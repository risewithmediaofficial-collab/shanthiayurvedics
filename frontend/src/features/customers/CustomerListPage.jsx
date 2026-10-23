import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  UserCheck,
  ShoppingBag,
  MapPin,
  Phone,
  MessageSquare,
  Download,
  Pencil,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Clock,
  Sparkles,
  User,
  Users,
  CreditCard,
  X,
  ExternalLink,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import apiClient from '../../api/apiClient.js';
import { Table } from '../../components/common/Table.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Input } from '../../components/common/Input.jsx';
import { Modal } from '../../components/common/Modal.jsx';
import { Pagination } from '../../components/common/Pagination.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { OrderCreateModal } from '../orders/OrderCreateModal.jsx';
import { CustomerProfileModal } from './CustomerProfileModal.jsx';
import { DateRangeFilter } from '../../components/common/DateRangeFilter.jsx';
import { ExportButton } from '../../components/common/ExportButton.jsx';
import { SortDropdown } from '../../components/common/SortDropdown.jsx';
import { exportToExcel, exportToCSV } from '../../utils/exportUtils.js';

const CUSTOMER_SORT_OPTIONS = [
  { value: 'createdAt', label: 'Registration Date' },
  { value: 'name', label: 'Customer Name' },
  { value: 'totalOrders', label: 'Total Orders' },
  { value: 'totalSpent', label: 'Lifetime Spent' },
  { value: 'mobile', label: 'Mobile Number' },
  { value: 'city', label: 'City / District' }
];

const getInitials = (name = '') => {
  const parts = (name || '').trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (name.slice(0, 2) || 'PT').toUpperCase();
};

const formatBranchName = (rawName = '') => {
  if (!rawName) return 'Hosur Main Hub';
  let clean = rawName.replace(/^SHANTHI\s+AYURVEDAS\s*/i, '').trim();
  if (clean === clean.toUpperCase() && clean.length > 3) {
    clean = clean
      .split(' ')
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(' ');
  }
  return clean || rawName;
};

