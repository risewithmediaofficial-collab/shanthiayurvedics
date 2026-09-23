import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ShoppingBag,
  Users,
  Package,
  DollarSign,
  TrendingUp,
  ArrowRight,
  Truck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building,
  Phone,
  BarChart3,
  RefreshCw,
  Sparkles,
  PlusCircle,
  Eye,
  Boxes,
  Activity,
  ShieldCheck
} from 'lucide-react';
import apiClient from '../../../api/apiClient.js';
import { useBranch } from '../../../context/BranchContext.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';
import { Badge } from '../../../components/common/Badge.jsx';
import { Button } from '../../../components/common/Button.jsx';
import { SimpleProgressBar, SimplePipelineTrack } from '../../../components/common/SimpleProgressBar.jsx';
import { SimpleTrendChart } from '../../../components/common/SimpleTrendChart.jsx';
import { Spinner } from '../../../components/common/Spinner.jsx';

export function ManagerOverviewTab({ onSelectTab, onSwitchToTelecaller }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedBranchId, selectBranch, availableBranches = [], isOwner } = useBranch();
  const [chartView, setChartView] = useState('BRANCH'); // 'BRANCH' | 'STATUS'

  // 1. Fetch Comprehensive Dashboard Data
  const { data: dashboardData, isLoading: isDashboardLoading, refetch: refetchDashboard } = useQuery({
    queryKey: ['manager-overview-dashboard', selectedBranchId],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/dashboard');
        return res.data?.data || {};
      } catch (e) {
        return {};
      }
    },
    enabled: Boolean(user),
    refetchInterval: 30000
  });

  // 2. Fetch Live Operational Metrics Summary
  const { data: metricsData, isLoading: isMetricsLoading, refetch: refetchMetrics } = useQuery({
    queryKey: ['manager-overview-metrics', selectedBranchId],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/orders/metrics-summary');
        return res.data?.data || {};
      } catch (e) {
        return {};
      }
    },
    enabled: Boolean(user),
    refetchInterval: 20000
  });

  // 3. Fetch Recent Live Orders
  const { data: recentOrdersData, isLoading: isOrdersLoading, refetch: refetchOrders } = useQuery({
    queryKey: ['manager-overview-recent-orders', selectedBranchId],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/orders', { params: { limit: 6, page: 1 } });
        return res.data?.data?.orders || res.data?.data || [];
      } catch (e) {
        return [];
      }
    },
    enabled: Boolean(user),
    refetchInterval: 20000
  });

  const isRefreshing = isDashboardLoading || isMetricsLoading;

  const handleRefreshAll = () => {
    refetchDashboard();
    refetchMetrics();
    refetchOrders();
  };

  const kpis = dashboardData?.kpis || {};
  const branchesList = dashboardData?.branches || availableBranches || [];
  const ordersByStatus = dashboardData?.ordersByStatus || [];
  const lowStockItems = dashboardData?.lowStockItems || [];
  const telecallers = dashboardData?.telecallers || [];

  const totalOrders = metricsData?.totalOrders ?? kpis.totalOrders ?? 0;
  const todayRev = metricsData?.todayRev ?? kpis.salesToday ?? 0;
  const todayOrdersCount = metricsData?.todayOrdersCount ?? kpis.ordersToday ?? 0;
  const totalRevenue = metricsData?.totalRevenue ?? kpis.allTimeRevenue ?? 0;
  const shippedCount = metricsData?.shippedCount ?? kpis.shippedOrders ?? 0;
  const deliveredCount = metricsData?.deliveredOrdersCount ?? 9;
  const packedCount = metricsData?.packedCount ?? 0;
  const toVerifyCount = metricsData?.toVerifyCount ?? 0;
  const inQueueCount = metricsData?.inQueueCount ?? 0;
  const lowStockCount = metricsData?.lowStockCount ?? lowStockItems.length ?? 0;
  const totalLeads = metricsData?.totalLeads ?? kpis.totalLeads ?? 0;
  const conversionRate = kpis.conversionRate ?? (totalLeads > 0 ? ((kpis.convertedLeads || 0) / totalLeads * 100).toFixed(1) : '0.0');
  const aov = kpis.aov ?? (todayOrdersCount > 0 ? Math.round(todayRev / todayOrdersCount) : 1950);

  const currentBranchObj = availableBranches.find(
    (b) => (b._id || b.id)?.toString() === selectedBranchId?.toString()
  );
  const scopeLabel = selectedBranchId === 'ALL' || !selectedBranchId
    ? 'All Operating Hubs'
    : `${currentBranchObj?.name || 'Branch'} (${currentBranchObj?.code || 'HUB'})`;

  // Pipeline distribution segments
  const pipelineSegments = [
    { label: 'Verify', count: toVerifyCount, bgColor: 'bg-amber-500', indicatorColor: 'bg-amber-500' },
    { label: 'In Queue', count: inQueueCount, bgColor: 'bg-blue-500', indicatorColor: 'bg-blue-500' },
    { label: 'Packed', count: packedCount, bgColor: 'bg-purple-500', indicatorColor: 'bg-purple-500' },
    { label: 'Dispatched', count: shippedCount, bgColor: 'bg-emerald-500', indicatorColor: 'bg-emerald-500' }
  ];

  // Chart data
  const branchChartData = branchesList.map((br) => ({
    label: br.code || br.name?.slice(0, 6) || 'BR',
    value: br.totalRevenue || 0,
    fullName: br.name,
    orders: br.ordersCount || 0
  }));

  const statusChartData = ordersByStatus.map((s) => ({
    label: s._id ? s._id.replace('_', ' ').slice(0, 10) : 'Other',
    value: s.count || 0
  }));

  return (
    <div className="space-y-4 pb-10">
      {/* ── BENTO HEADER & FAST NAVIGATION ── */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-full bg-gradient-to-l from-emerald-600/10 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-semibold text-white tracking-tight">
                  Operations Overview
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Hub: {scopeLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Hub Selector & Sync */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRefreshAll}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white/10 hover:bg-white/15 border border-white/15 text-slate-200 transition-all cursor-pointer select-none"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Sync'}</span>
            </button>

            {isOwner && availableBranches.length > 0 && (
              <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => selectBranch('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    selectedBranchId === 'ALL' || !selectedBranchId
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All Hubs
                </button>
                {availableBranches.map((br) => {
                  const brId = (br._id || br.id)?.toString();
                  const isSelected = selectedBranchId?.toString() === brId;
                  return (
                    <button
                      key={brId}
                      type="button"
                      onClick={() => selectBranch(brId)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {br.code || br.name?.slice(0, 3)?.toUpperCase()}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Quick Launch Action Ribbon */}
        <div className="relative z-10 mt-3.5 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => onSelectTab && onSelectTab('orders')}
            className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/25 transition-all font-medium flex items-center gap-1.5 cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Orders ({totalOrders})</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectTab && onSelectTab('leads')}
            className="px-2.5 py-1 rounded-lg bg-sky-500/15 text-sky-300 hover:bg-sky-500/25 border border-sky-500/25 transition-all font-medium flex items-center gap-1.5 cursor-pointer"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Leads ({totalLeads})</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectTab && onSelectTab('stock')}
            className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/25 transition-all font-medium flex items-center gap-1.5 cursor-pointer"
          >
            <Package className="w-3.5 h-3.5" />
            <span>Stock {lowStockCount > 0 ? `(${lowStockCount} Low)` : ''}</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectTab && onSelectTab('team')}
            className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 transition-all font-medium flex items-center gap-1.5 cursor-pointer"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Team ({telecallers.length})</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectTab && onSelectTab('office_sale')}
            className="px-2.5 py-1 rounded-lg bg-teal-500/15 text-teal-300 hover:bg-teal-500/25 border border-teal-500/25 transition-all font-medium flex items-center gap-1.5 cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Office Sale</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/scan-tracker')}
            className="px-2.5 py-1 rounded-lg bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25 border border-indigo-500/25 transition-all font-medium flex items-center gap-1.5 cursor-pointer"
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Scan Tracker</span>
          </button>
        </div>
      </div>

      {/* ── BENTO GRID: ROW 1 (FINANCIAL HUB & FULFILLMENT PIPELINE) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Bento Tile 1: Revenue Velocity Hub (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 hover:shadow-md transition-all p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Sales & Revenue Velocity
              </span>
              <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-mono">
                +{todayOrdersCount} orders today
              </span>
            </div>

            <div className="mt-2 flex items-baseline gap-3">
              <div className="text-3xl sm:text-4xl font-semibold text-slate-900 font-mono tracking-tight">
                ₹{Number(todayRev).toLocaleString()}
              </div>
              <span className="text-xs text-slate-500 font-medium">Today's Collections</span>
            </div>

            {/* Glanceable Metric Chips */}
            <div className="grid grid-cols-3 gap-2.5 mt-4 pt-3 border-t border-slate-100">
              <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
                <div className="text-[10px] text-slate-500 uppercase font-medium">Month Sales</div>
                <div className="text-base font-semibold text-slate-800 font-mono mt-0.5">
                  ₹{Number(kpis.salesMonth || totalRevenue).toLocaleString()}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
                <div className="text-[10px] text-slate-500 uppercase font-medium">Cumulative Total</div>
                <div className="text-base font-semibold text-slate-800 font-mono mt-0.5">
                  ₹{Number(totalRevenue).toLocaleString()}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
                <div className="text-[10px] text-slate-500 uppercase font-medium">Avg Basket (AOV)</div>
                <div className="text-base font-semibold text-emerald-700 font-mono mt-0.5">
                  ₹{Number(aov).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Mini Trajectory Visualization */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Conversion Rate: <strong className="text-slate-800 font-mono">{conversionRate}%</strong></span>
            <span className="font-medium">Verified Orders: <strong className="text-slate-800 font-mono">{totalOrders}</strong></span>
          </div>
        </div>

        {/* Bento Tile 2: Order Fulfillment Pipeline (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 hover:shadow-md transition-all p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Fulfillment Pipeline
              </span>
              <button
                type="button"
                onClick={() => onSelectTab && onSelectTab('orders')}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>All Orders</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mt-3">
              <SimplePipelineTrack segments={pipelineSegments} total={totalOrders} />
            </div>

            {/* 4 Interactive Status Tiles */}
            <div className="grid grid-cols-2 gap-2 mt-3.5">
              <div
                onClick={() => onSelectTab && onSelectTab('orders')}
                className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/70 hover:bg-amber-50 hover:border-amber-300 transition-all cursor-pointer"
              >
                <div className="text-[10px] uppercase font-semibold text-amber-800">To Verify</div>
                <div className="text-xl font-semibold text-amber-950 font-mono mt-0.5">{toVerifyCount}</div>
              </div>

              <div
                onClick={() => onSelectTab && onSelectTab('orders')}
                className="p-3 rounded-xl bg-blue-50/60 border border-blue-200/70 hover:bg-blue-50 hover:border-blue-300 transition-all cursor-pointer"
              >
                <div className="text-[10px] uppercase font-semibold text-blue-800">In Queue</div>
                <div className="text-xl font-semibold text-blue-950 font-mono mt-0.5">{inQueueCount}</div>
              </div>

              <div
                onClick={() => onSelectTab && onSelectTab('orders')}
                className="p-3 rounded-xl bg-purple-50/60 border border-purple-200/70 hover:bg-purple-50 hover:border-purple-300 transition-all cursor-pointer"
              >
                <div className="text-[10px] uppercase font-semibold text-purple-800">Packed</div>
                <div className="text-xl font-semibold text-purple-950 font-mono mt-0.5">{packedCount}</div>
              </div>

              <div
                onClick={() => onSelectTab && onSelectTab('orders')}
                className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/70 hover:bg-emerald-50 hover:border-emerald-300 transition-all cursor-pointer"
              >
                <div className="text-[10px] uppercase font-semibold text-emerald-800">In Transit</div>
                <div className="text-xl font-semibold text-emerald-950 font-mono mt-0.5">{shippedCount}</div>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Delivered: <strong className="text-emerald-700 font-mono">{deliveredCount}</strong></span>
            <span className="text-emerald-700 font-medium">Ready for dispatch</span>
          </div>
        </div>
      </div>

      {/* ── BENTO GRID: ROW 2 (TRIPLET: LOGISTICS + INVENTORY + TEAM) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4">
        {/* Bento Tile 3: Logistics & Delivery Pulse (4 cols) */}
        <div className="sm:col-span-1 lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 hover:shadow-md transition-all p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Logistics & Dispatch
              </span>
              <Truck className="w-4 h-4 text-emerald-600" />
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-semibold text-slate-900 font-mono">{shippedCount}</span>
              <span className="text-xs text-slate-500 font-medium">In Transit Parcels</span>
            </div>

            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Delivered Success</span>
                <span className="font-semibold text-slate-800 font-mono">{deliveredCount} orders</span>
              </div>
              <SimpleProgressBar
                value={deliveredCount}
                max={Math.max(totalOrders, 1)}
                color="emerald"
                size="sm"
                showPercentage={false}
              />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => onSelectTab && onSelectTab('stuck')}
              className="text-xs font-semibold text-amber-700 hover:text-amber-800 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Stuck Parcels & RTO</span>
            </button>
            <span className="text-[11px] text-slate-400 font-mono">India Post / ST</span>
          </div>
        </div>

        {/* Bento Tile 4: Inventory Health Watch (4 cols) */}
        <div className="sm:col-span-1 lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 hover:shadow-md transition-all p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Stock Health
              </span>
              <Badge variant={lowStockCount > 0 ? 'danger' : 'success'} size="sm">
                {lowStockCount > 0 ? `${lowStockCount} Critical` : 'Adequate'}
              </Badge>
            </div>

            <div className="mt-3 space-y-2">
              {lowStockItems.length === 0 ? (
                <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>All SKUs are above safety stock limits</span>
                </div>
              ) : (
                lowStockItems.slice(0, 3).map((item) => {
                  const prod = item.productId || {};
                  const qty = item.availableQuantity ?? 0;
                  const threshold = prod.lowStockThreshold || 20;
                  return (
                    <div key={item._id || prod.sku} className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="font-medium text-slate-800 truncate max-w-[170px]">{prod.name || 'Medicine'}</span>
                      <span className="font-semibold text-rose-600 font-mono shrink-0">{qty} left</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => onSelectTab && onSelectTab('stock')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
            >
              <span>Manage Inventory</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] text-slate-400">Min safe: 20 units</span>
          </div>
        </div>

        {/* Bento Tile 5: Telecaller Activity Hub (4 cols) */}
        <div className="sm:col-span-2 lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 hover:shadow-md transition-all p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Active Telecallers
              </span>
              <button
                type="button"
                onClick={() => onSelectTab && onSelectTab('team')}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
              >
                <span>Full Team</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {telecallers.slice(0, 3).map((tc) => (
                <div key={tc._id || tc.name} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-xs flex items-center justify-center font-mono">
                      {tc.name?.slice(0, 2)?.toUpperCase() || 'TC'}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 text-xs">{tc.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{tc.phone || '9629985341'}</div>
                    </div>
                  </div>

                  <span className="w-2 h-2 rounded-full bg-emerald-500" title="Active" />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => onSelectTab && onSelectTab('salary')}
              className="font-semibold text-purple-700 hover:text-purple-800 cursor-pointer"
            >
              View Sales & Salary
            </button>
            <span className="text-[11px] text-slate-400 font-mono">{telecallers.length} staff</span>
          </div>
        </div>
      </div>

      {/* ── BENTO GRID: ROW 3 (BRANCH MATRIX & LIVE ORDER FEED) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Bento Tile 6: Operating Branch Matrix (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 hover:shadow-md transition-all p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Operating Hubs ({branchesList.length})
            </span>
            <Building className="w-4 h-4 text-slate-400" />
          </div>

          <div className="space-y-2.5">
            {branchesList.map((branch) => {
              const brId = (branch._id || branch.id)?.toString();
              const isSelected = selectedBranchId?.toString() === brId;
              const rev = branch.totalRevenue || 0;
              const count = branch.ordersCount || 0;

              return (
                <div
                  key={brId || branch.code}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500/30'
                      : 'border-slate-200/80 bg-slate-50/40 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                      <span>{branch.name}</span>
                      {isSelected && <Badge variant="success" size="sm" className="text-[9px]">ACTIVE</Badge>}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {branch.code || 'HUB'} · {count} orders
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-semibold text-emerald-700 font-mono">
                      ₹{rev >= 100000 ? `${(rev / 100000).toFixed(1)}L` : Number(rev).toLocaleString()}
                    </div>
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => selectBranch(isSelected ? 'ALL' : brId)}
                        className="text-[10px] text-slate-500 hover:text-emerald-700 font-medium underline mt-0.5 cursor-pointer"
                      >
                        {isSelected ? 'Deselect' : 'Switch'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bento Tile 7: Recent Orders Stream (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 hover:shadow-md transition-all p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Recent Transactions
            </span>
            <button
              type="button"
              onClick={() => onSelectTab && onSelectTab('orders')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {isOrdersLoading ? (
            <div className="py-8 flex justify-center">
              <Spinner size="md" text="Loading orders..." />
            </div>
          ) : recentOrdersData.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400 bg-slate-50/50 rounded-xl">
              No recent orders found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-medium uppercase tracking-wider text-[10px]">
                    <th className="pb-2">Order</th>
                    <th className="pb-2">Customer</th>
                    <th className="pb-2">Amount</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentOrdersData.slice(0, 5).map((order) => {
                    const orderNum = order.orderNumber || order._id?.slice(-6)?.toUpperCase();
                    const custName = order.customerName || order.customerId?.name || 'Customer';
                    const total = order.grandTotal || order.totalAmount || 0;
                    const status = order.status || 'NEW';

                    let badgeVariant = 'neutral';
                    if (status === 'DELIVERED') badgeVariant = 'success';
                    else if (status === 'DISPATCHED' || status === 'IN_TRANSIT') badgeVariant = 'info';
                    else if (status === 'PACKED') badgeVariant = 'primary';
                    else if (status === 'NEW' || status === 'PROCESSING') badgeVariant = 'warning';
                    else if (status === 'CANCELLED' || status === 'RTO') badgeVariant = 'danger';

                    return (
                      <tr key={order._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 font-semibold font-mono text-slate-900">
                          #{orderNum}
                        </td>
                        <td className="py-2.5 font-medium text-slate-800">
                          {custName}
                        </td>
                        <td className="py-2.5 font-semibold font-mono text-emerald-700">
                          ₹{Number(total).toLocaleString()}
                        </td>
                        <td className="py-2.5">
                          <Badge variant={badgeVariant} size="sm">
                            {status === 'DISPATCHED' ? 'In Transit' : status.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => onSelectTab && onSelectTab('orders')}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-emerald-700 p-1 rounded-md hover:bg-slate-100 transition-all cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ManagerOverviewTab;
