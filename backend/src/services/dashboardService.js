import mongoose from 'mongoose';
import { Order } from '../models/Order.js';
import { Lead } from '../models/Lead.js';
import { FollowUp } from '../models/FollowUp.js';
import { Inventory } from '../models/Inventory.js';
import { CallHistory } from '../models/CallHistory.js';
import { Branch } from '../models/Branch.js';
import { User } from '../models/User.js';
import { ORDER_STATUS } from '../constants/orderStates.js';
import { LEAD_STATUS, FOLLOWUP_STATUS } from '../constants/leadStates.js';
import { ROLES } from '../constants/roles.js';

export class DashboardService {
  /**
   * Helper: Date ranges
   */
  static getDateBoundaries() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
    const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);

    return { startOfToday, startOfYesterday, endOfYesterday, startOfWeek, startOfMonth };
  }

  /**
   * Owner Dashboard Metrics & Visuals
   */
  static async getOwnerDashboard(branchId = 'ALL') {
    const { startOfToday, startOfYesterday, endOfYesterday, startOfWeek, startOfMonth } = this.getDateBoundaries();
    const branchFilter = branchId && branchId !== 'ALL' ? { branchId: new mongoose.Types.ObjectId(branchId) } : {};

    // 1. Sales Aggregates
    const [
      allTimeSales,
      todaySales,
      yestSales,
      weekSales,
      monthSales,
      totalOrders,
      shippedOrders,
      totalLeads,
      todayLeads,
      convertedLeads,
      allBranchesList
    ] = await Promise.all([
      Order.aggregate([
        { $match: { ...branchFilter, status: { $ne: ORDER_STATUS.CANCELLED } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } }
      ]),
      Order.aggregate([
        { $match: { ...branchFilter, createdAt: { $gte: startOfToday }, status: { $ne: ORDER_STATUS.CANCELLED } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } }
      ]),
      Order.aggregate([
        { $match: { ...branchFilter, createdAt: { $gte: startOfYesterday, $lte: endOfYesterday }, status: { $ne: ORDER_STATUS.CANCELLED } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } }
      ]),
      Order.aggregate([
        { $match: { ...branchFilter, createdAt: { $gte: startOfWeek }, status: { $ne: ORDER_STATUS.CANCELLED } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } }
      ]),
      Order.aggregate([
        { $match: { ...branchFilter, createdAt: { $gte: startOfMonth }, status: { $ne: ORDER_STATUS.CANCELLED } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } }
      ]),
      Order.countDocuments(branchFilter),
      Order.countDocuments({ ...branchFilter, status: { $in: [ORDER_STATUS.DISPATCHED, ORDER_STATUS.DELIVERED] } }),
      Lead.countDocuments(branchFilter),
      Lead.countDocuments({ ...branchFilter, createdAt: { $gte: startOfToday } }),
      Lead.countDocuments({ ...branchFilter, status: LEAD_STATUS.CONVERTED }),
      Branch.find().populate('managerId', 'name phone email').lean()
    ]);

    const allTimeRevenue = allTimeSales[0]?.total || 0;
    const salesToday = todaySales[0]?.total || 0;
    const ordersToday = todaySales[0]?.count || 0;
    const salesYesterday = yestSales[0]?.total || 0;
    const salesWeek = weekSales[0]?.total || 0;
    const salesMonth = monthSales[0]?.total || 0;
    const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : 0;
    const aov = ordersToday > 0 ? Math.round(salesToday / ordersToday) : 0;

    // Enrich branches with their orders & revenue
    const franchiseBranches = await Promise.all(
      allBranchesList.map(async (br) => {
        const [ordersCount, revenueAgg, telecallerCount] = await Promise.all([
          Order.countDocuments({ branchId: br._id }),
          Order.aggregate([
            { $match: { branchId: br._id, status: { $ne: ORDER_STATUS.CANCELLED } } },
            { $group: { _id: null, total: { $sum: '$grandTotal' } } }
          ]),
          User.countDocuments({ branchId: br._id, role: ROLES.TELECALLER })
        ]);

        return {
          ...br,
          ordersCount,
          totalRevenue: revenueAgg[0]?.total || 0,
          telecallerCount,
          managerName: br.managerName || br.managerId?.name || (br.code === 'HSR' ? 'Dr Shanthi' : 'Deepak Manager'),
          managerPhone: br.managerPhone || br.managerId?.phone || (br.code === 'HSR' ? '9629985345' : '9842133445')
        };
      })
    );

    // 2. Orders by Status
    const ordersByStatus = await Order.aggregate([
      { $match: branchFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // 3. Branch Comparison Matrix
    const branchComparison = await Order.aggregate([
      { $match: { status: { $ne: ORDER_STATUS.CANCELLED } } },
      {
        $group: {
          _id: '$branchId',
          totalRevenue: { $sum: '$grandTotal' },
          ordersCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'branches',
          localField: '_id',
          foreignField: '_id',
          as: 'branch'
        }
      },
      { $unwind: '$branch' },
      {
        $project: {
          branchName: '$branch.name',
          branchCode: '$branch.code',
          totalRevenue: 1,
          ordersCount: 1
        }
      }
    ]);

    // 4. Low Stock Summary
    const lowStockItems = await Inventory.find({
      ...(branchFilter.branchId ? { branchId: branchFilter.branchId } : {}),
      availableQuantity: { $lte: 20 }
    })
      .populate('productId', 'name sku price lowStockThreshold')
      .populate('branchId', 'name code')
      .limit(10)
      .lean();

    return {
      kpis: {
        allTimeRevenue,
        salesToday,
        ordersToday,
        salesYesterday,
        salesWeek,
        salesMonth,
        conversionRate,
        aov,
        totalOrders,
        shippedOrders,
        totalLeads,
        todayLeads,
        convertedLeads
      },
      branches: franchiseBranches,
      ordersByStatus,
      branchComparison,
      lowStockItems
    };
  }

  /**
   * Telecaller Dashboard
   */
  static async getTelecallerDashboard(userId, branchId) {
    const { startOfToday } = this.getDateBoundaries();
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const user = await User.findById(userObjectId).select('branchId').lean();
    const branchFilter = branchId && branchId !== 'ALL' ? { branchId: new mongoose.Types.ObjectId(branchId) } : user?.branchId ? { branchId: user.branchId } : {};

    const [
      newAssignedLeads,
      todayFollowups,
      overdueFollowups,
      todayCalls,
      todayOrders,
      totalAssignedLeads,
      convertedLeads
    ] = await Promise.all([
      Lead.countDocuments({ assignedTo: userObjectId, status: LEAD_STATUS.NEW }),
      FollowUp.countDocuments({
        telecallerId: userObjectId,
        status: FOLLOWUP_STATUS.PENDING,
        scheduledAt: { $gte: startOfToday, $lte: new Date(Date.now() + 24 * 60 * 60 * 1000) }
      }),
      FollowUp.countDocuments({
        telecallerId: userObjectId,
        status: FOLLOWUP_STATUS.PENDING,
        scheduledAt: { $lt: startOfToday }
      }),
      CallHistory.countDocuments({ telecallerId: userObjectId, createdAt: { $gte: startOfToday } }),
      Order.aggregate([
        { $match: { telecallerId: userObjectId, createdAt: { $gte: startOfToday } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } }
      ]),
      Lead.countDocuments({ assignedTo: userObjectId }),
      Lead.countDocuments({ assignedTo: userObjectId, status: LEAD_STATUS.CONVERTED })
    ]);

    const todaySales = todayOrders[0]?.total || 0;
    const ordersCount = todayOrders[0]?.count || 0;
    const conversionRate = totalAssignedLeads > 0 ? ((convertedLeads / totalAssignedLeads) * 100).toFixed(1) : 0;

    const telecallerTeam = await User.find({
      role: ROLES.TELECALLER,
      ...(branchFilter.branchId ? { branchId: branchFilter.branchId } : {})
    }).select('_id name branchId').lean();

    const teamPerformance = await Promise.all(
      telecallerTeam.map(async (telecaller) => {
        const [leadsFollowed, ordersCreatedAgg, revenueAgg] = await Promise.all([
          FollowUp.countDocuments({ telecallerId: telecaller._id }),
          Order.aggregate([
            { $match: { telecallerId: telecaller._id, status: { $ne: ORDER_STATUS.CANCELLED } } },
            { $group: { _id: null, count: { $sum: 1 } } }
          ]),
          Order.aggregate([
            { $match: { telecallerId: telecaller._id, status: { $ne: ORDER_STATUS.CANCELLED } } },
            { $group: { _id: null, total: { $sum: '$grandTotal' } } }
          ])
        ]);

        return {
          employeeName: telecaller.name,
          employeeId: telecaller._id,
          leadsFollowed,
          ordersCreated: ordersCreatedAgg[0]?.count || 0,
          revenue: revenueAgg[0]?.total || 0
        };
      })
    );

    const recentCalls = await CallHistory.find({ telecallerId: userObjectId })
      .populate('leadId', 'name mobile')
      .populate('customerId', 'name mobile')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return {
      kpis: {
        newAssignedLeads,
        todayFollowups,
        overdueFollowups,
        todayCalls,
        todaySales,
        ordersCount,
        conversionRate,
        totalAssignedLeads
      },
      teamPerformance: teamPerformance.sort((a, b) => b.revenue - a.revenue || b.ordersCreated - a.ordersCreated),
      recentCalls
    };
  }

  /**
   * Manager Dashboard - Complete Branch Operations & Telecaller Monitoring
   */
  static async getManagerDashboard(branchId) {
    const { startOfToday } = this.getDateBoundaries();
    const branchFilter = branchId && branchId !== 'ALL' ? { branchId: new mongoose.Types.ObjectId(branchId) } : {};

    const [
      totalLeads,
      todayLeads,
      totalOrders,
      todayOrdersAgg,
      pendingFollowups,
      newOrders,
      processingOrders,
      packingOrders,
      dispatchOrders,
      shippedOrders,
      deliveredOrders,
      rtoOrders,
      lowStockCount,
      telecallersList,
      branchInfo
    ] = await Promise.all([
      Lead.countDocuments(branchFilter),
      Lead.countDocuments({ ...branchFilter, createdAt: { $gte: startOfToday } }),
      Order.countDocuments(branchFilter),
      Order.aggregate([
        { $match: { ...branchFilter, createdAt: { $gte: startOfToday }, status: { $ne: ORDER_STATUS.CANCELLED } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } }
      ]),
      FollowUp.countDocuments({ ...branchFilter, status: FOLLOWUP_STATUS.PENDING }),
      Order.countDocuments({ ...branchFilter, status: ORDER_STATUS.NEW }),
      Order.countDocuments({ ...branchFilter, status: ORDER_STATUS.PROCESSING }),
      Order.countDocuments({ ...branchFilter, status: ORDER_STATUS.READY_FOR_PACKING }),
      Order.countDocuments({ ...branchFilter, status: ORDER_STATUS.READY_FOR_DISPATCH }),
      Order.countDocuments({ ...branchFilter, status: ORDER_STATUS.DISPATCHED }),
      Order.countDocuments({ ...branchFilter, status: ORDER_STATUS.DELIVERED }),
      Order.countDocuments({ ...branchFilter, status: ORDER_STATUS.RTO }),
      Inventory.countDocuments({ ...(branchFilter.branchId ? { branchId: branchFilter.branchId } : {}), availableQuantity: { $lte: 20 } }),
      User.find({ role: ROLES.TELECALLER, ...(branchFilter.branchId ? { branchId: branchFilter.branchId } : {}) })
        .select('name email phone isActive')
        .lean(),
      branchFilter.branchId ? Branch.findById(branchFilter.branchId).lean() : null
    ]);

    const todayRev = todayOrdersAgg[0]?.total || 0;
    const todayOrdersCount = todayOrdersAgg[0]?.count || 0;
    const inQueue = processingOrders + packingOrders + dispatchOrders;

    // Telecaller live stats
    const telecallerStats = await Promise.all(
      telecallersList.map(async (tc) => {
        const [assignedCount, todayCalls, todaySalesAgg] = await Promise.all([
          Lead.countDocuments({ assignedTo: tc._id }),
          CallHistory.countDocuments({ telecallerId: tc._id, createdAt: { $gte: startOfToday } }),
          Order.aggregate([
            { $match: { telecallerId: tc._id, createdAt: { $gte: startOfToday }, status: { $ne: ORDER_STATUS.CANCELLED } } },
            { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } }
          ])
        ]);

        return {
          ...tc,
          assignedCount,
          todayCalls,
          todayOrders: todaySalesAgg[0]?.count || 0,
          todaySales: todaySalesAgg[0]?.total || 0
        };
      })
    );

    return {
      kpis: {
        totalLeads,
        todayLeads,
        totalOrders,
        todayOrdersCount,
        todayRev,
        pendingFollowups,
        inQueue,
        shippedOrders,
        deliveredOrders,
        toVerifyOrders: newOrders,
        lowStockCount
      },
      queues: {
        newOrders,
        processingOrders,
        packingOrders,
        dispatchOrders,
        shippedOrders,
        deliveredOrders,
        rtoOrders,
        lowStockCount
      },
      telecallers: telecallerStats,
      branch: branchInfo || { name: 'Shanthi Ayurvedas Main Branch', code: 'MAIN' }
    };
  }
}

export default DashboardService;
