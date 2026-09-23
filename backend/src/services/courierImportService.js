/**
 * courierImportService.js
 *
 * Orchestrates the full "courier status bulk import" workflow:
 *  1. Parse uploaded file (Excel or PDF) → raw rows
 *  2. Map each courier's raw status text → our SHIPPING_STATUS enum
 *  3. Look up each AWB in the Shipment collection
 *  4. Bulk-update Shipment.trackingStatus (and actualDeliveryDate for DELIVERED)
 *  5. Update linked Order.status to 'DELIVERED' where applicable
 *  6. Return a structured import summary
 */

import { parseFile } from './fileParserService.js';
import { Shipment } from '../models/Shipment.js';
import { Order } from '../models/Order.js';
import { TrackingEvent } from '../models/TrackingEvent.js';
import { SHIPPING_STATUS } from '../constants/shippingStates.js';
import { ORDER_STATUS } from '../constants/orderStates.js';

// ── Status Mapping Tables ────────────────────────────────────────────────────

/**
 * India Post status strings found in their bulk report Excel / PDF.
 * Keys are lowercase trimmed raw strings (or substrings) from the file.
 */
const INDIA_POST_STATUS_MAP = {
  'delivered': SHIPPING_STATUS.DELIVERED,
  'item delivered': SHIPPING_STATUS.DELIVERED,
  'delivery': SHIPPING_STATUS.DELIVERED,
  'consignment delivered': SHIPPING_STATUS.DELIVERED,

  'out for delivery': SHIPPING_STATUS.OUT_FOR_DELIVERY,
  'ofd': SHIPPING_STATUS.OUT_FOR_DELIVERY,
  'out for del': SHIPPING_STATUS.OUT_FOR_DELIVERY,

  'in transit': SHIPPING_STATUS.IN_TRANSIT,
  'dispatched': SHIPPING_STATUS.IN_TRANSIT,
  'item dispatched': SHIPPING_STATUS.IN_TRANSIT,
  'in bag': SHIPPING_STATUS.IN_TRANSIT,
  'bagged': SHIPPING_STATUS.IN_TRANSIT,
  'received at': SHIPPING_STATUS.IN_TRANSIT,

  'item booked': SHIPPING_STATUS.SHIPMENT_CREATED,
  'booked': SHIPPING_STATUS.SHIPMENT_CREATED,

  'not delivered': SHIPPING_STATUS.DELIVERY_FAILED,
  'delivery failed': SHIPPING_STATUS.DELIVERY_FAILED,
  'addressee not available': SHIPPING_STATUS.DELIVERY_FAILED,
  'door locked': SHIPPING_STATUS.DELIVERY_FAILED,
  'undelivered': SHIPPING_STATUS.DELIVERY_FAILED,

  'returned': SHIPPING_STATUS.RTO_INITIATED,
  'return': SHIPPING_STATUS.RTO_INITIATED,
  'rto': SHIPPING_STATUS.RTO_INITIATED,
  'return to origin': SHIPPING_STATUS.RTO_INITIATED,
  'item returned': SHIPPING_STATUS.RTO_INITIATED,
  'refused': SHIPPING_STATUS.RTO_INITIATED,
};

/**
 * Professional Courier (TPC) status codes / strings.
 */
const TPC_STATUS_MAP = {
  // Short codes TPC uses
  'dl': SHIPPING_STATUS.DELIVERED,
  'del': SHIPPING_STATUS.DELIVERED,
  'delivered': SHIPPING_STATUS.DELIVERED,
  'delivery done': SHIPPING_STATUS.DELIVERED,
  'consignment delivered': SHIPPING_STATUS.DELIVERED,

  'ofd': SHIPPING_STATUS.OUT_FOR_DELIVERY,
  'out for delivery': SHIPPING_STATUS.OUT_FOR_DELIVERY,

  'it': SHIPPING_STATUS.IN_TRANSIT,
  'in transit': SHIPPING_STATUS.IN_TRANSIT,
  'intransit': SHIPPING_STATUS.IN_TRANSIT,
  'dispatched': SHIPPING_STATUS.IN_TRANSIT,
  'received at hub': SHIPPING_STATUS.IN_TRANSIT,

  'bkd': SHIPPING_STATUS.SHIPMENT_CREATED,
  'booked': SHIPPING_STATUS.SHIPMENT_CREATED,

  'ud': SHIPPING_STATUS.DELIVERY_FAILED,
  'undelivered': SHIPPING_STATUS.DELIVERY_FAILED,
  'mis': SHIPPING_STATUS.DELIVERY_FAILED,
  'not delivered': SHIPPING_STATUS.DELIVERY_FAILED,
  'delivery attempt failed': SHIPPING_STATUS.DELIVERY_FAILED,

  'rto': SHIPPING_STATUS.RTO_INITIATED,
  'return': SHIPPING_STATUS.RTO_INITIATED,
  'returned': SHIPPING_STATUS.RTO_INITIATED,
  'return to origin': SHIPPING_STATUS.RTO_INITIATED,
  'consignment refused': SHIPPING_STATUS.RTO_INITIATED,
};

