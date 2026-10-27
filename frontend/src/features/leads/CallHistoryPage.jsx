import { useBranch } from '../../context/BranchContext.jsx';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PhoneCall, Calendar, Clock, User, CheckCircle2, MessageSquare, Phone, Eye, Trash2, AlertTriangle } from 'lucide-react';
import apiClient from '../../api/apiClient.js';
import { Table } from '../../components/common/Table.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { Pagination } from '../../components/common/Pagination.jsx';
import { Modal } from '../../components/common/Modal.jsx';
import { Button } from '../../components/common/Button.jsx';
import { LeadDetailModal } from './LeadDetailModal.jsx';

export function CallHistoryPage({ callerId } = {}) {
  const queryClient = useQueryClient();
  const { selectedBranchId } = useBranch();
  const [page, setPage] = useState(1);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [callToDelete, setCallToDelete] = useState(null);
  const [actionFeedback, setActionFeedback] = useState('');

  const { data: callsResponse, isLoading } = useQuery({
    queryKey: ['callHistory', selectedBranchId, callerId, page],
    queryFn: async () => {
      const res = await apiClient.get('/leads/calls/history', { params: { page, limit: 15, telecallerId: callerId } });
      return res.data;
    }
  });

  const deleteCallMutation = useMutation({
    mutationFn: async (callId) => {
      const res = await apiClient.delete(`/leads/calls/history/${callId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callHistory'] });
      setCallToDelete(null);
      setActionFeedback('✓ Call interaction record deleted successfully');
      setTimeout(() => setActionFeedback(''), 3500);
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to delete call record');
    }
  });

  const calls = Array.isArray(callsResponse?.data) ? callsResponse?.data : [];
  const meta = callsResponse?.pagination || callsResponse?.meta || { page: 1, totalPages: 1, total: 0 };

  const handleOpenWhatsApp = (row) => {
    const mobile = row.leadId?.mobile || row.customerId?.mobile || '';
    const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
    const name = row.leadId?.name || row.customerId?.name || 'Customer';
    if (!cleanMobile) return;
    const textMsg = encodeURIComponent(
      `🌿 *Shanthi Ayurvedas Follow-up*\n\n` +
        `Hello *${name}*,\n` +
        `Following up regarding our Ayurvedic wellness discussion.\n` +
        `Please let us know if you have any questions about your prescribed formulations or consultation.\n\n` +
        `🙏 Shanthi Ayurvedas Healthcare Team`
    );
    window.open(`https://wa.me/91${cleanMobile}?text=${textMsg}`, '_blank');
  };

  const getOutcomeBadge = (outcome) => {
    switch (outcome) {
      case 'CONNECTED_INTERESTED':
        return <Badge variant="emerald">Interested</Badge>;
      case 'CONNECTED_CALLBACK_REQUESTED':
        return <Badge variant="warning">Callback</Badge>;
      case 'CONNECTED_NOT_INTERESTED':
        return <Badge variant="neutral">Not Interested</Badge>;
      case 'RINGING_NOT_RESPONDING':
        return <Badge variant="danger">Ringing not responding</Badge>;
      case 'NO_ANSWER':
      case 'BUSY':
        return <Badge variant="danger">{outcome === 'NO_ANSWER' ? 'No Answer / Ringing' : outcome}</Badge>;
      default:
        return <Badge variant="neutral">{outcome}</Badge>;
    }
  };

  const columns = [
    {
      header: 'Lead / Customer',
      cell: (row) => {
        const name = row.leadId?.name || row.customerId?.name || 'Customer';
        const mobile = row.leadId?.mobile || row.customerId?.mobile || '—';
        const leadIdVal = row.leadId?._id || row.leadId;
        return (
          <div
            onClick={(e) => {
              if (leadIdVal) {
                e.stopPropagation();
                setSelectedLeadId(leadIdVal);
              }
            }}
            className={leadIdVal ? 'cursor-pointer group' : ''}
          >
            <div className={`font-bold text-slate-900 ${leadIdVal ? 'group-hover:text-emerald-700 group-hover:underline' : ''}`}>
              {name}
            </div>
            <div className="text-xs text-slate-500 font-mono">{mobile}</div>
          </div>
        );
      }
    },
    {
      header: 'Outcome',
      cell: (row) => getOutcomeBadge(row.callStatus || row.outcome)
    },
    {
      header: 'Notes & Discussion',
      cell: (row) => <div className="text-xs text-slate-600 max-w-md line-clamp-2">{row.notes || '—'}</div>
    },
    {
      header: 'Telecaller',
      cell: (row) => <div className="text-xs font-medium text-slate-700">{row.telecallerId?.name || 'Staff'}</div>
    },
    {
      header: 'Date & Time',
      cell: (row) => (
        <div className="text-xs text-slate-500">
          {new Date(row.createdAt).toLocaleDateString()} {new Date(row.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      )
    },
    {
      header: 'Quick Action',
      align: 'right',
      cell: (row) => {
        const mobile = row.leadId?.mobile || row.customerId?.mobile || '';
        const leadIdVal = row.leadId?._id || row.leadId;
        return (
          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
            {leadIdVal && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedLeadId(leadIdVal);
                }}
                title="View Full Lead Details & Logs"
                className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold transition-colors flex items-center justify-center min-h-[36px] min-w-[36px] cursor-pointer touch-manipulation"
              >
                <Eye className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenWhatsApp(row);
              }}
              title="WhatsApp Follow-up"
              className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold transition-colors flex items-center justify-center min-h-[36px] min-w-[36px] cursor-pointer touch-manipulation"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
            {mobile && (
              <a
                href={`tel:${mobile}`}
                onClick={(e) => e.stopPropagation()}
                title="Call"
                className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors flex items-center justify-center min-h-[36px] min-w-[36px] touch-manipulation"
              >
                <Phone className="w-4 h-4" />
              </a>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCallToDelete(row);
              }}
              title="Delete Call Record"
              className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold transition-colors flex items-center justify-center min-h-[36px] min-w-[36px] cursor-pointer touch-manipulation"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Call History Ledger</h2>
          <p className="text-xs text-slate-500">Record of all telecaller communication and customer interactions</p>
        </div>
        {actionFeedback && (
          <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-lg animate-fade-in">
            {actionFeedback}
          </div>
        )}
      </div>

      <Table
        columns={columns}
        data={calls}
        isLoading={isLoading}
        onRowClick={(row) => {
          const lId = row.leadId?._id || row.leadId;
          if (lId) setSelectedLeadId(lId);
        }}
        emptyMessage="No call interactions recorded yet."
      />

      <Pagination
        currentPage={page}
        totalPages={meta.totalPages}
        totalItems={meta.total}
        itemsPerPage={15}
        onPageChange={setPage}
      />

      {/* Lead Details & Call Logs Modal */}
      {selectedLeadId && (
        <LeadDetailModal
          isOpen={Boolean(selectedLeadId)}
          leadId={selectedLeadId}
          onClose={() => setSelectedLeadId(null)}
        />
      )}

      {/* Delete Call History Confirmation Modal */}
      {callToDelete && (
        <Modal
          isOpen={Boolean(callToDelete)}
          onClose={() => setCallToDelete(null)}
          title="Delete Call History Record"
          subtitle="Confirm permanent deletion"
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold mb-1">Are you sure you want to delete this call record?</p>
                <p className="text-slate-600">
                  This call interaction log will be permanently removed from the ledger.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3 space-y-2 text-slate-700">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Customer / Lead:</span>
                <span className="font-bold text-slate-900">
                  {callToDelete.leadId?.name || callToDelete.customerId?.name || 'Customer'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Outcome:</span>
                <span>{getOutcomeBadge(callToDelete.callStatus || callToDelete.outcome)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Discussion Notes:</span>
                <span className="text-right max-w-[200px] truncate text-slate-800 font-medium">
                  {callToDelete.notes || '—'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Telecaller:</span>
                <span className="font-medium text-slate-800">
                  {callToDelete.telecallerId?.name || 'Staff'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Recorded Date:</span>
                <span className="font-mono text-slate-600 text-[11px]">
                  {new Date(callToDelete.createdAt).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setCallToDelete(null)}
                disabled={deleteCallMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                type="button"
                onClick={() => deleteCallMutation.mutate(callToDelete._id)}
                isLoading={deleteCallMutation.isPending}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                Delete Record
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default CallHistoryPage;
