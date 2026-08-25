import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  ShoppingBag,
  Package,
  Truck,
  PhoneCall,
  Search,
  CheckSquare,
  Square,
  AlertTriangle,
  RotateCcw,
  Building,
  DollarSign,
  Send,
  Calendar,
  Layers,
  UserCheck,
  CreditCard,
  MapPin,
  Clock,
  ArrowRight,
  Shield,
  LogOut,
  ChevronRight,
  Filter,
  MessageSquare,
  Printer,
  Tag,
  RefreshCw,
  Trash2,
  CheckCircle2,
  User as UserIcon,
  HelpCircle,
  Stethoscope,
  Plus
} from 'lucide-react';
import apiClient from '../../api/apiClient.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useBranch } from '../../context/BranchContext.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Modal } from '../../components/common/Modal.jsx';
import { Spinner } from '../../components/common/Spinner.jsx';
import { OrderCreateModal } from '../orders/OrderCreateModal.jsx';
import { PrintableInvoiceModal } from '../orders/PrintableInvoiceModal.jsx';
import { PrintableShippingLabelModal } from '../orders/PrintableShippingLabelModal.jsx';
import { DoctorSlotsPage } from '../consultations/DoctorSlotsPage.jsx';

export function ManagerDashboardView({ onSwitchToBossView }) {
  const { user } = useAuth();
  const { selectedBranchId } = useBranch();
  const queryClient = useQueryClient();

  // Active view filters
  const [activeTab, setActiveTab] = useState('LEADS');
  const [selectedTelecallerFilter, setSelectedTelecallerFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);
  const [assignTargetTelecaller, setAssignTargetTelecaller] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  // Modals
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [activeLeadForCall, setActiveLeadForCall] = useState(null);
  const [callNotes, setCallNotes] = useState('');
  const [callStatus, setCallStatus] = useState('INTERESTED');
  const [isOrderCreateModalOpen, setIsOrderCreateModalOpen] = useState(false);
  const [reorderInitialData, setReorderInitialData] = useState(null);
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState(null);
  const [selectedOrderForLabel, setSelectedOrderForLabel] = useState(null);
  const [orderStatusUpdates, setOrderStatusUpdates] = useState({});

  // 1. Fetch Manager Dashboard KPIs and Staff
  const { data: managerData, isLoading: isDashboardLoading } = useQuery({
    queryKey: ['manager-dashboard', selectedBranchId],
    queryFn: async () => {
      const res = await apiClient.get('/dashboard');
      return res.data?.data;
    }
  });

  // 2. Fetch Leads with filters
  const { data: leadsData, isLoading: isLeadsLoading, refetch: refetchLeads } = useQuery({
    queryKey: ['manager-leads', selectedBranchId, selectedTelecallerFilter, selectedStatusFilter, searchQuery, dateFilter],
    queryFn: async () => {
      const params = {};
      if (selectedTelecallerFilter !== 'ALL') params.assignedTo = selectedTelecallerFilter;
      if (selectedStatusFilter !== 'ALL') params.status = selectedStatusFilter;
      if (searchQuery) params.search = searchQuery;
      const res = await apiClient.get('/leads', { params });
      return res.data;
    }
  });

  // 3. Fetch Orders for Orders tab
  const { data: ordersData, isLoading: isOrdersLoading } = useQuery({
    queryKey: ['manager-orders', selectedBranchId],
    queryFn: async () => {
      const res = await apiClient.get('/orders?limit=20');
      return res.data;
    },
    enabled: activeTab === 'ORDERS' || activeTab === 'STUCK_SHIPPED'
  });

  // 4. Fetch Low Stock Inventory for Stock tab
  const { data: stockData, isLoading: isStockLoading } = useQuery({
    queryKey: ['manager-stock', selectedBranchId],
    queryFn: async () => {
      const res = await apiClient.get('/inventory/matrix');
      return res.data?.data;
    },
    enabled: activeTab === 'STOCK'
  });

  // Bulk Assign Mutation
  const bulkAssignMutation = useMutation({
    mutationFn: async ({ leadIds, assignedTo }) => {
      const res = await apiClient.post('/leads/bulk-assign', {
        leadIds,
        assignedTo,
        reason: 'Manager Dashboard Quick Bulk Assignment'
      });
      return res.data;
    },
    onSuccess: (data) => {
      setSelectedLeadIds([]);
      setAssignTargetTelecaller('');
      setActionSuccessMsg(data.message || 'Leads successfully assigned!');
      queryClient.invalidateQueries(['manager-leads']);
      queryClient.invalidateQueries(['manager-dashboard']);
      setTimeout(() => setActionSuccessMsg(''), 4000);
    }
  });

  // Log Call Mutation
  const logCallMutation = useMutation({
    mutationFn: async ({ leadId, callData }) => {
      const res = await apiClient.post(`/leads/${leadId}/calls`, callData);
      return res.data;
    },
    onSuccess: () => {
      setIsCallModalOpen(false);
      setActiveLeadForCall(null);
      setCallNotes('');
      queryClient.invalidateQueries(['manager-leads']);
      queryClient.invalidateQueries(['manager-dashboard']);
    }
  });

  const kpis = managerData?.kpis || {};
  const telecallers = managerData?.telecallers || [];
  const leads = leadsData?.data || [];
  const branchName = managerData?.branch?.name || 'Hosur Main Branch';

  const handleSelectAllLeads = () => {
    if (selectedLeadIds.length === leads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(leads.map((l) => l._id));
    }
  };

  const handleToggleLead = (id) => {
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkAssign = () => {
    if (selectedLeadIds.length === 0 || !assignTargetTelecaller) return;
    bulkAssignMutation.mutate({
      leadIds: selectedLeadIds,
      assignedTo: assignTargetTelecaller
    });
  };

  const openCallModal = (lead) => {
    setActiveLeadForCall(lead);
    setIsCallModalOpen(true);
  };

  const handleSaveCall = () => {
    if (!activeLeadForCall) return;
    logCallMutation.mutate({
      leadId: activeLeadForCall._id,
      callData: {
        callStatus,
        notes: callNotes || 'Manager follow-up note',
        callDurationSeconds: 60
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Action & Sub-Nav Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-ayur-800 text-white flex items-center justify-center text-xl shadow-xs">
            🌿
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">
              {branchName} Manager Hub
            </h2>
            <p className="text-xs text-slate-500">
              Live Operations, Lead Allocation & Orders Dispatch
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onSwitchToBossView && (
            <Button
              variant="outline"
              size="sm"
              icon={Shield}
              onClick={onSwitchToBossView}
              className="text-ayur-800 border-ayur-300"
            >
              Distributor View
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => {
              setReorderInitialData(null);
              setIsOrderCreateModalOpen(true);
            }}
            className="bg-emerald-700 hover:bg-emerald-800 text-white"
          >
            Office / Counter Sale
          </Button>
        </div>
      </div>

      {/* 2-Row Manager KPI Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4 border-b border-slate-100">
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              {kpis.totalLeads || 0}
            </div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">
              TOTAL LEADS
            </div>
          </div>

          <div className="text-center">
            <div className="text-sm font-bold text-slate-900 mt-1">
              {new Date().toLocaleDateString('en-GB')}
            </div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">
              TODAY
            </div>
          </div>

          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-black text-emerald-700">
              {kpis.todayOrders || kpis.totalOrders || 0}
            </div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">
              ORDERS
            </div>
          </div>

          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-black text-amber-700 font-mono">
              ₹{(kpis.todayRevenue || 0).toLocaleString()}
            </div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">
              TODAY REV
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-black text-blue-700">
              {kpis.totalFollowUps || 0}
            </div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">
              FOLLOWUPS
            </div>
          </div>

          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-black text-purple-700">
              {kpis.inQueueOrders || 0}
            </div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">
              IN QUEUE
            </div>
          </div>

          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-black text-cyan-700">
              {kpis.shippedOrders || 0}
            </div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">
              SHIPPED
            </div>
          </div>

          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-black text-amber-600">
              {kpis.toVerifyOrders || 0}
            </div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">
              TO VERIFY
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 scrollbar-none text-xs font-semibold">
        {[
          { id: 'LEADS', label: '📋 Leads Desk' },
          { id: 'ORDERS', label: '🛒 Orders Queue' },
          { id: 'CONSULT', label: '🌿 Doctor Slots' },
          { id: 'STOCK', label: '📦 Low Stock Matrix' }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? 'bg-ayur-800 text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: LEADS DESK */}
      {activeTab === 'LEADS' && (
        <div className="space-y-4">
          {actionSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionSuccessMsg}</span>
            </div>
          )}

          {/* Bulk Assign Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3 sm:p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSelectAllLeads}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
                >
                  {selectedLeadIds.length > 0 && selectedLeadIds.length === leads.length ? (
                    <CheckSquare className="w-4 h-4 text-ayur-700" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                  <span>All ({selectedLeadIds.length} selected)</span>
                </button>

                <select
                  value={assignTargetTelecaller}
                  onChange={(e) => setAssignTargetTelecaller(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-ayur-600"
                >
                  <option value="">Assign to Telecaller...</option>
                  {telecallers.map((tc) => (
                    <option key={tc._id} value={tc._id}>
                      {tc.name} ({tc.assignedCount || 0} active)
                    </option>
                  ))}
                </select>

                <Button
                  size="sm"
                  variant="primary"
                  icon={Send}
                  onClick={handleBulkAssign}
                  disabled={selectedLeadIds.length === 0 || !assignTargetTelecaller}
                  isLoading={bulkAssignMutation.isPending}
                  className="bg-ayur-800 hover:bg-ayur-900 text-white text-xs"
                >
                  Assign
                </Button>
              </div>

              {/* Live Staff Selector Pills */}
              <div className="flex items-center gap-1 overflow-x-auto max-w-md">
                <button
                  type="button"
                  onClick={() => setSelectedTelecallerFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    selectedTelecallerFilter === 'ALL'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All Staff
                </button>
                {telecallers.map((tc) => (
                  <button
                    key={tc._id}
                    type="button"
                    onClick={() => setSelectedTelecallerFilter(tc._id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                      selectedTelecallerFilter === tc._id
                        ? 'bg-ayur-800 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tc.name} ({tc.assignedCount || 0})
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Search Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search name, phone, or city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-ayur-600"
                />
              </div>

              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-700"
              >
                <option value="ALL">All Statuses</option>
                <option value="NEW">New Leads</option>
                <option value="CONTACTED">Contacted</option>
                <option value="INTERESTED">Interested</option>
                <option value="ORDER_PLACED">Order Placed</option>
                <option value="CALLBACK_REQUESTED">Callback Requested</option>
                <option value="JUNK">Junk / Closed</option>
              </select>

              <div className="text-right text-xs text-slate-500 flex items-center justify-end">
                <span>Total: <strong>{leads.length}</strong> leads</span>
              </div>
            </div>
          </div>

          {/* Leads List */}
          {isLeadsLoading ? (
            <div className="py-20 text-center bg-white rounded-2xl border border-slate-200">
              <Spinner size="lg" text="Loading zone leads..." />
            </div>
          ) : leads.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
              <div className="text-3xl mb-2">🌿</div>
              <div className="text-sm font-semibold text-slate-800">No leads found in this filter</div>
              <p className="text-xs text-slate-400 mt-1">Try resetting filters or adding new leads.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {leads.map((lead) => {
                const isSelected = selectedLeadIds.includes(lead._id);
                return (
                  <div
                    key={lead._id}
                    className={`bg-white rounded-2xl border p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isSelected ? 'border-ayur-600 bg-ayur-50/20' : 'border-slate-200/90 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleLead(lead._id)}
                        className="mt-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-ayur-700" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{lead.name}</span>
                          <span className="font-mono text-xs text-slate-500">{lead.mobile}</span>
                          <Badge variant="primary" size="sm">{lead.status}</Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          {lead.city && <span>📍 {lead.city}</span>}
                          {lead.assignedTo?.name && (
                            <span className="text-ayur-800 font-medium">
                              👤 Assigned: {lead.assignedTo.name}
                            </span>
                          )}
                          <span>📅 {new Date(lead.createdAt).toLocaleDateString('en-GB')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => openCallModal(lead)}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span>Log Call</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const cleanMobile = lead.mobile.replace(/\D/g, '').slice(-10);
                          window.open(`https://wa.me/91${cleanMobile}?text=Hello%20${encodeURIComponent(lead.name)},%20greetings%20from%20Shanthi%20Ayurvedas!`, '_blank');
                        }}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </button>

                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          setReorderInitialData({
                            patientName: lead.name,
                            mobile: lead.mobile,
                            city: lead.city
                          });
                          setIsOrderCreateModalOpen(true);
                        }}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs"
                      >
                        Convert & Order
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ORDERS QUEUE */}
      {activeTab === 'ORDERS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Branch Order Queue & Fulfillment</h3>
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => {
                setReorderInitialData(null);
                setIsOrderCreateModalOpen(true);
              }}
            >
              Create New Order
            </Button>
          </div>

          {isOrdersLoading ? (
            <div className="py-20 text-center bg-white rounded-2xl border border-slate-200">
              <Spinner size="lg" text="Loading active orders..." />
            </div>
          ) : (ordersData?.data || []).length === 0 ? (
            <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
              <div className="text-3xl mb-2">🛒</div>
              <div className="text-sm font-semibold text-slate-800">No orders currently active</div>
            </div>
          ) : (
            <div className="space-y-3">
              {(ordersData?.data || []).map((ord) => {
                const pat = ord.patientDetails || {};
                const addr = ord.deliveryAddress || {};
                const currentStatus = orderStatusUpdates[ord._id] || ord.status;

                return (
                  <div
                    key={ord._id}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-900 text-sm">
                          {pat.patientName || ord.customerId?.name || 'Customer'}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          📱 {pat.mobile || ord.customerId?.mobile || '—'}
                        </span>
                        <span className="font-bold text-slate-900 font-mono text-sm">
                          ₹{ord.grandTotal?.toLocaleString()}
                        </span>
                        <Badge variant="primary" size="sm">{ord.status}</Badge>
                      </div>

                      <div className="text-xs text-slate-400 font-mono">
                        {ord.orderNumber} • {new Date(ord.createdAt).toLocaleDateString('en-GB')}
                      </div>
                    </div>

                    <div className="text-xs text-slate-600 flex flex-wrap items-center gap-4">
                      <div>
                        <strong>Items:</strong>{' '}
                        {ord.items?.map((i) => `${i.quantity}x ${i.productName}`).join(', ')} • ({ord.paymentMethod})
                      </div>
                      {addr.street && (
                        <div>
                          <strong>Address:</strong> {addr.street}, {addr.city || addr.district}, {addr.state} - {addr.pincode}
                        </div>
                      )}
                    </div>

                    {/* Action Strip */}
                    <div className="flex flex-wrap items-center justify-end gap-1.5 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setSelectedOrderForInvoice(ord)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      >
                        📄 Bill
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedOrderForLabel(ord)}
                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      >
                        🏷️ Label
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const cleanMobile = (pat.mobile || ord.customerId?.mobile || '').replace(/\D/g, '').slice(-10);
                          window.open(`https://wa.me/91${cleanMobile}?text=Hello%20${encodeURIComponent(pat.patientName || 'Customer')},%20your%20order%20${ord.orderNumber}%20is%20being%20processed!`, '_blank');
                        }}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      >
                        💬 WhatsApp
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setReorderInitialData({
                            patientName: pat.patientName || ord.customerId?.name,
                            mobile: pat.mobile || ord.customerId?.mobile,
                            street: addr.street,
                            pincode: addr.pincode,
                            district: addr.district,
                            state: addr.state
                          });
                          setIsOrderCreateModalOpen(true);
                        }}
                        className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      >
                        🔄 Reorder
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DOCTOR SLOTS */}
      {activeTab === 'CONSULT' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-6">
          <DoctorSlotsPage />
        </div>
      )}

      {/* TAB 4: LOW STOCK MATRIX */}
      {activeTab === 'STOCK' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-900">Branch Stock & Replenishment Matrix</h3>
          {isStockLoading ? (
            <div className="py-12 text-center">
              <Spinner size="md" text="Loading stock..." />
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {(stockData || []).map((prod) => (
                <div key={prod.productId} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900">{prod.productName}</div>
                    <div className="text-slate-400 font-mono text-[11px]">SKU: {prod.sku}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-900 font-mono text-sm">
                      {prod.totalAvailable} units available
                    </span>
                    <Badge variant={prod.totalAvailable < 20 ? 'danger' : 'emerald'} size="sm">
                      {prod.totalAvailable < 20 ? 'Low Stock' : 'Adequate'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Call Logging Modal */}
      {isCallModalOpen && activeLeadForCall && (
        <Modal
          isOpen={isCallModalOpen}
          onClose={() => setIsCallModalOpen(false)}
          title={`Log Call: ${activeLeadForCall.name}`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-xs text-slate-900">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Call Disposition / Status</label>
              <select
                value={callStatus}
                onChange={(e) => setCallStatus(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              >
                <option value="INTERESTED">Interested in Ayurvedic Medicines</option>
                <option value="CALLBACK_REQUESTED">Callback Requested</option>
                <option value="NOT_INTERESTED">Not Interested</option>
                <option value="WRONG_NUMBER">Wrong Number / Junk</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Notes / Prescription Discussion</label>
              <textarea
                rows={3}
                value={callNotes}
                onChange={(e) => setCallNotes(e.target.value)}
                placeholder="Discussed knee joint pain package with patient..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <Button variant="secondary" onClick={() => setIsCallModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveCall}
                isLoading={logCallMutation.isPending}
              >
                Save Call Record
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Order Creation & Prescription Modal */}
      {isOrderCreateModalOpen && (
        <OrderCreateModal
          isOpen={isOrderCreateModalOpen}
          onClose={() => {
            setIsOrderCreateModalOpen(false);
            setReorderInitialData(null);
          }}
          initialPatientData={reorderInitialData}
        />
      )}

      {/* Printable Tax Invoice Modal */}
      {selectedOrderForInvoice && (
        <PrintableInvoiceModal
          isOpen={Boolean(selectedOrderForInvoice)}
          onClose={() => setSelectedOrderForInvoice(null)}
          order={selectedOrderForInvoice}
        />
      )}

      {/* Printable Shipping Label Modal */}
      {selectedOrderForLabel && (
        <PrintableShippingLabelModal
          isOpen={Boolean(selectedOrderForLabel)}
          onClose={() => setSelectedOrderForLabel(null)}
          order={selectedOrderForLabel}
        />
      )}
    </div>
  );
}

export default ManagerDashboardView;
