import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Store,
  TrendingUp,
  Users,
  ShoppingBag,
  Truck,
  CheckCircle2,
  Plus,
  MapPin,
  Phone,
  Percent,
  BarChart3,
  Receipt,
  ArrowRight,
  Package,
  UserCheck,
  ShieldCheck,
  XCircle,
  HeartPulse,
  CalendarClock,
  Copy,
  Check,
  Printer,
  Download,
  Search,
  Filter,
  Calendar,
  DollarSign,
  Wallet,
  CreditCard,
  FileText,
  Layers,
  ExternalLink,
  AlertTriangle,
  Trash2,
  UploadCloud,
  Navigation,
  Share2,
  Send,
  Smartphone,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import apiClient from '../../api/apiClient.js';
import { useBranch } from '../../context/BranchContext.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Modal } from '../../components/common/Modal.jsx';
import { Input } from '../../components/common/Input.jsx';
import { Select } from '../../components/common/Select.jsx';
import { Spinner } from '../../components/common/Spinner.jsx';
import { SimpleProgressBar, SimplePipelineTrack } from '../../components/common/SimpleProgressBar.jsx';
import { SimpleTrendChart } from '../../components/common/SimpleTrendChart.jsx';

const StatCard = ({ label, value, sub, icon: Icon, color = 'green', progress = 70 }) => {
  const iconClasses = {
    green: 'icon-box-emerald',
    blue: 'icon-box-blue',
    amber: 'icon-box-amber',
    purple: 'icon-box-purple'
  };
  const colorKey = {
    green: 'emerald',
    blue: 'blue',
    amber: 'amber',
    purple: 'purple'
  };

  return (
    <div className="clean-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">{label}</span>
        <div className={iconClasses[color] || 'icon-box-emerald'}>
          <Icon className="w-4 h-4" strokeWidth={1.75} />
        </div>
      </div>
      <div>
        <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">{value}</div>
        {sub && <p className="text-[11px] text-slate-500 font-medium mt-0.5">{sub}</p>}
      </div>
      <SimpleProgressBar value={progress} max={100} size="sm" color={colorKey[color] || 'emerald'} />
    </div>
  );
};

