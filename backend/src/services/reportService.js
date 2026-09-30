import mongoose from 'mongoose';
import { Order } from '../models/Order.js';
import { Lead } from '../models/Lead.js';
import { Inventory } from '../models/Inventory.js';
import { RTORecord } from '../models/RTORecord.js';
import { Shipment } from '../models/Shipment.js';
import { Branch } from '../models/Branch.js';
import { WithdrawalRequest } from '../models/WithdrawalRequest.js';
import { ValidationError, NotFoundError, ConflictError } from '../utils/errors.js';
import { dateRange, pagination } from '../utils/queryHelpers.js';
import { ORDER_STATUS } from '../constants/orderStates.js';

import { User } from '../models/User.js';
import { ROLES } from '../constants/roles.js';

export class ReportService {
  /**
   * Sales Report Aggregation
   */
  static async getSalesReport({ branchId, startDate, endDate, page = 1, limit = 25 }) {
    ({ page, limit } = pagination({ page, limit }));
    const filter = { status: { $ne: ORDER_STATUS.CANCELLED } };
    if (branchId && branchId !== 'ALL') filter.branchId = new mongoose.Types.ObjectId(branchId);
    if (startDate || endDate) {
      filter.createdAt = dateRange(startDate, endDate);
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
      filter.createdAt = dateRange(startDate, endDate);
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

  /**
   * Shanthi Ayurvedas TC Sales / Salary Report
   * Rule: 10% Commission on Catalog MRP for all DELIVERED Orders
   */
  static async getTCSalesSalaryReport({ branchId, startDate, endDate, month, year }) {
    const branchFilter = branchId && branchId !== 'ALL' ? { branchId: new mongoose.Types.ObjectId(branchId) } : {};
    const dateFilter = {};

    if (month && year) {
      const m = Number(month);
      const y = Number(year);
      if (!Number.isInteger(m) || m < 1 || m > 12 || !Number.isInteger(y) || y < 1900 || y > 9999) {
        throw new ValidationError('Enter a valid report month and year');
      }
      const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
      const prefix = `${y}-${String(m).padStart(2, '0')}`;
      Object.assign(dateFilter, dateRange(`${prefix}-01`, `${prefix}-${lastDay}`));
    } else if (startDate || endDate) {
      Object.assign(dateFilter, dateRange(startDate, endDate));
    }

    const orderMatch = {
      ...branchFilter,
      status: ORDER_STATUS.DELIVERED,
      ...(Object.keys(dateFilter).length > 0 ? { updatedAt: dateFilter } : {})
    };

    // 1. Fetch telecallers
    const telecallers = await User.find({
      role: ROLES.TELECALLER,
      ...(branchFilter.branchId ? { branchId: branchFilter.branchId } : {})
    }).select('name email phone isActive').lean();

    const activeCallers = telecallers;

    // 2. Aggregate delivered orders by telecaller
    const deliveredAgg = await Order.aggregate([
      { $match: orderMatch },
      {
        $group: {
          _id: '$telecallerId',
          totalDeliveredRevenue: { $sum: '$grandTotal' },
          deliveredOrdersCount: { $sum: 1 }
        }
      }
    ]);

    const aggMap = new Map();
    deliveredAgg.forEach((item) => {
      if (item._id) aggMap.set(item._id.toString(), item);
    });

    let totalGrossRevenue = 0;
    let totalDeliveredOrdersCount = 0;
    let totalCommissionEarned = 0;

    const callerReports = activeCallers.map((caller) => {
      const data = aggMap.get(caller._id.toString()) || { totalDeliveredRevenue: 0, deliveredOrdersCount: 0 };
      const deliveredRevenue = data.totalDeliveredRevenue || 0;
      const commission = Math.round(deliveredRevenue * 0.10); // 10% commission rule

      totalGrossRevenue += deliveredRevenue;
      totalDeliveredOrdersCount += data.deliveredOrdersCount;
      totalCommissionEarned += commission;

      return {
        telecallerId: caller._id,
        name: caller.name,
        phone: caller.phone,
        email: caller.email,
        deliveredOrdersCount: data.deliveredOrdersCount,
        deliveredRevenue,
        commissionRate: 10,
        commissionEarned: commission,
        deductions: 0,
        netPayable: commission
      };
    });

    return {
      rule: '10% Commission on Catalog MRP for all DELIVERED Orders',
      month: month || new Date().getMonth() + 1,
      year: year || new Date().getFullYear(),
      summary: {
        totalTelecallers: callerReports.length,
        totalDeliveredOrders: totalDeliveredOrdersCount,
        totalGrossDeliveredRevenue: totalGrossRevenue,
        totalCommissionEarned,
        netPayableSalary: totalCommissionEarned
      },
      telecallers: callerReports.sort((a, b) => b.deliveredRevenue - a.deliveredRevenue)
    };
  }

  /**
   * Shanthi Ayurvedas Till-Date & Withdrawal
   * 6 Financial KPIs + Withdrawal Request & Ledger
   */
  static async getTillDateWithdrawalData({ branchId }) {
    if (branchId && branchId !== 'ALL' && !mongoose.isValidObjectId(branchId)) {
      throw new ValidationError('Select a valid branch');
    }
    const branchFilter = branchId && branchId !== 'ALL' ? { branchId: new mongoose.Types.ObjectId(branchId) } : {};
    const [allOrdersAgg, deliveredOrdersAgg, branches, withdrawalTotals, requests, requestCount] = await Promise.all([
      Order.aggregate([
        { $match: { ...branchFilter, status: { $ne: ORDER_STATUS.CANCELLED } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } }
      ]),
      Order.aggregate([
        { $match: { ...branchFilter, status: ORDER_STATUS.DELIVERED } },
        { $group: { _id: '$branchId', total: { $sum: '$grandTotal' } } }
      ]),
      Branch.find(branchFilter.branchId ? { _id: branchFilter.branchId } : {}).select('revenueSharePercent withdrawalCommitted').lean(),
      WithdrawalRequest.aggregate([
        { $match: branchFilter },
        { $group: { _id: '$status', total: { $sum: '$amount' } } }
      ]),
      WithdrawalRequest.find(branchFilter).sort({ createdAt: -1 }).limit(100).lean(),
      WithdrawalRequest.countDocuments(branchFilter)
    ]);

    if (branchFilter.branchId && branches.length === 0) throw new NotFoundError('Branch');
    const branchMap = new Map(branches.map((branch) => [String(branch._id), branch]));
    const totalBranchSales = allOrdersAgg[0]?.total || 0;
    const deliveredCollections = deliveredOrdersAgg.reduce((sum, row) => sum + row.total, 0);
    const commissionAccrued = deliveredOrdersAgg.reduce((sum, row) => {
      const percent = branchMap.get(String(row._id))?.revenueSharePercent || 0;
      return sum + Math.round(row.total * percent / 100);
    }, 0);
    const totalWithdrawn = withdrawalTotals.find((row) => row._id === 'PROCESSED')?.total || 0;
    const pendingWithdrawal = withdrawalTotals.find((row) => row._id === 'PENDING')?.total || 0;
    const committed = branches.reduce((sum, branch) => sum + (branch.withdrawalCommitted || 0), 0);
    const availableBalance = Math.max(0, commissionAccrued - Math.max(committed, totalWithdrawn + pendingWithdrawal));

    return {
      metrics: {
        totalBranchSales,
        deliveredCollections,
        commissionAccrued,
        availableBalance,
        totalWithdrawn,
        pendingWithdrawal,
        minWithdrawalThreshold: 5000,
        revenueSharePercent: branches.length === 1 ? branches[0].revenueSharePercent || 0 : null
      },
      ledgerTotal: requestCount,
      ledger: requests.map((request) => ({
        id: String(request._id),
        branchId: request.branchId,
        amount: request.amount,
        requestedAt: request.createdAt,
        status: request.status,
        payoutMode: request.payoutMode,
        bankAccount: request.bankAccount,
        referenceNo: request.referenceNo,
        processedAt: request.processedAt
      }))
    };
  }

  /**
   * Submit Withdrawal Request
   */
  static async createWithdrawalRequest({ branchId, requestedBy, amount, payoutMode = 'BANK_TRANSFER', bankAccount, upiId }) {
    const numAmount = Number(amount);
    if (!mongoose.isValidObjectId(branchId)) throw new ValidationError('Select a branch before requesting a withdrawal');
    if (!Number.isFinite(numAmount) || numAmount < 5000 || !Number.isInteger(numAmount)) {
      throw new ValidationError('Withdrawal amount must be a whole number of at least ₹5,000');
    }
    if (!['BANK_TRANSFER', 'UPI'].includes(payoutMode)) throw new ValidationError('Choose a valid payout method');
    const rawDestination = payoutMode === 'UPI' ? upiId : bankAccount;
    const destination = typeof rawDestination === 'string' ? rawDestination.trim() : '';
    if (!destination || destination.length > 200) throw new ValidationError('Enter a valid payout destination');

    const branch = await Branch.findOne({ _id: branchId, isActive: true }).lean();
    if (!branch) throw new NotFoundError('Active branch');
    if (!branch.revenueSharePercent || branch.revenueSharePercent <= 0) {
      throw new ValidationError('Branch revenue share must be configured before requesting a payout');
    }
    const delivered = await Order.aggregate([
      { $match: { branchId: new mongoose.Types.ObjectId(branchId), status: ORDER_STATUS.DELIVERED } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } }
    ]);
    const accrued = Math.round((delivered[0]?.total || 0) * branch.revenueSharePercent / 100);
    const reserved = await Branch.updateOne({
      _id: branch._id,
      isActive: true,
      revenueSharePercent: branch.revenueSharePercent,
      $expr: { $lte: [{ $add: [{ $ifNull: ['$withdrawalCommitted', 0] }, numAmount] }, accrued] }
    }, { $inc: { withdrawalCommitted: numAmount } });
    if (!reserved.modifiedCount) throw new ConflictError('Insufficient available balance or branch settings changed. Refresh and try again.');

    try {
      const request = await WithdrawalRequest.create({
        branchId: branch._id,
        requestedBy,
        amount: numAmount,
        payoutMode,
        bankAccount: destination
      });
      return {
        id: String(request._id),
        amount: request.amount,
        requestedAt: request.createdAt,
        status: request.status,
        payoutMode: request.payoutMode,
        bankAccount: request.bankAccount
      };
    } catch (error) {
      await Branch.updateOne({ _id: branch._id }, { $inc: { withdrawalCommitted: -numAmount } });
      throw error;
    }
  }

  static async settleWithdrawalRequest({ id, status, referenceNo, processedBy }) {
    if (!mongoose.isValidObjectId(id)) throw new ValidationError('Invalid withdrawal request');
    if (!['PROCESSED', 'REJECTED'].includes(status)) throw new ValidationError('Choose processed or rejected');
    const reference = typeof referenceNo === 'string' ? referenceNo.trim() : '';
    if (status === 'PROCESSED' && (!reference || reference.length > 100)) {
      throw new ValidationError('Enter the bank or UPI transaction reference');
    }
    const request = await WithdrawalRequest.findOneAndUpdate(
      { _id: id, status: 'PENDING' },
      { $set: { status, referenceNo: status === 'PROCESSED' ? reference : undefined, processedAt: new Date(), processedBy } },
      { new: true }
    );
    if (!request) throw new ConflictError('Withdrawal request is missing or has already been settled');
    if (status === 'REJECTED') {
      await Branch.updateOne({ _id: request.branchId }, { $inc: { withdrawalCommitted: -request.amount } });
    }
    return { id: String(request._id), branchId: request.branchId, amount: request.amount, status: request.status, referenceNo: request.referenceNo, processedAt: request.processedAt };
  }
}

export default ReportService;

