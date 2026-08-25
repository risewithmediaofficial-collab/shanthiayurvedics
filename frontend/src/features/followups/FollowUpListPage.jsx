import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, CheckCircle2, Clock, Phone, AlertCircle } from 'lucide-react';
import apiClient from '../../api/apiClient.js';
import { Table } from '../../components/common/Table.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { Modal } from '../../components/common/Modal.jsx';
import { Input } from '../../components/common/Input.jsx';

export function FollowUpListPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('TODAY'); // TODAY, OVERDUE, UPCOMING, COMPLETED
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState(null);
  const [completeNotes, setCompleteNotes] = useState('');

  const { data: followupsResponse, isLoading } = useQuery({
    queryKey: ['followups', activeTab],
    queryFn: async () => {
      const res = await apiClient.get('/followups', { params: { filter: activeTab } });
      return res.data;
    }
  });

  const followups = followupsResponse?.data || [];

  const completeMutation = useMutation({
    mutationFn: ({ id, notes }) => apiClient.patch(`/followups/${id}/complete`, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries(['followups']);
      queryClient.invalidateQueries(['dashboard']);
      setCompleteModalOpen(false);
      setCompleteNotes('');
    }
  });

  const columns = [
    {
      header: 'Scheduled Date & Time',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-ayur-600" />
          <span className="font-semibold text-slate-900 text-xs">
            {new Date(row.scheduledAt).toLocaleDateString()} {new Date(row.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      )
    },
    {
      header: 'Lead / Customer',
      cell: (row) => (
        <div>
          <div className="font-bold text-slate-900">{row.leadId?.name || row.customerId?.name}</div>
          <div className="text-xs text-slate-500 font-mono">{row.leadId?.mobile || row.customerId?.mobile}</div>
        </div>
      )
    },
    {
      header: 'Action Notes',
      cell: (row) => <div className="text-xs text-slate-600 max-w-sm line-clamp-2">{row.notes || '—'}</div>
    },
    {
      header: 'Status',
      cell: (row) => (
        row.status === 'COMPLETED' ? (
          <Badge variant="emerald">Completed</Badge>
        ) : (
          <Badge variant={activeTab === 'OVERDUE' ? 'danger' : 'warning'}>
            {activeTab === 'OVERDUE' ? 'Overdue' : 'Pending'}
          </Badge>
        )
      )
    },
    {
      header: 'Actions',
      align: 'right',
      cell: (row) => (
        row.status === 'PENDING' && (
          <Button
            size="sm"
            variant="primary"
            icon={CheckCircle2}
            onClick={() => {
              setSelectedFollowUp(row);
              setCompleteModalOpen(true);
            }}
          >
            Done
          </Button>
        )
      )
    }
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Telecaller Follow-Up Queue</h2>
        <p className="text-xs text-slate-500">Track and fulfill call-back commitments and customer touchpoints</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        {['TODAY', 'OVERDUE', 'UPCOMING', 'COMPLETED'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === tab
                ? 'bg-ayur-800 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={followups}
        isLoading={isLoading}
        emptyMessage={`No ${activeTab.toLowerCase()} follow-up tasks.`}
      />

      {/* Complete Modal */}
      {selectedFollowUp && (
        <Modal
          isOpen={completeModalOpen}
          onClose={() => setCompleteModalOpen(false)}
          title="Complete Follow-Up"
          subtitle={`Lead: ${selectedFollowUp.leadId?.name || selectedFollowUp.customerId?.name}`}
          maxWidth="max-w-md"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              completeMutation.mutate({ id: selectedFollowUp._id, notes: completeNotes });
            }}
            className="space-y-3.5"
          >
            <Input
              label="Outcome / Resolution Notes"
              placeholder="Spoke with patient, placed order for Taila..."
              value={completeNotes}
              onChange={(e) => setCompleteNotes(e.target.value)}
              required
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" type="button" onClick={() => setCompleteModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" isLoading={completeMutation.isPending}>
                Mark Completed
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default FollowUpListPage;
