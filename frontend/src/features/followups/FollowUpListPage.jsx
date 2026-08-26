import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, CheckCircle2, Clock, Phone, AlertCircle, MessageSquare, ShoppingBag } from 'lucide-react';
import apiClient from '../../api/apiClient.js';
import { Table } from '../../components/common/Table.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { Modal } from '../../components/common/Modal.jsx';
import { Input } from '../../components/common/Input.jsx';
import { OrderCreateModal } from '../orders/OrderCreateModal.jsx';

export function FollowUpListPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('TODAY'); // TODAY, OVERDUE, UPCOMING, COMPLETED
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState(null);
  const [completeNotes, setCompleteNotes] = useState('');
  const [followUpForOrder, setFollowUpForOrder] = useState(null);

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

  const handleOpenWhatsApp = (row) => {
    const mobile = row.leadId?.mobile || row.customerId?.mobile || '';
    const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
    const name = row.leadId?.name || row.customerId?.name || 'Customer';
    if (!cleanMobile) return;
    const textMsg = encodeURIComponent(
      `🌿 *Shanthi Ayurvedas Follow-up*\n\n` +
        `Hello *${name}*,\n` +
        `Following up as promised regarding your Ayurvedic wellness inquiry.\n` +
        `Please let us know how we may assist you with your health remedies today.\n\n` +
        `🙏 Shanthi Ayurvedas Healthcare Team`
    );
    window.open(`https://wa.me/91${cleanMobile}?text=${textMsg}`, '_blank');
  };

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
          <div className="font-bold text-slate-900">{row.leadId?.name || row.customerId?.name || 'Customer'}</div>
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
      cell: (row) => {
        const mobile = row.leadId?.mobile || row.customerId?.mobile || '';
        return (
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => handleOpenWhatsApp(row)}
              title="Chat on WhatsApp"
              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold transition-colors flex items-center gap-1"
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </button>

            {mobile && (
              <a
                href={`tel:${mobile}`}
                title="Call"
                className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors flex items-center gap-1"
              >
                <Phone className="w-3.5 h-3.5" />
              </a>
            )}

            <button
              type="button"
              onClick={() => setFollowUpForOrder(row)}
              title="Create Prescription Order"
              className="p-1.5 rounded-lg bg-ayur-50 hover:bg-ayur-100 text-ayur-800 text-xs font-semibold transition-colors flex items-center gap-1"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-ayur-700" />
            </button>

            {row.status === 'PENDING' && (
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
            )}
          </div>
        );
      }
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
        <button
          onClick={() => setActiveTab('TODAY')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'TODAY' ? 'bg-ayur-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Today's Scheduled
        </button>
        <button
          onClick={() => setActiveTab('OVERDUE')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'OVERDUE' ? 'bg-rose-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          🚨 Overdue
        </button>
        <button
          onClick={() => setActiveTab('UPCOMING')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'UPCOMING' ? 'bg-ayur-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Upcoming (7 Days)
        </button>
        <button
          onClick={() => setActiveTab('COMPLETED')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'COMPLETED' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Completed
        </button>
      </div>

      <Table
        columns={columns}
        data={followups}
        isLoading={isLoading}
        emptyMessage={`No follow-ups found in '${activeTab}' filter.`}
      />

      {/* Complete Modal */}
      {selectedFollowUp && (
        <Modal
          isOpen={completeModalOpen}
          onClose={() => setCompleteModalOpen(false)}
          title="Complete Follow-Up"
          subtitle={`Lead: ${selectedFollowUp.leadId?.name || selectedFollowUp.customerId?.name}`}
          maxWidth="max-w-md"
          icon="✅"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              completeMutation.mutate({
                id: selectedFollowUp._id,
                notes: completeNotes
              });
            }}
            className="space-y-3.5"
          >
            <Input
              label="Resolution Notes *"
              required
              value={completeNotes}
              onChange={(e) => setCompleteNotes(e.target.value)}
              placeholder="Spoke with patient, customer placed order / resolved query..."
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" type="button" onClick={() => setCompleteModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" isLoading={completeMutation.isPending}>
                Mark as Completed
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Order Creation Drawer from Follow-up */}
      {followUpForOrder && (
        <OrderCreateModal
          isOpen={Boolean(followUpForOrder)}
          onClose={() => setFollowUpForOrder(null)}
          initialPatientData={{
            name: followUpForOrder.leadId?.name || followUpForOrder.customerId?.name,
            mobile: followUpForOrder.leadId?.mobile || followUpForOrder.customerId?.mobile,
            city: followUpForOrder.leadId?.city || followUpForOrder.customerId?.addresses?.[0]?.city || ''
          }}
        />
      )}
    </div>
  );
}

export default FollowUpListPage;
