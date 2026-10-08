import { TPCServiceInterface } from './TPCServiceInterface.js';
import { AppError } from '../../../utils/errors.js';
import { SHIPPING_STATUS } from '../../../constants/shippingStates.js';

/**
 * TPC Mock Service
 * Simulates The Professional Couriers (TPC) Web API with deterministic,
 * testable responses. Clearly marked as MOCK / DEMO everywhere.
 */
export class TPCMockService extends TPCServiceInterface {
  constructor(config = {}) {
    super();
    this.senderDetails = {
      name: config.senderName || 'Shanthi Ayurvedas',
      address: config.senderAddress || 'No 45 Ayur Bhavan, Main Road',
      city: config.senderCity || 'Hosur',
      pincode: config.senderPincode || '635109',
      mobile: config.senderMobile || '9876543210',
      email: config.senderEmail || 'orders@shanthiayurvedas.com',
      gstin: config.senderGstin || '33AAAAA0000A1Z5'
    };
    this.mockStock = 98; // Matches manual example (No of Cnotes: 98)
    this.codEnabled = Boolean(config.codEnabled);
  }

  /**
   * Check PIN-code serviceability
   */
  async checkServiceability({ pincode }) {
    if (!pincode || !/^[1-9]\d{5}$/.test(pincode.toString().trim())) {
      return {
        serviceable: false,
        carrier: 'The Professional Courier (TPC)',
        pincode: String(pincode || ''),
        message: 'Invalid Indian PIN code format (must be 6 digits starting with 1-9)',
        isMock: true
      };
    }

    const pin = pincode.toString().trim();

    // Specific unserviceable test PINs (999xxx or test blacklist)
    if (pin.startsWith('999') || pin === '000000' || pin === '123456') {
      return {
        serviceable: false,
        carrier: 'The Professional Courier (TPC)',
        pincode: pin,
        city: 'Unassigned Rural Zone',
        state: 'Remote Sector',
        estimatedDays: null,
        message: 'This PIN code is currently outside the TPC direct delivery network (Mock)',
        isMock: true
      };
    }

    // Known hub mappings
    const hubMap = {
      '563130': { city: 'Malur Hub', state: 'Karnataka', days: 2 },
      '635109': { city: 'Hosur Main Hub', state: 'Tamil Nadu', days: 1 },
      '600028': { city: 'Chennai Mylapore Hub', state: 'Tamil Nadu', days: 2 },
      '560001': { city: 'Bangalore Central Hub', state: 'Karnataka', days: 1 },
      '641001': { city: 'Coimbatore Hub', state: 'Tamil Nadu', days: 2 },
      '625001': { city: 'Madurai Hub', state: 'Tamil Nadu', days: 2 },
      '400001': { city: 'Mumbai Hub', state: 'Maharashtra', days: 3 },
      '110001': { city: 'Delhi Central Hub', state: 'Delhi', days: 3 }
    };

    const details = hubMap[pin] || {
      city: 'Regional TPC Parcel Hub',
      state: 'Delivery Zone',
      days: pin.startsWith('6') || pin.startsWith('5') ? 2 : 3
    };

    return {
      serviceable: true,
      carrier: 'The Professional Courier (TPC)',
      pincode: pin,
      city: details.city,
      state: details.state,
      estimatedDays: details.days,
      message: `PIN code ${pin} is serviceable by TPC (${details.city}) in ${details.days} days [MOCK]`,
      isMock: true
    };
  }

  /**
   * Search city / hubs
   */
  async searchCity({ areaName }) {
    const term = (areaName || '').toLowerCase();
    const hubs = [
      { areaName: 'Hosur Central', city: 'Hosur', pincode: '635109' },
      { areaName: 'Bangalore Electronic City', city: 'Bangalore', pincode: '560100' },
      { areaName: 'Chennai Guindy', city: 'Chennai', pincode: '600032' },
      { areaName: 'Coimbatore Gandhipuram', city: 'Coimbatore', pincode: '641012' },
      { areaName: 'Madurai Town', city: 'Madurai', pincode: '625001' }
    ];

    return hubs.filter(
      (h) => h.areaName.toLowerCase().includes(term) || h.city.toLowerCase().includes(term)
    );
  }

