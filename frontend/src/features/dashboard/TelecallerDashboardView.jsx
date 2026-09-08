import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Phone,
  PhoneCall,
  MessageSquare,
  CalendarClock,
  ShoppingBag,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  LogOut,
  Plus,
  Search,
  Filter,
  DollarSign,
  Award,
  Activity,
  Sparkles,
  ChevronRight,
  RefreshCw,
  UserCheck,
  FileText,
  AlertCircle,
  X,
  Send,
  Zap,
  PhoneForwarded,
  ShieldCheck,
  CheckCircle,
  Stethoscope,
  HeartPulse,
  TrendingUp,
  RotateCcw,
  Edit3,
  Truck,
  Copy,
  ExternalLink,
  Package,
  Eye
} from 'lucide-react';
import { OrderDetailsModal } from './OrderDetailsModal.jsx';
import apiClient from '../../api/apiClient.js';
import { usePermissions } from '../../hooks/usePermissions.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useBranch } from '../../context/BranchContext.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Modal } from '../../components/common/Modal.jsx';
import { Input } from '../../components/common/Input.jsx';
import { Select } from '../../components/common/Select.jsx';
import { Spinner } from '../../components/common/Spinner.jsx';
import { SimpleProgressBar } from '../../components/common/SimpleProgressBar.jsx';

