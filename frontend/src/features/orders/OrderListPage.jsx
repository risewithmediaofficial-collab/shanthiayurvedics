import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  Eye,
  ShoppingBag,
  Package,
  Loader2,
  Trash2,
  AlertTriangle,
  FileSpreadsheet,
  Scan,
  Download,
  Phone,
  MessageSquare,
  Clock,
  MapPin,
  Zap,
  CheckCircle2
} from 'lucide-react';
import apiClient from '../../api/apiClient.js';
import { usePermissions } from '../../hooks/usePermissions.js';
import { useBranch } from '../../context/BranchContext.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { Pagination } from '../../components/common/Pagination.jsx';
import { OrderCreateModal } from './OrderCreateModal.jsx';
import { PrintableInvoiceModal } from './PrintableInvoiceModal.jsx';
import { PrintableShippingLabelModal } from './PrintableShippingLabelModal.jsx';
import { ExcelImportModal } from './ExcelImportModal.jsx';
import { ExcelExportModal } from './ExcelExportModal.jsx';
import { BarcodeScanStationModal } from './BarcodeScanStationModal.jsx';
import { IndiaPostModuleModal } from './IndiaPostModuleModal.jsx';
import { BulkShippingLabelsModal } from './BulkShippingLabelsModal.jsx';