export function CustomerListPage({ callerId, hideHeader = false }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'reorders'
  const [selectedCustomerForProfile, setSelectedCustomerForProfile] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [isExporting, setIsExporting] = useState(false);
  const [customerForOrder, setCustomerForOrder] = useState(null);
  const [customerToEdit, setCustomerToEdit] = useState(null);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [actionMsg, setActionMsg] = useState('');

  const [editFormData, setEditFormData] = useState({
    name: '',
    mobile: '',
    altMobile: '',
    email: '',
    fatherName: '',
    street: '',
    landmark: '',
    city: '',
    state: 'Tamil Nadu',
    pincode: '',
    notes: ''
  });

  const { data: customerResponse, isLoading } = useQuery({
    queryKey: ['customers', page, search, startDate, endDate, sortBy, sortOrder],
    queryFn: async () => {
      const res = await apiClient.get('/customers', {
        params: {
          page,
          limit: 15,
          search,
          startDate,
          endDate,
          sortBy,
          sortOrder
        }
      });
      return res.data;
    },
    enabled: activeTab === 'all'
  });

  // 15-Day Reorders Query
  const { data: reordersResponse, isLoading: isLoadingReorders } = useQuery({
    queryKey: ['reorders-due', page, search],
    queryFn: async () => {
      const res = await apiClient.get('/customers/reorders-due', {
        params: { page, limit: 15, search }
      });
      return res.data;
    },
    enabled: activeTab === 'reorders'
  });

  // Badge count for reorders due
  const { data: reorderCount = 0 } = useQuery({
    queryKey: ['reorders-count-badge'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/customers/reorders-due', { params: { limit: 1 } });
        return res.data?.meta?.total || 0;
      } catch (e) {
        return 0;
      }
    },
    refetchInterval: 45000
  });

  const triggerReorderCheckMutation = useMutation({
    mutationFn: () => apiClient.post('/customers/check-reorders'),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['reorders-due'] });
      queryClient.invalidateQueries({ queryKey: ['reorders-count-badge'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setActionMsg(`✓ ${res.data?.message || '15-day reorder check completed'}`);
      setTimeout(() => setActionMsg(''), 4000);
    }
  });

  const updateCustomerMutation = useMutation({
    mutationFn: ({ id, payload }) => apiClient.patch(`/customers/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setCustomerToEdit(null);
      setActionMsg('✓ Customer profile updated successfully');
      setTimeout(() => setActionMsg(''), 3000);
    },
    onError: (err) => {
      setActionMsg(`⚠ ${err.response?.data?.message || 'Failed to update customer'}`);
      setTimeout(() => setActionMsg(''), 4000);
    }
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`/customers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setCustomerToDelete(null);
      setActionMsg('✓ Customer removed successfully');
      setTimeout(() => setActionMsg(''), 3000);
    },
    onError: (err) => {
      setActionMsg(`⚠ ${err.response?.data?.message || 'Failed to remove customer'}`);
      setTimeout(() => setActionMsg(''), 4000);
    }
  });

  const customers = Array.isArray(customerResponse?.data) ? customerResponse?.data : [];
  const meta = customerResponse?.pagination || customerResponse?.meta || { page: 1, totalPages: 1, total: 0 };

  const handleOpenWhatsApp = (customer) => {
    const cleanMobile = (customer.mobile || '').replace(/\D/g, '').slice(-10);
    if (!cleanMobile) return;
    const textMsg = encodeURIComponent(
      `🌿 *Shanthi Ayurvedas Wellness*\n\n` +
        `Hello *${customer.name}*,\n` +
        `Greetings from Shanthi Ayurvedas. We hope you are feeling well!\n\n` +
        `Would you like to re-order your Ayurvedic wellness medicines?\n\n` +
        `🙏 Shanthi Ayurvedas Healthcare Team`
    );
    window.open(`https://wa.me/91${cleanMobile}?text=${textMsg}`, '_blank');
  };

  const handleExportCustomers = async (format) => {
    try {
      setIsExporting(true);
      const res = await apiClient.get('/customers', {
        params: {
          search,
          startDate,
          endDate,
          sortBy,
          sortOrder,
          export: true
        }
      });
      const exportList = res.data?.data || customers;
      if (!exportList.length) {
        setActionMsg('⚠ No customer data to export');
        setTimeout(() => setActionMsg(''), 3000);
        return;
      }

      const rows = exportList.map((c) => {
        const addr = c.addresses?.[0] || {};
        return {
          'Customer Name': c.name || '',
          'Father / Spouse Name': c.fatherName || '',
          'Mobile': c.mobile || '',
          'Alt Mobile': c.altMobile || '',
          'Email': c.email || '',
          'Street Address': addr.street || '',
          'Landmark': addr.landmark || '',
          'City / District': addr.city || '',
          'State': addr.state || '',
          'Pincode': addr.pincode || '',
          'Branch': c.branchId?.name || '',
          'Assigned Telecaller': c.assignedTelecallerId?.name || '',
          'Total Orders': c.totalOrders || 0,
          'Lifetime Spent (₹)': c.totalSpent || 0,
          'Status': c.status || 'ACTIVE',
          'Registration Date': c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN') : ''
        };
      });

      const fileName = `Shanthi_Ayurvedas_Customers_${new Date().toISOString().split('T')[0]}`;
      if (format === 'csv') {
        exportToCSV(rows, fileName);
      } else {
        exportToExcel(rows, fileName, 'Customers');
      }
      setActionMsg(`✓ Exported ${rows.length} customers to ${format.toUpperCase()}`);
      setTimeout(() => setActionMsg(''), 3000);
    } catch (err) {
      console.error('Customer export failed:', err);
      setActionMsg('⚠ Failed to export customers');
      setTimeout(() => setActionMsg(''), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  // Bento Metrics Calculations
  const repeatCount = customers.filter((c) => (c.totalOrders || 0) > 1).length;
  const totalSpentSum = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0);

  // Desktop Table Columns
  const columns = [
    {
      header: 'Customer Details',
      cell: (row) => {
        const initials = getInitials(row.name);
        return (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-50 border border-emerald-200 text-emerald-800 font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs select-none">
              {initials}
            </div>
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => setSelectedCustomerForProfile(row)}
                className="font-bold text-slate-900 hover:text-emerald-700 hover:underline text-left cursor-pointer flex items-center gap-1.5 transition-colors group"
                title="View Complete Customer Profile & All Past Orders"
              >
                <span className="capitalize truncate tracking-tight text-xs sm:text-sm font-semibold text-slate-900 group-hover:text-emerald-700">
                  {row.name}
                </span>
                <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              </button>
              <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                <span>{row.mobile}</span>
              </div>
            </div>
          </div>
        );
      }
    },
    {
      header: 'Primary Address',
      cell: (row) => {
        const addr = row.addresses?.[0];
        if (!addr) return <span className="text-slate-400 italic text-xs">No address recorded</span>;
        return (
          <div className="text-xs text-slate-600 max-w-xs flex items-start gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="font-medium text-slate-800 truncate text-xs" title={addr.street || ''}>
                {addr.street || 'Standard Delivery Address'}
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                {addr.city ? `${addr.city}, ` : ''}{addr.state || 'Tamil Nadu'} {addr.pincode ? `- ${addr.pincode}` : ''}
              </div>
            </div>
          </div>
        );
      }
    },
    {
      header: 'Total Orders',
      cell: (row) => {
        const count = row.totalOrders || 0;
        return (
          <button
            type="button"
            onClick={() => setSelectedCustomerForProfile(row)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200/60 transition-colors cursor-pointer"
            title="Click to view all orders"
          >
            <ShoppingBag className="w-3 h-3 text-slate-500" />
            <span>{count} {count === 1 ? 'order' : 'orders'}</span>
          </button>
        );
      }
    },
    {
      header: 'Lifetime Spent',
      cell: (row) => (
        <span className="inline-flex items-center font-mono font-bold text-xs text-emerald-700 bg-emerald-50/80 px-2.5 py-1 rounded-full border border-emerald-200/60">
          ₹{(row.totalSpent || 0).toLocaleString('en-IN')}
        </span>
      )
    },
    {
      header: 'Branch',
      cell: (row) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 tracking-tight">
          {formatBranchName(row.branchId?.name)}
        </span>
      )
    },
    {
      header: 'Actions',
      align: 'right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          {/* Quick Order CTA */}
          <button
            type="button"
            onClick={() => setCustomerForOrder(row)}
            title="New Prescription Order"
            className="px-2.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span className="hidden lg:inline text-[11px]">Order</span>
          </button>

          {/* Profile */}
          <button
            type="button"
            onClick={() => setSelectedCustomerForProfile(row)}
            title="View 360° Profile & Order History"
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
          >
            <User className="w-3.5 h-3.5" />
            <span className="hidden xl:inline text-[11px]">Profile</span>
          </button>

          {/* WhatsApp */}
          <button
            type="button"
            onClick={() => handleOpenWhatsApp(row)}
            title="Chat on WhatsApp"
            className="p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold transition-colors flex items-center cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </button>

          {/* Call */}
          <a
            href={`tel:${row.mobile}`}
            title="Call"
            className="p-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors flex items-center"
          >
            <Phone className="w-3.5 h-3.5" />
          </a>

          {/* Edit */}
          <button
            type="button"
            onClick={() => {
              const addr = row.addresses?.[0] || {};
              setCustomerToEdit(row);
              setEditFormData({
                name: row.name || '',
                mobile: row.mobile || '',
                altMobile: row.altMobile || '',
                email: row.email || '',
                fatherName: row.fatherName || '',
                street: addr.street || '',
                landmark: addr.landmark || '',
                city: addr.city || '',
                state: addr.state || 'Tamil Nadu',
                pincode: addr.pincode || '',
                notes: row.notes || ''
              });
            }}
            title="Edit Customer"
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-colors flex items-center cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>

          {/* Delete */}
          <button
            type="button"
            onClick={() => setCustomerToDelete(row)}
            title="Delete Customer"
            className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold transition-colors flex items-center cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }
  ];

  // Dedicated columns for 15-Day Reorders Queue
  const reorderColumns = [
    {
      header: 'Patient Details',
      cell: (row) => {
        const initials = getInitials(row.customerName);
        return (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-100 to-orange-50 border border-amber-200 text-amber-800 font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs select-none">
              {initials}
            </div>
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => setSelectedCustomerForProfile({ id: row.customerId, phone: row.mobile, name: row.customerName })}
                className="font-bold text-slate-900 hover:text-emerald-700 hover:underline text-left cursor-pointer flex items-center gap-1.5 transition-colors group"
              >
                <span className="capitalize truncate text-xs sm:text-sm font-semibold text-slate-900 group-hover:text-emerald-700">
                  {row.customerName}
                </span>
                <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              </button>
              <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                <span>{row.mobile}</span>
              </div>
            </div>
          </div>
        );
      }
    },
    {
      header: '15-Day Cycle Status',
      cell: (row) => (
        <div>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <Clock className="w-3 h-3 text-amber-700 shrink-0" />
            <span>{row.daysSinceOrder} days ago</span>
          </span>
          <div className="text-[10px] text-amber-800 font-semibold mt-0.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Medicine Course Completed
          </div>
        </div>
      )
    },
    {
      header: 'Previous Prescription',
      cell: (row) => (
        <div className="text-xs max-w-xs">
          <div className="font-mono font-bold text-slate-900">#{row.orderNumber}</div>
          <div className="text-slate-500 truncate text-[11px] mt-0.5" title={row.items?.map((i) => `${i.productName} (x${i.quantity})`).join(', ')}>
            {row.items?.map((i) => `${i.productName} (x${i.quantity})`).join(', ') || 'Ayurvedic Treatment Kit'}
          </div>
        </div>
      )
    },
    {
      header: 'Course Amount',
      cell: (row) => (
        <span className="font-bold font-mono text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
          ₹{(row.grandTotal || 0).toLocaleString('en-IN')}
        </span>
      )
    },
    {
      header: 'Assigned Telecaller',
      cell: (row) => (
        <div className="text-xs text-slate-700">
          <div className="font-semibold text-slate-900">{row.telecallerName}</div>
          {row.telecallerPhone && <div className="text-[10px] font-mono text-slate-400">{row.telecallerPhone}</div>}
        </div>
      )
    },
    {
      header: 'Actions',
      align: 'right',
      cell: (row) => {
        const cleanPhone = (row.mobile || '').replace(/[^0-9]/g, '').slice(-10);
        return (
          <div className="flex items-center justify-end gap-1.5">
            <a
              href={`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(`Vanakkam ${row.customerName}! Greetings from Shanthi Ayurvedas. Hope your 15-day course is completing well. Would you like to repeat your medicine refill for uninterrupted recovery?`)}`}
              target="_blank"
              rel="noreferrer"
              title="Chat on WhatsApp"
              className="p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold transition-colors flex items-center cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </a>
            <a
              href={`tel:${row.mobile}`}
              title="Call Patient"
              className="p-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors flex items-center"
            >
              <Phone className="w-3.5 h-3.5" />
            </a>
            <button
              type="button"
              onClick={() => setSelectedCustomerForProfile({ id: row.customerId, phone: row.mobile, name: row.customerName })}
              title="View Customer Profile & All Past Orders"
              className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5 text-slate-700" />
              <span className="hidden md:inline text-[11px]">Profile</span>
            </button>
            <button
              type="button"
              onClick={() => setCustomerForOrder({
                name: row.customerName,
                mobile: row.mobile,
                items: row.items
              })}
              title="Place Repeat Medicine Order"
              className="px-2.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Book Reorder</span>
            </button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-4">
      {/* Header bar (when standalone or not hideHeader) */}
      {!hideHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                Ayurvedic Patient Registry
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Customer Directory
            </h1>
            <p className="text-xs text-slate-500">
              Verified buyers, treatment courses & repeat medicine timelines converted from telecaller interactions.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center">
            <ExportButton
              onExport={handleExportCustomers}
              isLoading={isExporting}
              disabled={customers.length === 0}
            />
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {actionMsg && (
        <div className={`flex items-center gap-2 px-4 py-2.5 border text-sm font-semibold rounded-2xl shadow-xs transition-all ${
          actionMsg.startsWith('⚠')
            ? 'bg-amber-50 border-amber-200 text-amber-800'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* Bento Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Card 1: Verified Patients */}
        <div className="bento-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-700 flex items-center justify-center font-bold shadow-2xs">
                  <Users className="w-4 h-4" />
                </div>
                <div className="bento-metric-title">Verified Patients</div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200/60">
                Registry
              </span>
            </div>
            <div className="bento-metric-value text-slate-900 mt-1">
              {meta.total || customers.length}
            </div>
          </div>
          <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-100">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Total registered Ayurvedic patients
          </div>
        </div>

        {/* Card 2: Repeat Buyers */}
        <div className="bento-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200/80 text-teal-700 flex items-center justify-center font-bold shadow-2xs">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div className="bento-metric-title">Repeat Buyers</div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200/80">
                Care Retention
              </span>
            </div>
            <div className="bento-metric-value text-teal-700 mt-1">
              {repeatCount}
            </div>
          </div>
          <div className="text-[11px] text-teal-700 font-medium flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-100">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
            Multiple courses prescribed (2+ orders)
          </div>
        </div>

        {/* Card 3: Lifetime Value */}
        <div className="bento-card flex flex-col justify-between sm:col-span-2 lg:col-span-1">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200/80 text-indigo-700 flex items-center justify-center font-bold shadow-2xs">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div className="bento-metric-title">Lifetime Value (LTV)</div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                Delivered
              </span>
            </div>
            <div className="bento-metric-value text-indigo-700 mt-1">
              ₹{totalSpentSum.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="text-[11px] text-indigo-600 font-medium flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-100">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
            Cumulative patient treatment revenue
          </div>
        </div>
      </div>

      {/* View Switcher Tabs: All Customers vs 15-Day Reorders Due */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-2 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => { setActiveTab('all'); setPage(1); }}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'all'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>All Customers</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeTab === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
            }`}>
              {meta.total || customers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('reorders'); setPage(1); }}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'reorders'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <RotateCcw className={`w-3.5 h-3.5 ${activeTab === 'reorders' ? 'text-white' : 'text-slate-400'}`} />
            <span>15-Day Reorders Due</span>
            {reorderCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeTab === 'reorders' ? 'bg-white text-amber-900' : 'bg-amber-500 text-white animate-pulse'
              }`}>
                {reorderCount}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'reorders' && (
          <button
            type="button"
            onClick={() => triggerReorderCheckMutation.mutate()}
            disabled={triggerReorderCheckMutation.isPending}
            className="text-xs px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs ml-auto"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-700" />
            <span>{triggerReorderCheckMutation.isPending ? 'Checking Orders...' : '⚡ Scan & Trigger Reorder Alerts'}</span>
          </button>
        )}
      </div>

      {/* Unified Search, Date Range, and Sorting Controls */}
      <div className="bento-card p-3.5 sm:p-4 space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="flex-1 min-w-[240px]">
            <Input
              placeholder={activeTab === 'all' ? "Search by customer name, mobile, city..." : "Search reorders by patient name, mobile, order #..."}
              icon={Search}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {activeTab === 'all' && (
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
              {/* Date Presets Filter */}
              <div className="crm-table-wrap overflow-x-auto scrollbar-none max-w-full">
                <DateRangeFilter
                  startDate={startDate}
                  endDate={endDate}
                  onChange={({ startDate: s, endDate: e }) => {
                    setStartDate(s);
                    setEndDate(e);
                    setPage(1);
                  }}
                />
              </div>

              {/* Sort Selector */}
              <div className="shrink-0">
                <SortDropdown
                  options={CUSTOMER_SORT_OPTIONS}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onChange={({ sortBy: sb, sortOrder: so }) => {
                    setSortBy(sb);
                    setSortOrder(so);
                    setPage(1);
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Table & Mobile Cards for Active Tab */}
      {activeTab === 'all' ? (
        <>
          {/* Desktop & Tablet Table View */}
          <div className="hidden md:block">
            <Table
              columns={columns}
              data={customers}
              isLoading={isLoading}
              emptyMessage="No customers found."
            />
          </div>

          {/* Mobile Native Card View (Phones < 768px) */}
          <div className="block md:hidden space-y-3">
            {isLoading ? (
              <div className="py-12 text-center bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
                <div className="inline-block animate-spin w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full"></div>
                <p className="mt-2 text-xs font-semibold text-slate-500">Loading customers...</p>
              </div>
            ) : customers.length === 0 ? (
              <div className="py-10 text-center bg-white rounded-2xl border border-slate-200 p-6 text-slate-500 shadow-2xs text-xs">
                No customers found matching your criteria.
              </div>
            ) : (
              customers.map((c) => {
                const initials = getInitials(c.name);
                const addr = c.addresses?.[0];
                return (
                  <div key={c._id} className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3.5 space-y-3">
                    {/* Top Row: Avatar + Name + Branch */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-50 border border-emerald-200 text-emerald-800 font-bold flex items-center justify-center text-xs shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => setSelectedCustomerForProfile(c)}
                            className="font-bold text-slate-900 text-left text-sm truncate flex items-center gap-1 hover:text-emerald-700"
                          >
                            <span className="capitalize">{c.name}</span>
                            <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          </button>
                          <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{c.mobile}</span>
                          </div>
                        </div>
                      </div>
                      <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {formatBranchName(c.branchId?.name)}
                      </span>
                    </div>

                    {/* Address snippet if available */}
                    {addr && (
                      <div className="text-xs text-slate-600 bg-slate-50/70 p-2 rounded-xl flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="truncate text-[11px]">
                          {addr.street ? `${addr.street}, ` : ''}{addr.city}, {addr.state} - {addr.pincode}
                        </span>
                      </div>
                    )}

                    {/* Stats Strip */}
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-xs">
                      <div className="bg-slate-50 p-2 rounded-xl">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Orders</span>
                        <span className="font-semibold text-slate-900">{c.totalOrders || 0} completed</span>
                      </div>
                      <div className="bg-emerald-50/60 p-2 rounded-xl">
                        <span className="text-[10px] font-bold text-emerald-600 uppercase block">Spent (LTV)</span>
                        <span className="font-mono font-bold text-emerald-800">₹{(c.totalSpent || 0).toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    {/* Action Buttons Row */}
                    <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setCustomerForOrder(c)}
                        className="flex-1 py-1.5 px-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-xs"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Order</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedCustomerForProfile(c)}
                        className="p-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                        title="Profile"
                      >
                        <User className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenWhatsApp(c)}
                        className="p-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                        title="WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>

                      <a
                        href={`tel:${c.mobile}`}
                        className="p-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                        title="Call"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>

                      <button
                        type="button"
                        onClick={() => {
                          const addr = c.addresses?.[0] || {};
                          setCustomerToEdit(c);
                          setEditFormData({
                            name: c.name || '',
                            mobile: c.mobile || '',
                            altMobile: c.altMobile || '',
                            email: c.email || '',
                            fatherName: c.fatherName || '',
                            street: addr.street || '',
                            landmark: addr.landmark || '',
                            city: addr.city || '',
                            state: addr.state || 'Tamil Nadu',
                            pincode: addr.pincode || '',
                            notes: c.notes || ''
                          });
                        }}
                        className="p-1.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setCustomerToDelete(c)}
                        className="p-1.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <Pagination
            currentPage={page}
            totalPages={meta.totalPages}
            totalItems={meta.total}
            itemsPerPage={15}
            onPageChange={setPage}
          />
        </>
      ) : (
        <>
          {/* Desktop Reorders Table */}
          <div className="hidden md:block">
            <Table
              columns={reorderColumns}
              data={reordersResponse?.data || []}
              isLoading={isLoadingReorders}
              emptyMessage="No patients currently due for 15-day course refills."
            />
          </div>

          {/* Mobile Reorders Cards */}
          <div className="block md:hidden space-y-3">
            {isLoadingReorders ? (
              <div className="py-12 text-center bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
                <div className="inline-block animate-spin w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full"></div>
                <p className="mt-2 text-xs font-semibold text-slate-500">Checking reorders...</p>
              </div>
            ) : (reordersResponse?.data || []).length === 0 ? (
              <div className="py-10 text-center bg-white rounded-2xl border border-slate-200 p-6 text-slate-500 shadow-2xs text-xs">
                No patients currently due for 15-day course refills.
              </div>
            ) : (
              (reordersResponse?.data || []).map((row) => (
                <div key={row.customerId || row.orderNumber} className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3.5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{row.customerName}</h4>
                      <p className="text-xs font-mono text-slate-500">{row.mobile}</p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      {row.daysSinceOrder}d ago
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl text-xs space-y-1">
                    <div className="text-slate-500 font-medium">Order #{row.orderNumber}</div>
                    <div className="text-slate-700 font-semibold truncate">
                      {row.items?.map((i) => `${i.productName} (x${i.quantity})`).join(', ') || 'Ayurvedic Treatment Kit'}
                    </div>
                    <div className="font-mono font-bold text-emerald-700">₹{(row.grandTotal || 0).toLocaleString('en-IN')}</div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setCustomerForOrder({
                        name: row.customerName,
                        mobile: row.mobile,
                        items: row.items
                      })}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Book Reorder</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedCustomerForProfile({ id: row.customerId, phone: row.mobile, name: row.customerName })}
                      className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700"
                    >
                      <User className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <Pagination
            currentPage={page}
            totalPages={reordersResponse?.meta?.totalPages || 1}
            totalItems={reordersResponse?.meta?.total || 0}
            itemsPerPage={15}
            onPageChange={setPage}
          />
        </>
      )}

      {/* Order Creation for Customer */}
      {customerForOrder && (
        <OrderCreateModal
          isOpen={Boolean(customerForOrder)}
          onClose={() => setCustomerForOrder(null)}
          initialPatientData={{
            name: customerForOrder.name,
            mobile: customerForOrder.mobile,
            fatherName: customerForOrder.fatherName,
            altMobile: customerForOrder.altMobile,
            city: customerForOrder.addresses?.[0]?.city || '',
            state: customerForOrder.addresses?.[0]?.state || 'Tamil Nadu',
            pincode: customerForOrder.addresses?.[0]?.pincode || ''
          }}
        />
      )}

      {/* Edit Customer Modal */}
      {customerToEdit && (
        <Modal
          isOpen={Boolean(customerToEdit)}
          onClose={() => setCustomerToEdit(null)}
          title={`Edit Customer: ${customerToEdit.name}`}
          maxWidth="max-w-xl"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateCustomerMutation.mutate({
                id: customerToEdit._id,
                payload: {
                  name: editFormData.name.trim(),
                  mobile: editFormData.mobile.trim(),
                  altMobile: editFormData.altMobile?.trim(),
                  email: editFormData.email?.trim(),
                  fatherName: editFormData.fatherName?.trim(),
                  notes: editFormData.notes?.trim(),
                  addresses: [
                    {
                      street: editFormData.street?.trim(),
                      landmark: editFormData.landmark?.trim(),
                      city: editFormData.city?.trim() || 'Hosur',
                      state: editFormData.state || 'Tamil Nadu',
                      pincode: editFormData.pincode?.trim() || '635109'
                    }
                  ]
                }
              });
            }}
            className="space-y-3.5"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Customer Name *"
                required
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              />
              <Input
                label="Father / Guardian Name"
                value={editFormData.fatherName}
                onChange={(e) => setEditFormData({ ...editFormData, fatherName: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Primary Mobile *"
                required
                value={editFormData.mobile}
                onChange={(e) => setEditFormData({ ...editFormData, mobile: e.target.value })}
              />
              <Input
                label="Alternate Mobile"
                value={editFormData.altMobile}
                onChange={(e) => setEditFormData({ ...editFormData, altMobile: e.target.value })}
              />
            </div>
            <Input
              label="Email Address"
              type="email"
              value={editFormData.email}
              onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
            />
            <Input
              label="Street Address"
              value={editFormData.street}
              onChange={(e) => setEditFormData({ ...editFormData, street: e.target.value })}
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="City / Town"
                value={editFormData.city}
                onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
              />
              <Input
                label="State"
                value={editFormData.state}
                onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })}
              />
              <Input
                label="Pincode"
                value={editFormData.pincode}
                onChange={(e) => setEditFormData({ ...editFormData, pincode: e.target.value })}
              />
            </div>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="secondary" type="button" className="w-full sm:w-auto" onClick={() => setCustomerToEdit(null)} disabled={updateCustomerMutation.isPending}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" className="w-full sm:w-auto" isLoading={updateCustomerMutation.isPending}>
                Save Customer
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Customer Modal */}
      {customerToDelete && (
        <Modal
          isOpen={Boolean(customerToDelete)}
          onClose={() => setCustomerToDelete(null)}
          title="Delete Customer Confirmation"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-100 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-red-800">
                <p className="font-bold mb-1">Are you sure you want to delete this customer?</p>
                <p>
                  Customer <strong>{customerToDelete.name}</strong> ({customerToDelete.mobile}) will be permanently removed.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setCustomerToDelete(null)} disabled={deleteCustomerMutation.isPending}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => deleteCustomerMutation.mutate(customerToDelete._id)}
                isLoading={deleteCustomerMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete Customer
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Customer Profile Modal with complete order history & 15-day reorder alert */}
      {selectedCustomerForProfile && (
        <CustomerProfileModal
          isOpen={Boolean(selectedCustomerForProfile)}
          onClose={() => setSelectedCustomerForProfile(null)}
          customerId={selectedCustomerForProfile._id || selectedCustomerForProfile.id}
          customerPhone={selectedCustomerForProfile.mobile || selectedCustomerForProfile.phone}
          initialData={selectedCustomerForProfile}
          onOrderCreated={() => {
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            queryClient.invalidateQueries({ queryKey: ['reorders-due'] });
            queryClient.invalidateQueries({ queryKey: ['orders'] });
          }}
        />
      )}
    </div>
  );
}

export default CustomerListPage;