  /**
   * Check Consignment Note Stock
   */
  async checkStock() {
    return {
      availableCnotes: this.mockStock,
      totalAllocated: 500,
      used: 500 - this.mockStock,
      status: this.mockStock > 20 ? 'SUFFICIENT' : 'LOW',
      message: `Available C-Notes in TPC demo account: ${this.mockStock} [MOCK MODE]`,
      isMock: true
    };
  }

  /**
   * Request Additional Consignment Notes
   */
  async requestStock({ qty = 100 }) {
    this.mockStock += Number(qty) || 100;
    return {
      success: true,
      requestedQty: qty,
      newAvailableCount: this.mockStock,
      message: `Successfully requested ${qty} C-notes from TPC station (Mock simulated)`,
      isMock: true
    };
  }

  /**
   * Book Shipment
   */
  async bookShipment({ order, packageDetails = {}, isCod = false }) {
    if (isCod && !this.codEnabled) {
      throw new AppError(
        'COD booking is disabled for The Professional Couriers. Only Pre-payment (UPI/Online) is supported.',
        400
      );
    }

    const weightKg = Number(packageDetails.weight) || 0.5;
    if (weightKg <= 0 || weightKg > 50) {
      throw new AppError('Package weight must be between 0.05 kg and 50 kg.', 400);
    }

    const recipientAddress = order.deliveryAddress || {};
    const pin = recipientAddress.pincode?.toString().trim();
    if (!pin || !/^[1-9]\d{5}$/.test(pin)) {
      throw new AppError('Valid 6-digit delivery PIN code required for TPC booking.', 400);
    }

    if (pin.startsWith('999')) {
      throw new AppError(`Delivery PIN code ${pin} is not serviceable by TPC.`, 400);
    }

    // Deterministic AWB generation for mock: TPC + 8 digits
    // Uses order number or random seed for uniqueness
    const orderNum = order.orderNumber || '';
    const numericPart = (orderNum.replace(/\D/g, '') + Math.floor(100000 + Math.random() * 900000)).slice(-8);
    const prefix = isCod ? 'COD' : 'TPC';
    const awbNumber = `${prefix}${numericPart.padEnd(8, '0')}`;

    if (this.mockStock > 0) {
      this.mockStock -= 1;
    }

    return {
      success: true,
      awbNumber,
      refNo: order.orderNumber || String(order._id),
      podNo: awbNumber,
      cnoteNo: awbNumber,
      bookingDate: new Date(),
      isCod,
      mode: 'ST', // Surface Transit
      service: 'STD',
      isMock: true,
      message: `Shipment booked successfully with The Professional Couriers (Mock Demo AWB: ${awbNumber})`,
      rawResponse: {
        POD_NO: `Saved Successfully with Cons No ${awbNumber}`,
        ID: String(Math.floor(1000000 + Math.random() * 9000000)),
        status: 'success',
        error: '0',
        _mock: true
      }
    };
  }

