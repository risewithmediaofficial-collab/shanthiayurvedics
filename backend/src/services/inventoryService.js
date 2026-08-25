import { Inventory } from '../models/Inventory.js';
import { StockMovement } from '../models/StockMovement.js';
import { StockTransfer } from '../models/StockTransfer.js';
import { StockAdjustment } from '../models/StockAdjustment.js';
import { Product } from '../models/Product.js';
import { ProductBatch } from '../models/ProductBatch.js';
import { MOVEMENT_TYPES, MOVEMENT_REASONS, TRANSFER_STATUS } from '../constants/stockStates.js';
import { AppError, NotFoundError } from '../utils/errors.js';
import { AuditService } from './auditService.js';

export class InventoryService {
  /**
   * Ensure Inventory document exists for product, batch, and branch
   */
  static async getOrCreateInventory(productId, batchId, branchId, session = null) {
    let query = Inventory.findOne({ productId, batchId, branchId });
    if (session) query = query.session(session);
    let inv = await query;

    if (!inv) {
      inv = new Inventory({
        productId,
        batchId,
        branchId,
        availableQuantity: 0,
        reservedQuantity: 0,
        allocatedQuantity: 0,
        dispatchedQuantity: 0,
        returnedQuantity: 0,
        damagedQuantity: 0
      });
      await inv.save(session ? { session } : undefined);
    }
    return inv;
  }

  /**
   * Stock In (Physical stock addition from purchase or production)
   */
  static async stockIn({ productId, batchId, branchId, quantity, reason = MOVEMENT_REASONS.PURCHASE, notes, user, req, session = null }) {
    if (quantity <= 0) {
      throw new AppError('Quantity must be greater than zero', 400);
    }

    const inv = await this.getOrCreateInventory(productId, batchId, branchId, session);
    const previousAvailable = inv.availableQuantity;
    inv.availableQuantity += quantity;
    await inv.save(session ? { session } : undefined);

    // Ledger Movement
    const movement = new StockMovement({
      productId,
      batchId,
      branchId,
      type: MOVEMENT_TYPES.IN,
      quantity,
      reason,
      performedBy: user.id || user._id,
      previousAvailable,
      newAvailable: inv.availableQuantity,
      notes,
      timestamp: new Date()
    });
    await movement.save(session ? { session } : undefined);

    await AuditService.log({
      userId: user.id || user._id,
      branchId,
      action: 'STOCK_IN',
      module: 'inventory',
      resourceType: 'Inventory',
      resourceId: inv._id,
      newValue: { productId, batchId, quantity, reason, newAvailable: inv.availableQuantity },
      req
    });

    return { inventory: inv, movement };
  }

  /**
   * Stock Out (Controlled reduction)
   */
  static async stockOut({ productId, batchId, branchId, quantity, reason = MOVEMENT_REASONS.MANUAL_ADJUSTMENT, notes, user, req, session = null }) {
    if (quantity <= 0) {
      throw new AppError('Quantity must be greater than zero', 400);
    }

    const inv = await this.getOrCreateInventory(productId, batchId, branchId, session);
    if (inv.availableQuantity < quantity) {
      throw new AppError(`Insufficient stock. Available: ${inv.availableQuantity}, Requested: ${quantity}`, 400);
    }

    const previousAvailable = inv.availableQuantity;
    inv.availableQuantity -= quantity;
    await inv.save(session ? { session } : undefined);

    const movement = new StockMovement({
      productId,
      batchId,
      branchId,
      type: MOVEMENT_TYPES.OUT,
      quantity,
      reason,
      performedBy: user.id || user._id,
      previousAvailable,
      newAvailable: inv.availableQuantity,
      notes,
      timestamp: new Date()
    });
    await movement.save(session ? { session } : undefined);

    return { inventory: inv, movement };
  }

