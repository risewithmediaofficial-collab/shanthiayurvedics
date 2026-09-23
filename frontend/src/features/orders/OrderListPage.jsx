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
  CheckCircle2,
  Pencil,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter
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
import { SimplePipelineTrack } from '../../components/common/SimpleProgressBar.jsx';
import { exportToExcel, exportToCSV } from '../../utils/exportUtils.js';
import { DateRangeFilter } from '../../components/common/DateRangeFilter.jsx';
import { ExportButton } from '../../components/common/ExportButton.jsx';

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
  const { hasPermission, isOwner, isManager, isDistributor, role, user } = usePermissions();
  const { selectedBranchId } = useBranch();

  // Filters & Sorting State
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [districtFilter, setDistrictFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [viewMode, setViewMode] = useState('card'); // 'card' | 'full'

  const handleHeaderSort = (field) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const handleExportOrders = async (format = 'excel') => {
    try {
      showToast('⏳ Preparing orders for export...');
      let exportOrdersList = [];

      if (selectedOrderIds.length > 0) {
        exportOrdersList = orders.filter((o) => selectedOrderIds.includes(o._id));
      } else {
        const params = {
          export: true,
          sortBy,
          sortOrder
        };
        if (search?.trim()) params.search = search.trim();
        if (statusFilter && statusFilter !== 'ALL') params.status = statusFilter;
        if (districtFilter && districtFilter !== 'ALL') params.district = districtFilter;
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
        if (selectedBranchId && selectedBranchId !== 'ALL') params.branchId = selectedBranchId;

        const res = await apiClient.get('/orders', { params });
        exportOrdersList = res.data?.data || orders;
      }

      if (exportOrdersList.length === 0) {
        showToast('⚠️ No orders found to export');
        return;
      }

      const rows = exportOrdersList.map((ord, idx) => {
        const pat = ord.patientDetails || {};
        const addr = ord.deliveryAddress || {};
        const customerName = pat.patientName || ord.customerId?.name || 'Customer';
        const mobile = pat.mobile || ord.customerId?.mobile || addr.phone || '';
        const itemsStr = ord.items?.map((i) => `${i.productName} (x${i.quantity})`).join(', ') || 'Ayurvedic Medicine';

        return {
          'S.No': idx + 1,
          'Order Number': ord.orderNumber,
          'Order Date': new Date(ord.createdAt).toLocaleDateString('en-GB'),
          'Customer Name': customerName,
          'Mobile': mobile,
          'Alt Mobile': pat.alternateMobile || '',
          'Products Summary': itemsStr,
          'Total Amount (₹)': ord.grandTotal || 0,
          'Payment Method': ord.paymentMethod || 'COD',
          'Payment Status': ord.paymentStatus || 'PENDING',
          'Order Status': ord.status,
          'Street Address': addr.street || '',
          'Landmark': addr.landmark || '',
          'City': addr.city || 'Hosur',
          'District': addr.district || 'Krishnagiri',
          'State': addr.state || 'Tamil Nadu',
          'Pincode': addr.pincode || '',
          'Tracking Number': ord.trackingNumber || '',
          'Branch': ord.branchId?.name || 'Hosur Main Hub'
        };
      });

      const filePrefix = `Shanthi_Orders_${startDate ? `${startDate}_to_${endDate || 'today'}` : 'All'}`;
      if (format === 'excel') {
        exportToExcel(rows, filePrefix, 'Orders');
      } else {
        exportToCSV(rows, filePrefix);
      }
      showToast(`✓ Exported ${rows.length} order(s) successfully!`);
    } catch (err) {
      console.error('Export error:', err);
      showToast('⚠️ Failed to export orders');
    }
  };

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
  const [selectedOrderForEdit, setSelectedOrderForEdit] = useState(null);
  const [editFormData, setEditFormData] = useState({
    patientName: '',
    fatherName: '',
    mobile: '',
    alternateMobile: '',
    street: '',
    landmark: '',
    village: '',
    taluk: '',
    city: '',
    district: '',
    state: 'Tamil Nadu',
    pincode: '',
    paymentMethod: 'COD',
    paymentStatus: 'COD_PENDING',
    status: 'NEW',
    trackingNumber: '',
    courierName: 'India Post',
    notes: '',
    grandTotal: ''
  });

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
    enabled: Boolean(user),
    refetchInterval: 15000
  });

  // Fetch Distinct Districts for Filter
  const { data: districtsResponse } = useQuery({
    queryKey: ['order-districts'],
    queryFn: async () => {
      const res = await apiClient.get('/orders/districts');
      return res.data?.data || [];
    },
    enabled: Boolean(user)
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
    },
    enabled: Boolean(user)
  });

  // Fetch Paginated Orders
  const { data: ordersResponse, isLoading, refetch: refetchOrders } = useQuery({
    queryKey: ['orders', page, search, statusFilter, districtFilter, startDate, endDate, sortBy, sortOrder, selectedBranchId],
    queryFn: async () => {
      const params = { page, limit: 15, sortBy, sortOrder };
      if (search?.trim()) params.search = search.trim();
      if (statusFilter && statusFilter !== 'ALL') params.status = statusFilter;
      if (districtFilter && districtFilter !== 'ALL') params.district = districtFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (selectedBranchId && selectedBranchId !== 'ALL') params.branchId = selectedBranchId;
      const res = await apiClient.get('/orders', { params });
      return res.data;
    },
    enabled: Boolean(user)
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
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      refetchOrders();
      refetchMetrics();
      setSelectedOrderIds([]);

      const data = res.data?.data || {};
      if (data.failedCount > 0 && data.successCount === 0) {
        showToast(`⚠️ Could not update: ${data.failed?.[0]?.error || 'Transition not allowed for selected status'}`);
      } else if (data.failedCount > 0) {
        showToast(`⚠️ Updated ${data.successCount} order(s), but ${data.failedCount} failed`);
      } else {
        showToast(`✓ Updated ${data.successCount || 'all'} order(s) to ${STATUS_META[bulkStatusToApply]?.label || bulkStatusToApply}`);
      }
    },
    onError: (err) => {
      showToast(`⚠️ ${err?.response?.data?.message || 'Bulk transition failed'}`);
    }
  });

  // Bulk Assign Verification Mutation
  const bulkAssignMutation = useMutation({
    mutationFn: ({ orderIds, telecallerId }) =>
      apiClient.patch('/orders/bulk-assign', { orderIds, telecallerId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      refetchOrders();
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
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      refetchOrders();
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
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      refetchOrders();
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
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      refetchOrders();
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
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      refetchOrders();
      refetchMetrics();
      setSelectedOrderForDelete(null);
      showToast('✓ Order deleted and stock released');
    },
    onError: (err) => {
      showToast(`⚠️ ${err?.response?.data?.message || 'Failed to delete order'}`);
    }
  });

  // Update Order Mutation
  const updateOrderMutation = useMutation({
    mutationFn: ({ orderId, payload }) => apiClient.patch(`/orders/${orderId}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      refetchOrders();
      refetchMetrics();
      setSelectedOrderForEdit(null);
      showToast('✓ Order details updated successfully');
    },
    onError: (err) => {
      showToast(`⚠️ ${err?.response?.data?.message || 'Failed to update order'}`);
    }
  });

  const handleOpenEditOrder = (order) => {
    setSelectedOrderForEdit(order);
    const addr = order.deliveryAddress || {};
    const patient = order.patientDetails || {};
    setEditFormData({
      patientName: patient.patientName || order.customer?.name || order.customerName || '',
      fatherName: patient.fatherName || '',
      mobile: patient.mobile || order.customer?.mobile || order.customerPhone || '',
      alternateMobile: patient.alternateMobile || '',
      street: addr.street || '',
      landmark: addr.landmark || '',
      village: addr.village || '',
      taluk: addr.taluk || '',
      district: addr.district || 'Krishnagiri',
      city: addr.city || 'Hosur',
      state: addr.state || 'Tamil Nadu',
      pincode: addr.pincode || '635109',
      paymentMethod: order.paymentMethod || 'COD',
      paymentStatus: order.paymentStatus || 'COD_PENDING',
      status: order.status || 'NEW',
      trackingNumber: order.trackingNumber === 'Pending' ? '' : (order.trackingNumber || ''),
      courierName: order.courierName || 'India Post',
      notes: order.notes || '',
      grandTotal: order.grandTotal || ''
    });
  };

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
    if (!bulkStatusToApply) {
      showToast('⚠️ Please select a target status from the dropdown');
      return;
    }
    if (selectedOrderIds.length === 0) {
      showToast('⚠️ Please select at least one order using the checkboxes below');
      return;
    }
    bulkStatusMutation.mutate({
      orderIds: selectedOrderIds,
      status: bulkStatusToApply,
      forceRevert: forceRevertChecked || isOwner || isManager || isDistributor
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

      {/* ── Bento KPI Metrics Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bento-card flex flex-col gap-0.5">
          <div className="bento-metric-title">Today's Sales</div>
          <div className="text-xl font-semibold font-mono text-slate-900 tracking-tight">₹{(metrics.todayRev ?? 0).toLocaleString()}</div>
          <div className="text-[10px] text-emerald-600 font-medium">+{metrics.todayOrdersCount ?? 0} orders today</div>
        </div>

        <div className="bento-card flex flex-col gap-0.5">
          <div className="bento-metric-title">Total Orders</div>
          <div className="text-xl font-semibold font-mono text-emerald-700 tracking-tight">{metrics.totalOrders ?? meta.total ?? 0}</div>
          <div className="text-[10px] text-slate-400 font-medium">Verified bookings</div>
        </div>

        <div className="bento-card flex flex-col gap-0.5">
          <div className="bento-metric-title">In Transit</div>
          <div className="text-xl font-semibold font-mono text-indigo-600 tracking-tight">{metrics.shippedCount ?? 0}</div>
          <div className="text-[10px] text-slate-400 font-medium">Active courier dispatch</div>
        </div>

        <div className="bento-card flex flex-col gap-0.5">
          <div className="bento-metric-title">Packed</div>
          <div className="text-xl font-semibold font-mono text-purple-600 tracking-tight">{metrics.packedCount ?? 0}</div>
          <div className="text-[10px] text-slate-400 font-medium">Awaiting dispatch</div>
        </div>

        <div className="bento-card flex flex-col gap-0.5">
          <div className="bento-metric-title">Verification Queue</div>
          <div className="text-xl font-semibold font-mono text-amber-600 tracking-tight">{metrics.toVerifyCount ?? 0}</div>
          <div className="text-[10px] text-slate-400 font-medium">Unverified bookings</div>
        </div>

        <div className="bento-card flex flex-col gap-0.5">
          <div className="bento-metric-title">Total Leads</div>
          <div className="text-xl font-semibold font-mono text-slate-800 tracking-tight">{metrics.totalLeads ?? 0}</div>
          <div className="text-[10px] text-slate-400 font-medium">Inbound inquiries</div>
        </div>
      </div>

      {/* Fulfillment Pipeline */}
      <div className="bento-card space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-800 tracking-tight flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-emerald-700" strokeWidth={1.75} />
            Fulfillment Pipeline
          </span>
          <span className="text-[11px] font-medium text-slate-400">Live Stage Distribution</span>
        </div>
        <SimplePipelineTrack
          segments={[
            { label: 'New', count: metrics.newOrdersCount ?? 2, bgColor: 'bg-blue-500', indicatorColor: 'bg-blue-500' },
            { label: 'Packed', count: metrics.packedCount ?? 0, bgColor: 'bg-purple-500', indicatorColor: 'bg-purple-500' },
            { label: 'In Transit', count: metrics.shippedCount ?? 2, bgColor: 'bg-indigo-500', indicatorColor: 'bg-indigo-500' },
            { label: 'Delivered', count: metrics.deliveredOrdersCount ?? 9, bgColor: 'bg-emerald-500', indicatorColor: 'bg-emerald-500' },
            { label: 'RTO', count: metrics.rtoOrdersCount ?? 0, bgColor: 'bg-rose-500', indicatorColor: 'bg-rose-500' }
          ]}
        />
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
          variant="primary"
          className="bg-indigo-950 hover:bg-indigo-900 text-white font-bold text-xs shadow-xs"
          icon={Scan}
          onClick={() => navigate('/scan-tracker')}
        >
          📦 Scan Tracker
        </Button>

        <Button
          size="sm"
          variant="secondary"
          className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs shadow-xs"
          onClick={() => navigate('/scan-tracker?subtab=export')}
        >
          📮 India Post Export
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
      <div className={`rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs border transition-all ${
        selectedOrderIds.length > 0
          ? 'bg-amber-50/90 border-amber-300 shadow-sm ring-1 ring-amber-300'
          : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex flex-wrap items-center gap-3">
          {/* Select All Checkbox */}
          <label className="flex items-center gap-1.5 font-bold text-slate-800 cursor-pointer select-none bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-xs">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={handleSelectAll}
              className="w-4 h-4 rounded text-ayur-600 focus:ring-ayur-500 cursor-pointer"
            />
            <span>Select All</span>
            {selectedOrderIds.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold text-[10px]">
                {selectedOrderIds.length} Selected
              </span>
            )}
          </label>

          {/* Update Status Dropdown */}
          <div className="flex flex-wrap items-center gap-2 pl-2 border-l border-slate-200">
            <span className={`text-[11px] uppercase tracking-wider font-bold ${
              selectedOrderIds.length > 0 ? 'text-amber-900' : 'text-slate-500'
            }`}>
              📦 Batch Action (Update Checked Orders):
            </span>
            <select
              disabled={selectedOrderIds.length === 0}
              value={bulkStatusToApply}
              onChange={(e) => setBulkStatusToApply(e.target.value)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium outline-none transition-all ${
                selectedOrderIds.length === 0
                  ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-white border border-amber-400 text-slate-800 focus:border-ayur-600 cursor-pointer shadow-xs'
              }`}
            >
              <option value="">
                {selectedOrderIds.length === 0
                  ? '← Check order boxes below to batch update status'
                  : 'Choose new status to apply...'}
              </option>
              <option value="NEW">New</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PROCESSING">Processing</option>
              <option value="READY_FOR_PACKING">Ready for Packing</option>
              <option value="PACKED">Packed</option>
              <option value="READY_FOR_DISPATCH">Ready to Dispatch</option>
              <option value="DISPATCHED">Shipped / Dispatched</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
              <option value="DELIVERED">Delivered</option>
              <option value="DELIVERY_FAILED">Delivery Failed</option>
              <option value="RTO">RTO Return</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            {/* Force Override Toggle */}
            <label className={`flex items-center gap-1 text-[11px] select-none bg-white px-2 py-1 rounded border border-slate-200 ${
              selectedOrderIds.length === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer text-slate-700'
            }`} title="Overrides state machine to permit transitioning from terminal states like Delivered or Cancelled">
              <input
                disabled={selectedOrderIds.length === 0}
                type="checkbox"
                checked={forceRevertChecked || isOwner || isManager || isDistributor}
                onChange={(e) => setForceRevertChecked(e.target.checked)}
                className="w-3.5 h-3.5 text-emerald-600 rounded cursor-pointer"
              />
              <span className="font-semibold text-slate-700">Manager Override</span>
            </label>

            <Button
              size="sm"
              variant="secondary"
              disabled={selectedOrderIds.length === 0 || !bulkStatusToApply}
              onClick={handleApplyBulkStatus}
              isLoading={bulkStatusMutation.isPending}
              className={`font-bold px-3 transition-all ${
                selectedOrderIds.length > 0 && bulkStatusToApply
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              Apply Status
            </Button>

            {selectedOrderIds.length === 0 && (
              <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 hidden sm:inline">
                ℹ️ To view or filter orders, use the Status Filter below
              </span>
            )}
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

      {/* 6B. Quick Status Filter Ribbon */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {[
          { key: '', label: 'All Orders', count: metrics.totalOrders ?? meta.total },
          { key: 'NEW', label: 'New', count: metrics.newOrdersCount },
          { key: 'CONFIRMED', label: 'Confirmed', count: metrics.confirmedOrdersCount },
          { key: 'PROCESSING', label: 'Processing', count: metrics.processingCount },
          { key: 'PACKED', label: 'Packed', count: metrics.packedCount },
          { key: 'IN_TRANSIT', label: 'In Transit', count: metrics.shippedCount },
          { key: 'DELIVERED', label: 'Delivered', count: metrics.deliveredOrdersCount },
          { key: 'RTO', label: 'RTO Return', count: metrics.rtoOrdersCount },
          { key: 'CANCELLED', label: 'Cancelled', count: metrics.cancelledCount }
        ].map((pill) => {
          const isSelected = statusFilter === pill.key || (pill.key === 'IN_TRANSIT' && (statusFilter === 'DISPATCHED' || statusFilter === 'IN_TRANSIT'));
          return (
            <button
              key={pill.key || 'ALL'}
              type="button"
              onClick={() => {
                setStatusFilter(pill.key);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 select-none ${
                isSelected
                  ? 'bg-emerald-700 text-white font-bold shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              <span>{pill.label}</span>
              {pill.count !== undefined && pill.count !== null && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {pill.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search & Filter Bar */}
      <div className="bento-card flex flex-wrap items-center gap-2.5 text-xs">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') refetchOrders();
            }}
            placeholder="Search name / mobile / tracking / order #"
            className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:border-ayur-600 transition-colors"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
        </div>

        {/* Date to Date Range Filter */}
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onChange={({ startDate: s, endDate: e }) => {
            setStartDate(s);
            setEndDate(e);
            setPage(1);
          }}
        />

        {/* Status Filter Dropdown */}
        <div className="w-48">
          <select
            id="orders-status-filter"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-2.5 py-2 bg-emerald-50/60 border border-emerald-300 rounded-lg text-xs outline-none focus:bg-white focus:border-emerald-600 text-emerald-950 font-bold cursor-pointer"
          >
            <option value="">All Statuses (Filter)</option>
            <option value="NEW">New</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PROCESSING">Processing</option>
            <option value="READY_FOR_PACKING">Ready for Packing</option>
            <option value="PACKED">Packed</option>
            <option value="READY_FOR_DISPATCH">Ready to Dispatch</option>
            <option value="IN_TRANSIT">In Transit (Shipped)</option>
            <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
            <option value="DELIVERED">Delivered</option>
            <option value="DELIVERY_FAILED">Delivery Failed</option>
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
            className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:border-ayur-600 text-slate-700 font-medium cursor-pointer"
          >
            <option value="">All Districts</option>
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* Sort By Dropdown */}
        <div className="w-52">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 focus-within:border-ayur-600 focus-within:bg-white transition-colors">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              id="orders-sort-select"
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, dir] = e.target.value.split('-');
                setSortBy(field);
                setSortOrder(dir);
                setPage(1);
              }}
              className="w-full bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer py-1"
            >
              <option value="createdAt-desc">📅 Date: Newest First</option>
              <option value="createdAt-asc">📅 Date: Oldest First</option>
              <option value="grandTotal-desc">💰 Amount: High to Low</option>
              <option value="grandTotal-asc">💰 Amount: Low to High</option>
              <option value="customer-asc">👤 Customer: A to Z</option>
              <option value="customer-desc">👤 Customer: Z to A</option>
              <option value="status-asc">🏷️ Status (A-Z)</option>
              <option value="orderNumber-asc">🔢 Order Number (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Direct Export Button */}
        <ExportButton
          onExport={handleExportOrders}
          label={selectedOrderIds.length > 0 ? `Export (${selectedOrderIds.length})` : 'Export Orders'}
        />

        {/* Action buttons */}
        <Button
          size="sm"
          variant="primary"
          onClick={() => refetchOrders()}
          className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold px-4 cursor-pointer"
        >
          Apply
        </Button>

        {/* Clear Active Filters */}
        {(statusFilter || districtFilter || startDate || endDate || search || sortBy !== 'createdAt' || sortOrder !== 'desc') && (
          <button
            type="button"
            onClick={() => {
              setStatusFilter('');
              setDistrictFilter('');
              setStartDate('');
              setEndDate('');
              setSearch('');
              setSortBy('createdAt');
              setSortOrder('desc');
              setPage(1);
            }}
            className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
            title="Reset all search, status, date, and sorting filters"
          >
            <X className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        )}

      </div>

      {/* Floating Success / Error Notification Toast */}
      {toastMsg && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 border text-xs font-bold rounded-2xl shadow-xl transition-all duration-200 ${
            toastMsg.startsWith('⚠️')
              ? 'bg-amber-50 border-amber-300 text-amber-900 ring-2 ring-amber-500/20'
              : 'bg-emerald-50 border-emerald-300 text-emerald-900 ring-2 ring-emerald-500/20'
          }`}
        >
          {toastMsg.startsWith('⚠️') ? (
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600" />
          ) : (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          )}
          <span>{toastMsg}</span>
          <button
            type="button"
            onClick={() => setToastMsg('')}
            className="ml-2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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
                      disabled={singleTransitionMutation.isPending}
                      onChange={(e) => {
                        singleTransitionMutation.mutate({
                          orderId: order._id,
                          status: e.target.value,
                          forceRevert: isOwner || isManager || isDistributor
                        });
                      }}
                      className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 outline-none focus:border-ayur-600 cursor-pointer"
                    >
                      <option value="NEW">New</option>
                      <option value="CONFIRMED">Confirmed</option>
                      <option value="PROCESSING">Processing</option>
                      <option value="READY_FOR_PACKING">Ready for Packing</option>
                      <option value="PACKED">Packed</option>
                      <option value="READY_FOR_DISPATCH">Ready to Dispatch</option>
                      <option value="DISPATCHED">Shipped</option>
                      <option value="IN_TRANSIT">In Transit</option>
                      <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                      <option value="DELIVERED">Delivered</option>
                      <option value="DELIVERY_FAILED">Delivery Failed</option>
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

                    {/* Edit Order */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditOrder(order)}
                      title="Edit Order"
                      className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors flex items-center cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
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
            <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider font-semibold border-b select-none">
              <tr>
                <th className="p-3 w-10">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded text-ayur-600 focus:ring-ayur-500"
                  />
                </th>
                <th
                  onClick={() => handleHeaderSort('orderNumber')}
                  className="p-3 cursor-pointer hover:bg-slate-200 transition-colors"
                  title="Click to sort by Order Number"
                >
                  <div className="flex items-center gap-1">
                    <span>Order Number</span>
                    {sortBy === 'orderNumber' ? (
                      <span className="text-emerald-700 font-bold">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleHeaderSort('customer')}
                  className="p-3 cursor-pointer hover:bg-slate-200 transition-colors"
                  title="Click to sort by Customer Name"
                >
                  <div className="flex items-center gap-1">
                    <span>Customer</span>
                    {sortBy === 'customer' ? (
                      <span className="text-emerald-700 font-bold">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                    )}
                  </div>
                </th>
                <th className="p-3">Items & Kit</th>
                <th
                  onClick={() => handleHeaderSort('grandTotal')}
                  className="p-3 cursor-pointer hover:bg-slate-200 transition-colors"
                  title="Click to sort by Amount"
                >
                  <div className="flex items-center gap-1">
                    <span>Total Amount</span>
                    {sortBy === 'grandTotal' ? (
                      <span className="text-emerald-700 font-bold">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleHeaderSort('status')}
                  className="p-3 cursor-pointer hover:bg-slate-200 transition-colors"
                  title="Click to sort by Status"
                >
                  <div className="flex items-center gap-1">
                    <span>Status</span>
                    {sortBy === 'status' ? (
                      <span className="text-emerald-700 font-bold">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                    )}
                  </div>
                </th>
                <th className="p-3">City / District</th>
                <th
                  onClick={() => handleHeaderSort('createdAt')}
                  className="p-3 cursor-pointer hover:bg-slate-200 transition-colors"
                  title="Click to sort by Date"
                >
                  <div className="flex items-center gap-1">
                    <span>Date</span>
                    {sortBy === 'createdAt' ? (
                      <span className="text-emerald-700 font-bold">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                    )}
                  </div>
                </th>
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
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            refetchOrders();
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
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            refetchOrders();
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

      {/* 10. Edit Order Modal */}
      {selectedOrderForEdit && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Edit Order #{selectedOrderForEdit.orderNumber}
                  </h3>
                  <p className="text-[11px] text-slate-400">Update patient, shipping address & payment details</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderForEdit(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Content */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Patient Details */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">1. Patient Information</h4>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Patient Name *</label>
                    <input
                      type="text"
                      required
                      value={editFormData.patientName}
                      onChange={(e) => setEditFormData({ ...editFormData, patientName: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-ayur-600"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Mobile (10 digits) *</label>
                    <input
                      type="tel"
                      required
                      value={editFormData.mobile}
                      onChange={(e) => setEditFormData({ ...editFormData, mobile: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-ayur-600"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Alternate Phone</label>
                    <input
                      type="tel"
                      value={editFormData.alternateMobile}
                      onChange={(e) => setEditFormData({ ...editFormData, alternateMobile: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ayur-600"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Father / Caretaker Name</label>
                    <input
                      type="text"
                      value={editFormData.fatherName}
                      onChange={(e) => setEditFormData({ ...editFormData, fatherName: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-ayur-600"
                    />
                  </div>
                </div>
              </div>

              {/* Delivery Address */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">2. Delivery Address</h4>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="col-span-2">
                    <label className="block text-slate-600 font-semibold mb-1">Street / House Address</label>
                    <input
                      type="text"
                      value={editFormData.street}
                      onChange={(e) => setEditFormData({ ...editFormData, street: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-ayur-600"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Landmark</label>
                    <input
                      type="text"
                      value={editFormData.landmark}
                      onChange={(e) => setEditFormData({ ...editFormData, landmark: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">City / Town</label>
                    <select
                      value={editFormData.city}
                      onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                    >
                      <option value="Hosur">Hosur</option>
                      <option value="Krishnagiri">Krishnagiri</option>
                      <option value="Dharmapuri">Dharmapuri</option>
                      <option value="Salem">Salem</option>
                      <option value="Coimbatore">Coimbatore</option>
                      <option value="Erode">Erode</option>
                      <option value="Tirupur">Tirupur</option>
                      <option value="Chennai">Chennai</option>
                      <option value="Vellore">Vellore</option>
                      <option value="Bengaluru">Bengaluru</option>
                      <option value="Tirunelveli">Tirunelveli</option>
                      <option value="Madurai">Madurai</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">District</label>
                    <input
                      type="text"
                      value={editFormData.district}
                      onChange={(e) => setEditFormData({ ...editFormData, district: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">State</label>
                    <select
                      value={editFormData.state}
                      onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                    >
                      <option value="Tamil Nadu">Tamil Nadu</option>
                      <option value="Karnataka">Karnataka</option>
                      <option value="Kerala">Kerala</option>
                      <option value="Andhra Pradesh">Andhra Pradesh</option>
                      <option value="Telangana">Telangana</option>
                      <option value="Maharashtra">Maharashtra</option>
                      <option value="Delhi">Delhi</option>
                      <option value="Gujarat">Gujarat</option>
                      <option value="Rajasthan">Rajasthan</option>
                      <option value="Uttar Pradesh">Uttar Pradesh</option>
                      <option value="West Bengal">West Bengal</option>
                      <option value="Madhya Pradesh">Madhya Pradesh</option>
                      <option value="Odisha">Odisha</option>
                      <option value="Punjab">Punjab</option>
                      <option value="Haryana">Haryana</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Pincode</label>
                    <input
                      type="text"
                      value={editFormData.pincode}
                      onChange={(e) => setEditFormData({ ...editFormData, pincode: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Order Status & Tracking */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">3. Status & Logistics</h4>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Order Status</label>
                    <select
                      value={editFormData.status}
                      onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                    >
                      <option value="NEW">New</option>
                      <option value="CONFIRMED">Confirmed</option>
                      <option value="PROCESSING">Processing</option>
                      <option value="PACKED">Packed</option>
                      <option value="READY_FOR_DISPATCH">Ready to Dispatch</option>
                      <option value="DISPATCHED">Shipped / Dispatched</option>
                      <option value="DELIVERED">Delivered</option>
                      <option value="RTO">RTO</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Courier / Service</label>
                    <select
                      value={editFormData.courierName}
                      onChange={(e) => setEditFormData({ ...editFormData, courierName: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                    >
                      <option value="India Post">India Post (Speed Post)</option>
                      <option value="BlueDart">BlueDart</option>
                      <option value="DTDC">DTDC</option>
                      <option value="Delhivery">Delhivery</option>
                      <option value="Ekart">Ekart Logistics</option>
                      <option value="Xpressbees">Xpressbees</option>
                      <option value="Shadowfax">Shadowfax</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Payment Details & Total */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">4. Payment Details</h4>
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Payment Method</label>
                    <select
                      value={editFormData.paymentMethod}
                      onChange={(e) => setEditFormData({ ...editFormData, paymentMethod: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                    >
                      <option value="COD">COD</option>
                      <option value="ONLINE">Online</option>
                      <option value="UPI">UPI</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Payment Status</label>
                    <select
                      value={editFormData.paymentStatus}
                      onChange={(e) => setEditFormData({ ...editFormData, paymentStatus: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                    >
                      <option value="COD_PENDING">COD Pending</option>
                      <option value="PENDING">Pending</option>
                      <option value="PAID">Paid</option>
                      <option value="FAILED">Failed</option>
                      <option value="REFUNDED">Refunded</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Grand Total (₹)</label>
                    <input
                      type="number"
                      value={editFormData.grandTotal}
                      onChange={(e) => setEditFormData({ ...editFormData, grandTotal: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-slate-600 font-semibold mb-1">Order Notes / Instructions</label>
                <textarea
                  rows={2}
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  placeholder="Specific dosage instructions, customer remarks..."
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50 rounded-b-2xl">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setSelectedOrderForEdit(null)}
                disabled={updateOrderMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                isLoading={updateOrderMutation.isPending}
                onClick={() => {
                  if (!editFormData.patientName || !editFormData.mobile) {
                    alert('Please enter Patient Name and Mobile');
                    return;
                  }
                  updateOrderMutation.mutate({
                    orderId: selectedOrderForEdit._id,
                    payload: editFormData
                  });
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                Save Order Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrderListPage;