export function TelecallerDashboardView({ previewCaller, onSwitchToManagerView, onSwitchToBossView, returnView = 'MANAGER' }) {
  const { user, logout } = useAuth();
  const { selectedBranchId } = useBranch();
  const queryClient = useQueryClient();

  const callerName = previewCaller?.name || user?.name || 'KANAGAVALLI';
  const isPreview = Boolean(previewCaller || onSwitchToManagerView || onSwitchToBossView);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState('HOME');

  // Duty Check-in state
  const [isCheckedIn, setIsCheckedIn] = useState(true);
  const [dutyStartTime] = useState('09:30 AM');

  // Modal controls
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isEditOrderModalOpen, setIsEditOrderModalOpen] = useState(false);
  const [selectedOrderForEdit, setSelectedOrderForEdit] = useState(null);
  const [isOrderDetailsModalOpen, setIsOrderDetailsModalOpen] = useState(false);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState(null);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  const [editOrderForm, setEditOrderForm] = useState({
    patientName: '',
    phone: '',
    alternatePhone: '',
    street: '',
    city: '',
    district: '',
    pincode: '',
    status: 'CONFIRMED',
    grandTotal: 1850,
    paymentMethod: 'COD',
    paymentStatus: 'COD_PENDING',
    trackingNumber: '',
    notes: ''
  });
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [isConsultModalOpen, setIsConsultModalOpen] = useState(false);
  const [isCallCentreModalOpen, setIsCallCentreModalOpen] = useState(false);
  const [isCustomerProfileModalOpen, setIsCustomerProfileModalOpen] = useState(false);
  const [activeDialerIndex, setActiveDialerIndex] = useState(0);

  // Form states
  const [orderForm, setOrderForm] = useState({
    customerName: '',
    phone: '',
    street: '',
    city: '',
    state: 'Tamil Nadu',
    pincode: '',
    productName: 'Ayur Slim Care 500g',
    quantity: 1,
    unitPrice: 1499,
    paymentMethod: 'COD',
    notes: ''
  });

  const [leadForm, setLeadForm] = useState({
    name: '',
    phone: '',
    concern: 'Weight Loss & Belly Fat',
    city: 'Hosur',
    source: 'Call Centre / Direct',
    notes: ''
  });

  const [consultForm, setConsultForm] = useState({
    patientName: '',
    phone: '',
    consultType: 'Walk-in Direct',
    preferredTime: '11:00 AM',
    healthGoal: 'Weight Loss & Metabolism',
    notes: ''
  });

  const [callLogForm, setCallLogForm] = useState({
    leadId: '',
    phone: '',
    customerName: '',
    disposition: 'CONNECTED_INTERESTED',
    notes: '',
    followupDate: ''
  });

  const [customerSearchQuery, setCustomerSearchQuery] = useState('');

  // 1. Fetch Leads assigned to this caller
  const { data: leadsData, isLoading: isLeadsLoading } = useQuery({
    queryKey: ['tc-leads', callerName, selectedBranchId],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/leads?limit=50');
        return res.data?.data?.leads || res.data?.data || [];
      } catch (e) {
        return [];
      }
    }
  });

  // Fallback mock leads if none in database yet
  const leads = useMemo(() => {
    if (leadsData && leadsData.length > 0) return leadsData;
    return [
      {
        _id: 'lead-1',
        name: 'Kavitha Ramesh',
        phone: '9845012341',
        city: 'Hosur',
        status: 'NEW',
        concern: 'Weight Loss 60-Day Regimen',
        leadScore: 85,
        lastCall: 'Today, 10:15 AM'
      },
      {
        _id: 'lead-2',
        name: 'Suresh Kumar',
        phone: '9845012342',
        city: 'Krishnagiri',
        status: 'FOLLOWUP',
        concern: 'Belly Fat Reduction & Detox',
        leadScore: 92,
        lastCall: 'Yesterday, 04:30 PM'
      },
      {
        _id: 'lead-3',
        name: 'Meena Sundaram',
        phone: '9845012343',
        city: 'Bengaluru',
        status: 'INTERESTED',
        concern: 'Digestive & Metabolism Tea',
        leadScore: 78,
        lastCall: '06 Sep, 02:00 PM'
      },
      {
        _id: 'lead-4',
        name: 'Anand Natarajan',
        phone: '9845012344',
        city: 'Dharmapuri',
        status: 'NEW',
        concern: 'Joint Care & Herbal Oil',
        leadScore: 70,
        lastCall: 'Today, 11:00 AM'
      }
    ];
  }, [leadsData]);

  // 2. Fetch Orders closed by this caller
  const { data: ordersData, refetch: refetchOrders } = useQuery({
    queryKey: ['tc-orders', callerName, selectedBranchId],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/orders?limit=100');
        const list = res.data?.data?.orders || res.data?.data || [];
        return Array.isArray(list) ? list : [];
      } catch (e) {
        return [];
      }
    }
  });

  const orders = useMemo(() => {
    const rawList = ordersData && ordersData.length > 0 ? ordersData : [
      {
        _id: 'ord-101',
        orderNumber: 'AYUR-HSR-0891',
        customerName: 'Priya Dharshini',
        customerPhone: '9845019871',
        totalAmount: 1899,
        grandTotal: 1899,
        paymentMethod: 'COD',
        orderStatus: 'SHIPPED',
        status: 'SHIPPED',
        trackingNumber: 'IP108849201IN',
        deliveryAddress: { street: '14 Gandhi Road', city: 'Hosur', district: 'Krishnagiri', pincode: '635109' },
        items: [{ productName: 'Slim Herbal Decoction 500ml', quantity: 2 }]
      },
      {
        _id: 'ord-102',
        orderNumber: 'AYUR-HSR-0892',
        customerName: 'Raghavan S',
        customerPhone: '9845019872',
        totalAmount: 2499,
        grandTotal: 2499,
        paymentMethod: 'COD',
        orderStatus: 'DELIVERED',
        status: 'DELIVERED',
        trackingNumber: 'IP108849202IN',
        deliveryAddress: { street: '8 Nehru Street', city: 'Krishnagiri', district: 'Krishnagiri', pincode: '635001' },
        items: [{ productName: 'Ayur Slim 90-Day Kit', quantity: 1 }]
      },
      {
        _id: 'ord-103',
        orderNumber: 'AYUR-HSR-0893',
        customerName: 'Bhuvaneshwari M',
        customerPhone: '9845019873',
        totalAmount: 1450,
        grandTotal: 1450,
        paymentMethod: 'ONLINE',
        orderStatus: 'PACKED',
        status: 'CONFIRMED',
        trackingNumber: 'IP108849203IN',
        deliveryAddress: { street: '45 Cross Rd', city: 'Bengaluru', district: 'Bengaluru', pincode: '560001' },
        items: [{ productName: 'Triphala & Guggulu Combo', quantity: 1 }]
      }
    ];

    return rawList.map((o) => {
      const patientName =
        o.patientDetails?.patientName ||
        o.customerId?.name ||
        o.customerName ||
        'Valued Patient';

      const patientPhone =
        o.patientDetails?.mobile ||
        o.customerId?.mobile ||
        o.deliveryAddress?.phone ||
        o.customerPhone ||
        '9629985341';

      const amount = Number(o.grandTotal ?? o.totalAmount ?? o.subtotal ?? 1850);
      const status = (o.status || o.orderStatus || 'CONFIRMED').toUpperCase();
      const products =
        Array.isArray(o.items) && o.items.length > 0
          ? o.items
              .map((i) => `${i.quantity ? i.quantity + 'x ' : ''}${i.productName || i.title || 'Ayurvedic Med'}`)
              .join(', ')
          : 'Ayurvedic Treatment Pack';

      const tracking = o.trackingNumber || o.tracking?.trackingNumber || (status === 'SHIPPED' || status === 'DELIVERED' ? 'IP108849193IN' : 'Pending');
      const paymentMethod = o.paymentMethod || 'COD';
      const paymentStatus = o.paymentStatus || (paymentMethod === 'ONLINE' ? 'PAID' : 'COD_PENDING');
      const district = o.deliveryAddress?.district || o.deliveryAddress?.city || 'Hosur, TN';

      return {
        ...o,
        customerName: patientName,
        customerPhone: patientPhone,
        totalAmount: amount,
        grandTotal: amount,
        orderStatus: status,
        status,
        productsList: products,
        trackingNumber: tracking,
        paymentMethod,
        paymentStatus,
        district
      };
    });
  }, [ordersData]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchSearch =
        !orderSearch ||
        o.orderNumber?.toLowerCase().includes(orderSearch.toLowerCase()) ||
        o.customerName?.toLowerCase().includes(orderSearch.toLowerCase()) ||
        o.customerPhone?.includes(orderSearch) ||
        o.trackingNumber?.toLowerCase().includes(orderSearch.toLowerCase());

      const matchStatus = orderStatusFilter === 'ALL' || o.status === orderStatusFilter;

      return matchSearch && matchStatus;
    });
  }, [orders, orderSearch, orderStatusFilter]);

  const handleOpenOrderDetails = (order) => {
    setSelectedOrderForDetails(order);
    setIsOrderDetailsModalOpen(true);
  };

  const handleOpenEditOrder = (order) => {
    setSelectedOrderForEdit(order);
    setEditOrderForm({
      patientName: order.customerName || '',
      phone: order.customerPhone || '',
      alternatePhone: order.patientDetails?.alternateMobile || order.alternatePhone || '',
      street: order.deliveryAddress?.street || '',
      city: order.deliveryAddress?.city || '',
      district: order.deliveryAddress?.district || 'Krishnagiri',
      pincode: order.deliveryAddress?.pincode || '635109',
      status: order.status || 'CONFIRMED',
      grandTotal: order.grandTotal || order.totalAmount || 1850,
      paymentMethod: order.paymentMethod || 'COD',
      paymentStatus: order.paymentStatus || 'COD_PENDING',
      trackingNumber: order.trackingNumber === 'Pending' ? '' : (order.trackingNumber || ''),
      notes: order.notes || ''
    });
    setIsEditOrderModalOpen(true);
  };

  const updateOrderMutation = useMutation({
    mutationFn: async ({ orderId, payload }) => {
      const res = await apiClient.patch(`/orders/${orderId}`, payload);
      return res.data;
    },
    onSuccess: async () => {
      await refetchOrders();
      queryClient.invalidateQueries({ queryKey: ['tc-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setIsEditOrderModalOpen(false);
      setSelectedOrderForEdit(null);
      setActionSuccessMsg('Order updated and synced successfully!');
      setTimeout(() => setActionSuccessMsg(''), 4000);
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to update order');
    }
  });

  // Derived counts for KPI Ribbon
  const totalLeadsCount = leads.length;
  const followupsCount = leads.filter(l => l.status === 'FOLLOWUP' || l.status === 'NEW').length;
  const consultsCount = 4;
  const ordersCount = orders.length;

  // Mutations
  const createOrderMutation = useMutation({
    mutationFn: async (payload) => {
      return apiClient.post('/orders', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tc-orders']);
      queryClient.invalidateQueries(['orders']);
      setIsOrderModalOpen(false);
      setOrderForm({
        customerName: '',
        phone: '',
        street: '',
        city: '',
        state: 'Tamil Nadu',
        pincode: '',
        productName: 'Ayur Slim Care 500g',
        quantity: 1,
        unitPrice: 1499,
        paymentMethod: 'COD',
        notes: ''
      });
      alert('Order created successfully!');
    }
  });

  const createLeadMutation = useMutation({
    mutationFn: async (payload) => {
      return apiClient.post('/leads', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tc-leads']);
      queryClient.invalidateQueries(['leads']);
      setIsLeadModalOpen(false);
      setLeadForm({
        name: '',
        phone: '',
        concern: 'Weight Loss & Belly Fat',
        city: 'Hosur',
        source: 'Call Centre / Direct',
        notes: ''
      });
      alert('Lead logged successfully!');
    }
  });

  // Telecaller Navigation Tabs List
  const tcTabs = [
    { id: 'HOME', label: 'Home', icon: Activity },
    { id: 'LEADS', label: `Leads (${totalLeadsCount})`, icon: Users },
    { id: 'FOLLOWUP', label: `Followup (${followupsCount})`, icon: CalendarClock },
    { id: 'CONSULTS', label: `Consults (${consultsCount})`, icon: Stethoscope },
    { id: 'ORDERS', label: `Orders (${ordersCount})`, icon: ShoppingBag },
    { id: 'CONVERTED', label: 'Converted', icon: CheckCircle2 },
    { id: 'LEAD_BANK', label: 'Lead Bank (12)', icon: Sparkles },
    { id: 'TREATMENT_FU', label: 'Treatment FU', icon: HeartPulse },
    { id: 'REORDER_CALLS', label: 'Reorder Calls (4)', icon: RotateCcw },
    { id: 'ATTENDANCE', label: 'Attendance', icon: Clock },
    { id: 'POWER_DIALER', label: '⚡ Power Dialer', icon: Zap }
  ];

  const handleOpenCallModal = (lead) => {
    setCallLogForm({
      leadId: lead._id || '',
      phone: lead.phone || '',
      customerName: lead.name || '',
      disposition: 'CONNECTED_INTERESTED',
      notes: '',
      followupDate: ''
    });
    setIsCallCentreModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {actionSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* 1. Header Bar */}
      <div className="bg-white text-slate-900 p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-700 border border-purple-100 flex items-center justify-center text-lg shadow-xs shrink-0 font-black">
            <PhoneCall className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                {callerName}
                {isPreview && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 uppercase tracking-wider">
                    Viewing Telecaller
                  </span>
                )}
              </h2>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wider">
                Hosur Branch · Zone 10
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Online" />
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })} · Checked in at {dutyStartTime}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          {/* Duty Check-in Toggle */}
          <button
            type="button"
            id="btn-tc-duty-toggle"
            onClick={() => setIsCheckedIn(!isCheckedIn)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              isCheckedIn
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            {isCheckedIn ? 'Checked In' : 'Duty Off'}
          </button>

          {/* Switch back to Boss Desk if Boss opened preview */}
          {onSwitchToBossView && (
            <Button
              id="btn-back-to-boss"
              variant="secondary"
              size="sm"
              onClick={onSwitchToBossView}
              className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-semibold shadow-xs"
            >
              ← Back to Boss Panel
            </Button>
          )}

          {/* Switch back to Manager Desk if in preview */}
          {onSwitchToManagerView && (
            <Button
              id="btn-back-to-manager"
              variant="secondary"
              size="sm"
              onClick={onSwitchToManagerView}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-semibold shadow-xs"
            >
              ← Back to Manager Desk
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            icon={LogOut}
            onClick={logout}
            className="bg-white hover:bg-rose-50 hover:text-rose-700 text-slate-600 border border-slate-200 text-xs font-semibold shadow-xs"
          >
            Logout
          </Button>
        </div>
      </div>

      {/* Supervisor Mode Banner */}
      {isPreview && (
        <div className="bg-purple-50/90 border border-purple-200/90 rounded-2xl p-3 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-purple-900 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse shrink-0" />
            <span>
              <strong>Supervisor Preview Mode:</strong> Viewing live workstation for <strong className="font-bold text-purple-950">{callerName}</strong> (Hosur Hub). Real-time calling station, dialer, leads & dispatch logs.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onSwitchToManagerView && (
              <button
                type="button"
                onClick={onSwitchToManagerView}
                className="font-bold underline hover:text-purple-700 cursor-pointer"
              >
                Manager Desk
              </button>
            )}
            {onSwitchToBossView && (
              <>
                <span className="text-purple-300">·</span>
                <button
                  type="button"
                  onClick={onSwitchToBossView}
                  className="font-bold underline hover:text-purple-700 cursor-pointer"
                >
                  Boss Panel
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* 2. Advisory Banner */}
      <div className="bg-emerald-700 text-white p-3.5 px-5 rounded-2xl shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white font-bold">
            🌿
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-white">
              Ayurvedic Weight Loss & Wellness Adviser Panel
            </h3>
            <p className="text-xs text-white/80">
              Patient Advisory & Care · Call Follow-ups · Dosage Guidance · Quick Invoicing
            </p>
          </div>
        </div>
        <span className="text-[11px] font-semibold bg-white/15 px-2.5 py-1 rounded-full text-white/90 hidden sm:inline">
          Active Calling Session
        </span>
      </div>

      {/* 3. KPI Ribbon (4 Metrics with Stroke Icons & Progress Bars) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="clean-card p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">MY LEADS</p>
            <div className="icon-box-emerald">
              <Users className="w-4 h-4" strokeWidth={1.75} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 font-mono">{totalLeadsCount}</div>
            <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">Assigned to me</p>
          </div>
          <SimpleProgressBar value={Math.min(100, totalLeadsCount * 10 || 40)} max={100} size="sm" color="emerald" />
        </div>

        <div className="clean-card p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">FOLLOWUPS</p>
            <div className="icon-box-amber">
              <CalendarClock className="w-4 h-4" strokeWidth={1.75} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-amber-700 font-mono">{followupsCount}</div>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Due today & overdue</p>
          </div>
          <SimpleProgressBar value={65} max={100} size="sm" color="amber" />
        </div>

        <div className="clean-card p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">CONSULTS</p>
            <div className="icon-box-blue">
              <Stethoscope className="w-4 h-4" strokeWidth={1.75} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-blue-700 font-mono">{consultsCount}</div>
            <p className="text-[11px] text-blue-600 font-medium mt-0.5">Scheduled inquiries</p>
          </div>
          <SimpleProgressBar value={50} max={100} size="sm" color="blue" />
        </div>

        <div className="clean-card p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">ORDERS</p>
            <div className="icon-box-purple">
              <ShoppingBag className="w-4 h-4" strokeWidth={1.75} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-purple-700 font-mono">{ordersCount}</div>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Closed & dispatched</p>
          </div>
          <SimpleProgressBar value={80} max={100} size="sm" color="purple" />
        </div>
      </div>

      {/* Daily Call Quota & Activity Layout Bar */}
      <div className="clean-card p-4 space-y-2 bg-gradient-to-r from-white via-white to-emerald-50/30">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-800 flex items-center gap-1.5">
            <PhoneCall className="w-3.5 h-3.5 text-emerald-700" strokeWidth={1.75} />
            Today's Telecalling Outreach Quota
          </span>
          <span className="text-[11px] font-mono text-slate-500">
            Target: <strong className="text-slate-800">50 Calls / Day</strong>
          </span>
        </div>
        <SimpleProgressBar value={34} max={50} size="md" color="emerald" label="Progress" sublabel="34 of 50 completed" />
      </div>

      {/* 4. Quick Actions Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <button
          type="button"
          id="btn-tc-book-consult"
          onClick={() => setIsConsultModalOpen(true)}
          className="flex items-center justify-center gap-2 p-3 bg-white hover:bg-purple-50/70 border border-slate-200 hover:border-purple-300 rounded-xl text-xs font-bold text-slate-700 hover:text-purple-800 shadow-2xs transition-all"
        >
          <Stethoscope className="w-4 h-4 text-purple-600" strokeWidth={1.75} />
          <span>Book Consult</span>
        </button>

        <button
          type="button"
          id="btn-tc-new-order"
          onClick={() => setIsOrderModalOpen(true)}
          className="flex items-center justify-center gap-2 p-3 bg-white hover:bg-emerald-50/70 border border-slate-200 hover:border-emerald-300 rounded-xl text-xs font-bold text-slate-700 hover:text-emerald-800 shadow-2xs transition-all"
        >
          <ShoppingBag className="w-4 h-4 text-emerald-600" strokeWidth={1.75} />
          <span>New Order</span>
        </button>

        <button
          type="button"
          id="btn-tc-new-lead"
          onClick={() => setIsLeadModalOpen(true)}
          className="flex items-center justify-center gap-2 p-3 bg-white hover:bg-rose-50/70 border border-slate-200 hover:border-rose-300 rounded-xl text-xs font-bold text-slate-700 hover:text-rose-800 shadow-2xs transition-all"
        >
          <PhoneForwarded className="w-4 h-4 text-rose-600" strokeWidth={1.75} />
          <span>Product Lead</span>
        </button>

        <button
          type="button"
          id="btn-tc-call-centre"
          onClick={() => {
            if (leads.length > 0) handleOpenCallModal(leads[0]);
            else setIsCallCentreModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 p-3 bg-white hover:bg-blue-50/70 border border-slate-200 hover:border-blue-300 rounded-xl text-xs font-bold text-slate-700 hover:text-blue-800 shadow-2xs transition-all"
        >
          <Phone className="w-4 h-4 text-blue-600" strokeWidth={1.75} />
          <span>Call Centre</span>
        </button>

        <button
          type="button"
          id="btn-tc-cust-profile"
          onClick={() => setIsCustomerProfileModalOpen(true)}
          className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 p-3 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 shadow-2xs transition-all"
        >
          <Search className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
          <span>Profile Search</span>
        </button>
      </div>

      {/* 5. Telecaller Tab Strip */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
        <div className="flex items-center gap-1 overflow-x-auto px-4 pt-3 border-b border-slate-100 scrollbar-none">
          {tcTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                id={`tab-tc-${tab.id.toLowerCase()}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-all whitespace-nowrap border-b-2 -mb-px ${
                  isActive
                    ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Container */}
        <div className="p-4 sm:p-5">
          {/* TAB 1: HOME (Priority Calling Queue) */}
          {activeTab === 'HOME' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Today's Priority Calling Queue</h3>
                  <p className="text-xs text-slate-500">Reach out to today's high-score patient inquiries</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">
                    {leads.length} active leads in queue
                  </span>
                  <button
                    type="button"
                    onClick={() => queryClient.invalidateQueries(['tc-leads'])}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                    title="Refresh Queue"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-2.5">
                {leads.map((lead) => (
                  <div
                    key={lead._id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 hover:bg-white border border-slate-200 hover:border-slate-300 rounded-xl transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 font-black text-sm flex items-center justify-center shrink-0">
                        {lead.name[0] || 'L'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs sm:text-sm text-slate-900">{lead.name}</span>
                          <Badge variant={lead.status === 'NEW' ? 'emerald' : lead.status === 'FOLLOWUP' ? 'amber' : 'neutral'} size="sm">
                            {lead.status}
                          </Badge>
                          {lead.leadScore && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                              {lead.leadScore} pts
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
                          <span>{lead.phone}</span>
                          <span>•</span>
                          <span>{lead.concern || 'Ayurvedic Wellness'}</span>
                          <span>•</span>
                          <span>{lead.city || 'Hosur'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                      <a
                        href={`tel:${lead.phone}`}
                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                      >
                        <Phone className="w-3 h-3" />
                        <span>Call</span>
                      </a>
                      <a
                        href={`https://wa.me/91${lead.phone}?text=${encodeURIComponent('Hello ' + lead.name + ', greeting from Shanthi Ayurvedas!')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold shadow-xs transition-colors"
                      >
                        <MessageSquare className="w-3 h-3 text-emerald-600" />
                        <span>WhatsApp</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => handleOpenCallModal(lead)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-xs transition-colors"
                      >
                        <FileText className="w-3 h-3 text-slate-500" />
                        <span>Log Call</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: LEADS (Assigned Leads) */}
          {activeTab === 'LEADS' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Assigned Patient Inquiries</h3>
                  <p className="text-xs text-slate-500">Filter, search, and manage your pipeline</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Search by patient name or phone..."
                    value={customerSearchQuery}
                    onChange={(e) => setCustomerSearchQuery(e.target.value)}
                    className="w-64 text-xs"
                  />
                  <Button
                    size="sm"
                    onClick={() => setIsLeadModalOpen(true)}
                    className="bg-slate-900 text-white text-xs font-bold"
                  >
                    + Add Lead
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-3 py-2.5">Patient Name</th>
                      <th className="px-3 py-2.5">Phone</th>
                      <th className="px-3 py-2.5">Concern / Package</th>
                      <th className="px-3 py-2.5">Location</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {leads.map((l) => (
                      <tr key={l._id} className="hover:bg-slate-50">
                        <td className="px-3 py-3 font-semibold text-slate-800">{l.name}</td>
                        <td className="px-3 py-3 text-slate-600 font-mono">{l.phone}</td>
                        <td className="px-3 py-3 text-slate-600">{l.concern || 'Weight Management'}</td>
                        <td className="px-3 py-3 text-slate-600">{l.city || 'Hosur'}</td>
                        <td className="px-3 py-3">
                          <Badge variant={l.status === 'NEW' ? 'emerald' : 'neutral'} size="sm">
                            {l.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <a
                              href={`tel:${l.phone}`}
                              className="p-1 text-emerald-700 hover:bg-emerald-50 rounded"
                              title="Call"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                            <button
                              type="button"
                              onClick={() => handleOpenCallModal(l)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded text-[11px]"
                            >
                              Log Call
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: FOLLOWUP */}
          {activeTab === 'FOLLOWUP' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Today's Callback Schedule</h3>
                  <p className="text-xs text-slate-500">Patients expecting a callback today</p>
                </div>
                <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                  {followupsCount} Scheduled
                </span>
              </div>

              <div className="space-y-2">
                {leads.slice(0, 3).map((lead, idx) => (
                  <div
                    key={lead._id}
                    className="p-3.5 bg-amber-50/40 border border-amber-100 rounded-xl flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-xs sm:text-sm text-slate-900">{lead.name}</div>
                        <div className="text-xs text-slate-500">
                          {lead.phone} • Requested call at {idx === 0 ? '11:30 AM' : idx === 1 ? '02:15 PM' : '04:45 PM'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${lead.phone}`}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow-xs"
                      >
                        Call Now
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: CONSULTS */}
          {activeTab === 'CONSULTS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Patient Consultations & Walk-in Inquiries</h3>
                  <p className="text-xs text-slate-500">Prescription guidance, dosage consultation, and branch appointments</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsConsultModalOpen(true)}
                  className="bg-emerald-700 text-white text-xs font-bold"
                >
                  + Book Consultation
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-slate-900 text-xs sm:text-sm">Vimala Murugesan</div>
                      <div className="text-xs text-slate-500">9845012355 • Hosur</div>
                    </div>
                    <Badge variant="emerald" size="sm">Confirmed</Badge>
                  </div>
                  <p className="text-xs text-slate-600">
                    <strong>Concern:</strong> Post-pregnancy weight reduction & sluggish metabolism.
                  </p>
                  <div className="text-[11px] text-slate-400">Scheduled: Today 03:30 PM (Walk-in)</div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-slate-900 text-xs sm:text-sm">Ravi Chandran</div>
                      <div className="text-xs text-slate-500">9845012356 • Krishnagiri</div>
                    </div>
                    <Badge variant="blue" size="sm">Phone Consult</Badge>
                  </div>
                  <p className="text-xs text-slate-600">
                    <strong>Concern:</strong> Cholesterol & belly fat herbal formulation inquiry.
                  </p>
                  <div className="text-[11px] text-slate-400">Scheduled: Tomorrow 10:30 AM (Tele-call)</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ORDERS */}
          {activeTab === 'ORDERS' && (
            <div className="space-y-4">
              {/* Header Strip */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>My Closed Orders & Invoices</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {filteredOrders.length} Orders
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Orders created by {callerName} with live dispatch tracking & patient delivery updates
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right hidden md:block mr-2">
                    <div className="text-[10px] uppercase font-semibold text-slate-400">Total Booked Volume</div>
                    <div className="text-sm font-black text-emerald-700 font-mono">
                      ₹{filteredOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0).toLocaleString()}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    id="btn-direct-order"
                    onClick={() => setIsOrderModalOpen(true)}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Direct Order</span>
                  </Button>
                </div>
              </div>

              {/* Filter & Search Toolbar */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by order ID, patient, mobile or tracking..."
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-600 outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={orderStatusFilter}
                    onChange={(e) => setOrderStatusFilter(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
                  >
                    <option value="ALL">All Order Statuses</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="PROCESSING">Processing</option>
                    <option value="SHIPPED">Shipped / Dispatched</option>
                    <option value="DELIVERED">Delivered</option>
                    <option value="NEW">New Order</option>
                    <option value="CANCELLED">Cancelled / RTO</option>
                  </select>
                </div>
              </div>

              {/* Orders Data Table */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="px-3.5 py-3">Order ID</th>
                        <th className="px-3.5 py-3">Patient</th>
                        <th className="px-3 py-3">Products</th>
                        <th className="px-3 py-3 text-right">Amount</th>
                        <th className="px-3 py-3 text-center">Payment</th>
                        <th className="px-3 py-3 text-center">Status</th>
                        <th className="px-3 py-3 text-center">Tracking No</th>
                        <th className="px-3.5 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredOrders.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-400">
                            No orders found matching criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredOrders.map((o, idx) => {
                          const statusColor =
                            o.status === 'DELIVERED'
                              ? 'emerald'
                              : o.status === 'SHIPPED' || o.status === 'DISPATCHED'
                              ? 'blue'
                              : o.status === 'CONFIRMED' || o.status === 'PROCESSING'
                              ? 'purple'
                              : o.status === 'CANCELLED' || o.status === 'RTO'
                              ? 'rose'
                              : 'slate';

                          const cleanPhone = (o.customerPhone || '9629985341').replace(/\D/g, '').slice(-10);

                          return (
                            <tr
                              key={o._id || idx}
                              onClick={() => handleOpenOrderDetails(o)}
                              className="hover:bg-slate-50/90 transition-colors group cursor-pointer"
                            >
                              {/* Order ID & Date */}
                              <td className="px-3.5 py-3">
                                <button
                                  type="button"
                                  id={`btn-order-id-${o._id || idx}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenOrderDetails(o);
                                  }}
                                  className="font-mono font-bold text-emerald-800 hover:text-emerald-950 hover:underline text-left text-xs flex items-center gap-1 group/id cursor-pointer"
                                  title="Click to view full order & products details"
                                >
                                  <span>{o.orderNumber}</span>
                                  <ExternalLink className="w-2.5 h-2.5 text-emerald-600 opacity-60 group-hover/id:opacity-100 transition-opacity" />
                                </button>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  {o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-GB') : '08/09/2026'}
                                </div>
                              </td>

                              {/* Patient Details */}
                              <td className="px-3.5 py-3">
                                <button
                                  type="button"
                                  id={`btn-order-patient-${o._id || idx}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenOrderDetails(o);
                                  }}
                                  className="font-bold text-slate-900 hover:text-emerald-800 hover:underline text-left text-xs uppercase leading-tight cursor-pointer block"
                                  title="Click to view patient profile & order details"
                                >
                                  {o.customerName}
                                </button>
                                <div className="flex items-center gap-1.5 mt-0.5 text-slate-500">
                                  <span className="font-mono text-[11px]">{cleanPhone}</span>
                                  {o.district && (
                                    <>
                                      <span className="text-slate-300">·</span>
                                      <span className="text-[10px] text-slate-400 truncate max-w-[110px]">{o.district}</span>
                                    </>
                                  )}
                                </div>
                              </td>

                              {/* Products */}
                              <td className="px-3 py-3 text-slate-700 max-w-[220px]">
                                <div
                                  id={`btn-order-products-${o._id || idx}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenOrderDetails(o);
                                  }}
                                  className="font-medium truncate text-xs hover:text-emerald-800 transition-colors cursor-pointer"
                                  title="Click to view all ordered products & formulation details"
                                >
                                  {o.productsList}
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5">Ayurvedic Formulation</div>
                              </td>

                              {/* Amount */}
                              <td className="px-3 py-3 text-right">
                                <div className="font-mono font-bold text-emerald-700 text-xs">
                                  ₹{o.grandTotal?.toLocaleString()}
                                </div>
                                <div className="text-[9px] font-semibold text-slate-400 uppercase mt-0.5">
                                  {o.paymentStatus || (o.paymentMethod === 'ONLINE' ? 'PAID' : 'COD PENDING')}
                                </div>
                              </td>

                              {/* Payment */}
                              <td className="px-3 py-3 text-center">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                    o.paymentMethod === 'ONLINE' || o.paymentMethod === 'UPI'
                                      ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                                  }`}
                                >
                                  {o.paymentMethod || 'COD'}
                                </span>
                              </td>

                              {/* Status */}
                              <td className="px-3 py-3 text-center">
                                <Badge variant={statusColor} size="sm">
                                  {o.status}
                                </Badge>
                              </td>

                              {/* Tracking No */}
                              <td className="px-3 py-3 text-center">
                                {o.trackingNumber && o.trackingNumber !== 'Pending' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 font-mono text-[10px] font-semibold text-slate-700 shadow-2xs">
                                    <Truck className="w-3 h-3 text-blue-600 shrink-0" />
                                    <span>{o.trackingNumber}</span>
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-slate-400 italic">Processing</span>
                                )}
                              </td>

                              {/* Actions */}
                              <td className="px-3.5 py-3 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* View Details Button */}
                                  <button
                                    type="button"
                                    id={`btn-view-order-${o._id || idx}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenOrderDetails(o);
                                    }}
                                    className="px-2 py-1 bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white border border-emerald-200 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-all shadow-2xs cursor-pointer group/view"
                                    title="View full order and products details"
                                  >
                                    <Eye className="w-3 h-3 text-emerald-700 group-hover/view:text-white transition-colors" />
                                    <span>View</span>
                                  </button>

                                  {/* Edit Option Button */}
                                  <button
                                    type="button"
                                    id={`btn-edit-order-${o._id || idx}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenEditOrder(o);
                                    }}
                                    className="px-2 py-1 bg-slate-100 hover:bg-blue-600 text-slate-700 hover:text-white border border-slate-200 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-all shadow-2xs cursor-pointer group/edit"
                                    title="Edit Patient Details, Status or Tracking"
                                  >
                                    <Edit3 className="w-3 h-3 text-slate-500 group-hover/edit:text-white transition-colors" />
                                    <span>Edit</span>
                                  </button>

                                  {/* Call Patient */}
                                  <a
                                    href={`tel:${cleanPhone}`}
                                    onClick={(e) => e.stopPropagation()}
                                    title={`Call ${o.customerName}`}
                                    className="p-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs inline-flex items-center justify-center transition-colors shadow-2xs"
                                  >
                                    <PhoneCall className="w-3 h-3" />
                                  </a>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: CONVERTED */}
          {activeTab === 'CONVERTED' && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                    Telecaller Revenue & Incentives
                  </div>
                  <div className="text-2xl font-black text-emerald-700 mt-1">
                    ₹{orders.reduce((acc, o) => acc + (o.totalAmount || 0), 0).toLocaleString()}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Estimated 10% caller incentive: <strong>₹{Math.round(orders.reduce((acc, o) => acc + (o.totalAmount || 0), 0) * 0.10).toLocaleString()}</strong>
                  </p>
                </div>
                <Award className="w-10 h-10 text-emerald-600" />
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Converted Leads</h4>
                {orders.map((o) => (
                  <div
                    key={o._id}
                    className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-xs sm:text-sm text-slate-900">{o.customerName}</div>
                      <div className="text-xs text-slate-400">Order: {o.orderNumber} • Amount: ₹{o.totalAmount}</div>
                    </div>
                    <Badge variant="emerald" size="sm">Converted</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: LEAD BANK */}
          {activeTab === 'LEAD_BANK' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Unassigned Lead Bank</h3>
                  <p className="text-xs text-slate-500">Claim fresh inbound web and social inquiries into your queue</p>
                </div>
                <span className="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-full">
                  12 Leads Available
                </span>
              </div>

              <div className="space-y-2.5">
                {[
                  { id: 'lb-1', name: 'Divya Bharathi', phone: '9845099881', concern: 'Weight Loss 30-Day Plan', source: 'Facebook Campaign', city: 'Hosur' },
                  { id: 'lb-2', name: 'Saravanan K', phone: '9845099882', concern: 'Diabetic Care & Digestion', source: 'Website Inbound', city: 'Krishnagiri' },
                  { id: 'lb-3', name: 'Geetha Priya', phone: '9845099883', concern: 'Hair & Skin Ayurvedic Care', source: 'Google Ads', city: 'Bengaluru' }
                ].map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-bold text-xs sm:text-sm text-slate-900">{item.name}</div>
                      <div className="text-xs text-slate-500">
                        {item.phone} • {item.concern} • {item.source}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => alert(`Assigned ${item.name} to your calling queue!`)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg shadow-xs"
                    >
                      Claim Lead →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 8: TREATMENT FU */}
          {activeTab === 'TREATMENT_FU' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Patient Treatment Progress (7 / 14 / 30 Days)</h3>
                <p className="text-xs text-slate-500">Routine follow-ups to verify dosage compliance and customer wellness</p>
              </div>

              <div className="space-y-2.5">
                {[
                  { name: 'Sowmya Rajesh', phone: '9845011221', day: 'Day 7', task: 'Check dosage intake & side effects', status: 'Due Today' },
                  { name: 'Karthik Venkatesh', phone: '9845011222', day: 'Day 14', task: 'Review weight loss progress (target: -2kg)', status: 'Pending' },
                  { name: 'Deepa Lakshmi', phone: '9845011223', day: 'Day 30', task: 'Month-end assessment & kit refill recommendation', status: 'Due Today' }
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-slate-900">{item.name}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                          {item.day}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {item.phone} • {item.task}
                      </div>
                    </div>
                    <a
                      href={`tel:${item.phone}`}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs"
                    >
                      Call Patient
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 9: REORDER CALLS */}
          {activeTab === 'REORDER_CALLS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Repeat Prescription & Refill Calls</h3>
                  <p className="text-xs text-slate-500">Patients whose medicine supply is ending in the next 5-7 days</p>
                </div>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                  High Conversion Potential
                </span>
              </div>

              <div className="space-y-2.5">
                {[
                  { name: 'Madhavan K', phone: '9845033441', prevOrder: 'Ayur Slim 30-Day Kit (Delivered 25 days ago)', amount: '₹1,499' },
                  { name: 'Shanthi Subramanian', phone: '9845033442', prevOrder: 'Triphala Slim Decoction x2 (Delivered 28 days ago)', amount: '₹1,850' }
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-emerald-50/40 border border-emerald-100 rounded-xl flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-bold text-xs sm:text-sm text-slate-900">{item.name}</div>
                      <div className="text-xs text-slate-600">{item.prevOrder}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${item.phone}`}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs"
                      >
                        Call to Refill
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          setOrderForm(prev => ({ ...prev, customerName: item.name, phone: item.phone }));
                          setIsOrderModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs rounded-lg shadow-xs"
                      >
                        Repeat Order
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 10: ATTENDANCE */}
          {activeTab === 'ATTENDANCE' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Daily Telecaller Attendance & Activity Log</h3>
                <p className="text-xs text-slate-500">Track hours, connected calls, and efficiency</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <div className="text-xs text-slate-400 font-semibold uppercase">Duty Status</div>
                  <div className="text-lg font-black text-emerald-700 mt-1">
                    {isCheckedIn ? 'Checked In' : 'Logged Off'}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Since {dutyStartTime}</div>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <div className="text-xs text-slate-400 font-semibold uppercase">Total Calls</div>
                  <div className="text-lg font-black text-slate-800 mt-1">28 Calls</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Logged today</div>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <div className="text-xs text-slate-400 font-semibold uppercase">Talk Time</div>
                  <div className="text-lg font-black text-slate-800 mt-1">01h 45m</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Average 3.7m/call</div>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <div className="text-xs text-slate-400 font-semibold uppercase">Orders Logged</div>
                  <div className="text-lg font-black text-purple-700 mt-1">{ordersCount} Orders</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Target: 5 / day</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 11: POWER DIALER */}
          {activeTab === 'POWER_DIALER' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">⚡ Fast Power Dialer</h3>
                  <p className="text-xs text-slate-500">Continuous calling with auto-advancing queue</p>
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  Lead {activeDialerIndex + 1} of {leads.length}
                </span>
              </div>

              {leads[activeDialerIndex] ? (
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 max-w-xl mx-auto text-center">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 font-black text-xl flex items-center justify-center mx-auto">
                    {leads[activeDialerIndex].name[0]}
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900">{leads[activeDialerIndex].name}</h4>
                    <p className="text-sm font-mono text-slate-600 mt-0.5">{leads[activeDialerIndex].phone}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Concern: {leads[activeDialerIndex].concern || 'Weight Management'} • {leads[activeDialerIndex].city}
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-2 pt-2">
                    <a
                      href={`tel:${leads[activeDialerIndex].phone}`}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5"
                    >
                      <Phone className="w-4 h-4" />
                      <span>Dial Now</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => handleOpenCallModal(leads[activeDialerIndex])}
                      className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-xs rounded-xl shadow-xs"
                    >
                      Log Call Notes
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveDialerIndex((prev) => (prev + 1) % leads.length)}
                      className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs"
                    >
                      Next Lead →
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 text-sm">
                  Queue completed for today!
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: NEW DIRECT ORDER */}
      {isOrderModalOpen && (
        <Modal
          isOpen={isOrderModalOpen}
          onClose={() => setIsOrderModalOpen(false)}
          title="Create Direct Telecaller Order"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createOrderMutation.mutate({
                customer: {
                  name: orderForm.customerName,
                  phone: orderForm.phone,
                  address: {
                    street: orderForm.street || 'Main Road',
                    city: orderForm.city || 'Hosur',
                    state: orderForm.state || 'Tamil Nadu',
                    pincode: orderForm.pincode || '635109'
                  }
                },
                items: [
                  {
                    title: orderForm.productName,
                    quantity: Number(orderForm.quantity),
                    unitPrice: Number(orderForm.unitPrice)
                  }
                ],
                paymentMethod: orderForm.paymentMethod,
                notes: orderForm.notes
              });
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Patient Name"
                value={orderForm.customerName}
                onChange={(e) => setOrderForm({ ...orderForm, customerName: e.target.value })}
                required
              />
              <Input
                label="Phone Number"
                value={orderForm.phone}
                onChange={(e) => setOrderForm({ ...orderForm, phone: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input
                label="City"
                value={orderForm.city}
                onChange={(e) => setOrderForm({ ...orderForm, city: e.target.value })}
              />
              <Input
                label="Pincode"
                value={orderForm.pincode}
                onChange={(e) => setOrderForm({ ...orderForm, pincode: e.target.value })}
              />
              <Select
                label="Payment Method"
                value={orderForm.paymentMethod}
                onChange={(e) => setOrderForm({ ...orderForm, paymentMethod: e.target.value })}
                options={[
                  { value: 'COD', label: 'Cash on Delivery (COD)' },
                  { value: 'PREPAID', label: 'Prepaid / UPI' }
                ]}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Product"
                value={orderForm.productName}
                onChange={(e) => setOrderForm({ ...orderForm, productName: e.target.value })}
              />
              <Input
                label="Order Amount (₹)"
                type="number"
                value={orderForm.unitPrice}
                onChange={(e) => setOrderForm({ ...orderForm, unitPrice: e.target.value })}
              />
            </div>
            <Input
              label="Delivery Address"
              value={orderForm.street}
              onChange={(e) => setOrderForm({ ...orderForm, street: e.target.value })}
              placeholder="Door No, Street Name, Landmark"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setIsOrderModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={createOrderMutation.isPending} className="bg-emerald-700 text-white font-bold">
                Confirm & Create Order
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 1B: EDIT ORDER */}
      {isEditOrderModalOpen && selectedOrderForEdit && (
        <Modal
          isOpen={isEditOrderModalOpen}
          onClose={() => {
            setIsEditOrderModalOpen(false);
            setSelectedOrderForEdit(null);
          }}
          title={`Edit Order: ${selectedOrderForEdit.orderNumber}`}
          maxWidth="max-w-2xl"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateOrderMutation.mutate({
                orderId: selectedOrderForEdit._id,
                payload: {
                  patientName: editOrderForm.patientName,
                  mobile: editOrderForm.phone,
                  alternateMobile: editOrderForm.alternatePhone,
                  street: editOrderForm.street,
                  city: editOrderForm.city,
                  district: editOrderForm.district,
                  pincode: editOrderForm.pincode,
                  status: editOrderForm.status,
                  grandTotal: Number(editOrderForm.grandTotal),
                  paymentMethod: editOrderForm.paymentMethod,
                  paymentStatus: editOrderForm.paymentStatus,
                  trackingNumber: editOrderForm.trackingNumber,
                  notes: editOrderForm.notes
                }
              });
            }}
            className="space-y-4 text-xs"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Left Column: Patient & Address */}
              <div className="space-y-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Patient & Delivery Details</span>
                </h4>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Patient Full Name *</label>
                  <input
                    id="input-edit-order-patient-name"
                    type="text"
                    required
                    value={editOrderForm.patientName}
                    onChange={(e) => setEditOrderForm({ ...editOrderForm, patientName: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs uppercase"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Primary Mobile *</label>
                    <input
                      id="input-edit-order-phone"
                      type="tel"
                      required
                      value={editOrderForm.phone}
                      onChange={(e) => setEditOrderForm({ ...editOrderForm, phone: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Alternate Phone</label>
                    <input
                      id="input-edit-order-alt-phone"
                      type="tel"
                      value={editOrderForm.alternatePhone}
                      onChange={(e) => setEditOrderForm({ ...editOrderForm, alternatePhone: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Street Address</label>
                  <input
                    id="input-edit-order-street"
                    type="text"
                    value={editOrderForm.street}
                    onChange={(e) => setEditOrderForm({ ...editOrderForm, street: e.target.value })}
                    placeholder="Door No, Street Name, Landmark"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">City</label>
                    <input
                      id="input-edit-order-city"
                      type="text"
                      value={editOrderForm.city}
                      onChange={(e) => setEditOrderForm({ ...editOrderForm, city: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">District</label>
                    <input
                      id="input-edit-order-district"
                      type="text"
                      value={editOrderForm.district}
                      onChange={(e) => setEditOrderForm({ ...editOrderForm, district: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Pincode</label>
                    <input
                      id="input-edit-order-pincode"
                      type="text"
                      value={editOrderForm.pincode}
                      onChange={(e) => setEditOrderForm({ ...editOrderForm, pincode: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Order Status, Logistics & Pricing */}
              <div className="space-y-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-blue-700" />
                  <span>Order Status & Fulfillment</span>
                </h4>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Order Status *</label>
                    <select
                      id="select-edit-order-status"
                      value={editOrderForm.status}
                      onChange={(e) => setEditOrderForm({ ...editOrderForm, status: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                    >
                      <option value="NEW">NEW</option>
                      <option value="CONFIRMED">CONFIRMED</option>
                      <option value="PROCESSING">PROCESSING</option>
                      <option value="READY_FOR_PACKING">READY FOR PACKING</option>
                      <option value="PACKED">PACKED</option>
                      <option value="READY_FOR_DISPATCH">READY FOR DISPATCH</option>
                      <option value="DISPATCHED">DISPATCHED</option>
                      <option value="SHIPPED">SHIPPED</option>
                      <option value="DELIVERED">DELIVERED</option>
                      <option value="RTO">RTO (RETURNED)</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Grand Total (₹) *</label>
                    <input
                      id="input-edit-order-grand-total"
                      type="number"
                      required
                      min={0}
                      value={editOrderForm.grandTotal}
                      onChange={(e) => setEditOrderForm({ ...editOrderForm, grandTotal: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-emerald-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                    <select
                      id="select-edit-order-payment-method"
                      value={editOrderForm.paymentMethod}
                      onChange={(e) => setEditOrderForm({ ...editOrderForm, paymentMethod: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    >
                      <option value="COD">Cash On Delivery (COD)</option>
                      <option value="ONLINE">Online Prepaid</option>
                      <option value="UPI">UPI Transfer</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Payment Status</label>
                    <select
                      id="select-edit-order-payment-status"
                      value={editOrderForm.paymentStatus}
                      onChange={(e) => setEditOrderForm({ ...editOrderForm, paymentStatus: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    >
                      <option value="COD_PENDING">COD PENDING</option>
                      <option value="PAID">PAID</option>
                      <option value="PENDING">PENDING</option>
                      <option value="REFUNDED">REFUNDED</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Speed Post Tracking Number</label>
                  <div className="relative">
                    <Truck className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="input-edit-order-tracking-no"
                      type="text"
                      placeholder="e.g. IP108849193IN"
                      value={editOrderForm.trackingNumber}
                      onChange={(e) => setEditOrderForm({ ...editOrderForm, trackingNumber: e.target.value })}
                      className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Special Order Notes</label>
                  <textarea
                    id="textarea-edit-order-notes"
                    rows={2}
                    value={editOrderForm.notes}
                    onChange={(e) => setEditOrderForm({ ...editOrderForm, notes: e.target.value })}
                    placeholder="Patient dosage, dispatch priority or delivery directions..."
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <div className="text-[11px] text-slate-500">
                Updating order: <strong className="font-mono text-slate-800">{selectedOrderForEdit.orderNumber}</strong>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => {
                    setIsEditOrderModalOpen(false);
                    setSelectedOrderForEdit(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  id="btn-save-order-changes"
                  type="submit"
                  variant="primary"
                  loading={updateOrderMutation.isPending}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
                >
                  Save Order Changes
                </Button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 1C: ORDER DETAILS & PRODUCTS BREAKDOWN */}
      {isOrderDetailsModalOpen && selectedOrderForDetails && (
        <OrderDetailsModal
          isOpen={isOrderDetailsModalOpen}
          onClose={() => {
            setIsOrderDetailsModalOpen(false);
            setSelectedOrderForDetails(null);
          }}
          order={selectedOrderForDetails}
          onEditOrder={(orderToEdit) => {
            setIsOrderDetailsModalOpen(false);
            setSelectedOrderForDetails(null);
            handleOpenEditOrder(orderToEdit);
          }}
        />
      )}

      {/* MODAL 2: LOG NEW LEAD */}
      {isLeadModalOpen && (
        <Modal
          isOpen={isLeadModalOpen}
          onClose={() => setIsLeadModalOpen(false)}
          title="Log Inbound Product Lead"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createLeadMutation.mutate({
                name: leadForm.name,
                phone: leadForm.phone,
                city: leadForm.city,
                source: leadForm.source,
                concern: leadForm.concern,
                notes: leadForm.notes
              });
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Patient / Inquiry Name"
                value={leadForm.name}
                onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                required
              />
              <Input
                label="Phone Number"
                value={leadForm.phone}
                onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Health Concern / Package"
                value={leadForm.concern}
                onChange={(e) => setLeadForm({ ...leadForm, concern: e.target.value })}
                options={[
                  { value: 'Weight Loss & Belly Fat', label: 'Weight Loss & Belly Fat' },
                  { value: 'Diabetic & Metabolism Care', label: 'Diabetic & Metabolism Care' },
                  { value: 'Joint Care & Arthritis', label: 'Joint Care & Arthritis' },
                  { value: 'Digestion & Gastric Detox', label: 'Digestion & Gastric Detox' }
                ]}
              />
              <Input
                label="City / Town"
                value={leadForm.city}
                onChange={(e) => setLeadForm({ ...leadForm, city: e.target.value })}
              />
            </div>
            <Input
              label="Lead Source"
              value={leadForm.source}
              onChange={(e) => setLeadForm({ ...leadForm, source: e.target.value })}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setIsLeadModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={createLeadMutation.isPending} className="bg-slate-900 text-white font-bold">
                Save Lead
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 3: BOOK CONSULT */}
      {isConsultModalOpen && (
        <Modal
          isOpen={isConsultModalOpen}
          onClose={() => setIsConsultModalOpen(false)}
          title="Book Patient Consultation / Walk-in"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              alert(`Consultation booked for ${consultForm.patientName}!`);
              setIsConsultModalOpen(false);
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Patient Name"
                value={consultForm.patientName}
                onChange={(e) => setConsultForm({ ...consultForm, patientName: e.target.value })}
                required
              />
              <Input
                label="Phone Number"
                value={consultForm.phone}
                onChange={(e) => setConsultForm({ ...consultForm, phone: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Consultation Mode"
                value={consultForm.consultType}
                onChange={(e) => setConsultForm({ ...consultForm, consultType: e.target.value })}
                options={[
                  { value: 'Walk-in Direct', label: 'Walk-in (Hosur Center)' },
                  { value: 'Phone Tele-Consult', label: 'Phone Tele-Consultation' }
                ]}
              />
              <Input
                label="Preferred Time"
                value={consultForm.preferredTime}
                onChange={(e) => setConsultForm({ ...consultForm, preferredTime: e.target.value })}
              />
            </div>
            <Input
              label="Health Symptoms & Advice Notes"
              value={consultForm.notes}
              onChange={(e) => setConsultForm({ ...consultForm, notes: e.target.value })}
              placeholder="e.g. 5kg weight reduction goal, thyroid history"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setIsConsultModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-purple-700 text-white font-bold">
                Confirm Booking
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 4: CALL LOG DISPOSITION */}
      {isCallCentreModalOpen && (
        <Modal
          isOpen={isCallCentreModalOpen}
          onClose={() => setIsCallCentreModalOpen(false)}
          title="Call Disposition & Follow-up Logger"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              alert(`Call logged for ${callLogForm.customerName || callLogForm.phone}!`);
              setIsCallCentreModalOpen(false);
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Patient / Lead Name"
                value={callLogForm.customerName}
                onChange={(e) => setCallLogForm({ ...callLogForm, customerName: e.target.value })}
              />
              <Input
                label="Phone"
                value={callLogForm.phone}
                onChange={(e) => setCallLogForm({ ...callLogForm, phone: e.target.value })}
                required
              />
            </div>
            <Select
              label="Call Outcome / Disposition"
              value={callLogForm.disposition}
              onChange={(e) => setCallLogForm({ ...callLogForm, disposition: e.target.value })}
              options={[
                { value: 'CONNECTED_INTERESTED', label: 'Connected — Highly Interested' },
                { value: 'CALLBACK_REQUESTED', label: 'Callback Requested (Schedule below)' },
                { value: 'ORDER_CLOSED', label: 'Order Closed / Ready to Invoice' },
                { value: 'NOT_REACHABLE', label: 'Ringing / Not Reachable (RNR)' },
                { value: 'BUSY', label: 'Busy / Asked to call back later' },
                { value: 'NOT_INTERESTED', label: 'Not Interested / Wrong Number' }
              ]}
            />
            <Input
              label="Next Follow-up Date & Time (Optional)"
              type="datetime-local"
              value={callLogForm.followupDate}
              onChange={(e) => setCallLogForm({ ...callLogForm, followupDate: e.target.value })}
            />
            <Input
              label="Discussion Notes"
              value={callLogForm.notes}
              onChange={(e) => setCallLogForm({ ...callLogForm, notes: e.target.value })}
              placeholder="e.g. Explained 60-day diet regimen, patient will confirm tomorrow morning"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setIsCallCentreModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-700 text-white font-bold">
                Save Disposition
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 5: CUSTOMER PROFILE SEARCH */}
      {isCustomerProfileModalOpen && (
        <Modal
          isOpen={isCustomerProfileModalOpen}
          onClose={() => setIsCustomerProfileModalOpen(false)}
          title="Customer Profile & Treatment History"
        >
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter customer phone or name..."
                value={customerSearchQuery}
                onChange={(e) => setCustomerSearchQuery(e.target.value)}
                className="flex-1 text-xs"
              />
              <Button size="sm" className="bg-slate-900 text-white font-bold">
                Search
              </Button>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Priya Dharshini</h4>
                  <p className="text-xs text-slate-500 font-mono">9845019871 • Hosur, Krishnagiri TN</p>
                </div>
                <Badge variant="emerald" size="sm">Repeat Buyer</Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 p-3 bg-white rounded-lg border border-slate-200 text-center text-xs">
                <div>
                  <div className="font-bold text-slate-800">2 Orders</div>
                  <div className="text-[10px] text-slate-400">Total Lifetime</div>
                </div>
                <div>
                  <div className="font-bold text-emerald-700">₹3,398</div>
                  <div className="text-[10px] text-slate-400">Total Spend</div>
                </div>
                <div>
                  <div className="font-bold text-blue-700">100%</div>
                  <div className="text-[10px] text-slate-400">Delivery Rate</div>
                </div>
              </div>

              <div className="text-xs space-y-1 text-slate-600">
                <div><strong>Current Regimen:</strong> Slim Herbal Decoction 500ml</div>
                <div><strong>Last Dispatched:</strong> 02 Sep 2026 via India Post (IP108849201IN)</div>
              </div>

              <div className="pt-2 flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setOrderForm(prev => ({
                      ...prev,
                      customerName: 'Priya Dharshini',
                      phone: '9845019871',
                      city: 'Hosur'
                    }));
                    setIsCustomerProfileModalOpen(false);
                    setIsOrderModalOpen(true);
                  }}
                  className="bg-emerald-700 text-white font-bold text-xs"
                >
                  Create Repeat Order
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsCustomerProfileModalOpen(false)}
                  className="text-xs font-semibold"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default TelecallerDashboardView;
