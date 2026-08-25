import mongoose from 'mongoose';
import { Order } from '../models/Order.js';
import { Lead } from '../models/Lead.js';
import { Inventory } from '../models/Inventory.js';
import { RTORecord } from '../models/RTORecord.js';
import { Shipment } from '../models/Shipment.js';
import { ORDER_STATUS } from '../constants/orderStates.js';

export class ReportService {
  /**
   * Sales Report Aggregation
   */
  static async getSalesReport({ branchId, startDate, endDate, page = 1, limit = 25 }) {
    const filter = { status: { $ne: ORDER_STATUS.CANCELLED } };
    if (branchId && branchId !== 'ALL') filter.branchId = new mongoose.Types.ObjectId(branchId);
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [total, orders, summary] = await Promise.all([
      Order.countDocuments(filter),
      Order.find(filter)
        .populate('customerId', 'name mobile')
        .populate('branchId', 'name code')
        .populate('telecallerId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$grandTotal' },
            totalItems: { $sum: { $size: '$items' } },
            avgOrderValue: { $avg: '$grandTotal' }
          }
        }
      ])
    ]);

    return {
      orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary: summary[0] || { totalRevenue: 0, totalItems: 0, avgOrderValue: 0 }
    };
  }

  /**
   * Lead Conversion Report
   */
  static async getLeadReport({ branchId, startDate, endDate }) {
    const filter = {};
    if (branchId && branchId !== 'ALL') filter.branchId = new mongoose.Types.ObjectId(branchId);
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const [bySource, byStatus] = await Promise.all([
      Lead.aggregate([
        { $match: filter },
        { $group: { _id: '$source', count: { $sum: 1 } } }
      ]),
      Lead.aggregate([
        { $match: filter },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);

    return { bySource, byStatus };
  }

  /**
   * Delivery & RTO Analytics
   */
  static async getDeliveryReport({ branchId }) {
    const filter = branchId && branchId !== 'ALL' ? { branchId: new mongoose.Types.ObjectId(branchId) } : {};

    const [totalShipments, deliveredCount, rtoCount, rtoByReason] = await Promise.all([
      Shipment.countDocuments(filter),
      Shipment.countDocuments({ ...filter, trackingStatus: 'DELIVERED' }),
      RTORecord.countDocuments(filter),
      RTORecord.aggregate([
        { $match: filter },
        { $group: { _id: '$reason', count: { $sum: 1 } } }
      ])
    ]);

    return {
      totalShipments,
      deliveredCount,
      rtoCount,
      deliverySuccessRate: totalShipments > 0 ? ((deliveredCount / totalShipments) * 100).toFixed(1) : 0,
      rtoRate: totalShipments > 0 ? ((rtoCount / totalShipments) * 100).toFixed(1) : 0,
      rtoByReason
    };
  }
}

export default ReportService;
