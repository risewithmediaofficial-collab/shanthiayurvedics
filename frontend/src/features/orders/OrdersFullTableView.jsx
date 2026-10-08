import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Zap,
  AlertTriangle,
  Clock,
  Scan,
  Plus,
  FileSpreadsheet,
  Download,
  Phone,
  MessageSquare,
  Eye,
  Pencil,
  Trash2,
  CheckCircle2,
  X,
  Filter,
  Users,
  Printer,
  FileText,
  Truck,
  ArrowUpDown,
  Building2,
  Calendar
} from 'lucide-react';
import { Button } from '../../components/common/Button.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { CustomSelect } from '../../components/common/CustomSelect.jsx';

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

const BULK_STATUS_OPTIONS = [
  { value: '', label: '-- Bulk Update Status --' },
  { value: 'NEW', label: 'New' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'READY_FOR_PACKING', label: 'Ready for Packing' },
  { value: 'PACKED', label: 'Packed' },
  { value: 'READY_FOR_DISPATCH', label: 'Ready to Dispatch' },
  { value: 'DISPATCHED', label: 'Shipped / Dispatched' },
  { value: 'IN_TRANSIT', label: 'In Transit' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'DELIVERY_FAILED', label: 'Delivery Failed' },
  { value: 'RTO', label: 'RTO Return' },
  { value: 'CANCELLED', label: 'Cancelled' }
];

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'NEW', label: 'New' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'PACKED', label: 'Packed' },
  { value: 'READY_FOR_DISPATCH', label: 'Ready for Dispatch' },
  { value: 'IN_TRANSIT', label: 'Shipped / In Transit' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'RTO', label: 'RTO' },
  { value: 'CANCELLED', label: 'Cancelled' }
];