  /**
   * Reserve Stock for an Order (ACID transactional lock)
   */
  static async reserveStock({ productId, batchId, branchId, quantity, orderId, user, req, session = null }) {
    const inv = await this.getOrCreateInventory(productId, batchId, branchId, session);

    if (inv.availableQuantity < quantity) {
      const product = await Product.findById(productId);
      throw new AppError(
        `Insufficient available stock for "${product?.name || 'Product'}". Available: ${inv.availableQuantity}, Requested: ${quantity}`,
        400
      );
    }

    const previousAvailable = inv.availableQuantity;
    inv.availableQuantity -= quantity;
    inv.reservedQuantity += quantity;
    await inv.save(session ? { session } : undefined);

    const movement = new StockMovement({
      productId,
      batchId,
      branchId,
      type: MOVEMENT_TYPES.RESERVE,
      quantity,
      reason: MOVEMENT_REASONS.ORDER_RESERVATION,
      referenceType: 'Order',
      referenceId: orderId ? orderId.toString() : null,
      performedBy: user.id || user._id,
      previousAvailable,
      newAvailable: inv.availableQuantity,
      notes: `Reserved for Order ${orderId}`,
      timestamp: new Date()
    });
    await movement.save(session ? { session } : undefined);

    return { inventory: inv, movement };
  }

  /**
   * Release Reserved Stock on Order Cancellation
   */
  static async releaseReservedStock({ productId, batchId, branchId, quantity, orderId, user, req, session = null }) {
    const inv = await this.getOrCreateInventory(productId, batchId, branchId, session);

    const actualQuantity = Math.min(inv.reservedQuantity, quantity);
    const previousAvailable = inv.availableQuantity;
    inv.reservedQuantity = Math.max(0, inv.reservedQuantity - actualQuantity);
    inv.availableQuantity += actualQuantity;
    await inv.save(session ? { session } : undefined);

    const movement = new StockMovement({
      productId,
      batchId,
      branchId,
      type: MOVEMENT_TYPES.RELEASE,
      quantity: actualQuantity,
      reason: MOVEMENT_REASONS.ORDER_CANCELLATION,
      referenceType: 'Order',
      referenceId: orderId ? orderId.toString() : null,
      performedBy: user.id || user._id,
      previousAvailable,
      newAvailable: inv.availableQuantity,
      notes: `Released from cancelled Order ${orderId}`,
      timestamp: new Date()
    });
    await movement.save(session ? { session } : undefined);

    return { inventory: inv, movement };
  }

  /**
   * Manual Stock Adjustment
   */
  static async adjustStock({ productId, batchId, branchId, newAvailable, reason, notes, user, req }) {
    const inv = await this.getOrCreateInventory(productId, batchId, branchId);
    const previousAvailable = inv.availableQuantity;
    const difference = newAvailable - previousAvailable;

    inv.availableQuantity = newAvailable;
    await inv.save();

    // Record adjustment entry
    const adjustment = new StockAdjustment({
      productId,
      batchId,
      branchId,
      previousAvailable,
      newAvailable,
      adjustedQuantity: difference,
      reason,
      performedBy: user.id,
      notes
    });
    await adjustment.save();

    // Record movement
    const movement = new StockMovement({
      productId,
      batchId,
      branchId,
      type: MOVEMENT_TYPES.ADJUSTMENT,
      quantity: Math.abs(difference),
      reason: MOVEMENT_REASONS.MANUAL_ADJUSTMENT,
      referenceType: 'StockAdjustment',
      referenceId: adjustment._id.toString(),
      performedBy: user.id,
      previousAvailable,
      newAvailable,
      notes,
      timestamp: new Date()
    });
    await movement.save();

    await AuditService.log({
      userId: user.id,
      branchId,
      action: 'STOCK_ADJUSTMENT',
      module: 'inventory',
      resourceType: 'StockAdjustment',
      resourceId: adjustment._id,
      oldValue: { previousAvailable },
      newValue: { newAvailable, difference, reason },
      req
    });

    return { inventory: inv, adjustment, movement };
  }

