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
  Stethoscope,
  Receipt,
  ArrowRight,
  Package
} from 'lucide-react';
import apiClient from '../../api/apiClient.js';
import { useBranch } from '../../context/BranchContext.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Modal } from '../../components/common/Modal.jsx';
import { Input } from '../../components/common/Input.jsx';
import { Select } from '../../components/common/Select.jsx';
import { Spinner } from '../../components/common/Spinner.jsx';
import { DoctorSlotsPage } from '../consultations/DoctorSlotsPage.jsx';

const StatCard = ({ label, value, sub, icon: Icon, color = 'green' }) => {
  const colorMap = {
    green:  { bg: 'bg-emerald-50',  icon: 'bg-emerald-100 text-emerald-700', val: 'text-emerald-700',  border: 'border-emerald-100' },
    blue:   { bg: 'bg-blue-50',     icon: 'bg-blue-100 text-blue-700',       val: 'text-blue-700',     border: 'border-blue-100' },
    amber:  { bg: 'bg-amber-50',    icon: 'bg-amber-100 text-amber-700',     val: 'text-amber-700',    border: 'border-amber-100' },
    purple: { bg: 'bg-purple-50',   icon: 'bg-purple-100 text-purple-700',   val: 'text-purple-700',   border: 'border-purple-100' }
  };
  const c = colorMap[color] || colorMap.green;

  return (
    <div className={`${c.bg} border ${c.border} rounded-2xl p-5 flex items-start justify-between gap-3`}>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">{label}</p>
        <div className={`text-2xl font-black mt-1.5 ${c.val}`}>{value}</div>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
      <div className={`p-2.5 rounded-xl ${c.icon} flex-shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
};

export function AdminDistributorDashboardView({ onSwitchToManagerView }) {
  const { selectedBranchId, selectBranch } = useBranch();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('HOME');
  const [isAddBranchModalOpen, setIsAddBranchModalOpen] = useState(false);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);

  const [branchForm, setBranchForm] = useState({
    name: '', code: '', branchType: 'FRANCHISE', phone: '', email: '',
    street: '', city: '', state: 'Tamil Nadu', pincode: '',
    managerName: '', managerPhone: '', revenueSharePercent: 15,
    billerId: '', gstNumber: ''
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
      const res = await apiClient.get('/orders?limit=25');
      return res.data;
    },
    enabled: activeTab === 'ORDERS'
  });

  // Fetch Leads for sub-tab
  const { data: leadsResponse } = useQuery({
    queryKey: ['admin-leads', selectedBranchId],
    queryFn: async () => {
      const res = await apiClient.get('/leads?limit=25');
      return res.data;
    },
    enabled: activeTab === 'LEADS'
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
        billerId: '', gstNumber: ''
      });
    }
  });

  if (isLoading) {
    return <Spinner size="lg" text="Loading dashboard..." className="py-24" />;
  }

  const kpis = dashboardData?.kpis || {};
  const branches = dashboardData?.branches || [];
  const activeBranch = branches.find((b) => b._id === selectedBranchId) || branches[0] || {};

  const tabs = [
    { id: 'HOME',      label: 'Overview' },
    { id: 'ORDERS',    label: 'Orders' },
    { id: 'LEADS',     label: 'Leads' },
    { id: 'CONSULT',   label: 'Consult & Slots' },
    { id: 'TEAM',      label: 'Team' },
    { id: 'FRANCHISE', label: 'Franchise & Branches' },
    { id: 'GST',       label: 'GST Billing' },
    { id: 'EXPENSES',  label: 'Purchase Expenses' }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Active Branch
            </span>
            {activeBranch.branchType && (
              <span className="text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-100 px-2.5 py-1 rounded-full uppercase">
                {activeBranch.branchType}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            {activeBranch.name || 'Shanthi Ayurvedas'}
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500">
            {activeBranch.address?.city && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {activeBranch.address.city}, {activeBranch.address.state}
              </span>
            )}
            {activeBranch.phone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {activeBranch.phone}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onSwitchToManagerView && (
            <button
              type="button"
              onClick={onSwitchToManagerView}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              Manager View <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* India Post Banner (only if billerId exists) */}
      {activeBranch.billerId && (
        <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>
              <strong>India Post Self Upload Ready</strong> — Biller ID: <strong>{activeBranch.billerId}</strong>
            </span>
          </div>
          <span className="text-emerald-600 font-semibold hidden sm:inline">Logistics Synced</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Month Revenue"
          value={kpis.salesMonth != null ? `₹${kpis.salesMonth.toLocaleString()}` : '—'}
          sub={kpis.allTimeRevenue != null ? `All-time ₹${kpis.allTimeRevenue.toLocaleString()}` : 'No data yet'}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          label="Total Leads"
          value={kpis.totalLeads ?? '—'}
          sub={`Today: ${kpis.todayLeads ?? 0} new`}
          icon={Users}
          color="blue"
        />
        <StatCard
          label="Total Orders"
          value={kpis.totalOrders ?? '—'}
          sub={`Shipped: ${kpis.shippedOrders ?? 0}`}
          icon={ShoppingBag}
          color="amber"
        />
        <StatCard
          label="Conversion Rate"
          value={kpis.conversionRate != null ? `${kpis.conversionRate}%` : '—'}
          sub="Lead to order"
          icon={Percent}
          color="purple"
        />
      </div>

      {/* Sub-Tabs */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {/* Tab Bar */}
        <div className="flex items-center gap-1 overflow-x-auto px-4 pt-3 border-b border-slate-100 scrollbar-none">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-all whitespace-nowrap border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-ayur-600 text-ayur-700 bg-ayur-50/60'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-5">
          {/* OVERVIEW TAB */}
          {activeTab === 'HOME' && (
            <div className="space-y-5">
              {/* Doctor Payout Banner */}
              <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-100 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-base flex-shrink-0">
                    💰
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-800">Doctor Payout Report</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Consultation fees • 10% zone incentive & commission settlement
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPayoutModalOpen(true)}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors flex-shrink-0"
                >
                  View →
                </button>
              </div>

              {/* Branch / Zone Managers */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Zone & Branch Managers
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsAddBranchModalOpen(true)}
                    className="text-xs text-ayur-700 hover:text-ayur-900 font-semibold flex items-center gap-1 hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Branch / Franchise
                  </button>
                </div>

                {branches.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-sm">
                    <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No branches configured yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {branches.map((br) => (
                      <div
                        key={br._id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-slate-50 hover:bg-white border border-slate-200 hover:border-slate-300 rounded-xl transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-ayur-100 text-ayur-800 font-black text-sm flex items-center justify-center flex-shrink-0">
                            {br.managerName?.[0]?.toUpperCase() || br.name?.[0]?.toUpperCase() || 'B'}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-slate-800 flex items-center gap-2">
                              {br.managerName || <span className="text-slate-400 italic">No manager assigned</span>}
                              <span className="text-xs font-medium text-slate-400">({br.name})</span>
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">
                              Zone Manager
                              {br.managerPhone && ` • ${br.managerPhone}`}
                              {` • ${br.ordersCount ?? 0} Orders`}
                              {br.totalRevenue != null && ` (₹${br.totalRevenue.toLocaleString()})`}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            selectBranch(br._id);
                            if (onSwitchToManagerView) onSwitchToManagerView();
                          }}
                          className="px-4 py-1.5 bg-white hover:bg-ayur-50 border border-slate-200 hover:border-ayur-300 text-slate-700 hover:text-ayur-800 text-xs font-bold rounded-lg transition-all self-end sm:self-center"
                        >
                          Open →
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Consultation Booking Link */}
              {activeBranch.code && (
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-ayur-700 font-semibold flex-shrink-0">Booking Link</span>
                    <span className="font-mono text-slate-400 truncate">
                      {window.location.origin}/consult/{activeBranch.code?.toLowerCase()}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      navigator.clipboard.writeText(
                        `${window.location.origin}/consult/${activeBranch.code?.toLowerCase()}`
                      )
                    }
                    className="text-ayur-600 hover:text-ayur-800 font-semibold hover:underline flex-shrink-0 ml-2"
                  >
                    Copy
                  </button>
                </div>
              )}
            </div>
          )}

          {/* CONSULT TAB */}
          {activeTab === 'CONSULT' && (
            <DoctorSlotsPage />
          )}

          {/* FRANCHISE TAB */}
          {activeTab === 'FRANCHISE' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Franchise Stores & Outlets</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Manage franchisee contracts, commission splits, and outlet operations</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddBranchModalOpen(true)}
                  className="px-4 py-2 bg-ayur-700 hover:bg-ayur-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Franchise
                </button>
              </div>

              {branches.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  <Store className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                  No franchise outlets yet
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {branches.map((br) => (
                    <div key={br._id} className="p-5 bg-white border border-slate-200 rounded-2xl space-y-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-slate-800 text-base flex items-center gap-2">
                            <Store className="w-4 h-4 text-ayur-600" />
                            {br.name}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            Code: <span className="font-mono text-slate-600">{br.code}</span>
                            {br.branchType && (
                              <> · <span className="text-purple-600 font-semibold">{br.branchType}</span></>
                            )}
                          </div>
                        </div>
                        <Badge variant={br.isActive ? 'emerald' : 'neutral'} size="sm">
                          {br.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl text-center text-xs border border-slate-100">
                        <div>
                          <div className="font-black text-slate-800 text-sm">
                            {br.totalRevenue != null ? `₹${br.totalRevenue.toLocaleString()}` : '—'}
                          </div>
                          <div className="text-[10px] text-slate-400 uppercase mt-0.5">Sales</div>
                        </div>
                        <div>
                          <div className="font-black text-amber-600 text-sm">{br.ordersCount ?? '—'}</div>
                          <div className="text-[10px] text-slate-400 uppercase mt-0.5">Orders</div>
                        </div>
                        <div>
                          <div className="font-black text-purple-600 text-sm">
                            {br.revenueSharePercent != null ? `${br.revenueSharePercent}%` : '—'}
                          </div>
                          <div className="text-[10px] text-slate-400 uppercase mt-0.5">Rev. Share</div>
                        </div>
                      </div>

                      <div className="text-xs text-slate-500 space-y-1">
                        {br.managerName && (
                          <div>Manager: <strong className="text-slate-700">{br.managerName}</strong>
                            {br.managerPhone && ` (${br.managerPhone})`}
                          </div>
                        )}
                        {br.address?.city && (
                          <div>Location: {br.address.city}{br.address.pincode && `, ${br.address.pincode}`}</div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            selectBranch(br._id);
                            if (onSwitchToManagerView) onSwitchToManagerView();
                          }}
                          className="px-4 py-1.5 bg-ayur-50 hover:bg-ayur-100 text-ayur-800 text-xs font-bold rounded-lg border border-ayur-200 transition-colors"
                        >
                          Manage Console →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* GST BILLING TAB */}
          {activeTab === 'GST' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">GST Billing & Tax Summary</h3>
                <p className="text-xs text-slate-500 mt-0.5">Monthly Ayurvedic formulations tax summary and B2B invoices</p>
              </div>

              {kpis.salesMonth != null ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-2xl">
                    <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Taxable Value</div>
                    <div className="text-2xl font-black text-emerald-700 mt-2 font-mono">
                      ₹{Math.round(kpis.salesMonth * 0.82).toLocaleString()}
                    </div>
                  </div>
                  <div className="p-5 bg-amber-50 border border-amber-100 rounded-2xl">
                    <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">GST Output (18%)</div>
                    <div className="text-2xl font-black text-amber-700 mt-2 font-mono">
                      ₹{Math.round(kpis.salesMonth * 0.18).toLocaleString()}
                    </div>
                  </div>
                  <div className="p-5 bg-blue-50 border border-blue-100 rounded-2xl">
                    <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">ITC Estimate</div>
                    <div className="text-2xl font-black text-blue-700 mt-2 font-mono">
                      ₹{Math.round(kpis.salesMonth * 0.05).toLocaleString()}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 text-sm">
                  <Receipt className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                  No revenue data available yet
                </div>
              )}
            </div>
          )}

          {/* PURCHASE EXPENSES TAB */}
          {activeTab === 'EXPENSES' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Procurement & Purchase Expenses</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Raw herbs, packaging, and vendor procurement accounts</p>
                </div>
              </div>
              <div className="text-center py-12 text-slate-400 text-sm">
                <Package className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                No purchase records yet
              </div>
            </div>
          )}

          {/* ORDERS TAB */}
          {activeTab === 'ORDERS' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-800">Recent Orders</h3>
              {!ordersResponse?.data?.orders?.length ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  <ShoppingBag className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                  No orders found
                </div>
              ) : (
                <div className="space-y-2">
                  {ordersResponse.data.orders.slice(0, 15).map((order) => (
                    <div
                      key={order._id}
                      className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs hover:border-slate-300 transition-colors"
                    >
                      <div>
                        <div className="font-semibold text-slate-800">#{order.orderNumber || order._id?.slice(-6)}</div>
                        <div className="text-slate-400 mt-0.5">{order.customerName || '—'}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-700">₹{(order.totalAmount || 0).toLocaleString()}</div>
                        <Badge variant={order.status === 'DELIVERED' ? 'emerald' : 'primary'} size="sm" className="mt-1">
                          {order.status || '—'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* LEADS TAB */}
          {activeTab === 'LEADS' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-800">Recent Leads</h3>
              {!leadsResponse?.data?.leads?.length ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  <Users className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                  No leads found
                </div>
              ) : (
                <div className="space-y-2">
                  {leadsResponse.data.leads.slice(0, 15).map((lead) => (
                    <div
                      key={lead._id}
                      className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs hover:border-slate-300 transition-colors"
                    >
                      <div>
                        <div className="font-semibold text-slate-800">{lead.name || '—'}</div>
                        <div className="text-slate-400 mt-0.5">{lead.phone || '—'}</div>
                      </div>
                      <Badge variant="primary" size="sm">{lead.status || '—'}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TEAM TAB */}
          {activeTab === 'TEAM' && (
            <div className="text-center py-12 text-slate-400 text-sm">
              <Users className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              Team management available under Administration
            </div>
          )}

          {/* PAYOUT / SETTLEMENT tabs — redirect to reports */}
          {(activeTab === 'PAYOUT' || activeTab === 'SETTLEMENT') && (
            <div className="text-center py-12 text-slate-400 text-sm">
              <BarChart3 className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              Visit Finance & Reports for detailed payout and settlement data
            </div>
          )}
        </div>
      </div>

      {/* Add Branch Modal */}
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

      {/* Doctor Payout Modal */}
      {isPayoutModalOpen && (
        <Modal
          isOpen={isPayoutModalOpen}
          onClose={() => setIsPayoutModalOpen(false)}
          title="Doctor & Staff Payout Ledger"
          subtitle="Monthly consultation commissions and zone incentives"
          maxWidth="max-w-md"
        >
          <div className="text-center py-8 text-slate-400 text-sm">
            <Receipt className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            Payout data will appear here once consultations are recorded
          </div>
          <div className="flex justify-end pt-2">
            <Button variant="secondary" onClick={() => setIsPayoutModalOpen(false)}>Close</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default AdminDistributorDashboardView;