const PAYMENT_FILTER_OPTIONS = [
  { value: '', label: 'All Payments' },
  { value: 'COD', label: 'COD' },
  { value: 'PREPAID', label: 'Prepaid' },
  { value: 'ONLINE', label: 'Online' },
  { value: 'UPI', label: 'UPI' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' }
];

const ROW_STATUS_OPTIONS = [
  { value: 'NEW', label: 'New' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'PACKED', label: 'Packed' },
  { value: 'READY_FOR_DISPATCH', label: 'Ready to Dispatch' },
  { value: 'DISPATCHED', label: 'Shipped / Dispatched' },
  { value: 'IN_TRANSIT', label: 'In Transit' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'DELIVERY_FAILED', label: 'Delivery Failed' },
  { value: 'RTO', label: 'RTO' },
  { value: 'CANCELLED', label: 'Cancelled' }
];

export function OrdersFullTableView({
  orders = [],
  metrics = {},
  meta = {},
  telecallers = [],
  districts = [],
  products = [],
  user = {},
  onSwitchView,
  onOpenCreateOrder,
  onOpenExcelImport,
  onOpenIndiaPostModal,
  onOpenBulkLabels,
  onSelectInvoice,
  onSelectLabel,
  onSelectEdit,
  onSelectDelete,
  selectedOrderIds = [],
  onToggleSelectOrder,
  onSelectAll,
  isAllSelected = false,
  bulkStatusMutation,
  singleTransitionMutation,
  autoDispatchMutation,
  exportOrders,
  search = '',
  setSearch,
  statusFilter = '',
  setStatusFilter,
  districtFilter = '',
  setDistrictFilter,
  startDate = '',
  setStartDate,
  endDate = '',
  setEndDate,
  refetchOrders
}) {
  const navigate = useNavigate();

  // Local state for Full View console
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [telecallerFilter, setTelecallerFilter] = useState('');
  const [myOrdersOnly, setMyOrdersOnly] = useState(false);
  const [specialFilter, setSpecialFilter] = useState('ALL'); // 'ALL' | 'DUPLICATES' | 'STUCK' | 'PREPAID_PENDING' | 'NOT_EXPORTED'
  
  const [searchMultipleOpen, setSearchMultipleOpen] = useState(false);
  const [multiPhoneInput, setMultiPhoneInput] = useState('');
  const [appliedMultiPhones, setAppliedMultiPhones] = useState([]);

  const [bulkStatusToApply, setBulkStatusToApply] = useState('');
  const [forceRevertChecked, setForceRevertChecked] = useState(false);
  const [telecallerSalesModalOpen, setTelecallerSalesModalOpen] = useState(false);

  // Formatted Current Timestamp matching "05 Oct 2026 02:56 PM"
  const formattedTimestamp = useMemo(() => {
    return new Date().toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }, []);

  // Duplicate Phone Detection across orders
  const { duplicateOrders, phoneDuplicateCounts } = useMemo(() => {
    const counts = {};
    orders.forEach((o) => {
      const raw = o.patientDetails?.mobile || o.customerId?.mobile || o.deliveryAddress?.phone || '';
      const clean = raw.replace(/[^0-9]/g, '').slice(-10);
      if (clean && clean.length === 10) {
        counts[clean] = (counts[clean] || 0) + 1;
      }
    });

    const dups = orders.filter((o) => {
      const raw = o.patientDetails?.mobile || o.customerId?.mobile || o.deliveryAddress?.phone || '';
      const clean = raw.replace(/[^0-9]/g, '').slice(-10);
      return clean && counts[clean] > 1;
    });

    return { duplicateOrders: dups, phoneDuplicateCounts: counts };
  }, [orders]);

  // Stuck Shipped / Outstanding Orders
  const { stuckOrders, stuckTotalAmount } = useMemo(() => {
    const stuck = orders.filter((o) => {
      const daysOld = (Date.now() - new Date(o.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      const isStuckStatus = ['READY_FOR_DISPATCH', 'DISPATCHED', 'IN_TRANSIT'].includes(o.status);
      const isUnpaidPending = (o.paymentMethod === 'COD' || o.paymentStatus !== 'PAID') && !['DELIVERED', 'CANCELLED'].includes(o.status);
      return isStuckStatus || isUnpaidPending || daysOld >= 2;
    });
    const total = stuck.reduce((acc, o) => acc + (o.grandTotal || 0), 0);
    return { stuckOrders: stuck, stuckTotalAmount: total };
  }, [orders]);

  // Prepaid orders with pending payment
  const prepaidPendingOrders = useMemo(() => {
    return orders.filter((o) => {
      const isPrepaid = ['PREPAID', 'ONLINE', 'UPI'].includes(o.paymentMethod);
      return isPrepaid && (o.paymentStatus === 'PENDING' || !o.paymentStatus || o.paymentStatus === 'COD_PENDING');
    });
  }, [orders]);

  // Unexported Orders (Packed or Ready for Dispatch without tracking number)
  const notExportedOrders = useMemo(() => {
    return orders.filter((o) => !o.trackingNumber && ['PACKED', 'READY_FOR_DISPATCH'].includes(o.status));
  }, [orders]);

  const indiaPostReadyCount = useMemo(() => {
    return orders.filter((o) => (o.courierName === 'India Post' || !o.courierName) && ['PACKED', 'READY_FOR_DISPATCH'].includes(o.status)).length;
  }, [orders]);

  const professionalReadyCount = useMemo(() => {
    return orders.filter((o) => /professional/i.test(o.courierName || '') && ['PACKED', 'READY_FOR_DISPATCH'].includes(o.status)).length;
  }, [orders]);

  // RTO Low Risk Orders
  const lowRiskOrdersCount = useMemo(() => {
    return orders.filter((o) => ['CONFIRMED', 'PACKED', 'DELIVERED'].includes(o.status)).length;
  }, [orders]);

  // Apply Multi-Number Search Filter
  const handleApplyMultiNumbers = () => {
    if (!multiPhoneInput.trim()) {
      setAppliedMultiPhones([]);
      return;
    }
    const extracted = multiPhoneInput
      .split(/[\n,; ]+/)
      .map((s) => s.replace(/[^0-9]/g, '').slice(-10))
      .filter((s) => s.length >= 7);
    setAppliedMultiPhones(extracted);
  };

  // Filtered orders list for the table
  const displayOrders = useMemo(() => {
    let list = orders;

    // Special chip filter
    if (specialFilter === 'DUPLICATES') {
      list = duplicateOrders;
    } else if (specialFilter === 'STUCK') {
      list = stuckOrders;
    } else if (specialFilter === 'PREPAID_PENDING') {
      list = prepaidPendingOrders;
    } else if (specialFilter === 'NOT_EXPORTED') {
      list = notExportedOrders;
    }

    // Applied Multi Phone Numbers
    if (appliedMultiPhones.length > 0) {
      list = list.filter((o) => {
        const raw = o.patientDetails?.mobile || o.customerId?.mobile || o.deliveryAddress?.phone || '';
        const clean = raw.replace(/[^0-9]/g, '').slice(-10);
        return appliedMultiPhones.includes(clean);
      });
    }

    // Payment Method filter
    if (paymentMethodFilter && paymentMethodFilter !== 'ALL') {
      list = list.filter((o) => {
        if (paymentMethodFilter === 'PREPAID') {
          return ['PREPAID', 'ONLINE', 'UPI'].includes(o.paymentMethod);
        }
        return o.paymentMethod === paymentMethodFilter;
      });
    }

    // Product filter
    if (productFilter && productFilter !== 'ALL') {
      list = list.filter((o) =>
        o.items?.some((i) =>
          (i.productId?._id || i.productId) === productFilter ||
          i.productName?.toLowerCase().includes(productFilter.toLowerCase())
        )
      );
    }

    // Telecaller filter
    if (telecallerFilter && telecallerFilter !== 'ALL') {
      list = list.filter((o) =>
        (o.assignedTo?._id || o.assignedTo || o.telecallerId?._id || o.telecallerId) === telecallerFilter
      );
    }

    // My own orders only
    if (myOrdersOnly && user?._id) {
      list = list.filter((o) =>
        (o.assignedTo?._id || o.assignedTo || o.telecallerId?._id || o.telecallerId || o.createdBy?._id || o.createdBy) === user._id
      );
    }

    return list;
  }, [
    orders,
    specialFilter,
    duplicateOrders,
    stuckOrders,
    prepaidPendingOrders,
    notExportedOrders,
    appliedMultiPhones,
    paymentMethodFilter,
    productFilter,
    telecallerFilter,
    myOrdersOnly,
    user
  ]);

  // Bulk status submission
  const handleBulkUpdateStatus = () => {
    if (!bulkStatusToApply) return;
    if (selectedOrderIds.length === 0) return;
    bulkStatusMutation.mutate({
      orderIds: selectedOrderIds,
      status: bulkStatusToApply,
      forceRevert: forceRevertChecked
    });
  };

  return (
    <div className="space-y-3 font-sans pb-16">
      {/* ── 1. Top Navy Header Bar (matching Image 2) ── */}
      <div className="bg-[#1a237e] text-white px-5 py-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div>
          <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
            Orders Panel
          </h1>
          <p className="text-xs text-blue-200 mt-0.5 font-mono font-medium tracking-wide">
            {formattedTimestamp}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={onSwitchView}
            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs shadow-xs cursor-pointer"
          >
            🗂️ Card View
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => navigate('/dashboard')}
            className="bg-white/20 hover:bg-white/30 text-white border border-white/30 font-bold text-xs shadow-xs cursor-pointer"
          >
            Dashboard
          </Button>
        </div>
      </div>

      {/* ── 2. Six Metric Cards Grid (matching Image 2) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. New */}
        <div
          onClick={() => {
            setStatusFilter(statusFilter === 'NEW' ? '' : 'NEW');
            setSpecialFilter('ALL');
          }}
          className={`bg-white rounded-2xl border p-4 shadow-xs text-center cursor-pointer transition-all hover:border-blue-400 ${
            statusFilter === 'NEW' ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/20' : 'border-slate-200'
          }`}
        >
          <div className="text-2xl sm:text-3xl font-black text-[#1e88e5] font-mono">
            {metrics.newOrdersCount ?? 0}
          </div>
          <div className="text-xs font-semibold text-slate-500 mt-1">New</div>
        </div>

        {/* 2. Packed */}
        <div
          onClick={() => {
            setStatusFilter(statusFilter === 'PACKED' ? '' : 'PACKED');
            setSpecialFilter('ALL');
          }}
          className={`bg-white rounded-2xl border p-4 shadow-xs text-center cursor-pointer transition-all hover:border-orange-400 ${
            statusFilter === 'PACKED' ? 'ring-2 ring-orange-500 border-orange-500 bg-orange-50/20' : 'border-slate-200'
          }`}
        >
          <div className="text-2xl sm:text-3xl font-black text-[#fb8c00] font-mono">
            {metrics.packedCount ?? 0}
          </div>
          <div className="text-xs font-semibold text-slate-500 mt-1">Packed</div>
        </div>

        {/* 3. Shipped */}
        <div
          onClick={() => {
            setStatusFilter(statusFilter === 'IN_TRANSIT' ? '' : 'IN_TRANSIT');
            setSpecialFilter('ALL');
          }}
          className={`bg-white rounded-2xl border p-4 shadow-xs text-center cursor-pointer transition-all hover:border-emerald-400 ${
            statusFilter === 'IN_TRANSIT' ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/20' : 'border-slate-200'
          }`}
        >
          <div className="text-2xl sm:text-3xl font-black text-[#43a047] font-mono">
            {metrics.shippedCount ?? 0}
          </div>
          <div className="text-xs font-semibold text-slate-500 mt-1">Shipped</div>
        </div>

        {/* 4. Delivered */}
        <div
          onClick={() => {
            setStatusFilter(statusFilter === 'DELIVERED' ? '' : 'DELIVERED');
            setSpecialFilter('ALL');
          }}
          className={`bg-white rounded-2xl border p-4 shadow-xs text-center cursor-pointer transition-all hover:border-teal-400 ${
            statusFilter === 'DELIVERED' ? 'ring-2 ring-teal-500 border-teal-500 bg-teal-50/20' : 'border-slate-200'
          }`}
        >
          <div className="text-2xl sm:text-3xl font-black text-[#43a047] font-mono">
            {metrics.deliveredOrdersCount ?? 0}
          </div>
          <div className="text-xs font-semibold text-slate-500 mt-1">Delivered</div>
        </div>

        {/* 5. RTO */}
        <div
          onClick={() => {
            setStatusFilter(statusFilter === 'RTO' ? '' : 'RTO');
            setSpecialFilter('ALL');
          }}
          className={`bg-white rounded-2xl border p-4 shadow-xs text-center cursor-pointer transition-all hover:border-rose-400 ${
            statusFilter === 'RTO' ? 'ring-2 ring-rose-500 border-rose-500 bg-rose-50/20' : 'border-slate-200'
          }`}
        >
          <div className="text-2xl sm:text-3xl font-black text-[#e53935] font-mono">
            {metrics.rtoOrdersCount ?? 0}
          </div>
          <div className="text-xs font-semibold text-slate-500 mt-1">RTO</div>
        </div>

        {/* 6. Revenue */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs text-center">
          <div className="text-xl sm:text-2xl font-black text-[#8e24aa] font-mono truncate">
            Rs {(metrics.todayRev ?? meta.totalRevenue ?? 0).toLocaleString()}
          </div>
          <div className="text-xs font-semibold text-slate-500 mt-1">Revenue</div>
        </div>
      </div>

      {/* ── 3. Red Alert Banner (Prepaid Payment Pending - Only when > 0) ── */}
      {prepaidPendingOrders.length > 0 && (
        <div className="bg-[#d32f2f] text-white px-4 py-2.5 rounded-xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
            <span>
              {prepaidPendingOrders.length} PREPAID {prepaidPendingOrders.length === 1 ? 'order' : 'orders'} with PAYMENT PENDING!
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSpecialFilter(specialFilter === 'PREPAID_PENDING' ? 'ALL' : 'PREPAID_PENDING')}
            className="text-xs font-black bg-white text-[#d32f2f] hover:bg-red-50 px-3.5 py-1 rounded-full transition-colors cursor-pointer shadow-xs"
          >
            {specialFilter === 'PREPAID_PENDING' ? 'Show All Orders' : 'View All →'}
          </button>
        </div>
      )}

      {/* ── 4. Search and Multi-Dropdown Filter Box (matching Image 2) ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        {/* Full-width Search Input */}
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch && setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && refetchOrders) refetchOrders();
            }}
            placeholder="Search name, phone or tracking ID"
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium outline-none focus:bg-white focus:border-[#1a237e] transition-colors"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        {/* Dropdown Filters Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 items-center text-xs">
          {/* Date From */}
          <div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate && setStartDate(e.target.value)}
              placeholder="dd-mm-yyyy"
              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-700 outline-none focus:border-[#1a237e]"
            />
          </div>

          {/* Date To */}
          <div>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate && setEndDate(e.target.value)}
              placeholder="dd-mm-yyyy"
              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-700 outline-none focus:border-[#1a237e]"
            />
          </div>

          {/* All Status */}
          <div>
            <CustomSelect
              value={statusFilter}
              onChange={(e) => setStatusFilter && setStatusFilter(e.target.value)}
              options={STATUS_FILTER_OPTIONS}
              placeholder="All Status"
              size="sm"
              minWidth="min-w-[150px]"
            />
          </div>

          {/* All Payments */}
          <div>
            <CustomSelect
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              options={PAYMENT_FILTER_OPTIONS}
              placeholder="All Payments"
              size="sm"
              minWidth="min-w-[150px]"
            />
          </div>

          {/* All Districts */}
          <div>
            <CustomSelect
              value={districtFilter}
              onChange={(e) => setDistrictFilter && setDistrictFilter(e.target.value)}
              options={[
                { value: '', label: 'All Districts' },
                ...districts.map((d) => ({ value: d, label: d }))
              ]}
              placeholder="All Districts"
              searchable
              size="sm"
              minWidth="min-w-[160px]"
            />
          </div>

          {/* All Products */}
          <div>
            <CustomSelect
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              options={[
                { value: '', label: 'All Products' },
                ...products.map((p) => ({ value: p._id, label: p.name }))
              ]}
              placeholder="All Products"
              searchable
              size="sm"
              minWidth="min-w-[170px]"
            />
          </div>

          {/* All Telecallers */}
          <div>
            <CustomSelect
              value={telecallerFilter}
              onChange={(e) => setTelecallerFilter(e.target.value)}
              options={[
                { value: '', label: 'All Telecallers' },
                ...telecallers.map((tc) => ({ value: tc._id, label: tc.name }))
              ]}
              placeholder="All Telecallers"
              searchable
              size="sm"
              minWidth="min-w-[160px]"
            />
          </div>

          {/* Search Button & My Own Checkbox */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => refetchOrders && refetchOrders()}
              className="w-full px-3 py-1.5 rounded-lg bg-[#1a237e] hover:bg-[#0d145a] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer text-center"
            >
              Search
            </button>
          </div>
        </div>

        {/* Sub-bar: Search Multiple Numbers & Branch Status */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-2 border-t border-slate-100">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setSearchMultipleOpen(!searchMultipleOpen)}
              className="text-blue-700 hover:text-blue-900 font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>Search Multiple Numbers</span>
              <span className="text-[10px]">{searchMultipleOpen ? '▴' : '▾'}</span>
              {appliedMultiPhones.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 text-[10px] font-mono">
                  {appliedMultiPhones.length} applied
                </span>
              )}
            </button>

            <label className="flex items-center gap-1.5 text-slate-600 font-semibold cursor-pointer select-none">
              <input
                type="checkbox"
                checked={myOrdersOnly}
                onChange={(e) => setMyOrdersOnly(e.target.checked)}
                className="w-3.5 h-3.5 text-[#1a237e] rounded cursor-pointer"
              />
              <span>My own orders only</span>
            </label>
          </div>

          <div className="text-slate-500 font-medium flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Branch Status (1 branch, {orders.length} orders) ▾</span>
          </div>
        </div>

        {/* Expandable Multi-Number Search Drawer */}
        {searchMultipleOpen && (
          <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3 space-y-2 animate-fadeIn text-xs">
            <div className="flex items-center justify-between font-bold text-blue-900">
              <span>Paste Multiple Mobile Numbers (comma, space or newline separated):</span>
              <button
                type="button"
                onClick={() => setSearchMultipleOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <textarea
              rows={3}
              value={multiPhoneInput}
              onChange={(e) => setMultiPhoneInput(e.target.value)}
              placeholder="e.g. 9876543210, 9123456780, 8765432109..."
              className="w-full p-2 bg-white border border-blue-200 rounded-lg text-xs font-mono outline-none focus:border-blue-500"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleApplyMultiNumbers}
                className="px-3 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-bold text-xs cursor-pointer"
              >
                Filter Numbers
              </button>
              {appliedMultiPhones.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setAppliedMultiPhones([]);
                    setMultiPhoneInput('');
                  }}
                  className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-semibold text-xs cursor-pointer"
                >
                  Clear Filter
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── 5. Two Courier Summary Cards (India Post & Velocity) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* India Post Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" />
                <h4 className="font-bold text-slate-900 text-sm">India Post</h4>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-[11px] font-bold border border-red-200">
                {indiaPostReadyCount} ready to dispatch
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              {indiaPostReadyCount > 0
                ? `${indiaPostReadyCount} orders pending postal dispatch · Speed Post Tracking & Export`
                : 'All orders processed · Speed Post Tracking & Export'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenIndiaPostModal}
              className="px-3 py-1.5 rounded-lg bg-[#00897b] hover:bg-[#00695c] text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              📮 India Post Manifest
            </button>
            <button
              type="button"
              onClick={() => navigate('/scan-tracker?subtab=export')}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 cursor-pointer"
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* The Professional Courier Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: '#1e88e5' }} />
                <h4 className="font-bold text-slate-900 text-sm">The Professional Courier (TPC)</h4>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 text-[11px] font-bold border border-blue-200">
                {professionalReadyCount} ready to dispatch
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              {professionalReadyCount > 0
                ? `${professionalReadyCount} express prepaid orders ready · Direct courier dispatch`
                : 'All orders processed · Direct courier dispatch (API booking later)'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => exportOrders && exportOrders('csv')}
              className="px-3 py-1.5 rounded-lg bg-[#1e88e5] hover:bg-[#1565c0] text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
              style={{ backgroundColor: '#1e88e5', color: '#ffffff' }}
            >
              <span>⚡</span>
              <span>Export TPC Orders</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/shipping/tracking')}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 cursor-pointer"
            >
              Logistics Desk
            </button>
          </div>
        </div>
      </div>

      {/* ── 6. Action Chips Ribbon (matching Image 2) ── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* 1. Dispatch Orders (Auto Dispatch) */}
        <button
          type="button"
          onClick={() => autoDispatchMutation && autoDispatchMutation.mutate()}
          disabled={autoDispatchMutation?.isPending}
          className="px-3 py-1.5 rounded-lg bg-[#2e7d32] hover:bg-[#1b5e20] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Dispatch Orders</span>
        </button>

        {/* 2. Possible Duplicates */}
        <button
          type="button"
          onClick={() => setSpecialFilter(specialFilter === 'DUPLICATES' ? 'ALL' : 'DUPLICATES')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer ${
            specialFilter === 'DUPLICATES'
              ? 'bg-[#d84315] text-white ring-2 ring-orange-300'
              : 'bg-[#ef6c00] hover:bg-[#e65100] text-white'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>⚠️ Possible Duplicates</span>
          <span className="px-1.5 py-0.2 rounded-full bg-white text-[#ef6c00] text-[10px] font-black">
            {duplicateOrders.length}
          </span>
        </button>

        {/* 3. Telecaller Sales Info */}
        <button
          type="button"
          onClick={() => setTelecallerSalesModalOpen(true)}
          className="px-3 py-1.5 rounded-lg bg-[#1565c0] hover:bg-[#0d47a1] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Users className="w-3.5 h-3.5" />
          <span>Telecaller Sales Info</span>
        </button>

        {/* 4. India Post Export */}
        <button
          type="button"
          onClick={onOpenIndiaPostModal}
          className="px-3 py-1.5 rounded-lg bg-[#00897b] hover:bg-[#00695c] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <span>📮 India Post Export</span>
        </button>

        {/* 5. TPC Export */}
        <button
          type="button"
          onClick={() => exportOrders && exportOrders('csv')}
          className="px-3 py-1.5 rounded-lg bg-[#1e88e5] hover:bg-[#1565c0] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          style={{ backgroundColor: '#1e88e5', color: '#ffffff' }}
        >
          <span>⚡ TPC Export</span>
        </button>

        {/* 6. Not Exported */}
        <button
          type="button"
          onClick={() => setSpecialFilter(specialFilter === 'NOT_EXPORTED' ? 'ALL' : 'NOT_EXPORTED')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
            specialFilter === 'NOT_EXPORTED'
              ? 'bg-[#004d40] text-white ring-2 ring-teal-300'
              : 'bg-[#00695c] hover:bg-[#004d40] text-white'
          }`}
        >
          <span>Not Exported</span>
          <span className="px-1.5 py-0.2 rounded-full bg-white text-[#00695c] text-[10px] font-black">
            {notExportedOrders.length}
          </span>
        </button>

        {/* 7. Stuck Shipped / Outstanding */}
        <button
          type="button"
          onClick={() => setSpecialFilter(specialFilter === 'STUCK' ? 'ALL' : 'STUCK')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
            specialFilter === 'STUCK'
              ? 'bg-[#6a1b14] text-white ring-2 ring-red-300'
              : 'bg-[#8d281e] hover:bg-[#6a1b14] text-white'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Stuck Shipped / Outstanding</span>
          <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-mono font-bold">
            {stuckOrders.length} — ₹{stuckTotalAmount.toLocaleString()}
          </span>
        </button>

        {/* 8. Scan Tracker */}
        <button
          type="button"
          onClick={() => navigate('/scan-tracker')}
          className="px-3 py-1.5 rounded-lg bg-[#43a047] hover:bg-[#2e7d32] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Scan className="w-3.5 h-3.5" />
          <span>Scan Tracker</span>
        </button>

        {/* 9. + Add Order */}
        <button
          type="button"
          onClick={onOpenCreateOrder}
          className="px-3 py-1.5 rounded-lg bg-[#8e24aa] hover:bg-[#6a1b9a] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Order</span>
        </button>

        {/* 10. Import Excel */}
        <button
          type="button"
          onClick={onOpenExcelImport}
          className="px-3 py-1.5 rounded-lg bg-[#2e7d32] hover:bg-[#1b5e20] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Import Excel</span>
        </button>

        {/* 11. Online Orders */}
        <button
          type="button"
          onClick={() => setPaymentMethodFilter(paymentMethodFilter === 'ONLINE' ? '' : 'ONLINE')}
          className="px-3 py-1.5 rounded-lg bg-[#5c6bc0] hover:bg-[#3f51b5] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <span>🌐 Online Orders</span>
        </button>

        {/* 12. Card View switch button */}
        <button
          type="button"
          onClick={onSwitchView}
          className="px-3 py-1.5 rounded-lg bg-[#1a237e] hover:bg-[#0d145a] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 ml-auto transition-colors cursor-pointer"
        >
          <span>🗂️ Card View</span>
        </button>
      </div>

      {/* ── 7. Bulk Actions Toolbar (matching Image 2) ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Bulk Actions</span>
          <label className="flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={onSelectAll}
              className="w-4 h-4 rounded text-ayur-600 focus:ring-ayur-500 cursor-pointer"
            />
            <span>Select All</span>
          </label>

          <div className="flex items-center gap-2">
            <CustomSelect
              value={bulkStatusToApply}
              onChange={(e) => setBulkStatusToApply(e.target.value)}
              options={BULK_STATUS_OPTIONS}
              placeholder="-- Bulk Update Status --"
              minWidth="min-w-[210px]"
              size="sm"
            />

            <label className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={forceRevertChecked}
                onChange={(e) => setForceRevertChecked(e.target.checked)}
                className="w-3.5 h-3.5 text-emerald-600 rounded cursor-pointer"
              />
              <span>force revert</span>
            </label>

            <button
              type="button"
              disabled={selectedOrderIds.length === 0 || !bulkStatusToApply}
              onClick={handleBulkUpdateStatus}
              className="px-3 py-1.5 rounded-lg bg-[#1a237e] hover:bg-[#0d145a] disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              Update Status
            </button>

            <button
              type="button"
              disabled={selectedOrderIds.length === 0}
              onClick={onOpenBulkLabels}
              className="px-3 py-1.5 rounded-lg bg-[#37474f] hover:bg-[#263238] disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              Print labels
            </button>

            <button
              type="button"
              disabled={selectedOrderIds.length === 0}
              onClick={() => {
                bulkStatusMutation &&
                  bulkStatusMutation.mutate({
                    orderIds: selectedOrderIds,
                    status: 'DISPATCHED',
                    forceRevert: true
                  });
              }}
              className="px-3 py-1.5 rounded-lg bg-[#00897b] hover:bg-[#00695c] disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              Mark Shipped Elsewhere (Clear Not Exported)
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => exportOrders && exportOrders('csv')}
          className="px-3 py-1.5 rounded-lg bg-[#00695c] hover:bg-[#004d40] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download Full Info (CSV)</span>
        </button>
      </div>

      {/* ── 8. RTO Low Risk Banner (matching Image 2) ── */}
      <div className="bg-emerald-50/90 border border-emerald-300 rounded-xl px-4 py-2 flex items-center justify-between text-xs text-emerald-950 font-medium shadow-xs">
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-0.5 rounded-full bg-[#2e7d32] text-white font-black text-[11px] tracking-wide">
            RTO LOW RISK ({lowRiskOrdersCount})
          </span>
          <span className="text-emerald-800 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Buyer confirmed
          </span>
        </div>

        {specialFilter !== 'ALL' && (
          <div className="flex items-center gap-2">
            <span className="font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded text-[11px]">
              Active Filter: {specialFilter} ({displayOrders.length} orders)
            </span>
            <button
              type="button"
              onClick={() => setSpecialFilter('ALL')}
              className="text-xs font-black text-rose-600 hover:text-rose-800 underline cursor-pointer"
            >
              Clear Filter ✕
            </button>
          </div>
        )}
      </div>

      {/* ── 9. Comprehensive Data Table ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-sm scrollbar-thin">
        <table className="w-full min-w-[980px] text-xs text-left">
          <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur-xs text-slate-700 uppercase tracking-wider font-semibold border-b shadow-2xs select-none">
            <tr>
              <th className="p-3 w-10">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={onSelectAll}
                  className="w-4 h-4 rounded text-ayur-600 focus:ring-ayur-500"
                />
              </th>
              <th className="p-3">Order Number</th>
              <th className="p-3">Customer & Phone</th>
              <th className="p-3">Items & Kit</th>
              <th className="p-3">Total (₹) & Pay</th>
              <th className="p-3">Order Status</th>
              <th className="p-3">Quick Change</th>
              <th className="p-3">District / City</th>
              <th className="p-3">Telecaller</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displayOrders.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-12 text-center text-slate-400">
                  <div className="font-bold text-slate-700 text-sm">No orders matching current filter</div>
                  <p className="text-xs text-slate-400 mt-1">Try resetting the special filter or adjusting search parameters.</p>
                </td>
              </tr>
            ) : (
              displayOrders.map((row) => {
                const pat = row.patientDetails || {};
                const addr = row.deliveryAddress || {};
                const customerName = pat.patientName || row.customerId?.name || 'Customer';
                const mobile = pat.mobile || row.customerId?.mobile || addr.phone || '';
                const cleanPhone = mobile.replace(/[^0-9]/g, '').slice(-10);
                const isDuplicate = cleanPhone && (phoneDuplicateCounts[cleanPhone] || 0) > 1;
                const statusMeta = STATUS_META[row.status] || { label: row.status, bg: 'bg-slate-100 text-slate-700' };
                const isSelected = selectedOrderIds.includes(row._id);

                return (
                  <tr
                    key={row._id}
                    className={`hover:bg-slate-50 transition-colors ${
                      isSelected ? 'bg-emerald-50/20' : ''
                    } ${isDuplicate ? 'bg-amber-50/20' : ''}`}
                  >
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelectOrder && onToggleSelectOrder(row._id)}
                        className="w-4 h-4 rounded text-ayur-600 focus:ring-ayur-500"
                      />
                    </td>

                    {/* Order Number & Date */}
                    <td className="p-3">
                      <span className="font-bold font-mono text-slate-900 block">{row.orderNumber}</span>
                      <span className="text-[10px] text-slate-400 block">
                        {new Date(row.createdAt).toLocaleDateString('en-GB')}
                      </span>
                    </td>

                    {/* Customer & Phone */}
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900">{customerName}</span>
                        {isDuplicate && (
                          <span className="px-1.5 py-0.2 rounded-full bg-orange-100 text-orange-800 text-[9px] font-black" title="Possible Duplicate Order">
                            DUP
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600 font-mono text-[11px] mt-0.5">
                        <span>{mobile || '—'}</span>
                        {mobile && (
                          <div className="flex items-center gap-1">
                            <a
                              href={`tel:${mobile}`}
                              className="text-slate-400 hover:text-emerald-700 p-0.5 rounded"
                              title="Call"
                            >
                              <Phone className="w-3 h-3" />
                            </a>
                            <a
                              href={`https://wa.me/91${cleanPhone}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-600 hover:text-emerald-700 p-0.5 rounded"
                              title="WhatsApp"
                            >
                              <MessageSquare className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Items */}
                    <td className="p-3 text-slate-700 max-w-[200px] truncate" title={row.items?.map((i) => `${i.productName} (x${i.quantity})`).join(', ')}>
                      {row.items?.map((i) => `${i.productName} (x${i.quantity})`).join(', ') || 'Ayurvedic Kit'}
                    </td>

                    {/* Amount & Payment */}
                    <td className="p-3">
                      <span className="font-bold font-mono text-slate-900 block">₹{row.grandTotal?.toLocaleString()}</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] uppercase font-bold text-slate-500">
                          {row.paymentMethod || 'COD'}
                        </span>
                        {row.courierName && (
                          <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-semibold border ${
                            row.courierName.includes('Professional')
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {row.courierName.includes('Professional') ? '⚡ TPC' : '📮 Post'}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="p-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusMeta.bg}`}>
                        {statusMeta.label}
                      </span>
                    </td>

                    {/* Quick Status Dropdown */}
                    <td className="p-3">
                      <div className="relative inline-block">
                        <select
                          value={row.status}
                          onChange={(e) => {
                            singleTransitionMutation &&
                              singleTransitionMutation.mutate({
                                orderId: row._id,
                                status: e.target.value,
                                forceRevert: true
                              });
                          }}
                          className="appearance-none pl-2.5 pr-6 py-1 bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 rounded-lg text-[11px] font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all cursor-pointer shadow-2xs"
                        >
                          <option value="NEW">New</option>
                          <option value="CONFIRMED">Confirmed</option>
                          <option value="PROCESSING">Processing</option>
                          <option value="PACKED">Packed</option>
                          <option value="READY_FOR_DISPATCH">Ready to Dispatch</option>
                          <option value="DISPATCHED">Shipped / Dispatched</option>
                          <option value="IN_TRANSIT">In Transit</option>
                          <option value="DELIVERED">Delivered</option>
                          <option value="DELIVERY_FAILED">Delivery Failed</option>
                          <option value="RTO">RTO</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-1.5 text-slate-400">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </td>

                    {/* District & City */}
                    <td className="p-3 text-slate-600">
                      <div>{addr.district || 'Krishnagiri'}</div>
                      <div className="text-[10px] text-slate-400">{addr.city || 'Hosur'}</div>
                    </td>

                    {/* Telecaller */}
                    <td className="p-3 text-slate-600 text-[11px]">
                      {row.assignedTo?.name || row.telecallerId?.name || row.createdBy?.name || 'Central'}
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onSelectInvoice && onSelectInvoice(row)}
                          className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                          title="Tax Invoice"
                        >
                          🧾
                        </button>
                        <button
                          type="button"
                          onClick={() => onSelectLabel && onSelectLabel(row)}
                          className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                          title="Shipping Label"
                        >
                          🏷️
                        </button>
                        <button
                          type="button"
                          onClick={() => onSelectEdit && onSelectEdit(row)}
                          className="p-1 rounded text-blue-600 hover:bg-blue-50"
                          title="Edit Order"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/orders/${row._id}`)}
                          className="p-1 rounded text-slate-600 hover:bg-slate-100"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onSelectDelete && onSelectDelete(row)}
                          className="p-1 rounded text-red-600 hover:bg-red-50"
                          title="Delete Order"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── 10. Telecaller Sales Info Modal ── */}
      {telecallerSalesModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 animate-fadeIn">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Telecaller Sales Performance</h3>
                  <p className="text-[11px] text-slate-400">Order bookings and sales breakdown by telecaller</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTelecallerSalesModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="text-[11px] font-bold text-blue-800">Active Staff</div>
                  <div className="text-xl font-bold font-mono text-blue-900 mt-0.5">{telecallers.length}</div>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="text-[11px] font-bold text-emerald-800">Total Bookings</div>
                  <div className="text-xl font-bold font-mono text-emerald-900 mt-0.5">{orders.length}</div>
                </div>
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
                  <div className="text-[11px] font-bold text-purple-800">Total Revenue</div>
                  <div className="text-xl font-bold font-mono text-purple-900 mt-0.5">
                    ₹{(meta.totalRevenue ?? 0).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
                    <tr>
                      <th className="p-2.5">Telecaller</th>
                      <th className="p-2.5">Email / Phone</th>
                      <th className="p-2.5">Bookings</th>
                      <th className="p-2.5">Confirmed</th>
                      <th className="p-2.5">Shipped / Delivered</th>
                      <th className="p-2.5 text-right">Revenue (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {telecallers.map((tc) => {
                      const tcOrders = orders.filter(
                        (o) => (o.assignedTo?._id || o.assignedTo || o.telecallerId?._id || o.telecallerId) === tc._id
                      );
                      const confirmedCount = tcOrders.filter((o) => ['CONFIRMED', 'PACKED', 'DISPATCHED', 'DELIVERED'].includes(o.status)).length;
                      const shippedCount = tcOrders.filter((o) => ['DISPATCHED', 'IN_TRANSIT', 'DELIVERED'].includes(o.status)).length;
                      const rev = tcOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);

                      return (
                        <tr key={tc._id} className="hover:bg-slate-50">
                          <td className="p-2.5 font-bold text-slate-900">{tc.name}</td>
                          <td className="p-2.5 text-slate-500 font-mono text-[11px]">{tc.email || tc.mobile || '—'}</td>
                          <td className="p-2.5 font-mono font-bold text-blue-700">{tcOrders.length}</td>
                          <td className="p-2.5 font-mono text-emerald-700">{confirmedCount}</td>
                          <td className="p-2.5 font-mono text-indigo-700">{shippedCount}</td>
                          <td className="p-2.5 font-mono font-bold text-slate-900 text-right">₹{rev.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-100 flex justify-end bg-slate-50 rounded-b-2xl">
              <Button size="sm" variant="secondary" onClick={() => setTelecallerSalesModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrdersFullTableView;
