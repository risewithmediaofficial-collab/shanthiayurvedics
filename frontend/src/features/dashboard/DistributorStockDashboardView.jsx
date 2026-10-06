import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package,
  ShoppingBag,
  Users,
  Phone,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Search,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  TrendingDown,
  Warehouse,
  Coins,
  BadgePercent,
  ExternalLink
} from 'lucide-react';
import apiClient from '../../api/apiClient.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useBranch } from '../../context/BranchContext.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Spinner } from '../../components/common/Spinner.jsx';
import { exportToExcel, exportToCSV } from '../../utils/exportUtils.js';
import { ExportButton } from '../../components/common/ExportButton.jsx';
import { SortDropdown } from '../../components/common/SortDropdown.jsx';
import { DateRangeFilter } from '../../components/common/DateRangeFilter.jsx';

const DISTRIBUTOR_SORT_OPTIONS = [
  { value: 'productName', label: '📦 Product Name' },
  { value: 'availableQuantity', label: '📊 Available Stock' },
  { value: 'price', label: '💰 Unit Price' },
  { value: 'valuation', label: '💎 Stock Valuation' },
  { value: 'updatedAt', label: '🕒 Date Updated' },
  { value: 'expiryDate', label: '⏳ Expiry Date' }
];

export function DistributorStockDashboardView({ onSwitchToTelecaller }) {
  const { user } = useAuth();
  const { selectedBranchId } = useBranch();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('STOCK'); // 'STOCK' | 'SALES' | 'TELECALLERS'
  const [searchTerm, setSearchTerm] = useState('');
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [tcSearchTerm, setTcSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'OUT_OF_STOCK' | 'INACTIVE'
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [stockSortBy, setStockSortBy] = useState('productName');
  const [stockSortOrder, setStockSortOrder] = useState('asc');
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  const showToast = (msg) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(''), 4000);
  };

  // 1. Fetch Distributor Dashboard Data (Scoped to their branch)
  const { data: dashboardData, isLoading, refetch } = useQuery({
    queryKey: ['distributor-stock-dashboard', selectedBranchId],
    queryFn: async () => {
      const res = await apiClient.get('/dashboard');
      return res.data?.data;
    }
  });

  // Stock Active / Inactive / Out-of-Stock toggle mutation
  const toggleStockStatusMutation = useMutation({
    mutationFn: async ({ id, productId, currentActive }) => {
      try {
        const res = await apiClient.patch(`/inventory/${id}/toggle-status`, {
          isActive: !currentActive,
          isOutOfStockNote: currentActive ? true : false,
          syncProduct: true
        });
        return res.data;
      } catch (err) {
        if (productId) {
          const res = await apiClient.patch(`/products/${productId}`, {
            isActive: !currentActive
          });
          return res.data;
        }
        throw err;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['distributor-stock-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      const newActive = !variables.currentActive;
      showToast(newActive ? '✓ Stock item marked Active & In-Stock' : '✓ Stock item marked as Inactive (Out of Stock Note)');
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to update stock status');
    }
  });

  if (isLoading) {
    return <Spinner size="lg" text="Loading Branch Portal Data..." className="py-24" />;
  }

  const kpis = dashboardData?.kpis || {};
  const stockItems = Array.isArray(dashboardData?.stockItems) ? dashboardData.stockItems : [];
  const telecallers = Array.isArray(dashboardData?.telecallers) ? dashboardData.telecallers : [];
  const orders = Array.isArray(dashboardData?.orders) ? dashboardData.orders : [];
  const branch = dashboardData?.branch || {};

  // 1. Filtered Stock Items
  const filteredStock = stockItems.filter((item) => {
    const matchesSearch =
      (item.productName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.sku || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoryFilter === 'ALL' || (item.category || '').toLowerCase() === categoryFilter.toLowerCase();
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && item.isActive !== false && item.availableQuantity > 0) ||
      (statusFilter === 'OUT_OF_STOCK' && (item.availableQuantity === 0 || item.isActive === false || item.isOutOfStock)) ||
      (statusFilter === 'INACTIVE' && item.isActive === false);

    const matchesDate = (() => {
      if (!dateRange.startDate && !dateRange.endDate) return true;
      const rawDate = item.updatedAt || item.createdAt || item.expiryDate;
      if (!rawDate) return true;
      const d = new Date(rawDate).toISOString().slice(0, 10);
      if (dateRange.startDate && d < dateRange.startDate) return false;
      if (dateRange.endDate && d > dateRange.endDate) return false;
      return true;
    })();

    return matchesSearch && matchesCategory && matchesStatus && matchesDate;
  });

  const sortedStock = [...filteredStock].sort((a, b) => {
    let valA = a[stockSortBy];
    let valB = b[stockSortBy];
    if (stockSortBy === 'valuation') {
      valA = (a.availableQuantity || 0) * (a.price || 0);
      valB = (b.availableQuantity || 0) * (b.price || 0);
    } else if (stockSortBy === 'updatedAt' || stockSortBy === 'expiryDate') {
      valA = new Date(valA || 0).getTime();
      valB = new Date(valB || 0).getTime();
    }
    if (typeof valA === 'string') {
      return stockSortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return stockSortOrder === 'asc' ? (valA || 0) - (valB || 0) : (valB || 0) - (valA || 0);
  });

  // 2. Filtered Branch Orders (Total Sales)
  const filteredOrders = orders.filter((ord) => {
    const q = orderSearchTerm.toLowerCase();
    return (
      (ord.orderNumber || '').toLowerCase().includes(q) ||
      (ord.customerName || '').toLowerCase().includes(q) ||
      (ord.customerPhone || '').toLowerCase().includes(q) ||
      (ord.telecallerId?.name || '').toLowerCase().includes(q)
    );
  });

  // 3. Filtered Telecallers (Each Telecaller Sales)
  const filteredTelecallers = telecallers.filter((tc) => {
    const q = tcSearchTerm.toLowerCase();
    return (
      (tc.name || '').toLowerCase().includes(q) ||
      (tc.phone || '').toLowerCase().includes(q) ||
      (tc.email || '').toLowerCase().includes(q)
    );
  });

  // Export handlers
  const handleExportBranchStock = (format = 'excel') => {
    const rows = sortedStock.map((item, idx) => ({
      'S.No': idx + 1,
      'Product Name': item.productName || '—',
      'SKU': item.sku || '—',
      'Category': item.category || '—',
      'Unit Price (₹)': item.price || 0,
      'Available Stock': item.availableQuantity || 0,
      'Reorder Threshold': item.lowStockThreshold || 10,
      'Status': item.isOutOfStock ? 'Out of Stock' : item.isLowStock ? 'Low Stock' : 'In Stock',
      'Stock Valuation (₹)': ((item.availableQuantity || 0) * (item.price || 0)).toFixed(2)
    }));
    const filePrefix = `Shanthi_${branch.name ? branch.name.replace(/\s+/g, '_') : 'Branch'}_Stock`;
    if (format === 'excel') exportToExcel(rows, filePrefix, 'Stock_Ledger');
    else exportToCSV(rows, filePrefix);
    showToast(`✓ Exported ${rows.length} product stock records`);
  };

  const handleExportOrders = (format = 'excel') => {
    const rows = filteredOrders.map((ord, idx) => ({
      'S.No': idx + 1,
      'Order Number': ord.orderNumber || '—',
      'Customer Name': ord.customerName || '—',
      'Phone': ord.customerPhone || '—',
      'Telecaller': ord.telecallerId?.name || '—',
      'Payment Method': ord.paymentMethod || '—',
      'Status': ord.status || '—',
      'Total Amount (₹)': ord.grandTotal || 0,
      'Date': ord.createdAt ? new Date(ord.createdAt).toLocaleDateString() : '—'
    }));
    const filePrefix = `Shanthi_${branch.name ? branch.name.replace(/\s+/g, '_') : 'Branch'}_Sales`;
    if (format === 'excel') exportToExcel(rows, filePrefix, 'Branch_Sales');
    else exportToCSV(rows, filePrefix);
    showToast(`✓ Exported ${rows.length} branch sales orders`);
  };

  const handleExportTelecallerSales = (format = 'excel') => {
    const rows = filteredTelecallers.map((tc, idx) => ({
      'S.No': idx + 1,
      'Telecaller Name': tc.name || '—',
      'Phone': tc.phone || '—',
      'Email': tc.email || '—',
      'Assigned Leads': tc.assignedLeads || 0,
      'Orders Completed': tc.totalOrders || 0,
      'Total Sales (₹)': tc.totalSales || 0,
      'Avg Order Value (₹)': tc.totalOrders ? Math.round(tc.totalSales / tc.totalOrders) : 0,
      'Status': tc.isActive ? 'Active' : 'Inactive'
    }));
    const filePrefix = `Shanthi_${branch.name ? branch.name.replace(/\s+/g, '_') : 'Branch'}_Telecaller_Sales`;
    if (format === 'excel') exportToExcel(rows, filePrefix, 'TC_Sales');
    else exportToCSV(rows, filePrefix);
    showToast(`✓ Exported ${rows.length} telecaller performance records`);
  };

  const lowStockAlerts = stockItems.filter((i) => i.isLowStock || i.isOutOfStock);

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {actionSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {actionSuccessMsg}
        </div>
      )}

      {/* ── 1. DISTRIBUTOR BRANCH BANNER ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Branch Stock Distributor
              </span>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                🏢 {branch.name || 'Branch Warehouse'} ({branch.code || 'BR'})
              </span>
              {branch.phone && (
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" /> {branch.phone}
                </span>
              )}
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">
                📍 {branch.address?.city || 'Dispensary'} · {branch.address?.state || 'Tamil Nadu'}
              </span>
            </div>

            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>{branch.name ? `${branch.name} — Branch Distributor Desk` : 'Branch Distributor Portal'}</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Strictly scoped to your branch: Total Sales, Stocks Available, Telecaller Access & Each Telecaller Sales.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => refetch()}
              className="p-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors shadow-xs cursor-pointer"
              title="Refresh branch data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            {onSwitchToTelecaller && (
              <button
                id="btn-distributor-view-telecaller"
                type="button"
                onClick={() => onSwitchToTelecaller()}
                className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow transition-all flex items-center gap-1.5 cursor-pointer"
                title="View Telecaller Dashboard"
              >
                <span>🎧</span>
                <span>View Panel: Telecaller</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Branch Context Ribbon */}
        <div className="mt-4 flex items-center justify-between p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <span className="text-base">🏢</span>
            <span>
              Assigned Branch: <strong>{branch.name || 'Primary Branch'}</strong>
              {branch.code && <span className="text-slate-400 font-mono ml-1.5">[{branch.code}]</span>}
            </span>
          </div>
          <span className="text-emerald-700 font-bold hidden md:inline">Isolated Branch Scope Enforced</span>
        </div>
      </div>

      {/* ── 2. THE 4 CORE METRICS (Total Sales, Stocks Available, Telecaller Access, Each Telecaller Sales) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: TOTAL SALES */}
        <div
          onClick={() => setActiveTab('SALES')}
          className={`bento-card p-4 flex flex-col justify-between cursor-pointer transition-all hover:ring-2 hover:ring-indigo-400 ${
            activeTab === 'SALES' ? 'ring-2 ring-indigo-600 bg-indigo-50/20' : ''
          }`}
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">Total Sales</span>
            <ShoppingBag className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-950 font-mono mt-2">
            ₹{Math.round(kpis.branchRevenue || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center justify-between">
            <span>{kpis.branchOrdersCount || 0} Orders in branch</span>
            <span className="text-indigo-600 font-bold">View Sales →</span>
          </div>
        </div>

        {/* Metric 2: STOCKS AVAILABLE */}
        <div
          onClick={() => setActiveTab('STOCK')}
          className={`bento-card p-4 flex flex-col justify-between cursor-pointer transition-all hover:ring-2 hover:ring-emerald-400 ${
            activeTab === 'STOCK' ? 'ring-2 ring-emerald-600 bg-emerald-50/20' : ''
          }`}
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Stocks Available</span>
            <Package className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono mt-2">
            {kpis.totalStockUnits?.toLocaleString() || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center justify-between">
            <span>₹{Math.round(kpis.inventoryValuation || 0).toLocaleString()} value</span>
            <span className="text-emerald-600 font-bold">View Stock →</span>
          </div>
        </div>

        {/* Metric 3: TELECALLER ACCESS */}
        <div
          onClick={() => setActiveTab('TELECALLERS')}
          className={`bento-card p-4 flex flex-col justify-between cursor-pointer transition-all hover:ring-2 hover:ring-teal-400 ${
            activeTab === 'TELECALLERS' ? 'ring-2 ring-teal-600 bg-teal-50/20' : ''
          }`}
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700">Telecaller Access</span>
            <Users className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-teal-950 font-mono mt-2">
            {kpis.telecallerCount || telecallers.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center justify-between">
            <span>Active branch agents</span>
            <span className="text-teal-600 font-bold">View Team →</span>
          </div>
        </div>

        {/* Metric 4: EACH TELECALLER SALES */}
        <div
          onClick={() => setActiveTab('TELECALLERS')}
          className={`bento-card p-4 flex flex-col justify-between cursor-pointer transition-all hover:ring-2 hover:ring-amber-400 ${
            activeTab === 'TELECALLERS' ? 'ring-2 ring-amber-600 bg-amber-50/20' : ''
          }`}
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Top Telecaller Sales</span>
            <TrendingUp className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-900 font-mono mt-2">
            ₹{Math.round(kpis.topTelecallerSales || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 truncate">
            Top: <strong>{kpis.topTelecallerName || '—'}</strong>
          </div>
        </div>
      </div>

      {/* ── 3. SUB-NAV TABS (The 3 Dedicated Sections) ── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 pt-3.5 border-b border-slate-200 bg-slate-50/50">
          {[
            { id: 'STOCK', label: '📦 Stocks Available', count: stockItems.length },
            { id: 'SALES', label: '💰 Total Sales & Orders', count: orders.length },
            { id: 'TELECALLERS', label: '👥 Telecaller Team & Each Sales', count: telecallers.length }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 -mb-px flex items-center gap-2 cursor-pointer ${
                activeTab === tab.id
                  ? 'border-emerald-600 text-emerald-800 bg-white shadow-xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
              }`}
            >
              <span>{tab.label}</span>
              <span className="px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold bg-slate-200 text-slate-700">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* ── TAB 1: STOCKS AVAILABLE ── */}
        {activeTab === 'STOCK' && (
          <div className="p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by product name or SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <DateRangeFilter
                  startDate={dateRange.startDate}
                  endDate={dateRange.endDate}
                  onChange={setDateRange}
                  label="Stock Date"
                />

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                  {[
                    { id: 'ALL', label: 'All Stock' },
                    { id: 'ACTIVE', label: 'Active' },
                    { id: 'OUT_OF_STOCK', label: 'Out of Stock' },
                    { id: 'INACTIVE', label: 'Inactive' }
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setStatusFilter(st.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                        statusFilter === st.id
                          ? 'bg-white text-slate-900 shadow-2xs font-bold'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>

                <SortDropdown
                  options={DISTRIBUTOR_SORT_OPTIONS}
                  sortBy={stockSortBy}
                  sortOrder={stockSortOrder}
                  onSortChange={(field, order) => {
                    setStockSortBy(field);
                    setStockSortOrder(order);
                  }}
                />

                <ExportButton
                  onExport={handleExportBranchStock}
                  label="Export Stock"
                />

                <div className="text-xs text-slate-500 font-medium pl-1">
                  <strong className="text-slate-800">{sortedStock.length}</strong> products
                </div>
              </div>
            </div>

            {/* Stocks Table with inline scroll */}
            <div className={`overflow-x-auto overflow-y-auto border border-slate-200 rounded-xl relative scrollbar-thin ${sortedStock.length > 10 ? 'max-h-[520px]' : ''}`}>
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 shadow-2xs">
                  <tr>
                    <th className="py-3 px-4">Product & SKU</th>
                    <th className="py-3 px-3">Unit Price</th>
                    <th className="py-3 px-3 text-center">Available Stock</th>
                    <th className="py-3 px-3 text-center">Threshold</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-right">Valuation</th>
                    <th className="py-3 px-4 text-right">Stock Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedStock.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                        No products found matching filters.
                      </td>
                    </tr>
                  ) : (
                    sortedStock.map((item) => (
                      <tr key={item._id} className={`transition-colors ${item.isActive === false ? 'bg-slate-50/70 opacity-80' : 'hover:bg-slate-50/60'}`}>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{item.productName}</span>
                            {item.isActive === false && (
                              <span className="px-1.5 py-0.2 bg-rose-100 text-rose-700 text-[10px] font-bold rounded">
                                Out of Stock Note
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{item.sku}</div>
                        </td>
                        <td className="py-3 px-3 font-mono font-semibold text-slate-800">
                          ₹{item.price}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-lg font-mono font-bold text-xs ${
                            item.availableQuantity === 0 || item.isActive === false
                              ? 'bg-rose-100 text-rose-800'
                              : item.isLowStock
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {item.availableQuantity} units
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-slate-500">
                          {item.lowStockThreshold}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {item.isActive === false ? (
                            <Badge variant="neutral" size="sm" className="bg-slate-100 text-slate-700 border border-slate-300 font-bold">
                              ○ Inactive
                            </Badge>
                          ) : item.availableQuantity === 0 ? (
                            <Badge variant="danger" size="sm">
                              ● Out of Stock
                            </Badge>
                          ) : item.isLowStock ? (
                            <Badge variant="warning" size="sm">
                              ● Low Stock
                            </Badge>
                          ) : (
                            <Badge variant="emerald" size="sm">
                              ● In Stock
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                          ₹{Math.round(item.stockValue || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              toggleStockStatusMutation.mutate({
                                id: item._id,
                                productId: item.productId,
                                currentActive: item.isActive !== false
                              })
                            }
                            disabled={toggleStockStatusMutation.isPending}
                            title={
                              item.isActive !== false
                                ? 'Click to note as Inactive / Out of Stock'
                                : 'Click to activate stock'
                            }
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer select-none shadow-2xs ${
                              item.isActive !== false
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300'
                                : 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300'
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                item.isActive !== false ? 'bg-emerald-500' : 'bg-rose-500'
                              }`}
                            />
                            <span>{item.isActive !== false ? 'Active' : 'Inactive'}</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 2: TOTAL SALES & ORDERS ── */}
        {activeTab === 'SALES' && (
          <div className="p-4 sm:p-5 space-y-4">
            {/* Sales Summary Banner */}
            <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-indigo-700" />
                  Branch Total Sales Summary
                </h4>
                <p className="text-[11px] text-indigo-700 mt-0.5">
                  Lifetime Revenue: <strong className="font-mono text-indigo-950">₹{Math.round(kpis.branchRevenue || 0).toLocaleString()}</strong> across <strong className="font-mono text-indigo-950">{kpis.branchOrdersCount || orders.length}</strong> orders.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <ExportButton
                  onExport={handleExportOrders}
                  label="Export Orders"
                />
              </div>
            </div>

            {/* Orders Search */}
            <div className="relative max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search orders by number, customer name, phone, telecaller..."
                value={orderSearchTerm}
                onChange={(e) => setOrderSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            {/* Orders Table with inline scroll */}
            <div className={`overflow-x-auto overflow-y-auto border border-slate-200 rounded-xl relative scrollbar-thin ${filteredOrders.length > 10 ? 'max-h-[520px]' : ''}`}>
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 shadow-2xs">
                  <tr>
                    <th className="py-3 px-4">Order #</th>
                    <th className="py-3 px-3">Customer</th>
                    <th className="py-3 px-3">Telecaller</th>
                    <th className="py-3 px-3">Payment</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-right">Total Amount</th>
                    <th className="py-3 px-4 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                        No orders recorded for this branch yet.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((ord) => (
                      <tr key={ord._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {ord.orderNumber}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-800">{ord.customerName || '—'}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{ord.customerPhone || '—'}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-700">
                          {ord.telecallerId?.name ? (
                            <span className="inline-flex items-center gap-1 font-medium">
                              🎧 {ord.telecallerId.name}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">
                          {ord.paymentMethod || 'COD'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <Badge
                            variant={
                              ord.status === 'DELIVERED'
                                ? 'emerald'
                                : ord.status === 'CANCELLED'
                                ? 'danger'
                                : ord.status === 'DISPATCHED'
                                ? 'info'
                                : 'neutral'
                            }
                            size="sm"
                          >
                            {ord.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                          ₹{Math.round(ord.grandTotal || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-[11px] text-slate-500 font-mono">
                          {ord.createdAt ? new Date(ord.createdAt).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 3: TELECALLER TEAM & EACH TELECALLER SALES ── */}
        {activeTab === 'TELECALLERS' && (
          <div className="p-4 sm:p-5 space-y-4">
            {/* Header / Export */}
            <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-teal-700" />
                  Branch Telecallers Performance & Sales Breakdown
                </h4>
                <p className="text-[11px] text-teal-700 mt-0.5">
                  Each telecaller sales for {branch.name || 'this branch'}. Click <strong>Open Telecaller Desk</strong> to inspect their console.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <ExportButton
                  onExport={handleExportTelecallerSales}
                  label="Export TC Sales"
                />
              </div>
            </div>

            {/* Filter Search */}
            <div className="relative max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search telecallers by name, phone, or email..."
                value={tcSearchTerm}
                onChange={(e) => setTcSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white"
              />
            </div>

            {/* Telecallers Table with inline scroll */}
            <div className={`overflow-x-auto overflow-y-auto border border-slate-200 rounded-xl relative scrollbar-thin ${filteredTelecallers.length > 10 ? 'max-h-[520px]' : ''}`}>
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 shadow-2xs">
                  <tr>
                    <th className="py-3 px-4">Telecaller Agent</th>
                    <th className="py-3 px-3">Contact</th>
                    <th className="py-3 px-3 text-center">Assigned Leads</th>
                    <th className="py-3 px-3 text-center">Orders Closed</th>
                    <th className="py-3 px-3 text-right">Total Sales</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Telecaller Access</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTelecallers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                        No telecallers assigned to this branch yet.
                      </td>
                    </tr>
                  ) : (
                    filteredTelecallers.map((tc) => (
                      <tr key={tc._id || tc.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span className="w-7 h-7 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs shrink-0">
                              {(tc.name || 'T')[0].toUpperCase()}
                            </span>
                            <span>{tc.name || 'Telecaller'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-mono text-slate-800 text-[11px]">{tc.phone || '—'}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{tc.email || '—'}</div>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-semibold text-slate-700">
                          {tc.assignedLeads || 0}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-semibold text-slate-700">
                          {tc.totalOrders || 0}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-emerald-800">
                          ₹{Math.round(tc.totalSales || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <Badge variant={tc.isActive !== false ? 'emerald' : 'neutral'} size="sm">
                            {tc.isActive !== false ? '● Active' : '○ Inactive'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {onSwitchToTelecaller && (
                            <button
                              type="button"
                              onClick={() => onSwitchToTelecaller(tc)}
                              className="px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ml-auto cursor-pointer"
                              title={`Open Telecaller Dashboard for ${tc.name}`}
                            >
                              <span>🎧</span>
                              <span>Open Desk</span>
                              <ExternalLink className="w-3 h-3 text-teal-600" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DistributorStockDashboardView;