  /**
   * Create a Multi-Item Stock Transfer Request
   */
  static async createStockTransfer({ fromBranchId, toBranchId, items, notes, user, req }) {
    if (fromBranchId === toBranchId) {
      throw new AppError('Source and destination branches must be different', 400);
    }

    // Verify stock availability in source branch
    for (const item of items) {
      const inv = await this.getOrCreateInventory(item.productId, item.batchId, fromBranchId);
      if (inv.availableQuantity < item.quantity) {
        const product = await Product.findById(item.productId);
        throw new AppError(
          `Insufficient stock in source branch for "${product?.name}". Available: ${inv.availableQuantity}, Requested: ${item.quantity}`,
          400
        );
      }
    }

    const transferNumber = `TRF-${Date.now().toString().slice(-6)}`;
    const transfer = new StockTransfer({
      transferNumber,
      fromBranchId,
      toBranchId,
      items,
      status: TRANSFER_STATUS.REQUESTED,
      requestedBy: user.id,
      notes
    });
    await transfer.save();

    await AuditService.log({
      userId: user.id,
      branchId: fromBranchId,
      action: 'STOCK_TRANSFER_REQUESTED',
      module: 'inventory',
      resourceType: 'StockTransfer',
      resourceId: transfer._id,
      newValue: transfer.toObject(),
      req
    });

    return transfer;
  }

  /**
   * Dispatch Stock Transfer (Reduces fromBranch stock)
   */
  static async dispatchStockTransfer(transferId, { trackingNumber, notes }, user, req) {
    const transfer = await StockTransfer.findById(transferId);
    if (!transfer) throw new NotFoundError('StockTransfer');
    if (transfer.status !== TRANSFER_STATUS.REQUESTED && transfer.status !== TRANSFER_STATUS.APPROVED) {
      throw new AppError(`Transfer cannot be dispatched in '${transfer.status}' status`, 400);
    }

    // Deduct stock from source branch
    for (const item of transfer.items) {
      const inv = await this.getOrCreateInventory(item.productId, item.batchId, transfer.fromBranchId);
      if (inv.availableQuantity < item.quantity) {
        throw new AppError(`Insufficient stock in source branch to dispatch`, 400);
      }
      const previousAvailable = inv.availableQuantity;
      inv.availableQuantity -= item.quantity;
      await inv.save();

      await StockMovement.create({
        productId: item.productId,
        batchId: item.batchId,
        branchId: transfer.fromBranchId,
        type: MOVEMENT_TYPES.TRANSFER_OUT,
        quantity: item.quantity,
        reason: MOVEMENT_REASONS.STOCK_TRANSFER,
        referenceType: 'StockTransfer',
        referenceId: transfer._id.toString(),
        performedBy: user.id,
        previousAvailable,
        newAvailable: inv.availableQuantity,
        notes: `Transfer Out to Branch ${transfer.toBranchId}`
      });
    }

    transfer.status = TRANSFER_STATUS.IN_TRANSIT;
    transfer.approvedBy = user.id;
    transfer.trackingNumber = trackingNumber;
    if (notes) transfer.notes = notes;
    await transfer.save();

    return transfer;
  }

  /**
   * Receive and Verify Stock Transfer (Increments toBranch stock)
   */
  static async receiveStockTransfer(transferId, user, req) {
    const transfer = await StockTransfer.findById(transferId);
    if (!transfer) throw new NotFoundError('StockTransfer');
    if (transfer.status !== TRANSFER_STATUS.IN_TRANSIT) {
      throw new AppError(`Transfer must be 'IN_TRANSIT' to be received. Current: ${transfer.status}`, 400);
    }

    // Add stock to destination branch
    for (const item of transfer.items) {
      const inv = await this.getOrCreateInventory(item.productId, item.batchId, transfer.toBranchId);
      const previousAvailable = inv.availableQuantity;
      inv.availableQuantity += item.quantity;
      await inv.save();

      await StockMovement.create({
        productId: item.productId,
        batchId: item.batchId,
        branchId: transfer.toBranchId,
        type: MOVEMENT_TYPES.TRANSFER_IN,
        quantity: item.quantity,
        reason: MOVEMENT_REASONS.STOCK_TRANSFER,
        referenceType: 'StockTransfer',
        referenceId: transfer._id.toString(),
        performedBy: user.id,
        previousAvailable,
        newAvailable: inv.availableQuantity,
        notes: `Transfer In from Branch ${transfer.fromBranchId}`
      });
    }

    transfer.status = TRANSFER_STATUS.RECEIVED;
    transfer.receivedBy = user.id;
    await transfer.save();

    return transfer;
  }
}

export default InventoryService;