// Status styling configuration
const STATUS_META = {
  NEW:                { label: 'New',               badge: 'primary',  bg: 'bg-blue-50 text-blue-700 border-blue-200' },
  CONFIRMED:          { label: 'Confirmed',         badge: 'info',     bg: 'bg-sky-50 text-sky-700 border-sky-200' },
  PROCESSING:         { label: 'Processing',        badge: 'warning',  bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  READY_FOR_PACKING:  { label: 'Ready for Packing', badge: 'warning',  bg: 'bg-orange-50 text-orange-700 border-orange-200' },
  PACKED:             { label: 'Packed',            badge: 'purple',   bg: 'bg-purple-50 text-purple-700 border-purple-200' },
  READY_FOR_DISPATCH: { label: 'Ready to Dispatch', badge: 'info',     bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  DISPATCHED:         { label: 'Shipped',           badge: 'info',     bg: 'bg-blue-50 text-blue-700 border-blue-200' },
  IN_TRANSIT:         { label: 'In Transit',        badge: 'info',     bg: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  OUT_FOR_DELIVERY:   { label: 'Out for Delivery',  badge: 'primary',  bg: 'bg-violet-50 text-violet-700 border-violet-200' },
  DELIVERED:          { label: 'Delivered',         badge: 'emerald',  bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  DELIVERY_FAILED:    { label: 'Delivery Failed',   badge: 'danger',   bg: 'bg-rose-50 text-rose-700 border-rose-200' },
  RTO:                { label: 'RTO Return',        badge: 'danger',   bg: 'bg-red-50 text-red-700 border-red-200' },
  CANCELLED:          { label: 'Cancelled',         badge: 'neutral',  bg: 'bg-slate-100 text-slate-600 border-slate-200' },
};

export function OrderListPage({ hideHeader = false }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { hasPermission, isOwner, isManager, role } = usePermissions();
  const { selectedBranchId } = useBranch();

  // Filters & State
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [districtFilter, setDistrictFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [viewMode, setViewMode] = useState('card'); // 'card' | 'full'

  // Multi-Selection State
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [bulkStatusToApply, setBulkStatusToApply] = useState('');
  const [forceRevertChecked, setForceRevertChecked] = useState(false);
  const [assignVerifierId, setAssignVerifierId] = useState('');

  // Modals State
  const [createModalOpen, setCreateModalOpen] = useState(searchParams.get('new') === 'true');
  const [excelImportOpen, setExcelImportOpen] = useState(false);
  const [excelExportOpen, setExcelExportOpen] = useState(false);
  const [scanStationOpen, setScanStationOpen] = useState(false);
  const [indiaPostModalOpen, setIndiaPostModalOpen] = useState(false);
  const [bulkLabelsModalOpen, setBulkLabelsModalOpen] = useState(false);

  // Single order action modals
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState(null);
  const [selectedOrderForLabel, setSelectedOrderForLabel] = useState(null);
  const [selectedOrderForDelete, setSelectedOrderForDelete] = useState(null);

  // Notification Toast
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  // Fetch Live Metrics Summary for Top Ribbon
  const { data: metricsResponse, refetch: refetchMetrics } = useQuery({
    queryKey: ['order-metrics-summary', selectedBranchId],
    queryFn: async () => {
      const res = await apiClient.get('/orders/metrics-summary');
      return res.data?.data || {};
    },
    refetchInterval: 15000
  });

  // Fetch Distinct Districts for Filter
  const { data: districtsResponse } = useQuery({
    queryKey: ['order-districts'],
    queryFn: async () => {
      const res = await apiClient.get('/orders/districts');
      return res.data?.data || [];
    }
  });

  // Fetch Telecallers for Assignment Dropdown
  const { data: telecallersResponse } = useQuery({
    queryKey: ['active-telecallers', selectedBranchId],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/users', { params: { role: 'TELECALLER' } });
        return res.data?.data || [];
      } catch (e) {
        return [];
      }
    }
  });

  // Fetch Paginated Orders
  const { data: ordersResponse, isLoading, refetch: refetchOrders } = useQuery({
    queryKey: ['orders', page, search, statusFilter, districtFilter, dateFilter, selectedBranchId],
    queryFn: async () => {
      const params = { page, limit: 15 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (districtFilter) params.district = districtFilter;
      if (dateFilter) {
        params.startDate = dateFilter;
        params.endDate = dateFilter;
      }
      const res = await apiClient.get('/orders', { params });
      return res.data;
    }
  });

  const orders = ordersResponse?.data || [];
  const meta = ordersResponse?.pagination || { page: 1, totalPages: 1, total: 0, totalRevenue: 0 };
  const districts = districtsResponse || [];
  const telecallers = telecallersResponse || [];
  const metrics = metricsResponse || {};

  // Bulk Status Update Mutation
  const bulkStatusMutation = useMutation({
    mutationFn: ({ orderIds, status, forceRevert }) =>
      apiClient.patch('/orders/bulk-status', { orderIds, status, forceRevert }),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['orders']);
      refetchMetrics();
      setSelectedOrderIds([]);
      showToast(`✓ Bulk updated status to ${bulkStatusToApply}`);
    },
    onError: (err) => {
      showToast(`⚠️ ${err?.response?.data?.message || 'Bulk transition failed'}`);
    }
  });

  // Bulk Assign Verification Mutation
  const bulkAssignMutation = useMutation({
    mutationFn: ({ orderIds, telecallerId }) =>
      apiClient.patch('/orders/bulk-assign', { orderIds, telecallerId }),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['orders']);
      setSelectedOrderIds([]);
      showToast('✓ Selected orders assigned to telecaller for verification');
    },
    onError: (err) => {
      showToast(`⚠️ ${err?.response?.data?.message || 'Assignment failed'}`);
    }
  });

  // Bulk Verify Mutation
  const bulkVerifyMutation = useMutation({
    mutationFn: ({ orderIds }) => apiClient.patch('/orders/bulk-verify', { orderIds }),
    onSuccess: () => {
      queryClient.invalidateQueries(['orders']);
      refetchMetrics();
      setSelectedOrderIds([]);
      showToast('✓ Selected orders marked as verified & confirmed');
    },
    onError: (err) => {
      showToast(`⚠️ ${err?.response?.data?.message || 'Verification failed'}`);
    }
  });

  // Auto Dispatch Mutation
  const autoDispatchMutation = useMutation({
    mutationFn: () => apiClient.post('/orders/auto-dispatch'),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['orders']);
      refetchMetrics();
      showToast(`✓ ${res.data?.data?.count || 0} packed orders auto-dispatched successfully!`);
    },
    onError: (err) => {
      showToast(`⚠️ ${err?.response?.data?.message || 'Auto dispatch failed'}`);
    }
  });

  // Single Order Status Transition
  const singleTransitionMutation = useMutation({
    mutationFn: ({ orderId, status, forceRevert }) =>
      apiClient.patch(`/orders/${orderId}/transition`, { status, forceRevert }),
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries(['orders']);
      refetchMetrics();
      showToast(`✓ Order status updated to ${STATUS_META[status]?.label || status}`);
    },
    onError: (err) => {
      showToast(`⚠️ ${err?.response?.data?.message || 'Status transition failed'}`);
    }
  });

  // Delete Order Mutation
  const deleteMutation = useMutation({
    mutationFn: (orderId) => apiClient.delete(`/orders/${orderId}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['orders']);
      refetchMetrics();
      setSelectedOrderForDelete(null);
      showToast('✓ Order deleted and stock released');
    },
    onError: (err) => {
      showToast(`⚠️ ${err?.response?.data?.message || 'Failed to delete order'}`);
    }
  });

  // Selection toggles
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedOrderIds(orders.map((o) => o._id));
    } else {
      setSelectedOrderIds([]);
    }
  };

  const handleToggleSelectOrder = (id) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleApplyBulkStatus = () => {
    if (!bulkStatusToApply) return;
    if (selectedOrderIds.length === 0) {
      showToast('⚠️ Please select at least one order to update');
      return;
    }
    bulkStatusMutation.mutate({
      orderIds: selectedOrderIds,
      status: bulkStatusToApply,
      forceRevert: forceRevertChecked
    });
  };

  const handleApplyBulkAssign = () => {
    if (!assignVerifierId) return;
    if (selectedOrderIds.length === 0) {
      showToast('⚠️ Please select at least one order to assign');
      return;
    }
    bulkAssignMutation.mutate({
      orderIds: selectedOrderIds,
      telecallerId: assignVerifierId
    });
  };

  const handleApplyBulkVerify = () => {
    if (selectedOrderIds.length === 0) {
      showToast('⚠️ Please select at least one order to verify');
      return;
    }
    bulkVerifyMutation.mutate({ orderIds: selectedOrderIds });
  };

  const isAllSelected = orders.length > 0 && selectedOrderIds.length === orders.length;

  return (
    <div className="space-y-4 pb-12 font-sans">
      {/* 1. Header Profile & Title Bar (hidden when embedded in Manager View) */}
      {!hideHeader && (
        <div className="bg-white text-slate-900 p-4 sm:p-5 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border border-slate-200/90">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
              Dr Shanthi
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase tracking-wider">
                MANAGER · SHANTHI AYURVEDAS HOSUR
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Central Orders Hub & Logistics Dispatch Station
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold"
              onClick={() => navigate('/reports')}
            >
              👔 Boss View
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold"
              onClick={() => navigate('/inventory')}
            >
              📦 Stock Ledger
            </Button>
          </div>
        </div>
      )}

      {/* 2. Top Metrics Ribbon (2 Rows matching AyurOne Mart) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 divide-y divide-slate-100">
        {/* Row 1: Total Leads | Today | Orders | Today Rev */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-3 text-center">
          <div className="p-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 block font-mono">
              {metrics.totalLeads ?? 0}
            </span>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
              Total Leads
            </span>
          </div>

          <div className="p-2 border-l border-slate-100">
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full inline-block mb-1 uppercase tracking-wider">
              TODAY
            </span>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">
              {metrics.todayOrdersCount ?? 0} Orders Today
            </span>
          </div>

          <div className="p-2 border-l border-slate-100">
            <span className="text-2xl sm:text-3xl font-bold text-emerald-700 block font-mono">
              {metrics.totalOrders ?? meta.total ?? 0}
            </span>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
              Orders
            </span>
          </div>

          <div className="p-2 border-l border-slate-100">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 block font-mono">
              ₹{(metrics.todayRev ?? 0).toLocaleString()}
            </span>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
              Today Rev
            </span>
          </div>
        </div>

        {/* Row 2: Followups | In Queue | Shipped | To Verify */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 text-center">
          <div className="p-2">
            <span className="text-xl sm:text-2xl font-bold text-slate-700 block font-mono">
              {metrics.pendingFollowups ?? 0}
            </span>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
              Followups
            </span>
          </div>

          <div className="p-2 border-l border-slate-100">
            <span className="text-xl sm:text-2xl font-bold text-amber-600 block font-mono">
              {metrics.inQueueCount ?? 0}
            </span>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
              In Queue
            </span>
          </div>

          <div className="p-2 border-l border-slate-100">
            <span className="text-xl sm:text-2xl font-bold text-blue-600 block font-mono">
              {metrics.shippedCount ?? 0}
            </span>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
              Shipped
            </span>
          </div>

          <div className="p-2 border-l border-slate-100">
            <span className="text-xl sm:text-2xl font-bold text-slate-800 block font-mono">
              {metrics.toVerifyCount ?? 0}
            </span>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
              To Verify
            </span>
          </div>
        </div>
      </div>

      {/* 3. Low Stock Alert Banner */}
      {Boolean(metrics.lowStockCount !== undefined) && (
        <div
          onClick={() => navigate('/inventory')}
          className="bg-amber-50/80 hover:bg-amber-100/70 border border-amber-200 text-amber-800 px-4 py-2.5 rounded-xl flex items-center justify-between text-xs font-semibold cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>{metrics.lowStockCount ?? 55} products low on stock</span>
          </div>
          <span className="text-amber-900 underline font-bold text-[11px]">View Stock &rarr;</span>
        </div>
      )}

      {/* 4. Action Buttons Ribbon */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs shadow-xs"
          onClick={() => setViewMode(viewMode === 'card' ? 'full' : 'card')}
        >
          {viewMode === 'card' ? '📋 Full View' : '🗂️ Card View'}
        </Button>

        <Button
          size="sm"
          variant="secondary"
          className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs shadow-xs"
          icon={Scan}
          onClick={() => setScanStationOpen(true)}
        >
          Scan
        </Button>

        <Button
          size="sm"
          variant="secondary"
          className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs shadow-xs"
          onClick={() => setIndiaPostModalOpen(true)}
        >
          📮 India Post
        </Button>

        <Button
          size="sm"
          variant="secondary"
          className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs shadow-xs"
          icon={FileSpreadsheet}
          onClick={() => setExcelImportOpen(true)}
        >
          Import Excel
        </Button>

        <Button
          size="sm"
          variant="primary"
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs"
          icon={Plus}
          onClick={() => setCreateModalOpen(true)}
        >
          New Order
        </Button>

        <Button
          size="sm"
          variant="secondary"
          className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs ml-auto shadow-xs"
          icon={Download}
          onClick={() => setExcelExportOpen(true)}
        >
          Export File
        </Button>
      </div>

      {/* 5. Bulk Action Toolbar */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Select All Checkbox */}
          <label className="flex items-center gap-1.5 font-bold text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={handleSelectAll}
              className="w-4 h-4 rounded text-ayur-600 focus:ring-ayur-500"
            />
            <span>All</span>
            {selectedOrderIds.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-ayur-700 text-white text-[10px]">
                {selectedOrderIds.length}
              </span>
            )}
          </label>

          {/* Update Status Dropdown */}
          <div className="flex items-center gap-1.5">
            <select
              value={bulkStatusToApply}
              onChange={(e) => setBulkStatusToApply(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium outline-none focus:border-ayur-600"
            >
              <option value="">Update status...</option>
              <option value="NEW">New</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PROCESSING">Processing</option>
              <option value="READY_FOR_PACKING">Ready for Packing</option>
              <option value="PACKED">Packed</option>
              <option value="READY_FOR_DISPATCH">Ready to Dispatch</option>
              <option value="DISPATCHED">Shipped / Dispatched</option>
              <option value="DELIVERED">Delivered</option>
              <option value="RTO">RTO Return</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            {/* Force Revert Checkbox */}
            <label className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={forceRevertChecked}
                onChange={(e) => setForceRevertChecked(e.target.checked)}
                className="w-3.5 h-3.5 text-red-600 rounded"
              />
              <span title="Bypasses forward state machine check">force revert</span>
            </label>

            <Button
              size="sm"
              variant="secondary"
              disabled={!bulkStatusToApply || selectedOrderIds.length === 0}
              onClick={handleApplyBulkStatus}
              isLoading={bulkStatusMutation.isPending}
              className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold"
            >
              Update
            </Button>
          </div>

          {/* Assign Verify Telecaller */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
            <select
              value={assignVerifierId}
              onChange={(e) => setAssignVerifierId(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium outline-none focus:border-ayur-600"
            >
              <option value="">Assign verify...</option>
              {telecallers.map((tc) => (
                <option key={tc._id} value={tc._id}>
                  {tc.name}
                </option>
              ))}
            </select>

            <Button
              size="sm"
              variant="secondary"
              disabled={selectedOrderIds.length === 0}
              onClick={() => {
                if (assignVerifierId) {
                  handleApplyBulkAssign();
                } else {
                  handleApplyBulkVerify();
                }
              }}
              isLoading={bulkAssignMutation.isPending || bulkVerifyMutation.isPending}
              className="bg-amber-700 hover:bg-amber-800 text-white font-bold"
            >
              Verify
            </Button>
          </div>
        </div>

        {/* Labels Button */}
        <div>
          <Button
            size="sm"
            variant="secondary"
            disabled={selectedOrderIds.length === 0}
            onClick={() => setBulkLabelsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
          >
            🖨️ Labels ({selectedOrderIds.length})
          </Button>
        </div>
      </div>

      {/* 6. Auto Dispatch Notification Banner */}
      <div className="bg-blue-50 border border-blue-200 text-blue-900 px-4 py-3 rounded-xl flex items-center justify-between text-xs font-medium shadow-sm">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-blue-600" />
          <span>
            <strong>{metrics.packedCount ?? 105} packed</strong> — ready to ship
          </span>
        </div>

        <Button
          size="sm"
          variant="primary"
          icon={Zap}
          isLoading={autoDispatchMutation.isPending}
          onClick={() => autoDispatchMutation.mutate()}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
        >
          Auto Dispatch
        </Button>
      </div>

      {/* 7. Search & Filter Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-wrap items-center gap-2.5 text-xs shadow-sm">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search name / mobile / tracking"
            className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:border-ayur-600"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
        </div>

        {/* Date Filter */}
        <div className="relative w-36">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:border-ayur-600 text-slate-700"
          />
        </div>

        {/* Status Filter Dropdown */}
        <div className="w-36">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:border-ayur-600 text-slate-700"
          >
            <option value="">All Status</option>
            <option value="NEW">New</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PROCESSING">Processing</option>
            <option value="PACKED">Packed</option>
            <option value="READY_FOR_DISPATCH">Ready to Dispatch</option>
            <option value="DISPATCHED">Shipped / Dispatched</option>
            <option value="DELIVERED">Delivered</option>
            <option value="RTO">RTO Return</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {/* Districts Filter Dropdown */}
        <div className="w-36">
          <select
            value={districtFilter}
            onChange={(e) => {
              setDistrictFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:border-ayur-600 text-slate-700"
          >
            <option value="">All Districts</option>
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* Action buttons */}
        <Button
          size="sm"
          variant="primary"
          onClick={() => refetchOrders()}
          className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold px-4"
        >
          Search
        </Button>

        {(search || statusFilter || districtFilter || dateFilter) && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setStatusFilter('');
              setDistrictFilter('');
              setDateFilter('');
              setPage(1);
            }}
            className="text-xs text-slate-400 hover:text-slate-700 px-2 font-medium"
          >
            Reset
          </button>
        )}
      </div>

      {/* 8. Orders Summary Ribbon */}
      <div className="flex items-center justify-between text-xs text-slate-600 px-1 font-medium">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-slate-700" />
          <span className="font-bold text-slate-900 text-sm">Orders</span>
          <span>
            {meta.total} total · <strong className="text-emerald-700">₹{meta.totalRevenue?.toLocaleString()}</strong> revenue
          </span>
        </div>

        <span className="text-[11px] text-slate-400">
          Showing page {page} of {meta.totalPages || 1}
        </span>
      </div>

      {/* Success / Error Notification Toast */}
      {toastMsg && (
        <div
          className={`flex items-center gap-2 px-4 py-2.5 border text-xs font-semibold rounded-xl ${
            toastMsg.startsWith('⚠️')
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          {toastMsg.startsWith('⚠️') ? (
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 9. ORDERS LIST (CARD VIEW OR FULL VIEW) */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 bg-white rounded-2xl border">
          <Loader2 className="w-8 h-8 animate-spin text-ayur-600 mb-2" />
          <p className="text-xs font-medium">Loading orders data...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 space-y-2">
          <ShoppingBag className="w-10 h-10 mx-auto text-slate-300" />
          <p className="font-bold text-slate-700 text-sm">No orders found</p>
          <p className="text-xs">Adjust your search or filter parameters to find matching orders.</p>
        </div>
      ) : viewMode === 'card' ? (
        /* CARD VIEW: EXACT AYURONE MART ORDER CARDS */
        <div className="space-y-3">
          {orders.map((order) => {
            const pat = order.patientDetails || {};
            const addr = order.deliveryAddress || {};
            const customerName = pat.patientName || order.customerId?.name || 'Customer';
            const mobile = pat.mobile || order.customerId?.mobile || addr.phone || '';
            const statusConfig = STATUS_META[order.status] || { label: order.status, bg: 'bg-slate-100 text-slate-700' };
            const isSelected = selectedOrderIds.includes(order._id);
            const itemsSummary = order.items?.map((i) => `${i.productName} x${i.quantity}`).join(', ') || 'Herbal Healthcare Kit';

            return (
              <div
                key={order._id}
                className={`bg-white rounded-2xl border transition-all p-4 shadow-sm space-y-3 ${
                  isSelected ? 'border-emerald-600 bg-emerald-50/10 ring-1 ring-emerald-500' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Card Top: Checkbox, Name, Price, Status, Payment */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelectOrder(order._id)}
                      className="w-4 h-4 rounded text-ayur-600 focus:ring-ayur-500 mt-1"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 text-sm">{customerName}</span>
                        <span className="font-mono text-[10px] text-slate-400">#{order.orderNumber}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs">
                        <span className="font-mono text-slate-600">{mobile}</span>
                        {mobile && (
                          <div className="flex items-center gap-1 ml-1">
                            <a
                              href={`tel:${mobile}`}
                              className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-slate-100 rounded transition-colors"
                              title="Call"
                            >
                              <Phone className="w-3 h-3" />
                            </a>
                            <a
                              href={`https://wa.me/91${mobile.replace(/[^0-9]/g, '').slice(-10)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                              title="WhatsApp"
                            >
                              <MessageSquare className="w-3 h-3 text-emerald-600" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-base font-black text-slate-900">
                      ₹{order.grandTotal?.toLocaleString()}
                    </div>
                    <div className="flex items-center justify-end gap-1.5 mt-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusConfig.bg}`}>
                        {statusConfig.label}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 uppercase">
                        {order.paymentMethod}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Items & Address Line */}
                <div className="space-y-1 text-xs text-slate-600 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 flex-shrink-0" />
                    <span className="font-medium text-slate-800 truncate">{itemsSummary}</span>
                  </div>
                  <div className="flex items-start gap-1.5 text-slate-500 text-[11px]">
                    <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0 mt-0.5" />
                    <span className="truncate">
                      {addr.street}, {addr.landmark ? addr.landmark + ', ' : ''}{addr.city || 'Hosur'} - {addr.pincode || '635109'}
                    </span>
                  </div>
                </div>

                {/* Card Bottom: Date, Quick Status Changer & Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <Clock className="w-3 h-3" />
                    <span>
                      {new Date(order.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short'
                      })}
                      , {new Date(order.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {order.trackingNumber && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 font-mono text-[10px] border border-amber-200">
                        📮 {order.trackingNumber}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Inline Status Dropdown */}
                    <select
                      value={order.status}
                      onChange={(e) => {
                        singleTransitionMutation.mutate({
                          orderId: order._id,
                          status: e.target.value,
                          forceRevert: isOwner || isManager
                        });
                      }}
                      className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 outline-none focus:border-ayur-600"
                    >
                      <option value="NEW">New</option>
                      <option value="CONFIRMED">Confirmed</option>
                      <option value="PROCESSING">Processing</option>
                      <option value="PACKED">Packed</option>
                      <option value="READY_FOR_DISPATCH">Ready to Dispatch</option>
                      <option value="DISPATCHED">Shipped</option>
                      <option value="DELIVERED">Delivered</option>
                      <option value="RTO">RTO</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>

                    {/* Bill / Invoice */}
                    <button
                      type="button"
                      onClick={() => setSelectedOrderForInvoice(order)}
                      title="Tax Invoice"
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                    >
                      🧾
                    </button>

                    {/* Shipping Label */}
                    <button
                      type="button"
                      onClick={() => setSelectedOrderForLabel(order)}
                      title="Shipping Label"
                      className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold transition-colors"
                    >
                      🏷️
                    </button>

                    {/* View Details */}
                    <button
                      type="button"
                      onClick={() => navigate(`/orders/${order._id}`)}
                      title="View Details"
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Order */}
                    <button
                      type="button"
                      onClick={() => setSelectedOrderForDelete(order)}
                      title="Delete Order"
                      className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* FULL VIEW: COMPLETE TABLE VIEW */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider font-semibold border-b">
              <tr>
                <th className="p-3 w-10">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded text-ayur-600 focus:ring-ayur-500"
                  />
                </th>
                <th className="p-3">Order Number</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Items & Kit</th>
                <th className="p-3">Total Amount</th>
                <th className="p-3">Status</th>
                <th className="p-3">City / District</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((row) => {
                const customerName = row.patientDetails?.patientName || row.customerId?.name || 'Customer';
                const mobile = row.patientDetails?.mobile || row.customerId?.mobile || '—';
                const statusMeta = STATUS_META[row.status] || { label: row.status, badge: 'neutral' };
                const isSelected = selectedOrderIds.includes(row._id);

                return (
                  <tr key={row._id} className={`hover:bg-slate-50 ${isSelected ? 'bg-emerald-50/20' : ''}`}>
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectOrder(row._id)}
                        className="w-4 h-4 rounded text-ayur-600 focus:ring-ayur-500"
                      />
                    </td>
                    <td className="p-3">
                      <span className="font-bold font-mono text-slate-900 block">{row.orderNumber}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(row.createdAt).toLocaleDateString('en-GB')}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-slate-900 block">{customerName}</span>
                      <span className="text-[10px] font-mono text-slate-500">{mobile}</span>
                    </td>
                    <td className="p-3 text-slate-700 max-w-[200px] truncate">
                      {row.items?.map((i) => `${i.productName} (x${i.quantity})`).join(', ') || 'Ayurvedic Kit'}
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-slate-900 block">₹{row.grandTotal?.toLocaleString()}</span>
                      <span className="text-[10px] text-slate-400 uppercase">{row.paymentMethod}</span>
                    </td>
                    <td className="p-3">
                      <Badge variant={statusMeta.badge} size="sm">
                        {statusMeta.label}
                      </Badge>
                    </td>
                    <td className="p-3 text-slate-600">
                      {row.deliveryAddress?.city || row.deliveryAddress?.district || 'Hosur'}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedOrderForInvoice(row)}
                          className="p-1 text-slate-500 hover:text-slate-800"
                          title="Invoice"
                        >
                          🧾
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedOrderForLabel(row)}
                          className="p-1 text-slate-500 hover:text-slate-800"
                          title="Label"
                        >
                          🏷️
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/orders/${row._id}`)}
                          className="p-1 text-slate-500 hover:text-slate-800"
                          title="Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 10. Pagination */}
      <Pagination
        currentPage={page}
        totalPages={meta.totalPages}
        totalItems={meta.total}
        itemsPerPage={15}
        onPageChange={setPage}
      />

      {/* MODALS */}
      {/* 1. Create Order Modal */}
      {createModalOpen && (
        <OrderCreateModal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
        />
      )}

      {/* 2. Excel Import Modal */}
      {excelImportOpen && (
        <ExcelImportModal
          isOpen={excelImportOpen}
          onClose={() => setExcelImportOpen(false)}
          onImportSuccess={() => {
            queryClient.invalidateQueries(['orders']);
            refetchMetrics();
            showToast('✓ Excel orders imported successfully!');
          }}
          telecallers={telecallers}
        />
      )}

      {/* 3. Excel / Manifest Export Modal */}
      {excelExportOpen && (
        <ExcelExportModal
          isOpen={excelExportOpen}
          onClose={() => setExcelExportOpen(false)}
          orders={orders}
          selectedOrders={orders.filter((o) => selectedOrderIds.includes(o._id))}
          filterStatus={statusFilter}
          filterDistrict={districtFilter}
        />
      )}

      {/* 4. Barcode Scan Station Modal */}
      {scanStationOpen && (
        <BarcodeScanStationModal
          isOpen={scanStationOpen}
          onClose={() => setScanStationOpen(false)}
          onOrderUpdated={() => {
            queryClient.invalidateQueries(['orders']);
            refetchMetrics();
          }}
        />
      )}

      {/* 5. India Post Module Modal */}
      {indiaPostModalOpen && (
        <IndiaPostModuleModal
          isOpen={indiaPostModalOpen}
          onClose={() => setIndiaPostModalOpen(false)}
          orders={orders}
        />
      )}

      {/* 6. Bulk Shipping Labels Modal */}
      {bulkLabelsModalOpen && (
        <BulkShippingLabelsModal
          isOpen={bulkLabelsModalOpen}
          onClose={() => setBulkLabelsModalOpen(false)}
          orders={orders.filter((o) => selectedOrderIds.includes(o._id))}
        />
      )}

      {/* 7. Single Order Tax Invoice */}
      {selectedOrderForInvoice && (
        <PrintableInvoiceModal
          isOpen={Boolean(selectedOrderForInvoice)}
          onClose={() => setSelectedOrderForInvoice(null)}
          order={selectedOrderForInvoice}
        />
      )}

      {/* 8. Single Order Shipping Label */}
      {selectedOrderForLabel && (
        <PrintableShippingLabelModal
          isOpen={Boolean(selectedOrderForLabel)}
          onClose={() => setSelectedOrderForLabel(null)}
          order={selectedOrderForLabel}
        />
      )}

      {/* 9. Delete Confirmation Modal */}
      {selectedOrderForDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl border">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-slate-900 text-sm">Delete Order Confirmation</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete Order #{selectedOrderForDelete.orderNumber}? Reserved stock will be
              automatically released back to branch inventory.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button size="sm" variant="secondary" onClick={() => setSelectedOrderForDelete(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="danger"
                isLoading={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(selectedOrderForDelete._id)}
                className="bg-red-600 hover:bg-red-700 text-white font-bold"
              >
                Delete Order
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrderListPage;