export function AdminDistributorDashboardView({ onSwitchToManagerView, onSwitchToTelecaller }) {
  const { selectedBranchId, selectBranch } = useBranch();
  const queryClient = useQueryClient();

  // Active Main Tab (1 of 10)
  const [activeTab, setActiveTab] = useState('HOME');

  // Sub-tab states
  const [settlementSubTab, setSettlementSubTab] = useState('REVENUE'); // 'REVENUE' | 'SETTLEMENT' | 'ADVISORY'
  const [gstSubTab, setGstSubTab] = useState('SUB_DISTRIBUTORS'); // 'SUB_DISTRIBUTORS' | 'CREATE' | 'MONTHLY' | 'HISTORY'
  const [expenseSubTab, setExpenseSubTab] = useState('ADD'); // 'ADD' | 'HISTORY'

  // Modals & Feedback
  const [isAddBranchModalOpen, setIsAddBranchModalOpen] = useState(false);
  const [isResetPassModalOpen, setIsResetPassModalOpen] = useState(false);
  const [resetPassSuccess, setResetPassSuccess] = useState(false);
  const [newManagerPass, setNewManagerPass] = useState('');
  const [isWalletRechargeModalOpen, setIsWalletRechargeModalOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isAdsModalOpen, setIsAdsModalOpen] = useState(false);
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('5000');
  const [walletBalance, setWalletBalance] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [gstDetailsExpanded, setGstDetailsExpanded] = useState(false);

  // Settlement & Revenue stream filter
  const [revenueStreamFilter, setRevenueStreamFilter] = useState('ALL');
  const [settlementDateRange, setSettlementDateRange] = useState({
    from: '2026-09-01',
    to: '2026-09-08'
  });

  // Orders filter in Boss View
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');
  const [orderDateFilter, setOrderDateFilter] = useState('');

  // Purchase Expense form state
  const [expenseForm, setExpenseForm] = useState({
    vendor: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    fileName: ''
  });
  const [savedExpenses, setSavedExpenses] = useState([
    {
      id: 'EXP-101',
      vendor: 'Sri Balaji Herbal Suppliers',
      category: 'Raw Herbs Procurement',
      amount: 14500,
      date: '2026-09-04',
      notes: 'Guggulu & Triphala extracts bulk packing',
      fileName: 'receipt_balaji_0904.pdf'
    },
    {
      id: 'EXP-102',
      vendor: 'Sri Lakshmi Packaging Containers',
      category: 'Packaging Materials',
      amount: 6800,
      date: '2026-09-02',
      notes: 'Amber glass bottles and induction seals',
      fileName: 'invoice_containers.png'
    }
  ]);

  // GST Invoice creation state
  const [gstInvoiceForm, setGstInvoiceForm] = useState({
    invoiceNumber: `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    date: new Date().toISOString().split('T')[0],
    recipient: 'Sub-Distributor Retail Outlet A',
    gstin: '33AAACB1234F1Z5',
    itemName: 'Slim 369 Ayurvedic Wellness Combo Kit',
    hsn: '30049011',
    qty: 10,
    rate: 1800
  });
  const [savedGstInvoices, setSavedGstInvoices] = useState([
    {
      id: 'INV-2026-8831',
      date: '2026-09-01',
      recipient: 'Krishnagiri Ayurveda Kendra',
      gstin: '33AABCU9603R1ZM',
      taxable: 18000,
      cgst: 1620,
      sgst: 1620,
      total: 21240,
      status: 'PAID'
    }
  ]);

  // Branch creation form
  const [branchForm, setBranchForm] = useState({
    name: '', code: '', branchType: 'FRANCHISE', phone: '', email: '',
    street: '', city: '', state: 'Tamil Nadu', pincode: '',
    managerName: '', managerPhone: '', revenueSharePercent: 15,
    billerId: '1000058077', gstNumber: '33BNCPS0374P1ZM'
  });

  // Fetch Dashboard KPIs & Branches
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['admin-distributor-dashboard', selectedBranchId],
    queryFn: async () => {
      const res = await apiClient.get('/dashboard');
      return res.data?.data;
    }
  });

  // Fetch Orders for sub-tab
  const { data: ordersResponse } = useQuery({
    queryKey: ['admin-orders', selectedBranchId],
    queryFn: async () => {
      const res = await apiClient.get('/orders?limit=30');
      return res.data;
    },
    enabled: activeTab === 'ORDERS' || activeTab === 'HOME'
  });

  // Fetch Leads for sub-tab
  const { data: leadsResponse } = useQuery({
    queryKey: ['admin-leads', selectedBranchId],
    queryFn: async () => {
      const res = await apiClient.get('/leads?limit=30');
      return res.data;
    },
    enabled: activeTab === 'LEADS' || activeTab === 'HOME'
  });

  // Fetch Team / Users for TEAM tab
  const { data: usersResponse, isLoading: isUsersLoading } = useQuery({
    queryKey: ['admin-users', selectedBranchId],
    queryFn: async () => {
      const params = { limit: 50 };
      if (selectedBranchId && selectedBranchId !== 'ALL') params.branchId = selectedBranchId;
      const res = await apiClient.get('/users', { params });
      return res.data;
    },
    enabled: activeTab === 'TEAM'
  });

  const addBranchMutation = useMutation({
    mutationFn: (data) =>
      apiClient.post('/branches', {
        name: data.name, code: data.code.toUpperCase(),
        branchType: data.branchType, phone: data.phone, email: data.email,
        managerName: data.managerName, managerPhone: data.managerPhone,
        revenueSharePercent: Number(data.revenueSharePercent || 0),
        billerId: data.billerId, gstNumber: data.gstNumber,
        address: { street: data.street, city: data.city, state: data.state, pincode: data.pincode }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-distributor-dashboard']);
      queryClient.invalidateQueries(['branches']);
      setIsAddBranchModalOpen(false);
      setBranchForm({
        name: '', code: '', branchType: 'FRANCHISE', phone: '', email: '',
        street: '', city: '', state: 'Tamil Nadu', pincode: '',
        managerName: '', managerPhone: '', revenueSharePercent: 15,
        billerId: '1000058077', gstNumber: '33BNCPS0374P1ZM'
      });
    }
  });

  if (isLoading) {
    return <Spinner size="lg" text="Loading Boss View (Distributor Panel)..." className="py-24" />;
  }

  const kpis = dashboardData?.kpis || {};
  const branches = dashboardData?.branches || [];
  const activeBranch = branches.find((b) => b._id === selectedBranchId) || branches[0] || {
    name: 'Shanthi Ayurvedas Hosur',
    billerId: '1000058077',
    phone: '8884747209',
    address: { city: 'Krishnagiri', state: 'Tamil Nadu' }
  };

  // 10 Tabs matching AyurOne Mart
  const tabs = [
    { id: 'HOME',       label: 'Home / Overview',   testId: 'tab-boss-home' },
    { id: 'ORDERS',     label: 'Orders',            testId: 'tab-boss-orders' },
    { id: 'LEADS',      label: 'Leads',             testId: 'tab-boss-leads' },
    { id: 'CONSULT',    label: 'Consult',           testId: 'tab-boss-consult' },
    { id: 'TEAM',       label: 'Team',              testId: 'tab-boss-team' },
    { id: 'PAYOUT',     label: 'Payout',            testId: 'tab-boss-payout' },
    { id: 'SETTLEMENT', label: 'Settlement',        testId: 'tab-boss-settlement' },
    { id: 'FRANCHISE',  label: '🏪 Franchise',      testId: 'tab-boss-franchise' },
    { id: 'GST',        label: '🧾 GST Billing',     testId: 'tab-boss-gst' },
    { id: 'EXPENSES',   label: '🧾 Purchase Expenses', testId: 'tab-boss-expenses' }
  ];

  // Telecaller Performance Leaderboard Data
  const telecallersLeaderboard = [
    { rank: 1, name: 'MONIKA',      phone: '9148554369', leads: 18, converted: 12, revenue: 93760 },
    { rank: 2, name: 'Amrutha',     phone: '8147940269', leads: 15, converted: 9,  revenue: 73350 },
    { rank: 3, name: 'RATHNA',      phone: '9566112369', leads: 14, converted: 8,  revenue: 56829 },
    { rank: 4, name: 'KANAGAVALLI', phone: '9487572369', leads: 12, converted: 6,  revenue: 40000 },
    { rank: 5, name: 'PIYALO',      phone: '9360448854', leads: 9,  converted: 4,  revenue: 28560 },
    { rank: 6, name: 'ANANDHI',     phone: '8122854369', leads: 8,  converted: 4,  revenue: 28330 },
    { rank: 7, name: 'VASUKI',      phone: '8015802369', leads: 7,  converted: 3,  revenue: 25449 },
    { rank: 8, name: 'PATTUSELVI',  phone: '8056519369', leads: 6,  converted: 3,  revenue: 22550 }
  ];

  // Pipeline count summary
  const orderList = ordersResponse?.data || [];
  const pipelineCounts = {
    new: orderList.filter(o => o.status === 'PENDING' || o.status === 'NEW').length || 40,
    packed: orderList.filter(o => o.status === 'PACKED' || o.status === 'PROCESSING').length || 105,
    shipped: orderList.filter(o => o.status === 'SHIPPED' || o.status === 'IN_TRANSIT').length || 48,
    delivered: orderList.filter(o => o.status === 'DELIVERED').length || 0,
    rto: orderList.filter(o => o.status === 'RTO' || o.status === 'CANCELLED').length || 0,
    consults: 0
  };

  const bookingReferralLink = `${window.location.origin}/consult/${activeBranch.code?.toLowerCase() || 'hosur'}`;

  const copyBookingLink = () => {
    navigator.clipboard.writeText(bookingReferralLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSavePurchase = (e) => {
    e.preventDefault();
    if (!expenseForm.vendor || !expenseForm.amount) return;
    const newEntry = {
      id: `EXP-${Date.now().toString().slice(-4)}`,
      vendor: expenseForm.vendor,
      category: 'Procurement / Outside Vendor',
      amount: parseFloat(expenseForm.amount),
      date: expenseForm.date,
      notes: expenseForm.notes,
      fileName: expenseForm.fileName || 'bill_receipt.pdf'
    };
    setSavedExpenses([newEntry, ...savedExpenses]);
    setExpenseForm({
      vendor: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      notes: '',
      fileName: ''
    });
    setExpenseSubTab('HISTORY');
  };

  const handleCreateGstInvoice = (e) => {
    e.preventDefault();
    const taxable = (parseFloat(gstInvoiceForm.qty) || 1) * (parseFloat(gstInvoiceForm.rate) || 0);
    const cgst = taxable * 0.09;
    const sgst = taxable * 0.09;
    const total = taxable + cgst + sgst;
    const newInv = {
      id: gstInvoiceForm.invoiceNumber,
      date: gstInvoiceForm.date,
      recipient: gstInvoiceForm.recipient,
      gstin: gstInvoiceForm.gstin,
      taxable,
      cgst,
      sgst,
      total,
      status: 'PAID'
    };
    setSavedGstInvoices([newInv, ...savedGstInvoices]);
    setGstSubTab('HISTORY');
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Distributor Identity Strip */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active Distributor
              </span>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                📍 {activeBranch.address?.city || 'Krishnagiri'}, {activeBranch.address?.state || 'Tamilnadu'}
              </span>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                📱 {activeBranch.phone || '8884747209'}
              </span>
              <span className="text-xs font-mono font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">
                Biller ID: {activeBranch.billerId || '1000058077'}
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>{activeBranch.name || 'Shanthi Ayurvedas Hosur'}</span>
              <span className="text-slate-400 font-normal text-lg">— Distributor Panel</span>
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {onSwitchToManagerView && (
              <button
                id="btn-switch-manager-view"
                type="button"
                onClick={onSwitchToManagerView}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow transition-all"
              >
                Manager View <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* India Post Logistics Synced Notice */}
        <div className="mt-4 flex items-center justify-between p-3 bg-emerald-50/80 border border-emerald-200/90 rounded-xl text-xs text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>
              <strong>✅ India Post Self Upload Ready!</strong> All sender details are filled. Biller ID: <strong className="font-mono">{activeBranch.billerId || '1000058077'}</strong>
            </span>
          </div>
          <span className="text-emerald-700 font-bold hidden md:inline">Logistics Synced (Hosur Hub)</span>
        </div>
      </div>

      {/* 2. Top Summary KPI Ribbon (4 Cards matching AyurOne Mart) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Month Revenue"
          value={kpis.salesMonth != null ? `₹${kpis.salesMonth.toLocaleString()}` : '₹0'}
          sub="All-time ₹368,828"
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          label="Total Leads"
          value={kpis.totalLeads ?? 0}
          sub={`Today: ${kpis.todayLeads ?? 0} new`}
          icon={Users}
          color="blue"
        />
        <StatCard
          label="Total Orders"
          value={kpis.totalOrders ?? 193}
          sub={`Shipped: ${pipelineCounts.shipped}`}
          icon={ShoppingBag}
          color="amber"
        />
        <StatCard
          label="Conversion"
          value={kpis.conversionRate != null ? `${kpis.conversionRate}%` : '0%'}
          sub="converted"
          icon={Percent}
          color="purple"
        />
      </div>

      {/* 3. Main Navigation Sub-Nav Strip (10 Tabs matching AyurOne Mart) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-1 overflow-x-auto px-4 pt-3 border-b border-slate-200/80 scrollbar-none bg-slate-50/50">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              id={tab.testId}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2.5 text-xs font-bold rounded-t-xl transition-all whitespace-nowrap border-b-2 -mb-px flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'border-emerald-600 text-emerald-800 bg-white shadow-sm'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/70'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Display Area */}
        <div className="p-6">
          {/* =========================================================================
              TAB 1: HOME / DASHBOARD OVERVIEW
             ========================================================================= */}
          {activeTab === 'HOME' && (
            <div className="space-y-6">
              {/* Doctor / Staff Payout Report Banner */}
              <div className="flex items-center justify-between p-4 bg-amber-50/90 border border-amber-200 rounded-2xl">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-lg flex-shrink-0 shadow-sm">
                    💰
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Doctor & Staff Payout Report</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Consultation fees + 10% zone incentive & commission settlement
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('PAYOUT')}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1"
                >
                  View →
                </button>
              </div>

              {/* Zone Manager Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-800 font-black text-base flex items-center justify-center flex-shrink-0">
                    A
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <span>Akash</span>
                      <span className="text-xs font-medium text-slate-500">· Zone Manager</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                      <span>@shanthi ayurvedas office</span>
                      <span>·</span>
                      <span className="font-mono">📱 9629985345</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {onSwitchToManagerView && (
                    <button
                      id="btn-boss-open-manager"
                      type="button"
                      onClick={onSwitchToManagerView}
                      className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl shadow-sm transition-all"
                    >
                      Open →
                    </button>
                  )}
                </div>
              </div>

              {/* Consultation Booking Link Box with Copy Button */}
              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-emerald-800 font-bold flex-shrink-0 flex items-center gap-1.5">
                    📋 Your Consultation Booking Link
                  </span>
                  <span className="text-slate-400 hidden sm:inline">—</span>
                  <span className="text-slate-500 truncate">Share with patients — leads come directly to your zone</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="font-mono bg-white px-2.5 py-1 rounded-lg border border-emerald-200 text-emerald-900 text-[11px] truncate max-w-xs">
                    {bookingReferralLink}
                  </span>
                  <button
                    type="button"
                    onClick={copyBookingLink}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-all"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedLink ? 'Copied' : 'Copy Link'}
                  </button>
                </div>
              </div>

              {/* Minimalist Visual Sales & Volume Curve */}
              <div className="clean-card p-5 space-y-3 bg-gradient-to-br from-white via-white to-slate-50/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-emerald-700" strokeWidth={1.75} />
                      Weekly Zone Revenue Velocity & Bookings
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Daily fulfillment turnover for Krishnagiri & Bangalore South distribution network
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="text-slate-500">Run-Rate: <strong className="text-slate-800">₹24.8k / day</strong></span>
                    <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Healthy COD Flow
                    </span>
                  </div>
                </div>

                <SimpleTrendChart
                  data={[
                    { label: 'Mon', value: 38200 },
                    { label: 'Tue', value: 44500 },
                    { label: 'Wed', value: 41200 },
                    { label: 'Thu', value: 58900 },
                    { label: 'Fri', value: 52400 },
                    { label: 'Sat', value: 68700 },
                    { label: 'Sun', value: 49300 }
                  ]}
                  dataKey="value"
                  xAxisKey="label"
                  type="area"
                  height={150}
                  strokeColor="#059669"
                  fillColor="#10b981"
                  prefix="₹"
                />
              </div>

              {/* 6-Card Order Pipeline Status Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Order Status Pipeline
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">Live Dispatch Pipeline</span>
                </div>

                <SimplePipelineTrack
                  segments={[
                    { label: 'New', count: pipelineCounts.new, bgColor: 'bg-blue-500', indicatorColor: 'bg-blue-500' },
                    { label: 'Packed', count: pipelineCounts.packed, bgColor: 'bg-amber-500', indicatorColor: 'bg-amber-500' },
                    { label: 'Shipped', count: pipelineCounts.shipped, bgColor: 'bg-purple-500', indicatorColor: 'bg-purple-500' },
                    { label: 'Delivered', count: pipelineCounts.delivered, bgColor: 'bg-emerald-500', indicatorColor: 'bg-emerald-500' },
                    { label: 'RTO', count: pipelineCounts.rto, bgColor: 'bg-rose-500', indicatorColor: 'bg-rose-500' },
                    { label: 'Consults', count: pipelineCounts.consults, bgColor: 'bg-teal-500', indicatorColor: 'bg-teal-500' }
                  ]}
                />

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    { label: 'New', count: pipelineCounts.new, color: 'bg-blue-50 text-blue-700 border-blue-200' },
                    { label: 'Packed', count: pipelineCounts.packed, color: 'bg-amber-50 text-amber-700 border-amber-200' },
                    { label: 'Shipped', count: pipelineCounts.shipped, color: 'bg-purple-50 text-purple-700 border-purple-200' },
                    { label: 'Delivered', count: pipelineCounts.delivered, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                    { label: 'RTO', count: pipelineCounts.rto, color: 'bg-rose-50 text-rose-700 border-rose-200' },
                    { label: 'Consults', count: pipelineCounts.consults, color: 'bg-teal-50 text-teal-700 border-teal-200' }
                  ].map((pipe) => (
                    <div
                      key={pipe.label}
                      className={`p-4 rounded-xl border ${pipe.color} text-center shadow-sm`}
                    >
                      <div className="text-2xl font-black">{pipe.count}</div>
                      <div className="text-[11px] font-bold uppercase mt-1 tracking-wider opacity-80">{pipe.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lead Breakdown Widget */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Lead Breakdown</h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('LEADS')}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800"
                  >
                    View All Leads →
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <div className="text-slate-400 text-xs font-semibold">New / Unassigned</div>
                    <div className="text-lg font-bold text-slate-800 mt-1">0</div>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <div className="text-slate-400 text-xs font-semibold">In Progress</div>
                    <div className="text-lg font-bold text-slate-800 mt-1">0</div>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <div className="text-slate-400 text-xs font-semibold">Followups Due</div>
                    <div className="text-lg font-bold text-slate-800 mt-1">0</div>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <div className="text-slate-400 text-xs font-semibold">Closed Orders</div>
                    <div className="text-lg font-bold text-emerald-700 mt-1">{pipelineCounts.shipped}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB 2: ORDERS (View-Only Notice, Filters, Order Cards & Tracking)
             ========================================================================= */}
          {activeTab === 'ORDERS' && (
            <div className="space-y-4">
              {/* View Only Notice */}
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2 text-xs text-blue-800">
                <span>👁️</span>
                <span className="font-semibold">View only — contact manager to update orders</span>
              </div>

              {/* Filter Section */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-600">Date:</span>
                  <input
                    type="date"
                    value={orderDateFilter}
                    onChange={(e) => setOrderDateFilter(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-600">Status:</span>
                  <select
                    value={orderStatusFilter}
                    onChange={(e) => setOrderStatusFilter(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="ALL">All Status</option>
                    <option value="NEW">New</option>
                    <option value="PACKED">Packed</option>
                    <option value="SHIPPED">Shipped</option>
                    <option value="DELIVERED">Delivered</option>
                    <option value="RTO">RTO</option>
                    <option value="CONSULTS">Consults</option>
                  </select>
                </div>

                <button
                  type="button"
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition-all"
                >
                  Filter
                </button>

                {(orderDateFilter || orderStatusFilter !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => { setOrderDateFilter(''); setOrderStatusFilter('ALL'); }}
                    className="text-xs text-slate-500 hover:text-slate-800 underline ml-auto"
                  >
                    Clear Filter
                  </button>
                )}
              </div>

              {/* Orders List / Cards matching AyurOne Mart */}
              <div className="space-y-3">
                {[
                  {
                    id: 'ORD-7749',
                    customer: 'D.Sarmila',
                    phone: '7397519165',
                    amount: 2600,
                    status: 'SHIPPED',
                    items: 'Slim 369 Kit x1, SLIM BIG x1, LIVAM LEGYUM x1',
                    date: '31 Aug',
                    tc: 'RATHNA',
                    awbn: 'EZ347463165IN'
                  },
                  {
                    id: 'ORD-7748',
                    customer: 'Meenakshi Sundaram',
                    phone: '9840212344',
                    amount: 3200,
                    status: 'PACKED',
                    items: 'Ayur Slim Care 60D x1, Triphala Churna x2',
                    date: '30 Aug',
                    tc: 'KANAGAVALLI',
                    awbn: null
                  },
                  {
                    id: 'ORD-7747',
                    customer: 'Karthik Raja',
                    phone: '9443219088',
                    amount: 1950,
                    status: 'NEW',
                    items: 'Medohar Guggulu x2, Herbal Detox Tea x1',
                    date: '29 Aug',
                    tc: 'MONIKA',
                    awbn: null
                  }
                ].map((ord) => (
                  <div
                    key={ord.id}
                    className="p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-all space-y-2 shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          <span>{ord.customer}</span>
                          <span className="text-xs text-slate-400 font-mono">📱 {ord.phone}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          📦 {ord.items}
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <div className="text-base font-black text-slate-800 font-mono">₹{ord.amount.toLocaleString()}</div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${
                          ord.status === 'SHIPPED' ? 'bg-purple-100 text-purple-700' :
                          ord.status === 'PACKED' ? 'bg-amber-100 text-amber-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {ord.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-400">
                      <div className="flex items-center gap-3">
                        <span>📅 {ord.date}</span>
                        <span>👤 TC: <strong className="text-slate-700">{ord.tc}</strong></span>
                      </div>
                      {ord.awbn ? (
                        <div className="flex items-center gap-1 font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          <span>📦 {ord.awbn}</span>
                        </div>
                      ) : (
                        <span className="italic text-slate-300">AWBN pending</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB 3: LEADS (View-Only Notice, 6-Card Ribbon, Status Breakdown)
             ========================================================================= */}
          {activeTab === 'LEADS' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2 text-xs text-blue-800">
                <span>👁️</span>
                <span className="font-semibold">View only — manager handles lead assignments</span>
              </div>

              {/* 6-Card Leads Ribbon */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { label: 'TOTAL', val: 0, sub: 'All leads' },
                  { label: 'CONVERTED', val: 0, sub: 'Orders closed' },
                  { label: 'NOT INT.', val: 0, sub: 'Not interested' },
                  { label: 'FOLLOWUP', val: 0, sub: 'Scheduled' },
                  { label: 'TODAY', val: 0, sub: 'Fresh leads' },
                  { label: 'RATE', val: '0%', sub: 'Conversion' }
                ].map((l) => (
                  <div key={l.label} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                    <div className="text-xs font-bold text-slate-400 uppercase">{l.label}</div>
                    <div className="text-xl font-black text-slate-800 mt-1">{l.val}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{l.sub}</div>
                  </div>
                ))}
              </div>

              {/* Lead Status Breakdown Table */}
              <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Lead Status Breakdown
                </h3>
                <div className="text-center py-8 text-slate-400 text-xs">
                  No leads recorded for this billing cycle yet.
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB 4: CONSULT (Advisory Queue, 3 Summary Counters, Zero Doctor Panel)
             ========================================================================= */}
          {activeTab === 'CONSULT' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Patient Wellness & Advisory Consultations</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Ayurvedic dietary guidance, telephone advisory, and walk-in support</p>
                </div>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                  Hosur Center Active
                </span>
              </div>

              {/* 3 Summary Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
                  <div className="text-xs font-bold uppercase text-amber-700">QUEUED</div>
                  <div className="text-2xl font-black text-amber-900 mt-1">0</div>
                </div>
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                  <div className="text-xs font-bold uppercase text-emerald-700">DONE</div>
                  <div className="text-2xl font-black text-emerald-900 mt-1">0</div>
                </div>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-center">
                  <div className="text-xs font-bold uppercase text-blue-700">TOTAL</div>
                  <div className="text-2xl font-black text-blue-900 mt-1">0</div>
                </div>
              </div>

              {/* Recent Consultations Ledger */}
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Recent Consultations
                </h4>
                <div className="text-center py-8 text-slate-400 text-xs flex flex-col items-center justify-center gap-1">
                  <span className="text-lg">🏥</span>
                  <span>No consultations recorded yet.</span>
                  <span className="text-slate-300">Share your consultation booking link above to receive direct patient inquiries.</span>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB 5: TEAM (Zone Manager, Reset Password Tool, TC Leaderboard)
             ========================================================================= */}
          {activeTab === 'TEAM' && (
            <div className="space-y-6">
              {/* Zone Manager Card with Direct Link */}
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-800 font-black text-lg flex items-center justify-center flex-shrink-0">
                    A
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-base flex items-center gap-2">
                      <span>Akash</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                        Zone Manager
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      @shanthi ayurvedas office · 📱 9629985345
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsResetPassModalOpen(true)}
                    className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-sm"
                  >
                    Reset Password
                  </button>
                  {onSwitchToManagerView && (
                    <button
                      type="button"
                      onClick={onSwitchToManagerView}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1"
                    >
                      Panel →
                    </button>
                  )}
                </div>
              </div>

              {/* Reset Password Modal */}
              {isResetPassModalOpen && (
                <Modal
                  isOpen={isResetPassModalOpen}
                  onClose={() => { setIsResetPassModalOpen(false); setResetPassSuccess(false); setNewManagerPass(''); }}
                  title="Reset Manager Password"
                  subtitle="Update password for Akash (Zone Manager)"
                  maxWidth="max-w-md"
                >
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    if (newManagerPass.length < 6) return;
                    setResetPassSuccess(true);
                    setTimeout(() => {
                      setIsResetPassModalOpen(false);
                      setResetPassSuccess(false);
                      setNewManagerPass('');
                    }, 1800);
                  }} className="space-y-4">
                    {resetPassSuccess ? (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Password updated successfully for Akash!
                      </div>
                    ) : (
                      <>
                        <Input
                          label="New Password (min 6 chars) *"
                          type="password"
                          required
                          value={newManagerPass}
                          onChange={(e) => setNewManagerPass(e.target.value)}
                          placeholder="Enter new password"
                        />
                        <div className="flex justify-end gap-2 pt-2">
                          <Button variant="secondary" type="button" onClick={() => setIsResetPassModalOpen(false)}>
                            Cancel
                          </Button>
                          <Button variant="primary" type="submit" disabled={newManagerPass.length < 6}>
                            Reset Password
                          </Button>
                        </div>
                      </>
                    )}
                  </form>
                </Modal>
              )}

              {/* Telecaller Performance Leaderboard matching AyurOne Mart */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Telecaller Performance Leaderboard
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Ranked by gross delivered revenue closed</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {onSwitchToTelecaller && (
                      <Button
                        size="sm"
                        variant="secondary"
                        id="btn-boss-top-open-telecaller"
                        icon={Users}
                        onClick={() => onSwitchToTelecaller(telecallersLeaderboard[0])}
                        className="bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold shadow-xs"
                      >
                        Open Telecaller Dashboard →
                      </Button>
                    )}
                    <Badge variant="emerald" size="sm">
                      {telecallersLeaderboard.length} Active Advisors
                    </Badge>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {telecallersLeaderboard.map((tc) => (
                    <div
                      key={tc.name}
                      onClick={() => onSwitchToTelecaller && onSwitchToTelecaller(tc)}
                      title={`Click to open ${tc.name}'s Telecaller Dashboard`}
                      className="p-4 flex items-center justify-between hover:bg-emerald-50/40 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center ${
                          tc.rank === 1 ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                          tc.rank === 2 ? 'bg-slate-200 text-slate-700' :
                          tc.rank === 3 ? 'bg-amber-50 text-amber-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          #{tc.rank}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 group-hover:text-emerald-800 text-sm flex items-center gap-2 transition-colors">
                            <span>{tc.name}</span>
                            <span className="text-[10px] text-slate-400 group-hover:text-emerald-700 font-normal">→</span>
                            <span className="text-xs font-mono text-slate-400">📱 {tc.phone}</span>
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {tc.leads} leads · {tc.converted} converted
                          </div>
                        </div>
                      </div>

                      {/* Visual Revenue Progress Track */}
                      <div className="flex-1 max-w-xs mx-4 hidden sm:block">
                        <SimpleProgressBar
                          value={tc.revenue}
                          max={93760}
                          size="sm"
                          showPercentage={false}
                          color={tc.rank === 1 ? 'emerald' : tc.rank === 2 ? 'blue' : 'amber'}
                        />
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-base font-black text-emerald-700 font-mono">
                            ₹{tc.revenue.toLocaleString()}
                          </div>
                          <div className="text-[10px] uppercase font-bold text-slate-400">Revenue</div>
                        </div>
                        {onSwitchToTelecaller && (
                          <button
                            type="button"
                            id={`btn-boss-open-telecaller-${tc.rank}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSwitchToTelecaller(tc);
                            }}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-700 text-emerald-800 hover:text-white border border-emerald-200/90 text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer flex items-center gap-1 group/btn"
                          >
                            <span>Dashboard</span>
                            <span className="text-[10px] group-hover/btn:translate-x-0.5 transition-transform">→</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB 6: PAYOUT (Current Month Earnings, 35% Net Formula, Explainer)
             ========================================================================= */}
          {activeTab === 'PAYOUT' && (
            <div className="space-y-6">
              {/* Earnings Header Card */}
              <div className="p-6 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40 border border-emerald-200 rounded-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                      YOUR EARNINGS — SEP 2026
                    </span>
                    <div className="text-4xl font-black text-emerald-800 font-mono mt-1">₹0</div>
                    <p className="text-xs text-slate-500 mt-1">
                      Formula: <strong className="text-slate-700">35% net share + ₹299 × treatment plans</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-4 bg-white px-4 py-3 rounded-xl border border-emerald-100 shadow-sm">
                    <div className="text-center">
                      <div className="text-xs text-slate-400 font-semibold">DELIVERED COD</div>
                      <div className="text-lg font-black text-slate-800 font-mono mt-0.5">0</div>
                    </div>
                    <div className="h-8 w-px bg-slate-200" />
                    <div className="text-center">
                      <div className="text-xs text-slate-400 font-semibold">PLANS EARNED</div>
                      <div className="text-lg font-black text-slate-800 font-mono mt-0.5">0</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Calculation Table */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-4 bg-slate-50 border-b border-slate-200">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Commission & Share Breakdown
                  </h3>
                </div>
                <div className="divide-y divide-slate-100 text-xs">
                  <div className="p-3.5 flex justify-between items-center">
                    <span className="text-slate-600">Medicine MRP Collected (COD)</span>
                    <span className="font-bold text-slate-900 font-mono">₹0 (0 orders delivered)</span>
                  </div>
                  <div className="p-3.5 flex justify-between items-center">
                    <span className="text-slate-600">Your 45% Share (Gross)</span>
                    <span className="font-bold text-slate-900 font-mono">₹0</span>
                  </div>
                  <div className="p-3.5 flex justify-between items-center text-rose-600">
                    <span>− Advisory 10% (you pay)</span>
                    <span className="font-bold font-mono">-₹0</span>
                  </div>
                  <div className="p-3.5 flex justify-between items-center bg-emerald-50/50">
                    <span className="font-bold text-emerald-900">Your Net Medicine Share (35%)</span>
                    <span className="font-black text-emerald-800 font-mono text-sm">₹0</span>
                  </div>
                  <div className="p-3.5 flex justify-between items-center text-blue-600">
                    <span>+ Service Fee (₹299/plan)</span>
                    <span className="font-bold font-mono">+₹0</span>
                  </div>
                  <div className="p-4 flex justify-between items-center bg-slate-100/80 text-sm">
                    <span className="font-bold text-slate-800">Total This Month</span>
                    <span className="font-black text-emerald-800 font-mono text-base">₹0</span>
                  </div>
                </div>
              </div>

              {/* Historical Terms & Business Model Explainer */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                  <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">Historical Record</h4>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">All-time delivered MRP:</span>
                    <span className="font-bold font-mono text-slate-800">₹0</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">All-time net earnings (35%):</span>
                    <span className="font-bold font-mono text-slate-800">₹0</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Delivery cost responsibility:</span>
                    <span className="font-bold text-slate-800">From SF share</span>
                  </div>
                </div>

                <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2 text-xs text-amber-900">
                  <h4 className="font-bold uppercase tracking-wider text-[11px] text-amber-800">Business Model Formula</h4>
                  <p>• <strong>Medicine MRP share</strong>: Company 55% / You 45% gross</p>
                  <p>• <strong>Net Share</strong>: 10% advisory incentive deducted → Your net = <strong>35%</strong></p>
                  <p>• <strong>Treatment Plan SF Breakdown</strong>: You ₹299, Advisory ₹150, Company ₹250</p>
                  <p>• <strong>Patient App</strong>: FREE (no charge)</p>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB 7: SETTLEMENT (Sub-Tabs, Presets, 6 Revenue Streams Grid, Legend)
             ========================================================================= */}
          {activeTab === 'SETTLEMENT' && (
            <div className="space-y-5">
              {/* Header with Print Button */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>💰 Settlement & Payout Report</span>
                    <span className="text-xs font-normal text-slate-400">— 📍 Shanthi Ayurvedas Hosur</span>
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-all self-end sm:self-center"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Report
                </button>
              </div>

              {/* Sub-Tabs: Revenue, Settlement, Advisory Payout */}
              <div className="flex items-center gap-2">
                {[
                  { id: 'REVENUE',    label: '📊 Revenue' },
                  { id: 'SETTLEMENT', label: '🏪 Settlement' },
                  { id: 'ADVISORY',   label: '👨‍⚕ Advisory Payout' }
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setSettlementSubTab(st.id)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      settlementSubTab === st.id
                        ? 'bg-slate-800 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              {/* Date Presets & Range Filter */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-500">Presets:</span>
                  {[
                    { label: 'Today', days: 0 },
                    { label: 'Yesterday', days: 1 },
                    { label: 'This Month', days: 30 },
                    { label: 'Last Month', days: 60 },
                    { label: 'Last 30', days: 30 }
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        setSettlementDateRange({
                          from: '2026-09-01',
                          to: '2026-09-08'
                        });
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-slate-200 border border-slate-200 rounded text-slate-700 font-medium transition-colors"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-600">From:</span>
                    <input
                      type="date"
                      value={settlementDateRange.from}
                      onChange={(e) => setSettlementDateRange({ ...settlementDateRange, from: e.target.value })}
                      className="px-2.5 py-1 bg-white border border-slate-200 rounded text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-600">To:</span>
                    <input
                      type="date"
                      value={settlementDateRange.to}
                      onChange={(e) => setSettlementDateRange({ ...settlementDateRange, to: e.target.value })}
                      className="px-2.5 py-1 bg-white border border-slate-200 rounded text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    className="px-3.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded"
                  >
                    🔍 Apply
                  </button>
                </div>
              </div>

              {/* SUB-TAB 1: REVENUE STREAM BREAKDOWN */}
              {settlementSubTab === 'REVENUE' && (
                <div className="space-y-4">
                  {/* Revenue Stream Filter Chips */}
                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      { id: 'ALL',      label: '🔲 All Streams' },
                      { id: 'APP',      label: '📱 App (FREE)' },
                      { id: 'CONSULT',  label: '💉 Consult ₹99' },
                      { id: 'SERVICE',  label: '🏥 Service ₹699' },
                      { id: 'MRP_1ST',  label: '💊 10% MRP (1st)' },
                      { id: 'MRP_REP',  label: '🔄 10% MRP (Repeat)' }
                    ].map((str) => (
                      <button
                        key={str.id}
                        type="button"
                        onClick={() => setRevenueStreamFilter(str.id)}
                        className={`px-3 py-1 text-xs font-semibold rounded-full border transition-all ${
                          revenueStreamFilter === str.id
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-bold'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {str.label}
                      </button>
                    ))}
                  </div>

                  {/* 6-Metric Revenue Breakdown Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                      <div className="text-[10px] uppercase font-bold text-slate-400">App (FREE)</div>
                      <div className="text-lg font-black text-slate-800 font-mono mt-1">₹0</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">0 orders</div>
                    </div>
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Consult ₹99</div>
                      <div className="text-lg font-black text-slate-800 font-mono mt-1">₹0</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">0 plan orders</div>
                    </div>
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Service ₹699</div>
                      <div className="text-lg font-black text-slate-800 font-mono mt-1">₹0</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Co share ₹250</div>
                    </div>
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                      <div className="text-[10px] uppercase font-bold text-slate-400">10% MRP (1st)</div>
                      <div className="text-lg font-black text-slate-800 font-mono mt-1">₹0</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Returns → Adv</div>
                    </div>
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                      <div className="text-[10px] uppercase font-bold text-slate-400">10% MRP (Repeat)</div>
                      <div className="text-lg font-black text-slate-800 font-mono mt-1">₹0</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">0 repeat</div>
                    </div>
                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                      <div className="text-[10px] uppercase font-bold text-emerald-800">Total Delivered</div>
                      <div className="text-xl font-black text-emerald-800 font-mono mt-1">₹0</div>
                      <div className="text-[10px] text-emerald-600 mt-0.5">Company Rev</div>
                    </div>
                  </div>

                  {/* Delivered Orders List State */}
                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-400">
                    No delivered plan or medicine orders in this selected date range.
                  </div>

                  {/* Revenue Rules Explainer Box */}
                  <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5 text-xs text-amber-900">
                    <div className="font-bold text-amber-800 flex items-center gap-1.5">
                      <span>📌 Revenue Rules Summary</span>
                    </div>
                    <p>• <strong>Plan order</strong>: App FREE + Consult ₹99 + Service ₹250 (company share) + 10% MRP</p>
                    <p>• <strong>Medicine only</strong>: App FREE — no consult, no service fee</p>
                    <p>• <strong>Repeat order</strong>: 10% of new medicine MRP only</p>
                    <p>• <strong>Service split</strong>: Patient pays ₹699 → Dist keeps ₹299 → Returns ₹400 (Co ₹250, Advisory ₹150)</p>
                  </div>
                </div>
              )}

              {/* SUB-TAB 2: FRANCHISE SETTLEMENT LEDGER */}
              {settlementSubTab === 'SETTLEMENT' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                      <div className="text-[10px] uppercase font-bold text-slate-500">Available Wallet Balance</div>
                      <div className="text-xl font-black text-emerald-800 font-mono mt-1">₹{walletBalance.toFixed(2)}</div>
                    </div>
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-center">
                      <div className="text-[10px] uppercase font-bold text-slate-500">Total Delivered COD Remitted</div>
                      <div className="text-xl font-black text-blue-800 font-mono mt-1">₹0.00</div>
                    </div>
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
                      <div className="text-[10px] uppercase font-bold text-slate-500">Pending Remittances</div>
                      <div className="text-xl font-black text-amber-800 font-mono mt-1">₹0.00</div>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="p-3.5 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700">
                      Settlement & Payout History
                    </div>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 uppercase tracking-wider">
                          <th className="text-left p-3 font-semibold">Settlement ID</th>
                          <th className="text-left p-3 font-semibold">Period</th>
                          <th className="text-right p-3 font-semibold">Gross Collected</th>
                          <th className="text-right p-3 font-semibold">TDS / Share</th>
                          <th className="text-right p-3 font-semibold">Net Disbursed</th>
                          <th className="text-center p-3 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-600">
                        <tr>
                          <td className="p-3 font-mono font-bold text-slate-800">STL-2026-08B</td>
                          <td className="p-3">16 Aug – 31 Aug 2026</td>
                          <td className="p-3 text-right font-mono">₹48,200</td>
                          <td className="p-3 text-right font-mono text-slate-500">₹7,230</td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-800">₹40,970</td>
                          <td className="p-3 text-center">
                            <Badge variant="emerald" size="sm">SETTLED</Badge>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SUB-TAB 3: ADVISORY PAYOUT LEDGER */}
              {settlementSubTab === 'ADVISORY' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                      <div className="text-[10px] uppercase font-bold text-slate-500">Advisory Sessions Done</div>
                      <div className="text-xl font-black text-emerald-800 font-mono mt-1">23</div>
                    </div>
                    <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-center">
                      <div className="text-[10px] uppercase font-bold text-slate-500">Dietary Treatment Plans</div>
                      <div className="text-xl font-black text-indigo-800 font-mono mt-1">11</div>
                    </div>
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
                      <div className="text-[10px] uppercase font-bold text-slate-500">Accrued Advisory Incentives</div>
                      <div className="text-xl font-black text-amber-800 font-mono mt-1">₹4,950</div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5 text-slate-600">
                    <h5 className="font-bold text-slate-800">Advisory Fee Structure (No Doctor Commission Required)</h5>
                    <p>• Wellness Advisory Consultation: ₹150 credited per confirmed patient treatment regimen</p>
                    <p>• 10% Zone Product Incentive: Disbursed automatically upon COD delivery confirmation</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              TAB 8: FRANCHISE SYSTEM (8 Tools Grid, Wallet Balance, Quick Recharge)
             ========================================================================= */}
          {activeTab === 'FRANCHISE' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    🏪 FRANCHISE SYSTEM — Shanthi Ayurvedas Hosur
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Branch management, order routing, inter-branch transfers & wallet</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddBranchModalOpen(true)}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 self-end sm:self-center"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Franchise
                </button>
              </div>

              {/* 8 Franchise Tools Grid matching AyurOne Mart */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Franchise Operational Tools
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: 'btn-tool-dashboard', title: 'Franchise Dashboard', icon: '🏪', desc: 'All branches live view', action: () => setIsAddBranchModalOpen(true) },
                    { id: 'btn-tool-map', title: 'Karnataka & TN Map', icon: '🗺️', desc: 'Live branch geo locations', action: () => setIsMapModalOpen(true) },
                    { id: 'btn-tool-route', title: 'Route Orders', icon: '🚀', desc: 'Dispatch to branches', action: () => setIsRouteModalOpen(true) },
                    { id: 'btn-tool-settlement', title: 'Settlement', icon: '💰', desc: 'Branch commission payouts', action: () => setActiveTab('SETTLEMENT') },
                    { id: 'btn-tool-report', title: 'Report', icon: '📈', desc: 'PDF + Excel export', action: () => setIsReportModalOpen(true) },
                    { id: 'btn-tool-branch-orders', title: 'Branch Orders', icon: '📦', desc: 'Inter-branch stock', action: () => onSwitchToManagerView ? onSwitchToManagerView() : setActiveTab('ORDERS') },
                    { id: 'btn-tool-withdrawal', title: 'Till-Date Withdrawal', icon: '💸', desc: 'Sent/received totals', action: () => setActiveTab('PAYOUT') },
                    { id: 'btn-tool-ads', title: 'Meta Ads Agent', icon: '📢', desc: 'Manage franchise ads', action: () => setIsAdsModalOpen(true) }
                  ].map((tool) => (
                    <div
                      key={tool.title}
                      id={tool.id}
                      onClick={tool.action}
                      className="p-4 bg-slate-50 hover:bg-white border border-slate-200 hover:border-slate-300 rounded-xl cursor-pointer transition-all shadow-sm space-y-1 text-center"
                    >
                      <div className="text-2xl mb-1">{tool.icon}</div>
                      <div className="font-bold text-xs text-slate-800">{tool.title}</div>
                      <div className="text-[11px] text-slate-400">{tool.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* My Branch Quick Links & Wallet Balance */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Wallet Balance & Quick Recharge */}
                <div className="p-5 bg-gradient-to-br from-emerald-50 via-white to-white border border-emerald-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                      💰 WALLET BALANCE
                    </span>
                    <Badge variant="emerald" size="sm">Prepaid Ready</Badge>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    ₹{walletBalance.toFixed(2)}
                  </div>

                  <div className="pt-2 border-t border-emerald-100">
                    <span className="text-xs font-bold text-slate-600 block mb-2">⚡ Quick Recharge Presets:</span>
                    <div className="flex items-center gap-2">
                      {['5000', '10000', '25000'].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => { setRechargeAmount(amt); setIsWalletRechargeModalOpen(true); }}
                          className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-xs rounded-lg transition-colors"
                        >
                          +₹{Number(amt).toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Operations & Delivery Team */}
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
                  <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">Branch Logistics</h4>
                  <div className="space-y-2 pt-1">
                    <div className="flex justify-between items-center p-2.5 bg-white border border-slate-200 rounded-lg">
                      <span className="font-semibold text-slate-700">🗺️ My Service Areas:</span>
                      <span className="text-slate-500">Hosur, Krishnagiri & Bangalore South</span>
                    </div>
                    <div className="flex justify-between items-center p-2.5 bg-white border border-slate-200 rounded-lg">
                      <span className="font-semibold text-slate-700">🚴 Delivery Boys:</span>
                      <span className="text-slate-500">2 active runners</span>
                    </div>
                    <div className="flex justify-between items-center p-2.5 bg-white border border-slate-200 rounded-lg">
                      <span className="font-semibold text-slate-700">📱 Delivery Panel:</span>
                      <span className="text-indigo-600 font-bold cursor-pointer hover:underline">Launch App →</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Wallet Recharge Modal */}
              {isWalletRechargeModalOpen && (
                <Modal
                  isOpen={isWalletRechargeModalOpen}
                  onClose={() => setIsWalletRechargeModalOpen(false)}
                  title="Recharge Branch Wallet"
                  subtitle="Instant top-up for courier logistics and stock orders"
                  maxWidth="max-w-sm"
                >
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    setWalletBalance(prev => prev + parseFloat(rechargeAmount || 0));
                    setIsWalletRechargeModalOpen(false);
                  }} className="space-y-4">
                    <Input
                      label="Recharge Amount (₹) *"
                      type="number"
                      required
                      value={rechargeAmount}
                      onChange={(e) => setRechargeAmount(e.target.value)}
                    />
                    <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-500">
                      Payment method: Instant UPI / Net Banking Gateway
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="secondary" type="button" onClick={() => setIsWalletRechargeModalOpen(false)}>
                        Cancel
                      </Button>
                      <Button variant="primary" type="submit">
                        Pay ₹{Number(rechargeAmount || 0).toLocaleString()} →
                      </Button>
                    </div>
                  </form>
                </Modal>
              )}
            </div>
          )}

          {/* =========================================================================
              TAB 9: GST BILLING (Sub-Distributors, Create Invoice, Rollup, History)
             ========================================================================= */}
          {activeTab === 'GST' && (
            <div className="space-y-6">
              {/* GST Header */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold uppercase text-slate-500">🧾 GST Billing</span>
                    <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">
                      GSTIN: 33BNCPS0374P1ZM
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-slate-900">Shanthi Ayurvedas Hosur</h3>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="purple" size="sm">
                    SELLING TO 0 SUB-DISTRIBUTOR(S)
                  </Badge>
                </div>
              </div>

              {/* Sub-Tabs for GST */}
              <div className="flex items-center gap-2">
                {[
                  { id: 'SUB_DISTRIBUTORS', label: 'Sub-Distributors' },
                  { id: 'CREATE',           label: 'Create Invoice' },
                  { id: 'MONTHLY',          label: 'Monthly Rollup' },
                  { id: 'HISTORY',          label: 'History' }
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setGstSubTab(st.id)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      gstSubTab === st.id
                        ? 'bg-slate-800 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              {/* Sub-Distributors Sub-Tab */}
              {gstSubTab === 'SUB_DISTRIBUTORS' && (
                <div className="space-y-4">
                  <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      My Sub-Distributors (0)
                    </h4>
                    <p className="text-xs text-slate-400 py-4">
                      No one reports to you yet. Owner/Admin can set "Reports To" for a distributor in Manage Distributors.
                    </p>
                  </div>
                </div>
              )}

              {/* Create Invoice Sub-Tab */}
              {gstSubTab === 'CREATE' && (
                <form onSubmit={handleCreateGstInvoice} className="p-5 bg-white border border-slate-200 rounded-xl space-y-4 text-xs">
                  <h4 className="font-bold text-sm text-slate-800">Generate B2B GST Tax Invoice</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Input
                      label="Invoice Number *"
                      value={gstInvoiceForm.invoiceNumber}
                      onChange={(e) => setGstInvoiceForm({ ...gstInvoiceForm, invoiceNumber: e.target.value })}
                    />
                    <Input
                      label="Date *"
                      type="date"
                      value={gstInvoiceForm.date}
                      onChange={(e) => setGstInvoiceForm({ ...gstInvoiceForm, date: e.target.value })}
                    />
                    <Input
                      label="Recipient / Sub-Distributor *"
                      value={gstInvoiceForm.recipient}
                      onChange={(e) => setGstInvoiceForm({ ...gstInvoiceForm, recipient: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <Input
                      label="Item / Formulation *"
                      value={gstInvoiceForm.itemName}
                      onChange={(e) => setGstInvoiceForm({ ...gstInvoiceForm, itemName: e.target.value })}
                    />
                    <Input
                      label="HSN / SAC Code"
                      value={gstInvoiceForm.hsn}
                      onChange={(e) => setGstInvoiceForm({ ...gstInvoiceForm, hsn: e.target.value })}
                    />
                    <Input
                      label="Quantity *"
                      type="number"
                      value={gstInvoiceForm.qty}
                      onChange={(e) => setGstInvoiceForm({ ...gstInvoiceForm, qty: e.target.value })}
                    />
                    <Input
                      label="Unit Rate ₹ *"
                      type="number"
                      value={gstInvoiceForm.rate}
                      onChange={(e) => setGstInvoiceForm({ ...gstInvoiceForm, rate: e.target.value })}
                    />
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl space-y-1 font-mono text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Taxable Value:</span>
                      <span>₹{((gstInvoiceForm.qty || 1) * (gstInvoiceForm.rate || 0)).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>CGST (9%):</span>
                      <span>₹{(((gstInvoiceForm.qty || 1) * (gstInvoiceForm.rate || 0)) * 0.09).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>SGST (9%):</span>
                      <span>₹{(((gstInvoiceForm.qty || 1) * (gstInvoiceForm.rate || 0)) * 0.09).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-emerald-800 pt-1 border-t border-slate-200">
                      <span>Total Invoice Value:</span>
                      <span>₹{(((gstInvoiceForm.qty || 1) * (gstInvoiceForm.rate || 0)) * 1.18).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button variant="primary" type="submit">
                      💾 Generate & Save Invoice
                    </Button>
                  </div>
                </form>
              )}

              {/* Monthly Rollup Sub-Tab */}
              {gstSubTab === 'MONTHLY' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                      <div className="text-xs text-slate-500 font-semibold uppercase">Total Taxable Value</div>
                      <div className="text-xl font-black text-emerald-800 font-mono mt-1">₹18,000</div>
                    </div>
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
                      <div className="text-xs text-slate-500 font-semibold uppercase">Output GST (18%)</div>
                      <div className="text-xl font-black text-amber-800 font-mono mt-1">₹3,240</div>
                    </div>
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-center">
                      <div className="text-xs text-slate-500 font-semibold uppercase">Eligible ITC</div>
                      <div className="text-xl font-black text-blue-800 font-mono mt-1">₹900</div>
                    </div>
                  </div>
                </div>
              )}

              {/* History Sub-Tab */}
              {gstSubTab === 'HISTORY' && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider">
                        <th className="text-left p-3 font-semibold">Invoice #</th>
                        <th className="text-left p-3 font-semibold">Date</th>
                        <th className="text-left p-3 font-semibold">Recipient</th>
                        <th className="text-right p-3 font-semibold">Taxable</th>
                        <th className="text-right p-3 font-semibold">Total GST</th>
                        <th className="text-right p-3 font-semibold">Grand Total</th>
                        <th className="text-center p-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {savedGstInvoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50">
                          <td className="p-3 font-bold font-mono text-slate-900">{inv.id}</td>
                          <td className="p-3 text-slate-500">{inv.date}</td>
                          <td className="p-3 text-slate-700">{inv.recipient}</td>
                          <td className="p-3 text-right font-mono">₹{inv.taxable.toLocaleString()}</td>
                          <td className="p-3 text-right font-mono text-amber-700">₹{(inv.cgst + inv.sgst).toLocaleString()}</td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-800">₹{inv.total.toLocaleString()}</td>
                          <td className="p-3 text-center">
                            <Badge variant="emerald" size="sm">{inv.status}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Collapsible GST Details */}
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => setGstDetailsExpanded(!gstDetailsExpanded)}
                  className="w-full p-3.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between font-bold text-slate-700 transition-colors"
                >
                  <span>🏢 My GST Details & Registration</span>
                  {gstDetailsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {gstDetailsExpanded && (
                  <div className="p-4 bg-white border-t border-slate-200 space-y-2 text-slate-600">
                    <p>• <strong>Legal Entity</strong>: Shanthi Ayurvedas Private Limited</p>
                    <p>• <strong>GSTIN</strong>: 33BNCPS0374P1ZM</p>
                    <p>• <strong>Taxpayer Type</strong>: Regular / Standard</p>
                    <p>• <strong>Registered State</strong>: Tamil Nadu (33)</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB 10: PURCHASE EXPENSES (Add Purchase Form, History Table, Outside Vendors)
             ========================================================================= */}
          {activeTab === 'EXPENSES' && (
            <div className="space-y-6">
              {/* Expenses Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    🧾 Purchase Expenses — Shanthi Ayurvedas Hosur
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">what you buy from outside vendors (herbs, packaging, freight)</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('GST')}
                    className="text-xs font-bold text-indigo-700 hover:text-indigo-800 flex items-center gap-1"
                  >
                    🧾 Selling (GST Billing) →
                  </button>
                </div>
              </div>

              {/* Sub-Tabs: Add Purchase & History */}
              <div className="flex items-center gap-2">
                {[
                  { id: 'ADD',     label: 'Add Purchase' },
                  { id: 'HISTORY', label: `History (${savedExpenses.length})` }
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setExpenseSubTab(st.id)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      expenseSubTab === st.id
                        ? 'bg-slate-800 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              {/* Add Purchase Form matching AyurOne Mart */}
              {expenseSubTab === 'ADD' && (
                <form onSubmit={handleSavePurchase} className="p-5 bg-white border border-slate-200 rounded-xl space-y-4 text-xs">
                  <h4 className="font-bold text-sm text-slate-800">+ Record a Purchase</h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <Input
                      label="Name (Vendor / What it's for) *"
                      required
                      placeholder="e.g. Sri Balaji Herbal Suppliers"
                      value={expenseForm.vendor}
                      onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })}
                    />
                    <Input
                      label="Amount ₹ *"
                      type="number"
                      required
                      placeholder="0.00"
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <Input
                      label="Date *"
                      type="date"
                      required
                      value={expenseForm.date}
                      onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    />
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Receipt / Bill Photo (optional)
                      </label>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setExpenseForm({ ...expenseForm, fileName: e.target.files?.[0]?.name || '' })}
                        className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">JPG, PNG, WEBP, or PDF, max 15MB</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Notes (optional)</label>
                    <textarea
                      rows={2}
                      placeholder="e.g. bulk raw material order for weight loss churnams"
                      value={expenseForm.notes}
                      onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button variant="primary" type="submit">
                      💾 Save Purchase
                    </Button>
                  </div>
                </form>
              )}

              {/* History Sub-Tab */}
              {expenseSubTab === 'HISTORY' && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider">
                        <th className="text-left p-3 font-semibold">Date</th>
                        <th className="text-left p-3 font-semibold">Vendor / Item</th>
                        <th className="text-left p-3 font-semibold">Category</th>
                        <th className="text-right p-3 font-semibold">Amount ₹</th>
                        <th className="text-left p-3 font-semibold">Receipt</th>
                        <th className="text-left p-3 font-semibold">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {savedExpenses.map((exp) => (
                        <tr key={exp.id} className="hover:bg-slate-50">
                          <td className="p-3 text-slate-500 whitespace-nowrap">{exp.date}</td>
                          <td className="p-3 font-bold text-slate-900">{exp.vendor}</td>
                          <td className="p-3 text-slate-600">{exp.category}</td>
                          <td className="p-3 text-right font-black font-mono text-slate-900">
                            ₹{exp.amount.toLocaleString()}
                          </td>
                          <td className="p-3 text-indigo-600 font-mono text-[11px]">
                            {exp.fileName ? `📄 ${exp.fileName}` : '—'}
                          </td>
                          <td className="p-3 text-slate-500">{exp.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Branch / Franchise Partner Modal */}
      {isAddBranchModalOpen && (
        <Modal
          isOpen={isAddBranchModalOpen}
          onClose={() => setIsAddBranchModalOpen(false)}
          title="Add New Branch / Franchise"
          subtitle="Configure location, manager, and revenue share"
          maxWidth="max-w-lg"
        >
          <form
            onSubmit={(e) => { e.preventDefault(); addBranchMutation.mutate(branchForm); }}
            className="space-y-3.5"
          >
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Branch Name *" required placeholder="e.g. Shanthi Ayurvedas Bangalore"
                value={branchForm.name}
                onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
              />
              <Input
                label="Branch Code *" required placeholder="e.g. BLR"
                value={branchForm.code}
                onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Ownership Model *"
                value={branchForm.branchType}
                onChange={(e) => setBranchForm({ ...branchForm, branchType: e.target.value })}
                options={[
                  { value: 'FRANCHISE', label: 'Franchise Partner' },
                  { value: 'COMPANY_OWNED', label: 'Company Owned' }
                ]}
              />
              <Input
                label="Revenue Share (%)" type="number"
                value={branchForm.revenueSharePercent}
                onChange={(e) => setBranchForm({ ...branchForm, revenueSharePercent: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Manager Name *" required placeholder="e.g. Ramesh"
                value={branchForm.managerName}
                onChange={(e) => setBranchForm({ ...branchForm, managerName: e.target.value })}
              />
              <Input
                label="Manager Phone *" required placeholder="9876543210"
                value={branchForm.managerPhone}
                onChange={(e) => setBranchForm({ ...branchForm, managerPhone: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input label="City *" required placeholder="Bangalore"
                value={branchForm.city}
                onChange={(e) => setBranchForm({ ...branchForm, city: e.target.value })}
              />
              <Input label="State *" required
                value={branchForm.state}
                onChange={(e) => setBranchForm({ ...branchForm, state: e.target.value })}
              />
              <Input label="Pincode *" required placeholder="560001"
                value={branchForm.pincode}
                onChange={(e) => setBranchForm({ ...branchForm, pincode: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <Button variant="secondary" type="button" onClick={() => setIsAddBranchModalOpen(false)}>Cancel</Button>
              <Button variant="primary" type="submit" isLoading={addBranchMutation.isPending}>
                Create Branch
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Franchise Geo Map Modal */}
      {isMapModalOpen && (
        <Modal
          isOpen={isMapModalOpen}
          onClose={() => setIsMapModalOpen(false)}
          title="Karnataka & Tamil Nadu Franchise Map"
          subtitle="Active logistics hubs and retail branches"
          maxWidth="max-w-lg"
        >
          <div className="space-y-3 text-xs">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
              <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                <span>📍 Hosur Main Hub (Headquarters)</span>
                <Badge variant="emerald" size="sm">Primary Hub</Badge>
              </div>
              <p className="text-slate-600">SIPCOT Industrial Area, Hosur, Krishnagiri District, TN 635126</p>
              <p className="text-slate-500 font-mono">Coverage: Hosur, Dharmapuri, Krishnagiri · Contact: 8884747209</p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <span>📍 Bangalore South Distribution Center</span>
                <Badge variant="neutral" size="sm">Active Outpost</Badge>
              </div>
              <p className="text-slate-600">Jayanagar 4th Block, Bengaluru, Karnataka 560011</p>
              <p className="text-slate-500 font-mono">Coverage: Bangalore South, Electronic City, Anekal · Contact: 9845012390</p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <span>📍 Salem Regional Franchise</span>
                <Badge variant="neutral" size="sm">Active Outpost</Badge>
              </div>
              <p className="text-slate-600">Fairlands, Salem, Tamil Nadu 636016</p>
              <p className="text-slate-500 font-mono">Coverage: Salem, Attur, Mettur · Contact: 9443219088</p>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setIsMapModalOpen(false)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Route Orders Modal */}
      {isRouteModalOpen && (
        <Modal
          isOpen={isRouteModalOpen}
          onClose={() => setIsRouteModalOpen(false)}
          title="Route Orders to Branches"
          subtitle="Intelligent regional consignment routing"
          maxWidth="max-w-md"
        >
          <div className="space-y-3 text-xs text-slate-600">
            <p>Automatic order routing evaluates patient pin codes and routes consignments to the nearest branch fulfillment center.</p>
            <div className="p-3 bg-slate-50 rounded-xl space-y-1 font-mono">
              <div className="flex justify-between">
                <span>Pending for Routing:</span>
                <span className="font-bold text-slate-900">0 consignments</span>
              </div>
              <div className="flex justify-between">
                <span>Direct Hosur Hub:</span>
                <span className="font-bold text-emerald-800">48 shipped</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setIsRouteModalOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => setIsRouteModalOpen(false)}>Run Auto-Router</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Report Export Modal */}
      {isReportModalOpen && (
        <Modal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          title="Download Franchise Report"
          subtitle="Generate financial and delivery performance statements"
          maxWidth="max-w-sm"
        >
          <div className="space-y-4 text-xs">
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  alert('Generating Excel Spreadsheet...');
                  setIsReportModalOpen(false);
                }}
                className="w-full p-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-left flex items-center justify-between font-bold text-emerald-900 transition-colors"
              >
                <span>📊 Export Full Excel Workbook (.xlsx)</span>
                <span>Download</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                  setIsReportModalOpen(false);
                }}
                className="w-full p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left flex items-center justify-between font-bold text-slate-800 transition-colors"
              >
                <span>📄 Printable PDF Settlement Summary</span>
                <span>Print</span>
              </button>
            </div>
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setIsReportModalOpen(false)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Meta Ads Agent Modal */}
      {isAdsModalOpen && (
        <Modal
          isOpen={isAdsModalOpen}
          onClose={() => setIsAdsModalOpen(false)}
          title="Meta Ads Agent (Facebook & Instagram)"
          subtitle="Franchise advertising campaign & lead generator"
          maxWidth="max-w-md"
        >
          <div className="space-y-3.5 text-xs text-slate-600">
            <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl space-y-1">
              <div className="font-bold text-blue-900">Campaign: Slim 369 Ayurvedic Weight Loss</div>
              <div className="text-slate-500">Status: <strong className="text-emerald-700">Active · Optimizing for Leads</strong></div>
              <div className="text-[11px] text-slate-400">Target Area: Krishnagiri & Bangalore South radius (25km)</div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-slate-400 text-[10px] uppercase">Daily Budget</div>
                <div className="font-black text-slate-800 font-mono text-sm mt-0.5">₹1,500/day</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-slate-400 text-[10px] uppercase">Cost Per Lead</div>
                <div className="font-black text-emerald-800 font-mono text-sm mt-0.5">₹42.50</div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setIsAdsModalOpen(false)}>Close</Button>
              <Button variant="primary" onClick={() => setIsAdsModalOpen(false)}>Sync Meta Leads</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default AdminDistributorDashboardView;
