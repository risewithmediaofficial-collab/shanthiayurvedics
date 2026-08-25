import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Filter,
  PhoneCall,
  UserPlus,
  Calendar,
  Sparkles,
  ShoppingBag,
  AlertCircle
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
import { Spinner } from '../../components/common/Spinner.jsx';

export function LeadListPage() {
  const queryClient = useQueryClient();
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

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    whatsappNumber: '',
    source: 'FACEBOOK',
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

  // Create Lead Mutation
  const createLeadMutation = useMutation({
    mutationFn: (data) => apiClient.post('/leads', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['leads']);
      setIsCreateModalOpen(false);
      setFormData({ name: '', mobile: '', email: '', whatsappNumber: '', source: 'FACEBOOK', city: '', notes: '' });
      setDuplicateWarning(null);
    },
    onError: (err) => {
      if (err.response?.status === 409 && err.response?.data?.data?.duplicateLead) {
        setDuplicateWarning(err.response.data.data.duplicateLead);
      }
    }
  });

  // Log Call Mutation
  const logCallMutation = useMutation({
    mutationFn: ({ leadId, data }) => apiClient.post(`/leads/${leadId}/calls`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['leads']);
      queryClient.invalidateQueries(['dashboard']);
      setIsCallModalOpen(false);
      setCallData({ outcome: 'CONNECTED_INTERESTED', durationSeconds: 120, notes: '', nextFollowUpDate: '', nextFollowUpNotes: '' });
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'NEW': return <Badge variant="primary">New</Badge>;
      case 'ASSIGNED': return <Badge variant="info">Assigned</Badge>;
      case 'CONTACTED': return <Badge variant="warning">Contacted</Badge>;
      case 'INTERESTED': return <Badge variant="success">Interested</Badge>;
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
          {row.assignedTo?.name || <span className="text-slate-400 italic">Unassigned</span>}
        </div>
      )
    },
    {
      header: 'Actions',
      align: 'right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            size="sm"
            variant="outline"
            icon={PhoneCall}
            onClick={() => {
              setActiveLead(row);
              setIsCallModalOpen(true);
            }}
          >
            Log Call
          </Button>
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
          <p className="text-xs text-slate-500">Capture, assign, track calls, and convert leads into customers</p>
        </div>
        <Button
          variant="primary"
          icon={Plus}
          onClick={() => setIsCreateModalOpen(true)}
        >
          Add New Lead
        </Button>
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
        <div className="w-40">
          <Select
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All Sources' },
              { value: 'FACEBOOK', label: 'Facebook Ads' },
              { value: 'WHATSAPP', label: 'WhatsApp' },
              { value: 'CALL', label: 'Direct Call' },
              { value: 'WEBSITE', label: 'Website' },
              { value: 'WALKIN', label: 'Walk-in' }
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
        onClose={() => setIsCreateModalOpen(false)}
        title="Capture New Lead"
        subtitle="Automatic duplicate mobile check across system database"
        maxWidth="max-w-lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createLeadMutation.mutate(formData);
          }}
          className="space-y-3.5"
        >
          {duplicateWarning && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Duplicate Warning:</strong> Lead with phone {duplicateWarning.mobile} already exists assigned to {duplicateWarning.assignedTo?.name || 'staff'}.
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
                { value: 'FACEBOOK', label: 'Facebook / Meta Ad' },
                { value: 'WHATSAPP', label: 'WhatsApp Enquiry' },
                { value: 'CALL', label: 'Direct Phone Call' },
                { value: 'WEBSITE', label: 'Website Form' },
                { value: 'WALKIN', label: 'Walk-in' }
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
            <Button variant="outline" type="button" onClick={() => setIsCreateModalOpen(false)}>
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
          onClose={() => setIsCallModalOpen(false)}
          title={`Log Call with ${activeLead.name}`}
          subtitle={`Phone: ${activeLead.mobile} | Current Status: ${activeLead.status}`}
          maxWidth="max-w-md"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              logCallMutation.mutate({ leadId: activeLead._id, data: callData });
            }}
            className="space-y-3.5"
          >
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
              <Button variant="outline" type="button" onClick={() => setIsCallModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" isLoading={logCallMutation.isPending}>
                Save Call Log
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default LeadListPage;
