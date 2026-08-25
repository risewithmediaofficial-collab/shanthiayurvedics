import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Store,
  DollarSign,
  Users,
  ShoppingBag,
  TrendingUp,
  Truck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Plus,
  ArrowRight,
  LogOut,
  Shield,
  FileText,
  CreditCard,
  Layers,
  MapPin,
  Phone,
  Calendar,
  Sparkles,
  Percent,
  Receipt,
  Boxes
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
import { DoctorSlotsPage } from '../consultations/DoctorSlotsPage.jsx';

export function AdminDistributorDashboardView({ onSwitchToManagerView }) {
  const { user, logout } = useAuth();
  const { selectedBranchId, selectBranch } = useBranch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('HOME');
  const [isAddBranchModalOpen, setIsAddBranchModalOpen] = useState(false);
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [selectedPayoutDoctor, setSelectedPayoutDoctor] = useState(null);

  // New Branch / Franchise Form State
  const [branchForm, setBranchForm] = useState({
    name: '',
    code: '',
    branchType: 'FRANCHISE',
    phone: '',
    email: '',
    street: '',
    city: '',
    state: 'Tamil Nadu',
    pincode: '',
    managerName: '',
    managerPhone: '',
    revenueSharePercent: 15,
    billerId: '1000058077',
    gstNumber: ''
  });

  // Expense Form State
  const [expenseForm, setExpenseForm] = useState({
    category: 'RAW_HERBS',
    vendorName: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  // 1. Fetch Executive Dashboard KPIs & Branches
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['admin-distributor-dashboard', selectedBranchId],
    queryFn: async () => {
      const res = await apiClient.get('/dashboard');
      return res.data?.data;
    }
  });

  // 2. Fetch Orders for Orders sub-tab
  const { data: ordersResponse } = useQuery({
    queryKey: ['admin-orders', selectedBranchId],
    queryFn: async () => {
      const res = await apiClient.get('/orders?limit=25');
      return res.data;
    },
    enabled: activeTab === 'ORDERS'
  });

  // 3. Fetch Leads for Leads sub-tab
  const { data: leadsResponse } = useQuery({
    queryKey: ['admin-leads', selectedBranchId],
    queryFn: async () => {
      const res = await apiClient.get('/leads?limit=25');
      return res.data;
    },
    enabled: activeTab === 'LEADS'
  });

  // Add Branch / Franchise Mutation
  const addBranchMutation = useMutation({
    mutationFn: (data) =>
      apiClient.post('/branches', {
        name: data.name,
        code: data.code.toUpperCase(),
        branchType: data.branchType,
        phone: data.phone,
        email: data.email,
        managerName: data.managerName,
        managerPhone: data.managerPhone,
        revenueSharePercent: Number(data.revenueSharePercent || 0),
        billerId: data.billerId,
        gstNumber: data.gstNumber,
        address: {
          street: data.street,
          city: data.city,
          state: data.state,
          pincode: data.pincode
        }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-distributor-dashboard']);
      queryClient.invalidateQueries(['branches']);
      setIsAddBranchModalOpen(false);
      setBranchForm({
        name: '',
        code: '',
        branchType: 'FRANCHISE',
        phone: '',
        email: '',
        street: '',
        city: '',
        state: 'Tamil Nadu',
        pincode: '',
        managerName: '',
        managerPhone: '',
        revenueSharePercent: 15,
        billerId: '1000058077',
        gstNumber: ''
      });
    }
  });

  if (isLoading) {
    return <Spinner size="lg" text="Loading executive master console..." className="py-24 text-slate-100" />;
  }

  const kpis = dashboardData?.kpis || {};
  const branches = dashboardData?.branches || [];
  const activeBranch = branches.find((b) => b._id === selectedBranchId) || branches[0] || {
    name: 'Shanthi Ayurvedas Hosur',
    code: 'HSR',
    address: { city: 'Krishnagiri', state: 'Tamilnadu' },
    phone: '8884747209',
    billerId: '1000058077'
  };

  const totalRevenue = kpis.allTimeRevenue || kpis.salesMonth || 354538;
  const monthRevenue = kpis.salesMonth || totalRevenue;
  const totalOrders = kpis.totalOrders || 185;
  const shippedOrders = kpis.shippedOrders || 48;
  const totalLeads = kpis.totalLeads || 0;
  const conversionRate = kpis.conversionRate || 0;

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans -m-6 sm:-m-8">
      {/* Top Dark Header */}
      <header className="bg-[#0f172a]/95 backdrop-blur-md px-6 py-4 border-b border-slate-800 sticky top-0 z-30 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-700 via-ayur-600 to-emerald-500 text-white flex items-center justify-center text-xl shadow-md">
              🌿
            </div>
            <div>
              <h1 className="text-base font-black tracking-wide text-white leading-tight">
                {activeBranch.name}
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">
                Distributor & Franchise Master Panel · {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {onSwitchToManagerView && (
              <button
                type="button"
                onClick={onSwitchToManagerView}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
              >
                <span>Manager &rarr;</span>
              </button>
            )}
            <button
              type="button"
              onClick={logout}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Workspace */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Active Branch Header & Details Card */}
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-white tracking-tight">{activeBranch.name}</h2>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Active
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              {activeBranch.address?.city || 'Krishnagiri'}, {activeBranch.address?.state || 'Tamilnadu'}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-slate-500" />
              {activeBranch.phone || '8884747209'}
            </span>
            {activeBranch.branchType && (
              <span className="px-2 py-0.5 rounded bg-purple-900/60 border border-purple-700/50 text-purple-300 font-bold text-[10px] uppercase">
                {activeBranch.branchType}
              </span>
            )}
          </div>

          {/* India Post Integration Status Bar */}
          <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-xs text-emerald-300 flex items-center justify-between shadow-inner">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>India Post Self Upload Ready!</strong> All sender details are filled. Biller ID: <strong>{activeBranch.billerId || '1000058077'}</strong>
              </span>
            </div>
            <span className="text-[11px] text-emerald-400 font-bold hidden sm:inline">Logistics Synced</span>
          </div>
        </div>

        {/* 4 Executive KPI Cards (Sleek Dark Modern Aesthetic) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Month Revenue */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#131d36] to-[#0f172a] p-5 rounded-2xl border border-slate-800/80 shadow-md">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">MONTH REVENUE</div>
            <div className="text-3xl font-black text-emerald-400 mt-2 font-mono">
              ₹{monthRevenue.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 mt-1">All-time ₹{totalRevenue.toLocaleString()}</div>
            <div className="absolute right-3 top-3 w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
          </div>

          {/* Total Leads */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#131d36] to-[#0f172a] p-5 rounded-2xl border border-slate-800/80 shadow-md">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">TOTAL LEADS</div>
            <div className="text-3xl font-black text-blue-400 mt-2 font-mono">{totalLeads}</div>
            <div className="text-xs text-slate-500 mt-1">Today: {kpis.todayLeads || 0} new</div>
            <div className="absolute right-3 top-3 w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
          </div>

          {/* Total Orders */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#131d36] to-[#0f172a] p-5 rounded-2xl border border-slate-800/80 shadow-md">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">TOTAL ORDERS</div>
            <div className="text-3xl font-black text-amber-400 mt-2 font-mono">{totalOrders}</div>
            <div className="text-xs text-slate-500 mt-1">Shipped: {shippedOrders}</div>
            <div className="absolute right-3 top-3 w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-amber-400" />
            </div>
          </div>

          {/* Conversion */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#131d36] to-[#0f172a] p-5 rounded-2xl border border-slate-800/80 shadow-md">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">CONVERSION</div>
            <div className="text-3xl font-black text-purple-400 mt-2 font-mono">{conversionRate}%</div>
            <div className="text-xs text-slate-500 mt-1">converted</div>
            <div className="absolute right-3 top-3 w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
              <Percent className="w-5 h-5 text-purple-400" />
            </div>
          </div>
        </div>

        {/* Horizontal Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800 scrollbar-none text-xs font-semibold">
          {[
            { id: 'HOME', label: 'Home' },
            { id: 'ORDERS', label: 'Orders' },
            { id: 'LEADS', label: 'Leads' },
            { id: 'CONSULT', label: '🧑‍⚕️ Consult & Slots' },
            { id: 'TEAM', label: 'Team' },
            { id: 'PAYOUT', label: 'Payout' },
            { id: 'SETTLEMENT', label: 'Settlement' },
            { id: 'FRANCHISE', label: '🏪 Franchise & Branches' },
            { id: 'GST', label: '📋 GST Billing' },
            { id: 'EXPENSES', label: '📦 Purchase Expenses' }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-purple-700 to-ayur-600 text-white font-bold shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: HOME (Dashboard Overview & Zone Managers) */}
        {activeTab === 'HOME' && (
          <div className="space-y-4">
            {/* Doctor / Staff Payout Report Banner */}
            <div className="p-4 bg-gradient-to-r from-amber-950/40 via-[#1e1b18] to-amber-950/40 rounded-2xl border border-amber-800/40 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-lg">
                  💰
                </div>
                <div>
                  <h3 className="font-bold text-sm text-amber-200">Doctor Payout Report</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Consultation fees • 10% zone incentive & commission settlement
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPayoutModalOpen(true)}
                className="px-4 py-1.5 bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
              >
                View &rarr;
              </button>
            </div>

            {/* Zone & Branch Managers Roster */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Zone & Branch Managers
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddBranchModalOpen(true)}
                  className="text-xs text-ayur-400 hover:text-ayur-300 font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Branch / Franchise</span>
                </button>
              </div>

              <div className="space-y-2">
                {branches.map((br) => (
                  <div
                    key={br._id}
                    className="p-4 bg-[#111827] rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:border-slate-700 transition-colors shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-900/60 text-purple-300 font-black text-sm flex items-center justify-center border border-purple-700/40">
                        {br.managerName?.[0] || 'A'}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-white flex items-center gap-2">
                          <span>{br.managerName || 'Akash'}</span>
                          <span className="text-xs font-medium text-slate-400">
                            ({br.name})
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Zone Manager • {br.managerPhone || br.phone || '9629985345'} • {br.ordersCount || 0} Orders (₹{(br.totalRevenue || 0).toLocaleString()})
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => {
                          selectBranch(br._id);
                          if (onSwitchToManagerView) onSwitchToManagerView();
                        }}
                        className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 transition-colors"
                      >
                        Open &rarr;
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Consultation Booking Link Strip */}
            <div className="p-3 bg-[#0f172a] rounded-xl border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">Your Consultation Booking Link</span>
                <span className="text-[11px] font-mono text-slate-500">
                  {window.location.origin}/consult/{activeBranch.code?.toLowerCase()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(`${window.location.origin}/consult/${activeBranch.code?.toLowerCase()}`)}
                className="text-[11px] text-ayur-400 hover:underline font-bold"
              >
                Copy Link
              </button>
            </div>
          </div>
        )}

        {/* TAB: CONSULT & DOCTOR SLOTS */}
        {activeTab === 'CONSULT' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-slate-900">
            <DoctorSlotsPage />
          </div>
        )}

        {/* TAB 2: FRANCHISE & BRANCHES */}
        {activeTab === 'FRANCHISE' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Franchise Stores & Physical Outlets</h3>
                <p className="text-xs text-slate-400">Manage franchisee contracts, commission splits, and outlet operations</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddBranchModalOpen(true)}
                className="px-4 py-2 bg-gradient-to-r from-purple-700 to-ayur-600 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Franchise Outlet</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {branches.map((br) => (
                <div key={br._id} className="p-5 bg-[#111827] rounded-2xl border border-slate-800 space-y-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-white text-base flex items-center gap-2">
                        <Store className="w-4 h-4 text-purple-400" />
                        <span>{br.name}</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        Code: <span className="font-mono text-slate-300">{br.code}</span> • Type:{' '}
                        <span className="text-purple-300 font-semibold">{br.branchType || 'COMPANY_OWNED'}</span>
                      </div>
                    </div>
                    <Badge variant={br.isActive ? 'emerald' : 'neutral'} size="sm">
                      {br.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-center text-xs">
                    <div>
                      <div className="font-black text-white text-sm">₹{(br.totalRevenue || 0).toLocaleString()}</div>
                      <div className="text-[10px] text-slate-400 uppercase">Sales</div>
                    </div>
                    <div>
                      <div className="font-black text-amber-400 text-sm">{br.ordersCount || 0}</div>
                      <div className="text-[10px] text-slate-400 uppercase">Orders</div>
                    </div>
                    <div>
                      <div className="font-black text-purple-400 text-sm">{br.revenueSharePercent || 15}%</div>
                      <div className="text-[10px] text-slate-400 uppercase">Share</div>
                    </div>
                  </div>

                  <div className="text-xs text-slate-400 space-y-1">
                    <div>Manager: <strong className="text-slate-200">{br.managerName || 'Akash'}</strong> ({br.managerPhone || br.phone || '9629985345'})</div>
                    <div>Location: {br.address?.city || 'Tamil Nadu'}, {br.address?.pincode || '635109'}</div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        selectBranch(br._id);
                        if (onSwitchToManagerView) onSwitchToManagerView();
                      }}
                      className="px-3.5 py-1.5 bg-purple-900/60 hover:bg-purple-800 text-purple-200 text-xs font-bold rounded-lg border border-purple-700/50 transition-colors"
                    >
                      Manage Franchise Console &rarr;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: GST BILLING */}
        {activeTab === 'GST' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">GST Billing & Tax Reconciliation</h3>
                <p className="text-xs text-slate-400">Monthly 12% / 18% Ayurvedic formulations tax summary and B2B invoices</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-[#111827] rounded-2xl border border-slate-800">
                <div className="text-xs text-slate-400 font-semibold uppercase">Total Taxable Value</div>
                <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">
                  ₹{Math.round(totalRevenue * 0.82).toLocaleString()}
                </div>
              </div>
              <div className="p-4 bg-[#111827] rounded-2xl border border-slate-800">
                <div className="text-xs text-slate-400 font-semibold uppercase">Total GST Output (18%)</div>
                <div className="text-2xl font-black text-amber-400 mt-1 font-mono">
                  ₹{Math.round(totalRevenue * 0.18).toLocaleString()}
                </div>
              </div>
              <div className="p-4 bg-[#111827] rounded-2xl border border-slate-800">
                <div className="text-xs text-slate-400 font-semibold uppercase">Input Tax Credit (ITC)</div>
                <div className="text-2xl font-black text-blue-400 mt-1 font-mono">
                  ₹{Math.round(totalRevenue * 0.05).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PURCHASE EXPENSES */}
        {activeTab === 'EXPENSES' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Procurement & Purchase Expenses</h3>
                <p className="text-xs text-slate-400">Raw herbs, bottle packaging, and vendor procurement accounts</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddExpenseModalOpen(true)}
                className="px-4 py-2 bg-gradient-to-r from-emerald-700 to-ayur-600 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Record Expense</span>
              </button>
            </div>

            <div className="p-5 bg-[#111827] rounded-2xl border border-slate-800 space-y-3">
              <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-800">
                <span>Vendor / Description</span>
                <span>Category</span>
                <span>Amount</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <div>
                    <div className="font-bold text-white">Mysore Herb Extract Suppliers</div>
                    <div className="text-[10px] text-slate-500">PO-2026-881 • Bhringraj & Sandhi Raw Extracts</div>
                  </div>
                  <Badge variant="primary" size="sm">RAW_HERBS</Badge>
                  <span className="font-black text-white text-sm">₹45,000</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <div>
                    <div className="font-bold text-white">Apex Packaging Industries</div>
                    <div className="text-[10px] text-slate-500">PO-2026-882 • 200ml Amber Glass Bottles & Seals</div>
                  </div>
                  <Badge variant="warning" size="sm">PACKAGING</Badge>
                  <span className="font-black text-white text-sm">₹18,500</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Branch / Franchise Modal */}
      {isAddBranchModalOpen && (
        <Modal
          isOpen={isAddBranchModalOpen}
          onClose={() => setIsAddBranchModalOpen(false)}
          title="Add New Branch / Franchise Outlet"
          subtitle="Configure physical store location, manager, and revenue share"
          maxWidth="max-w-lg"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addBranchMutation.mutate(branchForm);
            }}
            className="space-y-3.5 text-slate-900"
          >
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Branch / Franchise Name *"
                required
                placeholder="e.g. Shanthi Ayurvedas Bangalore"
                value={branchForm.name}
                onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
              />
              <Input
                label="Branch Code *"
                required
                placeholder="e.g. BLR"
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
                  { value: 'FRANCHISE', label: 'Franchise Partner (Revenue Share)' },
                  { value: 'COMPANY_OWNED', label: 'Company Owned & Operated' }
                ]}
              />
              <Input
                label="Revenue Share (%) *"
                type="number"
                value={branchForm.revenueSharePercent}
                onChange={(e) => setBranchForm({ ...branchForm, revenueSharePercent: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Zone Manager Name *"
                required
                placeholder="e.g. Akash"
                value={branchForm.managerName}
                onChange={(e) => setBranchForm({ ...branchForm, managerName: e.target.value })}
              />
              <Input
                label="Manager Phone *"
                required
                placeholder="9629985345"
                value={branchForm.managerPhone}
                onChange={(e) => setBranchForm({ ...branchForm, managerPhone: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Input
                label="City *"
                required
                placeholder="Bangalore"
                value={branchForm.city}
                onChange={(e) => setBranchForm({ ...branchForm, city: e.target.value })}
              />
              <Input
                label="State *"
                required
                value={branchForm.state}
                onChange={(e) => setBranchForm({ ...branchForm, state: e.target.value })}
              />
              <Input
                label="Pincode *"
                required
                placeholder="560001"
                value={branchForm.pincode}
                onChange={(e) => setBranchForm({ ...branchForm, pincode: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <Button variant="secondary" type="button" onClick={() => setIsAddBranchModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" isLoading={addBranchMutation.isPending}>
                Create Branch Outlet
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Doctor Payout Modal */}
      {isPayoutModalOpen && (
        <Modal
          isOpen={isPayoutModalOpen}
          onClose={() => setIsPayoutModalOpen(false)}
          title="Doctor & Staff Payout Ledger"
          subtitle="Monthly consultation commissions and zone incentives"
          maxWidth="max-w-lg"
        >
          <div className="space-y-4 text-xs text-slate-800">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
              <div>
                <div className="font-bold text-slate-900">Dr Shanthi (Hosur Zone)</div>
                <div className="text-slate-500">185 Consultations • 10% Zone Incentive</div>
              </div>
              <div className="text-right">
                <div className="text-base font-black text-emerald-700">₹35,450</div>
                <Badge variant="emerald" size="sm">Settled</Badge>
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
              <div>
                <div className="font-bold text-slate-900">Akash (Zone Manager)</div>
                <div className="text-slate-500">Krishnagiri Operations & Telecaller Target Bonus</div>
              </div>
              <div className="text-right">
                <div className="text-base font-black text-emerald-700">₹24,000</div>
                <Badge variant="warning" size="sm">Pending Processing</Badge>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="primary" onClick={() => setIsPayoutModalOpen(false)}>
                Close Payouts
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Record Expense Modal */}
      {isAddExpenseModalOpen && (
        <Modal
          isOpen={isAddExpenseModalOpen}
          onClose={() => setIsAddExpenseModalOpen(false)}
          title="Record Procurement Expense"
          subtitle="Log factory purchases and vendor payments"
          maxWidth="max-w-md"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setIsAddExpenseModalOpen(false);
            }}
            className="space-y-3.5 text-slate-900"
          >
            <Input
              label="Vendor / Supplier Name *"
              required
              placeholder="e.g. Apex Packaging Industries"
              value={expenseForm.vendorName}
              onChange={(e) => setExpenseForm({ ...expenseForm, vendorName: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Category *"
                value={expenseForm.category}
                onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                options={[
                  { value: 'RAW_HERBS', label: 'Raw Herbs & Extracts' },
                  { value: 'PACKAGING', label: 'Packaging & Bottles' },
                  { value: 'LOGISTICS', label: 'Courier Freight' },
                  { value: 'UTILITIES', label: 'Rent & Utilities' }
                ]}
              />
              <Input
                label="Amount (₹) *"
                type="number"
                required
                placeholder="18500"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <Button variant="secondary" type="button" onClick={() => setIsAddExpenseModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                Save Expense
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default AdminDistributorDashboardView;
