import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package,
  Layers,
  Send,
  AlertTriangle,
  ArrowRight,
  Plus,
  RefreshCw,
  Building,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  TrendingDown,
  Warehouse,
  ShieldCheck,
  Phone
} from 'lucide-react';
import apiClient from '../../api/apiClient.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useBranch } from '../../context/BranchContext.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Modal } from '../../components/common/Modal.jsx';
import { Input } from '../../components/common/Input.jsx';
import { Select } from '../../components/common/Select.jsx';
import { Spinner } from '../../components/common/Spinner.jsx';
import { exportToExcel, exportToCSV } from '../../utils/exportUtils.js';
import { ExportButton } from '../../components/common/ExportButton.jsx';
import { SortDropdown } from '../../components/common/SortDropdown.jsx';

const DISTRIBUTOR_SORT_OPTIONS = [
  { value: 'productName', label: '📦 Product Name' },
  { value: 'availableQuantity', label: '📊 Available Stock' },
  { value: 'price', label: '💰 Unit Price' },
  { value: 'valuation', label: '💎 Stock Valuation' }
];

export function DistributorStockDashboardView({ onSwitchToManagerView }) {
  const { user } = useAuth();
  const { selectedBranchId, selectBranch } = useBranch();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('STOCK'); // 'STOCK' | 'TRANSFERS' | 'ALERTS'
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [stockSortBy, setStockSortBy] = useState('productName');
  const [stockSortOrder, setStockSortOrder] = useState('asc');
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  const [transferForm, setTransferForm] = useState({
    fromBranchId: '',
    productId: '',
    quantity: '50',
    notes: 'Urgent stock refill for branch distribution'
  });

  const showToast = (msg) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(''), 4000);
  };

  // 1. Fetch Distributor Dashboard Data
  const { data: dashboardData, isLoading, refetch } = useQuery({
    queryKey: ['distributor-stock-dashboard', selectedBranchId],
    queryFn: async () => {
      const res = await apiClient.get('/dashboard');
      return res.data?.data;
    }
  });

  // 2. Fetch Branches for transfer destination/source
  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await apiClient.get('/branches');
      return res.data?.data || [];
    }
  });
  const allBranches = branchesData || [];

  // 3. Fetch Products for transfer request
  const { data: productsData } = useQuery({
    queryKey: ['products-catalog-distributor'],
    queryFn: async () => {
      const res = await apiClient.get('/products');
      return res.data?.data || [];
    }
  });
  const products = productsData || [];

  // Transfer Request Mutation
  const requestTransferMutation = useMutation({
    mutationFn: (data) =>
      apiClient.post('/inventory/transfers', {
        fromBranchId: data.fromBranchId,
        toBranchId: branch?._id || selectedBranchId,
        items: [
          {
            productId: data.productId,
            quantity: Number(data.quantity)
          }
        ],
        notes: data.notes
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(['distributor-stock-dashboard']);
      setIsRequestModalOpen(false);
      setTransferForm({
        fromBranchId: '',
        productId: '',
        quantity: '50',
        notes: 'Urgent stock refill for branch distribution'
      });
      showToast('✓ Stock replenishment request submitted successfully');
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to submit stock request');
    }
  });

  if (isLoading) {
    return <Spinner size="lg" text="Loading Branch Stock Inventory..." className="py-24" />;
  }

  const kpis = dashboardData?.kpis || {};
  const stockItems = dashboardData?.stockItems || [];
  const transfers = dashboardData?.transfers || [];
  const branch = dashboardData?.branch || {};

  // Filtered Stock Items
  const filteredStock = stockItems.filter((item) => {
    const matchesSearch =
      (item.productName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.sku || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoryFilter === 'ALL' || (item.category || '').toLowerCase() === categoryFilter.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const sortedStock = [...filteredStock].sort((a, b) => {
    let valA = a[stockSortBy];
    let valB = b[stockSortBy];
    if (stockSortBy === 'valuation') {
      valA = (a.availableQuantity || 0) * (a.price || 0);
      valB = (b.availableQuantity || 0) * (b.price || 0);
    }
    if (typeof valA === 'string') {
      return stockSortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return stockSortOrder === 'asc' ? (valA || 0) - (valB || 0) : (valB || 0) - (valA || 0);
  });

  const handleExportBranchStock = (format = 'excel') => {
    const rows = sortedStock.map((item, idx) => ({
      'S.No': idx + 1,
      'Product Name': item.productName || '—',
      'SKU': item.sku || '—',
      'Category': item.category || '—',
      'Batch Number': item.batchNumber || '—',
      'Expiry Date': item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('en-GB') : 'Dec 2027',
      'Unit Price (₹)': item.price || 0,
      'Available Stock': item.availableQuantity || 0,
      'Reorder Threshold': item.lowStockThreshold || 10,
      'Status': item.isOutOfStock ? 'Out of Stock' : item.isLowStock ? 'Low Stock' : 'Optimal',
      'Stock Valuation (₹)': ((item.availableQuantity || 0) * (item.price || 0)).toFixed(2)
    }));

    const filePrefix = `Shanthi_${branch.name ? branch.name.replace(/\s+/g, '_') : 'Branch'}_Stock`;
    if (format === 'excel') exportToExcel(rows, filePrefix, 'Branch_Stock');
    else exportToCSV(rows, filePrefix);
    showToast(`✓ Exported ${rows.length} product stock records`);
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

      {/* ── 1. DISTRIBUTOR BRANCH STOCK BANNER ── */}
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
              <span>{branch.name ? `${branch.name} — Stock Control Desk` : 'Branch Stock & Inventory Portal'}</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Live warehouse ledger, stock allocations, batch numbers, and stock replenishment transfers.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="primary"
              icon={Plus}
              onClick={() => setIsRequestModalOpen(true)}
              className="bg-emerald-700 hover:bg-emerald-800 text-xs font-bold shadow-sm"
            >
              Request Stock Refill
            </Button>
            <button
              type="button"
              onClick={() => refetch()}
              className="p-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors shadow-xs"
              title="Refresh stock ledger"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            {onSwitchToManagerView && (
              <button
                type="button"
                onClick={onSwitchToManagerView}
                className="px-3.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
              >
                Manager View →
              </button>
            )}
          </div>
        </div>

        {/* Manager Sync Notice */}
        <div className="mt-4 flex items-center justify-between p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <span className="text-base">👔</span>
            <span>
              Assigned Branch Manager: <strong>{branch.managerName || branch.managerId?.name || 'Manager Assigned'}</strong>
              {branch.managerPhone && <span className="text-slate-400 font-mono ml-1.5">({branch.managerPhone})</span>}
            </span>
          </div>
          <span className="text-emerald-700 font-bold hidden md:inline">Synchronized with Orders Desk</span>
        </div>
      </div>

      {/* ── 2. STOCK METRICS RIBBON (5 Bento Cards) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bento-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Available Stock</span>
            <Package className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono mt-2">
            {kpis.totalStockUnits?.toLocaleString() || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Total units across all products</div>
        </div>

        <div className="bento-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Stock Valuation</span>
            <Warehouse className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-900 font-mono mt-2">
            ₹{Math.round(kpis.inventoryValuation || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Asset value at retail base</div>
        </div>

        <div className="bento-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Low Stock Alerts</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700 font-mono mt-2">
            {kpis.lowStockCount || 0}
          </div>
          <div className="text-[11px] text-amber-600 mt-0.5 font-medium">Under reorder threshold</div>
        </div>

        <div className="bento-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Out of Stock</span>
            <TrendingDown className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-700 font-mono mt-2">
            {kpis.outOfStockCount || 0}
          </div>
          <div className="text-[11px] text-rose-600 mt-0.5 font-medium">Critical refill required</div>
        </div>

        <div className="bento-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pending Inflow</span>
            <Send className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-700 font-mono mt-2">
            {kpis.pendingTransfersCount || 0}
          </div>
          <div className="text-[11px] text-purple-600 mt-0.5 font-medium">Inbound transfer orders</div>
        </div>
      </div>

      {/* ── 3. SUB-NAV TABS (Stock Ledger, Transfers, Low-Stock Warnings) ── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 pt-3.5 border-b border-slate-200 bg-slate-50/50">
          {[
            { id: 'STOCK', label: '📦 Branch Stock Ledger', count: stockItems.length },
            { id: 'TRANSFERS', label: '🚚 Stock Transfers & Shipments', count: transfers.length },
            { id: 'ALERTS', label: '⚠️ Replenishment Warnings', count: lowStockAlerts.length, badgeColor: 'bg-amber-100 text-amber-800' }
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
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold ${tab.badgeColor || 'bg-slate-200 text-slate-700'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Tab 1: STOCK LEDGER */}
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
                {/* Sort Dropdown */}
                <SortDropdown
                  options={DISTRIBUTOR_SORT_OPTIONS}
                  sortBy={stockSortBy}
                  sortOrder={stockSortOrder}
                  onSortChange={(field, order) => {
                    setStockSortBy(field);
                    setStockSortOrder(order);
                  }}
                />

                {/* Export Button */}
                <ExportButton
                  onExport={handleExportBranchStock}
                  label="Export Stock"
                />

                <div className="text-xs text-slate-500 font-medium pl-1">
                  <strong className="text-slate-800">{sortedStock.length}</strong> products
                </div>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <th className="py-3 px-4">Product & SKU</th>
                    <th className="py-3 px-3">Batch & Expiry</th>
                    <th className="py-3 px-3">Unit Price</th>
                    <th className="py-3 px-3 text-center">Available Stock</th>
                    <th className="py-3 px-3 text-center">Threshold</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-right">Valuation</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedStock.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                        No products found matching filters.
                      </td>
                    </tr>
                  ) : (
                    sortedStock.map((item) => (
                      <tr key={item._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{item.productName}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{item.sku}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-mono text-slate-700 font-semibold">{item.batchNumber}</div>
                          <div className="text-[10px] text-slate-400">
                            {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'Dec 2027'}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono font-semibold text-slate-800">
                          ₹{item.price}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-lg font-mono font-bold text-xs ${
                            item.availableQuantity === 0
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
                          <Badge
                            variant={
                              item.availableQuantity === 0
                                ? 'danger'
                                : item.isLowStock
                                ? 'warning'
                                : 'emerald'
                            }
                            size="sm"
                          >
                            {item.availableQuantity === 0
                              ? 'Out of Stock'
                              : item.isLowStock
                              ? 'Low Stock'
                              : 'In Stock'}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                          ₹{Math.round(item.stockValue || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setTransferForm((prev) => ({
                                ...prev,
                                productId: item.productId || ''
                              }));
                              setIsRequestModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                          >
                            Refill +
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

        {/* Tab 2: STOCK TRANSFERS */}
        {activeTab === 'TRANSFERS' && (
          <div className="p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Inter-Branch & Warehouse Stock Transfers</h3>
                <p className="text-xs text-slate-500">
                  Track incoming replenishment shipments from central fulfillment hubs to this branch.
                </p>
              </div>
              <Button variant="primary" icon={Plus} size="sm" onClick={() => setIsRequestModalOpen(true)}>
                New Request
              </Button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <th className="py-3 px-4">Transfer #</th>
                    <th className="py-3 px-3">From (Source)</th>
                    <th className="py-3 px-3">To (Destination)</th>
                    <th className="py-3 px-3">Items Count</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3">Tracking / Note</th>
                    <th className="py-3 px-4 text-right">Created Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transfers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                        No transfer records for this branch yet.
                      </td>
                    </tr>
                  ) : (
                    transfers.map((t) => (
                      <tr key={t._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {t.transferNumber}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-slate-800">{t.fromBranchId?.name || 'Central Hub'}</span>
                          <span className="text-[10px] text-slate-400 font-mono ml-1">({t.fromBranchId?.code || 'MAIN'})</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-emerald-800">{t.toBranchId?.name || branch.name}</span>
                          <span className="text-[10px] text-emerald-600 font-mono ml-1">({t.toBranchId?.code || branch.code})</span>
                        </td>
                        <td className="py-3 px-3 font-mono font-semibold">
                          {t.items?.reduce((acc, curr) => acc + (curr.quantity || 0), 0) || 0} units
                        </td>
                        <td className="py-3 px-3 text-center">
                          <Badge
                            variant={
                              t.status === 'COMPLETED'
                                ? 'emerald'
                                : t.status === 'IN_TRANSIT'
                                ? 'primary'
                                : t.status === 'CANCELLED'
                                ? 'danger'
                                : 'warning'
                            }
                            size="sm"
                          >
                            {t.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-slate-500">
                          {t.trackingNumber ? (
                            <span className="font-mono text-[11px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                              🚚 {t.trackingNumber}
                            </span>
                          ) : (
                            t.notes || '—'
                          )}
                        </td>
                        <td className="py-3 px-4 text-right text-[11px] text-slate-400 font-mono">
                          {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: LOW STOCK WARNINGS */}
        {activeTab === 'ALERTS' && (
          <div className="p-4 sm:p-5 space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-amber-900">
                    {lowStockAlerts.length} Products Require Stock Replenishment
                  </h4>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Stock level is below threshold or depleted. Click 'Refill Stock' to dispatch a replenishment request.
                  </p>
                </div>
              </div>
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={() => setIsRequestModalOpen(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                Bulk Request
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {lowStockAlerts.map((item) => (
                <div key={item._id} className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h5 className="font-bold text-slate-900 text-xs">{item.productName}</h5>
                      <span className="font-mono text-[10px] text-slate-400">{item.sku}</span>
                    </div>
                    <Badge variant={item.availableQuantity === 0 ? 'danger' : 'warning'} size="sm">
                      {item.availableQuantity === 0 ? 'Out of Stock' : `${item.availableQuantity} Left`}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                    <span className="text-slate-500">Threshold: <strong className="font-mono text-slate-800">{item.lowStockThreshold}</strong></span>
                    <button
                      type="button"
                      onClick={() => {
                        setTransferForm((prev) => ({
                          ...prev,
                          productId: item.productId || ''
                        }));
                        setIsRequestModalOpen(true);
                      }}
                      className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200"
                    >
                      Refill Stock →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── REQUEST STOCK REFILL MODAL ── */}
      <Modal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        title="Request Branch Stock Refill"
        subtitle={`Request inventory transfer into ${branch.name || 'Branch'}`}
        maxWidth="max-w-md"
        icon="📦"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!transferForm.fromBranchId || !transferForm.productId) {
              alert('Please select both source warehouse and product');
              return;
            }
            requestTransferMutation.mutate(transferForm);
          }}
          className="space-y-4"
        >
          <Select
            label="Source Warehouse / Branch *"
            required
            value={transferForm.fromBranchId}
            onChange={(e) => setTransferForm({ ...transferForm, fromBranchId: e.target.value })}
            options={[
              { value: '', label: '— Select Source Hub —' },
              ...allBranches
                .filter((b) => (b._id || b.id) !== (branch._id || selectedBranchId))
                .map((b) => ({
                  value: b._id || b.id,
                  label: `${b.name} (${b.code})`
                }))
            ]}
          />

          <Select
            label="Product to Replenish *"
            required
            value={transferForm.productId}
            onChange={(e) => setTransferForm({ ...transferForm, productId: e.target.value })}
            options={[
              { value: '', label: '— Select Product —' },
              ...products.map((p) => ({
                value: p._id || p.id,
                label: `${p.name} (${p.sku})`
              }))
            ]}
          />

          <Input
            label="Requested Quantity (Units) *"
            type="number"
            min="1"
            required
            value={transferForm.quantity}
            onChange={(e) => setTransferForm({ ...transferForm, quantity: e.target.value })}
          />

          <Input
            label="Notes / Urgency"
            placeholder="e.g. Low stock for upcoming festival campaign"
            value={transferForm.notes}
            onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="secondary" type="button" onClick={() => setIsRequestModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={requestTransferMutation.isPending}>
              Submit Stock Request
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default DistributorStockDashboardView;
