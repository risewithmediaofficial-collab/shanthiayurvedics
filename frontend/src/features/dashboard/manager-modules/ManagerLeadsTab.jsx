import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Search,
  CheckSquare,
  Square,
  PhoneCall,
  MessageSquare,
  ShoppingBag,
  Plus,
  Send,
  Filter,
  CheckCircle2,
  Calendar,
  Pencil,
  Trash2,
  RefreshCw,
  RotateCcw,
  ArrowUpDown,
  AlertTriangle
} from 'lucide-react';
import apiClient from '../../../api/apiClient.js';
import { useBranch } from '../../../context/BranchContext.jsx';
import { Badge } from '../../../components/common/Badge.jsx';
import { Button } from '../../../components/common/Button.jsx';
import { Modal } from '../../../components/common/Modal.jsx';
import { Spinner } from '../../../components/common/Spinner.jsx';
import { OrderCreateModal } from '../../orders/OrderCreateModal.jsx';

export function ManagerLeadsTab() {
  const { selectedBranchId } = useBranch();
  const queryClient = useQueryClient();

  const [selectedTelecallerFilter, setSelectedTelecallerFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);
  const [assignTargetTelecaller, setAssignTargetTelecaller] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  // Reset all filters
  const handleResetFilters = () => {
    setSelectedTelecallerFilter('ALL');
    setSelectedStatusFilter('ALL');
    setSearchQuery('');
    setDateFilter('');
    setSortBy('createdAt');
    setSortOrder('desc');
  };

  // Modals
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [activeLeadForCall, setActiveLeadForCall] = useState(null);
  const [callNotes, setCallNotes] = useState('');
  const [callStatus, setCallStatus] = useState('INTERESTED');

  const [isOrderCreateModalOpen, setIsOrderCreateModalOpen] = useState(false);
  const [orderInitialData, setOrderInitialData] = useState(null);

  // New Lead Form
  const [newLeadData, setNewLeadData] = useState({
    name: '',
    mobile: '',
    city: '',
    source: 'CALL',
    status: 'NEW',
    notes: '',
    assignedTo: ''
  });

  // Edit & Delete Lead States
  const [selectedLeadForEdit, setSelectedLeadForEdit] = useState(null);
  const [isEditLeadModalOpen, setIsEditLeadModalOpen] = useState(false);
  const [selectedLeadForDelete, setSelectedLeadForDelete] = useState(null);
  const [editLeadData, setEditLeadData] = useState({
    name: '',
    mobile: '',
    city: '',
    source: 'CALL',
    status: 'NEW',
    notes: '',
    assignedTo: ''
  });

  // 1. Fetch Staff / Telecallers
  const { data: telecallers = [] } = useQuery({
    queryKey: ['manager-telecallers', selectedBranchId],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/users', { params: { role: 'TELECALLER' } });
        return res.data?.data || [];
      } catch (e) {
        return [
          { _id: 'tc-1', name: 'KANAGAVALLI', phone: '9629985341' },
          { _id: 'tc-2', name: 'AMRUTHA', phone: '9629985342' },
          { _id: 'tc-3', name: 'PATTUSELVI', phone: '9629985343' }
        ];
      }
    }
  });

  // 2. Fetch Leads
  const { data: leadsResponse, isLoading: isLeadsLoading } = useQuery({
    queryKey: ['manager-leads-desk', selectedBranchId, selectedTelecallerFilter, selectedStatusFilter, searchQuery, dateFilter, sortBy, sortOrder],
    queryFn: async () => {
      const params = { limit: 100 };
      if (selectedTelecallerFilter !== 'ALL') params.assignedTo = selectedTelecallerFilter;
      if (selectedStatusFilter !== 'ALL') params.status = selectedStatusFilter;
      if (searchQuery) params.search = searchQuery;
      if (dateFilter) params.startDate = dateFilter;
      if (sortBy) params.sortBy = sortBy;
      if (sortOrder) params.sortOrder = sortOrder;
      const res = await apiClient.get('/leads', { params });
      return res.data;
    }
  });

  const leads = leadsResponse?.data || [];

  // Mutations
  const bulkAssignMutation = useMutation({
    mutationFn: async ({ leadIds, assignedTo }) => {
      const res = await apiClient.post('/leads/bulk-assign', {
        leadIds,
        assignedTo,
        reason: 'Manager Desk Bulk Allocation'
      });
      return res.data;
    },
    onSuccess: (data) => {
      setSelectedLeadIds([]);
      setAssignTargetTelecaller('');
      setActionSuccessMsg(data.message || 'Leads successfully assigned to telecaller!');
      queryClient.invalidateQueries(['manager-leads-desk']);
      setTimeout(() => setActionSuccessMsg(''), 4000);
    }
  });

  const createLeadMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await apiClient.post('/leads', payload);
      return res.data;
    },
    onSuccess: () => {
      setIsAddLeadModalOpen(false);
      setNewLeadData({ name: '', mobile: '', city: '', source: 'CALL', status: 'NEW', notes: '', assignedTo: '' });
      setActionSuccessMsg('New lead successfully added!');
      queryClient.invalidateQueries(['manager-leads-desk']);
      setTimeout(() => setActionSuccessMsg(''), 4000);
    }
  });

  const updateLeadMutation = useMutation({
    mutationFn: async ({ leadId, payload }) => {
      const res = await apiClient.patch(`/leads/${leadId}`, payload);
      return res.data;
    },
    onSuccess: () => {
      setIsEditLeadModalOpen(false);
      setSelectedLeadForEdit(null);
      setActionSuccessMsg('Lead updated successfully!');
      queryClient.invalidateQueries(['manager-leads-desk']);
      queryClient.invalidateQueries(['leads']);
      setTimeout(() => setActionSuccessMsg(''), 4000);
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to update lead');
    }
  });

  const deleteLeadMutation = useMutation({
    mutationFn: async (leadId) => {
      const res = await apiClient.delete(`/leads/${leadId}`);
      return res.data;
    },
    onSuccess: () => {
      setSelectedLeadForDelete(null);
      setActionSuccessMsg('Lead deleted successfully!');
      queryClient.invalidateQueries(['manager-leads-desk']);
      queryClient.invalidateQueries(['leads']);
      setTimeout(() => setActionSuccessMsg(''), 4000);
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to delete lead');
    }
  });

  const logCallMutation = useMutation({
    mutationFn: async ({ leadId, callData }) => {
      const res = await apiClient.post(`/leads/${leadId}/calls`, callData);
      return res.data;
    },
    onSuccess: () => {
      setIsCallModalOpen(false);
      setActiveLeadForCall(null);
      setCallNotes('');
      setActionSuccessMsg('Call log updated successfully');
      queryClient.invalidateQueries(['manager-leads-desk']);
      setTimeout(() => setActionSuccessMsg(''), 4000);
    }
  });

  const handleSelectAllLeads = () => {
    if (selectedLeadIds.length === leads.length && leads.length > 0) {
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
        notes: callNotes || 'Manager follow-up conversation',
        callDurationSeconds: 90
      }
    });
  };

  return (
    <div className="space-y-4">
      {actionSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* ── Bento Metrics Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bento-card flex flex-col gap-1">
          <div className="bento-metric-title">Total Leads</div>
          <div className="bento-metric-value text-slate-900">{leads.length}</div>
          <div className="text-[11px] text-slate-400 font-medium">Pipeline</div>
        </div>
        <div className="bento-card flex flex-col gap-1">
          <div className="bento-metric-title">New / Unassigned</div>
          <div className="bento-metric-value text-blue-600">
            {leads.filter((l) => !l.assignedTo || l.status === 'NEW').length}
          </div>
          <div className="text-[11px] text-blue-400 font-medium">Need assignment</div>
        </div>
        <div className="bento-card flex flex-col gap-1">
          <div className="bento-metric-title">In Progress</div>
          <div className="bento-metric-value text-amber-600">
            {leads.filter((l) => l.status === 'INTERESTED' || l.status === 'CONTACTED').length}
          </div>
          <div className="text-[11px] text-amber-400 font-medium">Interested / Contacted</div>
        </div>
        <div className="bento-card flex flex-col gap-1">
          <div className="bento-metric-title">Converted</div>
          <div className="bento-metric-value text-emerald-700">
            {leads.filter((l) => l.status === 'ORDER_PLACED' || l.status === 'CONVERTED').length}
          </div>
          <div className="text-[11px] text-emerald-500 font-medium">Orders placed</div>
        </div>
      </div>

      {/* Action Toolbar & Bulk Assignment Bar */}
      <div className="bento-card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAllLeads}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer"
            >
              {selectedLeadIds.length > 0 && selectedLeadIds.length === leads.length ? (
                <CheckSquare className="w-4 h-4 text-emerald-700" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>Select All ({selectedLeadIds.length})</span>
            </button>

            <select
              value={assignTargetTelecaller}
              onChange={(e) => setAssignTargetTelecaller(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
            >
              <option value="">Assign to Telecaller...</option>
              {telecallers.map((tc) => (
                <option key={tc._id} value={tc._id}>
                  {tc.name} ({tc.phone || ''})
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
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
            >
              Assign Selected
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="primary"
              icon={Plus}
              onClick={() => setIsAddLeadModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
            >
              Add New Lead
            </Button>
          </div>
        </div>

        {/* Quick Status Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-slate-100">
          {[
            { id: 'ALL', label: 'All Leads' },
            { id: 'NEW', label: 'New' },
            { id: 'CONTACTED', label: 'Contacted' },
            { id: 'INTERESTED', label: 'Interested' },
            { id: 'ORDER_PLACED', label: 'Order Placed' },
            { id: 'CALLBACK_REQUESTED', label: 'Callback' },
            { id: 'JUNK', label: 'Junk / Closed' }
          ].map((statusPill) => {
            const isActive = selectedStatusFilter === statusPill.id;
            return (
              <button
                key={statusPill.id}
                type="button"
                onClick={() => setSelectedStatusFilter(statusPill.id)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-xs font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {statusPill.label}
              </button>
            );
          })}
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search name, phone, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <select
            value={selectedTelecallerFilter}
            onChange={(e) => setSelectedTelecallerFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-700 font-medium"
          >
            <option value="ALL">All Staff / Callers</option>
            {telecallers.map((tc) => (
              <option key={tc._id} value={tc._id}>
                {tc.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-700 font-medium"
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">New Leads</option>
            <option value="CONTACTED">Contacted</option>
            <option value="INTERESTED">Interested</option>
            <option value="ORDER_PLACED">Order Placed</option>
            <option value="CALLBACK_REQUESTED">Callback Requested</option>
            <option value="JUNK">Junk / Closed</option>
          </select>

          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-700 font-medium"
          />

          {/* Sort Dropdown */}
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field);
              setSortOrder(order);
            }}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700"
          >
            <option value="createdAt-desc">Date: Newest First</option>
            <option value="createdAt-asc">Date: Oldest First</option>
            <option value="name-asc">Name: A to Z</option>
            <option value="name-desc">Name: Z to A</option>
            <option value="status-asc">Status: A to Z</option>
          </select>

          {(searchQuery || selectedTelecallerFilter !== 'ALL' || selectedStatusFilter !== 'ALL' || dateFilter || sortBy !== 'createdAt' || sortOrder !== 'desc') && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Leads List */}
      {isLeadsLoading ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-slate-200">
          <Spinner size="lg" text="Loading manager leads..." />
        </div>
      ) : leads.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
          <div className="text-3xl mb-2">📋</div>
          <div className="text-sm font-bold text-slate-800">No leads found</div>
          <p className="text-xs text-slate-400 mt-1">Try resetting the filters or add a new lead above.</p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="mt-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {leads.map((lead) => {
            const isSelected = selectedLeadIds.includes(lead._id);
            const cleanMobile = (lead.mobile || '').replace(/\D/g, '').slice(-10);

            return (
              <div
                key={lead._id}
                className={`bg-white rounded-2xl border p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isSelected ? 'border-emerald-600 bg-emerald-50/20' : 'border-slate-200/90 hover:border-slate-300 shadow-xs'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => handleToggleLead(lead._id)}
                    className="mt-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-emerald-700" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{lead.name}</span>
                      <span className="font-mono text-xs text-slate-500">📱 {lead.mobile}</span>
                      <Badge variant="primary" size="sm">{lead.status}</Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      {lead.city && <span>📍 {lead.city}</span>}
                      {lead.assignedTo?.name ? (
                        <span className="text-emerald-800 font-semibold">
                          👤 Caller: {lead.assignedTo.name}
                        </span>
                      ) : (
                        <span className="text-amber-600 font-semibold">⚠️ Unassigned</span>
                      )}
                      <span>📅 {new Date(lead.createdAt).toLocaleDateString('en-GB')}</span>
                      {lead.notes && <span className="italic text-slate-400">"{lead.notes}"</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-center">
                  <a
                    href={`tel:${cleanMobile}`}
                    onClick={() => openCallModal(lead)}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Call</span>
                  </a>

                  <a
                    href={`https://wa.me/91${cleanMobile}?text=Hello%20${encodeURIComponent(lead.name)},%20greetings%20from%20Shanthi%20Ayurvedas!`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>

                  {/* Edit Lead Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLeadForEdit(lead);
                      setEditLeadData({
                        name: lead.name || '',
                        mobile: lead.mobile || '',
                        city: lead.city || '',
                        source: lead.source || 'CALL',
                        status: lead.status || 'NEW',
                        notes: lead.notes || '',
                        assignedTo: lead.assignedTo?._id || lead.assignedTo || ''
                      });
                      setIsEditLeadModalOpen(true);
                    }}
                    title="Edit Lead Details"
                    className="p-1.5 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded-xl text-xs font-semibold flex items-center transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete Lead Button */}
                  <button
                    type="button"
                    onClick={() => setSelectedLeadForDelete(lead)}
                    title="Delete Lead"
                    className="p-1.5 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 rounded-xl text-xs font-semibold flex items-center transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      setOrderInitialData({
                        patientName: lead.name,
                        mobile: lead.mobile,
                        city: lead.city
                      });
                      setIsOrderCreateModalOpen(true);
                    }}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold"
                  >
                    Convert & Order
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Lead Modal */}
      {isAddLeadModalOpen && (
        <Modal
          isOpen={isAddLeadModalOpen}
          onClose={() => setIsAddLeadModalOpen(false)}
          title="Add New Patient Lead"
          maxWidth="max-w-md"
        >
          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Patient Full Name *</label>
              <input
                type="text"
                required
                value={newLeadData.name}
                onChange={(e) => setNewLeadData({ ...newLeadData, name: e.target.value })}
                placeholder="e.g. Ramesh Kumar"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Mobile Number (10 digits) *</label>
              <input
                type="tel"
                required
                value={newLeadData.mobile}
                onChange={(e) => setNewLeadData({ ...newLeadData, mobile: e.target.value })}
                placeholder="e.g. 9842112345"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">City / District</label>
              <input
                type="text"
                value={newLeadData.city}
                onChange={(e) => setNewLeadData({ ...newLeadData, city: e.target.value })}
                placeholder="e.g. Hosur, Krishnagiri"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Assign to Telecaller</label>
              <select
                value={newLeadData.assignedTo}
                onChange={(e) => setNewLeadData({ ...newLeadData, assignedTo: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              >
                <option value="">Leave Unassigned (Queue)</option>
                {telecallers.map((tc) => (
                  <option key={tc._id} value={tc._id}>
                    {tc.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Initial Health Query / Notes</label>
              <textarea
                rows={2}
                value={newLeadData.notes}
                onChange={(e) => setNewLeadData({ ...newLeadData, notes: e.target.value })}
                placeholder="Inquired about Joint Pain Oil / Diabetes Care..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <Button variant="secondary" onClick={() => setIsAddLeadModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => createLeadMutation.mutate(newLeadData)}
                isLoading={createLeadMutation.isPending}
                disabled={!newLeadData.name || !newLeadData.mobile}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
              >
                Create Lead
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Call Logging Modal */}
      {isCallModalOpen && activeLeadForCall && (
        <Modal
          isOpen={isCallModalOpen}
          onClose={() => setIsCallModalOpen(false)}
          title={`Log Call with ${activeLeadForCall.name}`}
          maxWidth="max-w-md"
        >
          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Call Disposition</label>
              <select
                value={callStatus}
                onChange={(e) => setCallStatus(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
              >
                <option value="INTERESTED">Interested in Ayurvedic Medicine</option>
                <option value="ORDER_PLACED">Order Placed Directly</option>
                <option value="CALLBACK_REQUESTED">Callback Requested</option>
                <option value="NOT_INTERESTED">Not Interested</option>
                <option value="WRONG_NUMBER">Wrong Number</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Call Notes / Prescription Discussion</label>
              <textarea
                rows={3}
                value={callNotes}
                onChange={(e) => setCallNotes(e.target.value)}
                placeholder="Discussed dosage and treatment schedule with patient..."
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
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
              >
                Save Call
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Order Create Modal */}
      {isOrderCreateModalOpen && (
        <OrderCreateModal
          isOpen={isOrderCreateModalOpen}
          onClose={() => {
            setIsOrderCreateModalOpen(false);
            setOrderInitialData(null);
          }}
          initialPatientData={orderInitialData}
        />
      )}

      {/* Edit Lead Modal */}
      {isEditLeadModalOpen && selectedLeadForEdit && (
        <Modal
          isOpen={isEditLeadModalOpen}
          onClose={() => {
            setIsEditLeadModalOpen(false);
            setSelectedLeadForEdit(null);
          }}
          title={`Edit Lead — ${selectedLeadForEdit.name}`}
          maxWidth="max-w-md"
        >
          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Patient Full Name *</label>
              <input
                type="text"
                required
                value={editLeadData.name}
                onChange={(e) => setEditLeadData({ ...editLeadData, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mobile Number *</label>
                <input
                  type="tel"
                  required
                  value={editLeadData.mobile}
                  onChange={(e) => setEditLeadData({ ...editLeadData, mobile: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">City / District</label>
                <input
                  type="text"
                  value={editLeadData.city}
                  onChange={(e) => setEditLeadData({ ...editLeadData, city: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Source</label>
                <select
                  value={editLeadData.source}
                  onChange={(e) => setEditLeadData({ ...editLeadData, source: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                >
                  <option value="CALL">Call</option>
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="META">Meta / Facebook</option>
                  <option value="WEBSITE">Website</option>
                  <option value="WALKIN">Walk-in</option>
                  <option value="MANUAL">Manual</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={editLeadData.status}
                  onChange={(e) => setEditLeadData({ ...editLeadData, status: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                >
                  <option value="NEW">New</option>
                  <option value="CONTACTED">Contacted</option>
                  <option value="INTERESTED">Interested</option>
                  <option value="ORDER_PLACED">Order Placed</option>
                  <option value="CALLBACK_REQUESTED">Callback Requested</option>
                  <option value="JUNK">Junk</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Assigned Telecaller</label>
              <select
                value={editLeadData.assignedTo}
                onChange={(e) => setEditLeadData({ ...editLeadData, assignedTo: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
              >
                <option value="">Leave Unassigned (Queue)</option>
                {telecallers.map((tc) => (
                  <option key={tc._id} value={tc._id}>
                    {tc.name} ({tc.phone || ''})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Notes / Inquiry Description</label>
              <textarea
                rows={2}
                value={editLeadData.notes}
                onChange={(e) => setEditLeadData({ ...editLeadData, notes: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsEditLeadModalOpen(false);
                  setSelectedLeadForEdit(null);
                }}
                disabled={updateLeadMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                isLoading={updateLeadMutation.isPending}
                disabled={!editLeadData.name || !editLeadData.mobile}
                onClick={() =>
                  updateLeadMutation.mutate({
                    leadId: selectedLeadForEdit._id,
                    payload: editLeadData
                  })
                }
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Lead Confirmation Modal */}
      {selectedLeadForDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl border">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-slate-900 text-sm">Delete Lead Confirmation</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete lead for <strong>{selectedLeadForDelete.name}</strong> ({selectedLeadForDelete.mobile})? All call records will be cleaned up.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button size="sm" variant="secondary" onClick={() => setSelectedLeadForDelete(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="danger"
                isLoading={deleteLeadMutation.isPending}
                onClick={() => deleteLeadMutation.mutate(selectedLeadForDelete._id)}
                className="bg-red-600 hover:bg-red-700 text-white font-bold"
              >
                Delete Lead
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManagerLeadsTab;