  /**
   * Generate Printable Consignment Note Label
   */
  async getLabel({ awbNumber, singleCopy = true, shipment = null }) {
    const orderNumber = shipment?.orderId?.orderNumber || shipment?.tpcDetails?.refNo || 'N/A';
    const recipient = shipment?.orderId?.deliveryAddress || {};
    const customerName =
      shipment?.orderId?.patientDetails?.patientName || shipment?.orderId?.customerId?.name || 'Valued Customer';
    const customerMobile =
      shipment?.orderId?.patientDetails?.mobile || shipment?.orderId?.customerId?.mobile || '9876543210';
    const weight = shipment?.packageDetails?.weight || 0.5;
    const pieces = shipment?.packageDetails?.pieces || 1;
    const bookingDateStr = shipment?.bookingDate
      ? new Date(shipment.bookingDate).toLocaleDateString('en-IN')
      : new Date().toLocaleDateString('en-IN');

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>TPC Shipping Label - ${awbNumber} [DEMO]</title>
  <style>
    @page { size: ${singleCopy ? '100mm 150mm' : 'A4'}; margin: 8mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 0; padding: 12px; background: #fff; color: #111; }
    .label-box { border: 2px dashed #0f766e; border-radius: 8px; padding: 14px; position: relative; max-width: 520px; margin: 0 auto; background: #fafafa; }
    .demo-watermark { position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 28px; font-weight: 900; color: rgba(220, 38, 38, 0.18); text-transform: uppercase; pointer-events: none; white-space: nowrap; border: 3px solid rgba(220, 38, 38, 0.25); padding: 8px 18px; border-radius: 8px; letter-spacing: 2px; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f766e; padding-bottom: 8px; margin-bottom: 10px; }
    .brand { font-size: 16px; font-weight: 800; color: #042f2e; }
    .subbrand { font-size: 9px; color: #0f766e; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; }
    .badge { background: #fee2e2; color: #991b1b; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; }
    .barcode-container { text-align: center; margin: 10px 0; padding: 8px; background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; }
    .barcode-visual { height: 44px; display: flex; justify-content: center; align-items: flex-end; gap: 2px; margin-bottom: 4px; }
    .bar { background: #000; width: 3px; }
    .bar-thick { width: 6px; }
    .bar-space { width: 3px; background: transparent; }
    .awb-text { font-family: monospace; font-size: 18px; font-weight: 900; letter-spacing: 3px; color: #0f172a; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 11px; margin-bottom: 10px; }
    .section { background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; }
    .section-title { font-size: 9px; text-transform: uppercase; font-weight: 800; color: #64748b; margin-bottom: 4px; }
    .name { font-weight: 700; font-size: 12px; color: #0f172a; }
    .details { font-size: 10px; color: #334155; line-height: 1.35; margin-top: 2px; }
    .pincode-highlight { font-size: 14px; font-weight: 900; color: #042f2e; margin-top: 4px; display: inline-block; background: #ccfbf1; padding: 2px 6px; border-radius: 4px; }
    .specs-table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 8px; background: #fff; }
    .specs-table td { border: 1px solid #cbd5e1; padding: 4px 6px; }
    .specs-table .label { font-weight: bold; background: #f1f5f9; width: 35%; }
    .footer { text-align: center; font-size: 9px; color: #64748b; margin-top: 10px; border-top: 1px dashed #cbd5e1; padding-top: 6px; }
  </style>
</head>
<body>
  <div class="label-box">
    <div class="demo-watermark">MOCK DEMO LABEL</div>
    
    <div class="header">
      <div>
        <div class="brand">THE PROFESSIONAL COURIERS</div>
        <div class="subbrand">Domestic Express Consignment Note</div>
      </div>
      <span class="badge">SAMPLE / DEMO MODE</span>
    </div>

    <div class="barcode-container">
      <div class="barcode-visual">
        <div class="bar bar-thick" style="height: 40px;"></div><div class="bar-space"></div>
        <div class="bar" style="height: 35px;"></div><div class="bar bar-thick" style="height: 40px;"></div>
        <div class="bar" style="height: 38px;"></div><div class="bar-space"></div>
        <div class="bar bar-thick" style="height: 40px;"></div><div class="bar" style="height: 30px;"></div>
        <div class="bar-space"></div><div class="bar bar-thick" style="height: 40px;"></div>
        <div class="bar" style="height: 38px;"></div><div class="bar bar-thick" style="height: 40px;"></div>
        <div class="bar-space"></div><div class="bar" style="height: 35px;"></div>
        <div class="bar bar-thick" style="height: 40px;"></div><div class="bar" style="height: 40px;"></div>
      </div>
      <div class="awb-text">${awbNumber}</div>
    </div>

    <div class="grid">
      <div class="section">
        <div class="section-title">DELIVER TO (CONSIGNEE):</div>
        <div class="name">${customerName}</div>
        <div class="details">
          ${recipient.street || 'Hospital Cross Road'}<br />
          ${recipient.city || 'Chennai'}, ${recipient.state || 'Tamil Nadu'}<br />
          <span class="pincode-highlight">PIN: ${recipient.pincode || '600028'}</span><br />
          📱 Mobile: ${customerMobile}
        </div>
      </div>

      <div class="section">
        <div class="section-title">DISPATCH FROM (SHIPPER):</div>
        <div class="name">${this.senderDetails.name}</div>
        <div class="details">
          ${this.senderDetails.address}<br />
          ${this.senderDetails.city} - ${this.senderDetails.pincode}<br />
          📞 ${this.senderDetails.mobile}<br />
          GSTIN: ${this.senderDetails.gstin}
        </div>
      </div>
    </div>

    <table class="specs-table">
      <tr>
        <td class="label">Order Ref No</td>
        <td><strong>#${orderNumber}</strong></td>
        <td class="label">Booking Date</td>
        <td>${bookingDateStr}</td>
      </tr>
      <tr>
        <td class="label">Weight / Pcs</td>
        <td>${weight} kg (${pieces} piece)</td>
        <td class="label">Service / Mode</td>
        <td>Standard (ST - Surface)</td>
      </tr>
      <tr>
        <td class="label">Payment Type</td>
        <td><strong>PREPAID ONLINE (UPI)</strong></td>
        <td class="label">Contents</td>
        <td>Ayurvedic Wellness Care</td>
      </tr>
    </table>

    <div class="footer">
      Generated via Shanthi Ayurvedas CRM · TPC API Mock Provider · Not for actual carrier transport
    </div>
  </div>
</body>
</html>
    `;

    return {
      html,
      awbNumber,
      isMock: true,
      singleCopy
    };
  }

  /**
   * Track & Trace progression (simulates delivery stages realistically)
   */
  async getTracking({ awbNumber }) {
    // Generate realistic progression timestamps
    const now = new Date();
    const tMinus = (hours) => new Date(now.getTime() - hours * 60 * 60 * 1000);

    const events = [
      {
        status: SHIPPING_STATUS.SHIPMENT_CREATED,
        location: 'Hosur Logistics Desk',
        activity: `Shipment booked with The Professional Couriers. Consignment note ${awbNumber} generated.`,
        timestamp: tMinus(28),
        rawData: { Type: 'Booking', City: 'Hosur' }
      },
      {
        status: SHIPPING_STATUS.PICKED_UP,
        location: 'Hosur Main Hub (HSR)',
        activity: 'Parcel picked up by TPC express van. Bagged into transit manifest.',
        timestamp: tMinus(22),
        rawData: { Type: 'Outbound', City: 'Hosur' }
      },
      {
        status: SHIPPING_STATUS.IN_TRANSIT,
        location: 'Regional Transshipment Hub',
        activity: 'In transit - Arrived at regional transit sorting facility.',
        timestamp: tMinus(12),
        rawData: { Type: 'Inbound', City: 'Regional Hub' }
      },
      {
        status: SHIPPING_STATUS.OUT_FOR_DELIVERY,
        location: 'Destination Delivery Station',
        activity: 'Consignment out for delivery with local TPC courier delivery agent.',
        timestamp: tMinus(2),
        rawData: { Type: 'Out for Delivery', City: 'Destination Station' }
      }
    ];

    return {
      awbNumber,
      status: SHIPPING_STATUS.OUT_FOR_DELIVERY,
      isDelivered: false,
      events,
      isMock: true,
      message: 'Active mock tracking progression retrieved'
    };
  }

  /**
   * Cancel Shipment
   */
  async cancelShipment({ awbNumber, reason = 'Order cancelled by staff' }) {
    return {
      success: true,
      awbNumber,
      status: 'CANCELLED',
      message: `Consignment ${awbNumber} successfully cancelled in TPC mock engine (${reason})`,
      isMock: true,
      response: {
        POD_NO: awbNumber,
        REF_NO: 'REF-MOCK',
        status: 'success',
        error: '0',
        _mock: true
      }
    };
  }

  /**
   * Modify Shipment
   */
  async modifyShipment({ awbNumber, packageDetails = {} }) {
    return {
      success: true,
      awbNumber,
      message: `Shipment ${awbNumber} parcel specifications updated in TPC mock engine`,
      isMock: true,
      packageDetails
    };
  }
}

export default TPCMockService;
