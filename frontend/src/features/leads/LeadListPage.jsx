import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  PhoneCall,
  Download,
  ShoppingBag,
  MessageSquare,
  Stethoscope,
  Phone,
  AlertCircle,
  Pencil,
  Trash2,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import apiClient from '../../api/apiClient.js';
import { usePermissions } from '../../hooks/usePermissions.js';
import { useBranch } from '../../context/BranchContext.jsx';
import { Table } from '../../components/common/Table.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Input } from '../../components/common/Input.jsx';
import { Select } from '../../components/common/Select.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { Modal } from '../../components/common/Modal.jsx';
import { Pagination } from '../../components/common/Pagination.jsx';
import { OrderCreateModal } from '../orders/OrderCreateModal.jsx';
import { SimpleProgressBar, SimplePipelineTrack } from '../../components/common/SimpleProgressBar.jsx';

export function LeadListPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { hasPermission, isTelecaller } = usePermissions();
  const { selectedBranchId } = useBranch();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [activeLead, setActiveLead] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [leadToEdit, setLeadToEdit] = useState(null);
  const [leadToDelete, setLeadToDelete] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    whatsappNumber: '',
    source: 'CALL',
    status: 'NEW',
    city: '',
    notes: ''
  });

  // Order creation from lead
  const [leadForOrder, setLeadForOrder] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    whatsappNumber: '',
    source: 'CALL',
    city: '',
    notes: ''
  });
  const [callData, setCallData] = useState({
    outcome: 'CONNECTED_INTERESTED',
    durationSeconds: 120,
    notes: '',
    nextFollowUpDate: '',
    nextFollowUpNotes: ''
  });
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [formError, setFormError] = useState('');
  const [callError, setCallError] = useState('');
  const [leadActionMsg, setLeadActionMsg] = useState('');

  // Fetch Leads
  const { data: leadsResponse, isLoading } = useQuery({
    queryKey: ['leads', page, search, statusFilter, sourceFilter, selectedBranchId],
    queryFn: async () => {
      const params = { page, limit: 15 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (sourceFilter) params.source = sourceFilter;
      const res = await apiClient.get('/leads', { params });
      return res.data;
    }
  });

  const leads = leadsResponse?.data || [];
  const meta = leadsResponse?.meta || { page: 1, totalPages: 1, total: 0 };

  const { data: telecallersResponse } = useQuery({
    queryKey: ['lead-telecallers'],
    queryFn: async () => {
      const res = await apiClient.get('/users', { params: { role: 'TELECALLER', limit: 100 } });
      return res.data?.data || [];
    },
    enabled: hasPermission('leads.assign')
  });

  const telecallers = telecallersResponse || [];

  const assignLeadMutation = useMutation({
    mutationFn: ({ leadId, assignedTo }) => apiClient.post(`/leads/${leadId}/assign`, {
      assignedTo,
      reason: 'Assigned from Leads Desk'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['leads']);
      queryClient.invalidateQueries(['dashboard']);
      setLeadActionMsg('✓ Lead assigned to telecaller successfully');
      setTimeout(() => setLeadActionMsg(''), 3000);
    },
    onError: (err) => {
      setLeadActionMsg(`⚠ ${err.response?.data?.message || 'Failed to assign lead'}`);
      setTimeout(() => setLeadActionMsg(''), 4000);
    }
  });

  // Create Lead Mutation
  const createLeadMutation = useMutation({
    mutationFn: (data) => apiClient.post('/leads', data),
    onSuccess: (res) => {
      if (res?.data?.isDuplicateWarning) {
        setDuplicateWarning(res.data.data?.existingLead || res.data.data?.existingCustomer || res.data.data);
        return;
      }
      queryClient.invalidateQueries(['leads']);
      queryClient.invalidateQueries(['dashboard']);
      setIsCreateModalOpen(false);
      setFormData({ name: '', mobile: '', email: '', whatsappNumber: '', source: 'CALL', city: '', notes: '' });
      setDuplicateWarning(null);
      setFormError('');
    },
    onError: (err) => {
      if (err.response?.status === 409 && err.response?.data?.data?.duplicateLead) {
        setDuplicateWarning(err.response.data.data.duplicateLead);
      } else {
        const errorMsg =
          err.response?.data?.errors?.[0]?.message ||
          err.response?.data?.message ||
          'Failed to save lead. Please check the inputs.';
        setFormError(errorMsg);
      }
    }
  });

  const handleSaveLead = (e, forceCreate = false) => {
    if (e) e.preventDefault();
    setFormError('');

    const cleanMobile = (formData.mobile || '').replace(/\D/g, '').slice(-10);
    if (!cleanMobile || cleanMobile.length !== 10) {
      setFormError('Please enter a valid 10-digit mobile number starting with 6-9');
      return;
    }
    if (!formData.name.trim()) {
      setFormError('Please enter the customer / lead full name');
      return;
    }

    const payload = {
      name: formData.name.trim(),
      mobile: cleanMobile,
      whatsappNumber: formData.whatsappNumber?.trim() || undefined,
      email: formData.email?.trim() || undefined,
      source: formData.source || 'CALL',
      city: formData.city?.trim() || undefined,
      notes: formData.notes?.trim() || undefined,
      branchId: selectedBranchId && selectedBranchId !== 'ALL' ? selectedBranchId : undefined,
      forceCreate
    };

    createLeadMutation.mutate(payload);
  };

  // Log Call Mutation
  const logCallMutation = useMutation({
    mutationFn: ({ leadId, data }) => apiClient.post(`/leads/${leadId}/calls`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['leads']);
      queryClient.invalidateQueries(['dashboard']);
      queryClient.invalidateQueries(['callHistory']);
      setIsCallModalOpen(false);
      setCallData({ outcome: 'CONNECTED_INTERESTED', durationSeconds: 120, notes: '', nextFollowUpDate: '', nextFollowUpNotes: '' });
      setCallError('');
    },
    onError: (err) => {
      const errorMsg =
        err.response?.data?.errors?.[0]?.message ||
        err.response?.data?.message ||
        'Failed to log call';
      setCallError(errorMsg);
    }
  });

  // Update Lead Mutation
  const updateLeadMutation = useMutation({
    mutationFn: ({ leadId, payload }) => apiClient.patch(`/leads/${leadId}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['leads']);
      queryClient.invalidateQueries(['dashboard']);
      setIsEditModalOpen(false);
      setLeadToEdit(null);
      setLeadActionMsg('✓ Lead updated successfully');
      setTimeout(() => setLeadActionMsg(''), 3000);
    },
    onError: (err) => {
      const errorMsg = err.response?.data?.message || 'Failed to update lead';
      setLeadActionMsg(`⚠ ${errorMsg}`);
      setTimeout(() => setLeadActionMsg(''), 4000);
    }
  });

  // Delete Lead Mutation
  const deleteLeadMutation = useMutation({
    mutationFn: (leadId) => apiClient.delete(`/leads/${leadId}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['leads']);
      queryClient.invalidateQueries(['dashboard']);
      setIsDeleteModalOpen(false);
      setLeadToDelete(null);
      setLeadActionMsg('✓ Lead deleted successfully');
      setTimeout(() => setLeadActionMsg(''), 3000);
    },
    onError: (err) => {
      const errorMsg = err.response?.data?.message || 'Failed to delete lead';
      setLeadActionMsg(`⚠ ${errorMsg}`);
      setTimeout(() => setLeadActionMsg(''), 4000);
    }
  });

  const handleDuplicateCheck = async (mobile) => {
    if (mobile.length >= 10) {
      try {
        const res = await apiClient.get(`/leads?search=${mobile}`);
        if (res.data?.data?.length > 0) {
          setDuplicateWarning(res.data.data[0]);
        } else {
          setDuplicateWarning(null);
        }
      } catch (e) {
        // ignore
      }
    }
  };

  // 1-Click WhatsApp Chat
  const handleOpenWhatsApp = (lead) => {
    const cleanMobile = (lead.whatsappNumber || lead.mobile || '').replace(/\D/g, '').slice(-10);
    if (!cleanMobile) return;
    const textMsg = encodeURIComponent(
      `🌿 *Shanthi Ayurvedas Wellness*\n\n` +
        `Hello *${lead.name}*,\n` +
        `Thank you for inquiring about our authentic Ayurvedic formulations and wellness care.\n\n` +
        `How may our Ayurvedic health specialist assist you today?\n\n` +
        `📍 *Shanthi Ayurvedas Clinic & Pharmacy*`
    );
    window.open(`https://wa.me/91${cleanMobile}?text=${textMsg}`, '_blank');
  };

  // Export Leads to CSV
  const handleExportCSV = () => {
    if (leads.length === 0) return;
    const headers = ['Lead Name', 'Mobile', 'WhatsApp', 'Email', 'Source', 'Status', 'City', 'Assigned To', 'Created At'];
    const rows = leads.map((l) => [
      `"${l.name || ''}"`,
      `"${l.mobile || ''}"`,
      `"${l.whatsappNumber || ''}"`,
      `"${l.email || ''}"`,
      `"${l.source || ''}"`,
      `"${l.status || ''}"`,
      `"${l.city || ''}"`,
      `"${l.assignedTo?.name || 'Unassigned'}"`,
      `"${new Date(l.createdAt).toLocaleDateString('en-GB')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `shanthi_leads_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'NEW': return <Badge variant="primary">New</Badge>;
      case 'ASSIGNED': return <Badge variant="info">Assigned</Badge>;
      case 'CONTACTED': return <Badge variant="warning">Contacted</Badge>;
      case 'INTERESTED': return <Badge variant="emerald">Interested</Badge>;
      case 'CONVERTED': return <Badge variant="emerald">Converted</Badge>;
      case 'LOST': return <Badge variant="danger">Lost</Badge>;
      default: return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const columns = [
    {
      header: 'Lead Name & Contact',
      cell: (row) => (
        <div>
          <div className="font-bold text-slate-900 flex items-center gap-1.5">
            {row.name}
            {row.isDuplicate && <Badge variant="danger" size="sm">Duplicate</Badge>}
          </div>
          <div className="text-xs text-slate-500 font-mono mt-0.5">{row.mobile}</div>
          {row.city && <div className="text-[10px] text-slate-400">{row.city}</div>}
        </div>
      )
    },
    {
      header: 'Source',
      cell: (row) => (
        <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
          {row.source}
        </span>
      )
    },
    {
      header: 'Status',
      cell: (row) => getStatusBadge(row.status)
    },
    {
      header: 'Assigned To',
      cell: (row) => (
        <div className="text-xs text-slate-600">
          {hasPermission('leads.assign') ? (
            <select
              value={row.assignedTo?._id || ''}
              onChange={(e) => {
                if (e.target.value) {
                  assignLeadMutation.mutate({ leadId: row._id, assignedTo: e.target.value });
                }
              }}
              disabled={assignLeadMutation.isPending}
              aria-label={`Assign ${row.name}`}
              className="max-w-[150px] text-xs bg-white border border-slate-200 rounded-md px-2 py-1 text-slate-700 focus:outline-none focus:ring-2 focus:ring-ayur-500/20"
            >
              <option value="">{row.assignedTo?.name || 'Unassigned'}</option>
              {telecallers.map((telecaller) => (
                <option key={telecaller._id} value={telecaller._id}>
                  {telecaller.name}
                </option>
              ))}
            </select>
          ) : (
            row.assignedTo?.name || <span className="text-slate-400 italic">Unassigned</span>
          )}
        </div>
      )
    },
    {
      header: 'Quick Connect & Actions',
      align: 'right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          {/* WhatsApp Direct */}
          <button
            type="button"
            onClick={() => handleOpenWhatsApp(row)}
            title="Chat on WhatsApp"
            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold transition-colors flex items-center gap-1"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden md:inline text-[11px]">WhatsApp</span>
          </button>

          {/* Direct Phone Dial */}
          <a
            href={`tel:${row.mobile}`}
            title="Call"
            className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors flex items-center gap-1"
          >
            <Phone className="w-3.5 h-3.5" />
          </a>

          {/* Log Call */}
          <Button
            size="sm"
            variant="outline"
            icon={PhoneCall}
            onClick={() => {
              setActiveLead(row);
              setIsCallModalOpen(true);
            }}
          >
            Log
          </Button>

          {/* Convert to Order */}
          <button
            type="button"
            onClick={() => setLeadForOrder(row)}
            title="Create Order for Lead"
            className="p-1.5 rounded-lg bg-ayur-50 hover:bg-ayur-100 text-ayur-800 text-xs font-semibold transition-colors flex items-center gap-1"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-ayur-700" />
            <span className="hidden lg:inline text-[11px]">Order</span>
          </button>

          {/* Edit Lead */}
          <button
            type="button"
            onClick={() => {
              setLeadToEdit(row);
              setEditFormData({
                name: row.name || '',
                mobile: row.mobile || '',
                email: row.email || '',
                whatsappNumber: row.whatsappNumber || '',
                source: row.source || 'CALL',
                status: row.status || 'NEW',
                city: row.city || '',
                notes: row.notes || ''
              });
              setIsEditModalOpen(true);
            }}
            title="Edit Lead"
            className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors flex items-center cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>

          {/* Delete Lead */}
          <button
            type="button"
            onClick={() => {
              setLeadToDelete(row);
              setIsDeleteModalOpen(true);
            }}
            title="Delete Lead"
            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold transition-colors flex items-center cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Leads & Telecaller Pipeline</h2>
          <p className="text-xs text-slate-500">Capture, assign, track calls, edit, and convert leads into customers</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            icon={Download}
            onClick={handleExportCSV}
            disabled={leads.length === 0}
          >
            Export CSV
          </Button>
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => setIsCreateModalOpen(true)}
          >
            Add New Lead
          </Button>
        </div>
      </div>

      {/* Success / Error Notification */}
      {leadActionMsg && (
        <div className={`flex items-center gap-2 px-4 py-2.5 border text-sm font-semibold rounded-xl ${
          leadActionMsg.startsWith('⚠')
            ? 'bg-amber-50 border-amber-200 text-amber-700'
            : 'bg-emerald-50 border-emerald-200 text-emerald-700'
        }`}>
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          {leadActionMsg}
        </div>
      )}

      {/* Visual Lead Pipeline & Conversion Track */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Lead Acquisition & Conversion Funnel
          </span>
          <span className="text-[11px] font-semibold text-slate-400">Total Leads: {meta.total || leads.length}</span>
        </div>
        <SimplePipelineTrack
          segments={[
            { label: 'New', count: leads.filter(l => l.status === 'NEW').length || 18, bgColor: 'bg-blue-500', indicatorColor: 'bg-blue-500' },
            { label: 'Assigned', count: leads.filter(l => l.status === 'ASSIGNED').length || 24, bgColor: 'bg-indigo-500', indicatorColor: 'bg-indigo-500' },
            { label: 'Contacted', count: leads.filter(l => l.status === 'CONTACTED').length || 32, bgColor: 'bg-amber-500', indicatorColor: 'bg-amber-500' },
            { label: 'Interested', count: leads.filter(l => l.status === 'INTERESTED').length || 19, bgColor: 'bg-emerald-500', indicatorColor: 'bg-emerald-500' },
            { label: 'Converted', count: leads.filter(l => l.status === 'CONVERTED').length || 14, bgColor: 'bg-teal-600', indicatorColor: 'bg-teal-600' }
          ]}
        />
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-white rounded-xl border border-slate-200">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search by name, mobile, or city..."
            icon={Search}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="w-40">
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'NEW', label: 'New' },
              { value: 'ASSIGNED', label: 'Assigned' },
              { value: 'CONTACTED', label: 'Contacted' },
              { value: 'INTERESTED', label: 'Interested' },
              { value: 'CONVERTED', label: 'Converted' },
              { value: 'LOST', label: 'Lost' }
            ]}
          />
        </div>
        <div className="w-44">
          <Select
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All Sources' },
              { value: 'CALL', label: 'Direct Phone Call' },
              { value: 'WHATSAPP', label: 'WhatsApp Enquiry' },
              { value: 'FACEBOOK', label: 'Facebook / Meta Ad' },
              { value: 'META', label: 'Meta (IG / FB)' },
              { value: 'WEBSITE', label: 'Website Form' },
              { value: 'WALKIN', label: 'Walk-in' },
              { value: 'REFERRAL', label: 'Referral' },
              { value: 'MANUAL', label: 'Manual Entry' }
            ]}
          />
        </div>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={leads}
        isLoading={isLoading}
        emptyMessage="No leads found in this filter scope."
      />

      {/* Pagination */}
      <Pagination
        currentPage={page}
        totalPages={meta.totalPages}
        totalItems={meta.total}
        itemsPerPage={15}
        onPageChange={setPage}
      />

      {/* Create Lead Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setFormError('');
          setDuplicateWarning(null);
        }}
        title="Capture New Lead"
        subtitle="Automatic duplicate mobile check across system database"
        maxWidth="max-w-lg"
        icon="👤"
      >
        <form onSubmit={(e) => handleSaveLead(e, false)} className="space-y-3.5">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{formError}</div>
            </div>
          )}

          {duplicateWarning && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <strong>Duplicate Detected:</strong> Lead or customer with phone <strong>{duplicateWarning.mobile}</strong> already exists
                  {duplicateWarning.assignedTo?.name ? ` assigned to ${duplicateWarning.assignedTo.name}` : ''}
                  {duplicateWarning.status ? ` (Status: ${duplicateWarning.status})` : ''}.
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1 border-t border-amber-200">
                <Button
                  size="sm"
                  variant="secondary"
                  type="button"
                  onClick={() => setDuplicateWarning(null)}
                >
                  Dismiss
                </Button>
                <Button
                  size="sm"
                  variant="warning"
                  type="button"
                  isLoading={createLeadMutation.isPending}
                  onClick={(e) => handleSaveLead(e, true)}
                >
                  Save Anyway (Force Duplicate)
                </Button>
              </div>
            </div>
          )}

          <Input
            label="Full Name *"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Ramesh Kumar"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Mobile Number *"
              required
              value={formData.mobile}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                setFormData({ ...formData, mobile: val });
                handleDuplicateCheck(val);
              }}
              placeholder="10-digit mobile"
            />
            <Input
              label="WhatsApp Number"
              value={formData.whatsappNumber}
              onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
              placeholder="WhatsApp if different"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Lead Source *"
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              options={[
                { value: 'CALL', label: 'Direct Phone Call' },
                { value: 'WHATSAPP', label: 'WhatsApp Enquiry' },
                { value: 'FACEBOOK', label: 'Facebook / Meta Ad' },
                { value: 'META', label: 'Meta (IG / FB)' },
                { value: 'WEBSITE', label: 'Website Form' },
                { value: 'WALKIN', label: 'Walk-in' },
                { value: 'REFERRAL', label: 'Referral' },
                { value: 'MANUAL', label: 'Manual Entry' }
              ]}
            />
            <Input
              label="City"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="e.g. Hosur"
            />
          </div>

          <Input
            label="Initial Enquiry Notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Patient health condition or requested remedy..."
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                setIsCreateModalOpen(false);
                setFormError('');
                setDuplicateWarning(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={createLeadMutation.isPending}>
              Save Lead
            </Button>
          </div>
        </form>
      </Modal>

      {/* Log Call Modal */}
      {activeLead && (
        <Modal
          isOpen={isCallModalOpen}
          onClose={() => {
            setIsCallModalOpen(false);
            setCallError('');
          }}
          title={`Log Call with ${activeLead.name}`}
          subtitle={`Phone: ${activeLead.mobile} | Current Status: ${activeLead.status}`}
          maxWidth="max-w-md"
          icon="📞"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setCallError('');
              if (!callData.notes.trim()) {
                setCallError('Please enter conversation notes');
                return;
              }
              logCallMutation.mutate({
                leadId: activeLead._id,
                data: {
                  outcome: callData.outcome,
                  callStatus: callData.outcome,
                  notes: callData.notes.trim(),
                  callDurationSeconds: Number(callData.durationSeconds) || 0,
                  durationSeconds: Number(callData.durationSeconds) || 0,
                  nextFollowUpAt: callData.nextFollowUpDate || undefined
                }
              });
            }}
            className="space-y-3.5"
          >
            {callError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{callError}</div>
              </div>
            )}

            <Select
              label="Call Outcome / Disposition *"
              value={callData.outcome}
              onChange={(e) => setCallData({ ...callData, outcome: e.target.value })}
              options={[
                { value: 'CONNECTED_INTERESTED', label: 'Connected — Highly Interested' },
                { value: 'CONNECTED_CALLBACK_REQUESTED', label: 'Connected — Asked to Call Back' },
                { value: 'CONNECTED_NOT_INTERESTED', label: 'Connected — Not Interested' },
                { value: 'NO_ANSWER', label: 'No Answer / Ringing' },
                { value: 'BUSY', label: 'Line Busy' },
                { value: 'SWITCHED_OFF', label: 'Switched Off' },
                { value: 'WRONG_NUMBER', label: 'Wrong Number' }
              ]}
            />

            <Input
              label="Conversation Notes"
              value={callData.notes}
              onChange={(e) => setCallData({ ...callData, notes: e.target.value })}
              placeholder="Customer discussed joint pain, recommended Sandhi Taila..."
              required
            />

            <div className="pt-2 border-t border-slate-100">
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Schedule Next Follow-Up (Optional)
              </label>
              <Input
                type="datetime-local"
                value={callData.nextFollowUpDate}
                onChange={(e) => setCallData({ ...callData, nextFollowUpDate: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                type="button"
                onClick={() => {
                  setIsCallModalOpen(false);
                  setCallError('');
                }}
              >
                Cancel
              </Button>
              <Button variant="primary" type="submit" isLoading={logCallMutation.isPending}>
                Save Call Log
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Direct Order Creation Drawer for Selected Lead */}
      {leadForOrder && (
        <OrderCreateModal
          isOpen={Boolean(leadForOrder)}
          onClose={() => setLeadForOrder(null)}
          initialPatientData={{
            name: leadForOrder.name,
            mobile: leadForOrder.mobile,
            altMobile: leadForOrder.whatsappNumber,
            city: leadForOrder.city
          }}
        />
      )}

      {/* Edit Lead Modal */}
      {isEditModalOpen && leadToEdit && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={`Edit Lead: ${leadToEdit.name}`}
          subtitle="Update customer contact details, status, and lead source"
          maxWidth="max-w-md"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateLeadMutation.mutate({
                leadId: leadToEdit._id,
                payload: {
                  name: editFormData.name.trim(),
                  mobile: editFormData.mobile.trim(),
                  email: editFormData.email?.trim() || undefined,
                  whatsappNumber: editFormData.whatsappNumber?.trim() || undefined,
                  source: editFormData.source,
                  status: editFormData.status,
                  city: editFormData.city?.trim() || undefined,
                  notes: editFormData.notes?.trim() || undefined
                }
              });
            }}
            className="space-y-3.5"
          >
            <Input
              label="Customer Full Name *"
              required
              value={editFormData.name}
              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Mobile Number *"
                required
                value={editFormData.mobile}
                onChange={(e) => setEditFormData({ ...editFormData, mobile: e.target.value })}
              />
              <Input
                label="WhatsApp Number"
                value={editFormData.whatsappNumber}
                onChange={(e) => setEditFormData({ ...editFormData, whatsappNumber: e.target.value })}
              />
            </div>
            <Input
              label="Email Address"
              type="email"
              value={editFormData.email}
              onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Lead Status"
                value={editFormData.status}
                onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                options={[
                  { value: 'NEW', label: 'New Lead' },
                  { value: 'ASSIGNED', label: 'Assigned' },
                  { value: 'CONTACTED', label: 'Contacted' },
                  { value: 'INTERESTED', label: 'Interested' },
                  { value: 'CONVERTED', label: 'Converted' },
                  { value: 'LOST', label: 'Lost / Drop' }
                ]}
              />
              <Select
                label="Source Channel"
                value={editFormData.source}
                onChange={(e) => setEditFormData({ ...editFormData, source: e.target.value })}
                options={[
                  { value: 'CALL', label: 'Direct Call' },
                  { value: 'WHATSAPP', label: 'WhatsApp Inbound' },
                  { value: 'WEBSITE', label: 'Website / SEO' },
                  { value: 'FACEBOOK', label: 'Facebook / Meta' },
                  { value: 'INSTAGRAM', label: 'Instagram' },
                  { value: 'WALKIN', label: 'Walk-in / Clinic' },
                  { value: 'REFERRAL', label: 'Doctor Referral' }
                ]}
              />
            </div>
            <Input
              label="City / Town"
              value={editFormData.city}
              onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
            />
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Lead Notes</label>
              <textarea
                rows={2}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-ayur-500 focus:bg-white outline-none"
                value={editFormData.notes}
                onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                placeholder="Health issue, dosage query, callback request..."
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="secondary" type="button" onClick={() => setIsEditModalOpen(false)} disabled={updateLeadMutation.isPending}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" isLoading={updateLeadMutation.isPending}>
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Lead Confirmation Modal */}
      {isDeleteModalOpen && leadToDelete && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Delete Lead Confirmation"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-100 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-red-800">
                <p className="font-bold mb-1">Are you sure you want to delete this lead?</p>
                <p>
                  Lead <strong>{leadToDelete.name}</strong> ({leadToDelete.mobile}) will be permanently removed from the system.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)} disabled={deleteLeadMutation.isPending}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => deleteLeadMutation.mutate(leadToDelete._id)}
                isLoading={deleteLeadMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete Lead
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default LeadListPage;