/**
 * Generic fallback map used when courier is unknown or for fuzzy matching.
 */
const GENERIC_STATUS_MAP = {
  ...INDIA_POST_STATUS_MAP,
  ...TPC_STATUS_MAP,
};

// ── Status Resolver ──────────────────────────────────────────────────────────

/**
 * Resolve a raw status string from the file to our SHIPPING_STATUS enum value.
 * @param {string} rawStatus
 * @param {'INDIA_POST'|'PROFESSIONAL_COURIER'|'AUTO'} courier
 * @returns {string} SHIPPING_STATUS value
 */
function resolveStatus(rawStatus, courier = 'AUTO') {
  const key = rawStatus.toLowerCase().trim();

  let map;
  if (courier === 'INDIA_POST') map = INDIA_POST_STATUS_MAP;
  else if (courier === 'PROFESSIONAL_COURIER') map = TPC_STATUS_MAP;
  else map = GENERIC_STATUS_MAP;

  // Exact match
  if (map[key]) return map[key];

  // Substring match (e.g. "Delivered at Chennai" → "delivered")
  for (const [pattern, status] of Object.entries(map)) {
    if (key.includes(pattern)) return status;
  }

  // Default — keep as IN_TRANSIT rather than unknown
  return SHIPPING_STATUS.IN_TRANSIT;
}

// ── Main Service ─────────────────────────────────────────────────────────────

/**
 * Process an uploaded courier status file and bulk-update shipments.
 *
 * @param {Buffer} fileBuffer  - Raw file buffer from multer
 * @param {string} mimetype    - MIME type from multer
 * @param {string} originalname - Original filename
 * @param {'INDIA_POST'|'PROFESSIONAL_COURIER'|'AUTO'} courier
 * @param {object} actorUser   - req.user (for audit / logging context)
 * @returns {Promise<ImportSummary>}
 */
export async function processImportFile(fileBuffer, mimetype, originalname, courier = 'AUTO', actorUser = {}) {
  // Step 1 — Parse file into raw rows
  const parsedRows = await parseFile(fileBuffer, mimetype, originalname);

  if (!parsedRows || parsedRows.length === 0) {
    throw new Error('No valid AWB rows could be extracted from the uploaded file. Please check the file format.');
  }

  // Step 2 — Resolve status for each row
  const resolvedRows = parsedRows.map((row) => ({
    awbNumber: row.awbNumber.toUpperCase().trim(),
    rawStatus: row.rawStatus,
    mappedStatus: resolveStatus(row.rawStatus, courier),
  }));

  // Deduplicate by AWB (last occurrence wins)
  const awbMap = new Map();
  for (const row of resolvedRows) {
    awbMap.set(row.awbNumber, row);
  }
  const uniqueRows = Array.from(awbMap.values());

  // Step 3 — Look up shipments in bulk
  const awbNumbers = uniqueRows.map((r) => r.awbNumber);
  const existingShipments = await Shipment.find({ awbNumber: { $in: awbNumbers } })
    .select('_id awbNumber orderId trackingStatus')
    .lean();

  const shipmentByAwb = new Map(existingShipments.map((s) => [s.awbNumber, s]));

  // Step 4 — Classify results
  const summary = {
    totalRowsInFile: parsedRows.length,
    uniqueAwbs: uniqueRows.length,
    matched: 0,
    unmatched: 0,
    alreadyUpToDate: 0,
    updated: 0,
    byStatus: {
      [SHIPPING_STATUS.DELIVERED]: 0,
      [SHIPPING_STATUS.OUT_FOR_DELIVERY]: 0,
      [SHIPPING_STATUS.IN_TRANSIT]: 0,
      [SHIPPING_STATUS.SHIPMENT_CREATED]: 0,
      [SHIPPING_STATUS.DELIVERY_FAILED]: 0,
      [SHIPPING_STATUS.RTO_INITIATED]: 0,
      [SHIPPING_STATUS.RTO_IN_TRANSIT]: 0,
      [SHIPPING_STATUS.RTO_RECEIVED]: 0,
    },
    unmatchedAwbs: [],
    updatedShipments: [],
    errors: [],
  };

  const shipmentUpdates = [];
  const orderIdsToMarkDelivered = [];

  for (const row of uniqueRows) {
    const shipment = shipmentByAwb.get(row.awbNumber);

    if (!shipment) {
      summary.unmatched++;
      summary.unmatchedAwbs.push(row.awbNumber);
      continue;
    }

    summary.matched++;
    summary.byStatus[row.mappedStatus] = (summary.byStatus[row.mappedStatus] || 0) + 1;

    if (shipment.trackingStatus === row.mappedStatus) {
      summary.alreadyUpToDate++;
      continue;
    }

    // Build update payload
    const updateFields = {
      trackingStatus: row.mappedStatus,
    };
    if (row.mappedStatus === SHIPPING_STATUS.DELIVERED) {
      updateFields.actualDeliveryDate = new Date();
    }

    shipmentUpdates.push({
      updateOne: {
        filter: { _id: shipment._id },
        update: { $set: updateFields },
      },
    });

    if (row.mappedStatus === SHIPPING_STATUS.DELIVERED && shipment.orderId) {
      orderIdsToMarkDelivered.push(shipment.orderId);
    }

    summary.updated++;
    summary.updatedShipments.push({
      awbNumber: row.awbNumber,
      previousStatus: shipment.trackingStatus,
      newStatus: row.mappedStatus,
      rawStatus: row.rawStatus,
    });
  }

  // ── Step 5 — Bulk write shipment updates ───────────────────────────────
  if (shipmentUpdates.length > 0) {
    await Shipment.bulkWrite(shipmentUpdates);
  }

  // ── Step 6 — Create TrackingEvent records for each updated shipment ─────
  // This keeps the tracking timeline modal accurate after a bulk import.
  if (summary.updatedShipments.length > 0) {
    const trackingEvents = summary.updatedShipments.map((s) => {
      const shipment = shipmentByAwb.get(s.awbNumber);
      return {
        shipmentId: shipment?._id,
        awbNumber: s.awbNumber,
        status: s.newStatus,
        location: 'Courier Status Import',
        activity: `Status updated via bulk import: ${s.rawStatus} → ${s.newStatus}`,
        timestamp: new Date()
      };
    }).filter((e) => e.shipmentId); // only include matched ones

    if (trackingEvents.length > 0) {
      await TrackingEvent.insertMany(trackingEvents, { ordered: false });
    }
  }

  // ── Step 7 — Update linked orders to DELIVERED (with state guard) ───────
  // Only update orders that are in a deliverable state to avoid breaking
  // the strict order state machine.
  const DELIVERABLE_ORDER_STATES = [
    ORDER_STATUS.DISPATCHED,
    ORDER_STATUS.IN_TRANSIT,
    ORDER_STATUS.OUT_FOR_DELIVERY,
    ORDER_STATUS.DELIVERY_FAILED,
  ];

  if (orderIdsToMarkDelivered.length > 0) {
    await Order.updateMany(
      {
        _id: { $in: orderIdsToMarkDelivered },
        status: { $in: DELIVERABLE_ORDER_STATES }
      },
      {
        $set: { status: ORDER_STATUS.DELIVERED, paymentStatus: 'PAID' },
        $push: {
          statusHistory: {
            fromStatus: null, // we don't know exact prev without fetching each
            toStatus: ORDER_STATUS.DELIVERED,
            timestamp: new Date(),
            notes: 'Auto-updated to DELIVERED via courier status bulk import'
          }
        }
      }
    );
  }

  return summary;
}
