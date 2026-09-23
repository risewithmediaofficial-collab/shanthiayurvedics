import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  Phone,
  AlertCircle,
  MessageSquare,
  ShoppingBag,
  Pencil,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import apiClient from '../../api/apiClient.js';
import { Table } from '../../components/common/Table.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { Modal } from '../../components/common/Modal.jsx';
import { Input } from '../../components/common/Input.jsx';
import { OrderCreateModal } from '../orders/OrderCreateModal.jsx';
import { ExportButton } from '../../components/common/ExportButton.jsx';
import { exportToExcel, exportToCSV } from '../../utils/exportUtils.js';

export function FollowUpListPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('TODAY'); // TODAY, OVERDUE, UPCOMING, COMPLETED
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState(null);
  const [followUpToDelete, setFollowUpToDelete] = useState(null);
  const [completeNotes, setCompleteNotes] = useState('');
  const [followUpForOrder, setFollowUpForOrder] = useState(null);
  const [actionMsg, setActionMsg] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const [editFormData, setEditFormData] = useState({
    scheduledAt: '',
    notes: '',
    priority: 'MEDIUM'
  });

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
      setActionMsg('✓ Follow-up marked as completed');
      setTimeout(() => setActionMsg(''), 3000);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => apiClient.patch(`/followups/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['followups']);
      queryClient.invalidateQueries(['dashboard']);
      setEditModalOpen(false);
      setSelectedFollowUp(null);
      setActionMsg('✓ Follow-up rescheduled/updated successfully');
      setTimeout(() => setActionMsg(''), 3000);
    },
    onError: (err) => {
      setActionMsg(`⚠ ${err.response?.data?.message || 'Failed to update follow-up'}`);
      setTimeout(() => setActionMsg(''), 4000);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`/followups/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['followups']);
      queryClient.invalidateQueries(['dashboard']);
      setDeleteModalOpen(false);
      setFollowUpToDelete(null);
      setActionMsg('✓ Follow-up removed successfully');
      setTimeout(() => setActionMsg(''), 3000);
    },
    onError: (err) => {
      setActionMsg(`⚠ ${err.response?.data?.message || 'Failed to remove follow-up'}`);
      setTimeout(() => setActionMsg(''), 4000);
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

  const handleExportFollowUps = async (format) => {
    try {
      setIsExporting(true);
      const res = await apiClient.get('/followups', {
        params: {
          filter: activeTab,
          export: true
        }
      });
      const exportList = res.data?.data || followups;
      if (!exportList.length) {
        setActionMsg('⚠ No follow-ups to export');
        setTimeout(() => setActionMsg(''), 3000);
        return;
      }

      const rows = exportList.map((f) => ({
        'Scheduled At': f.scheduledAt ? new Date(f.scheduledAt).toLocaleString('en-IN') : '',
        'Contact Name': f.leadId?.name || f.customerId?.name || 'Customer',
        'Mobile': f.leadId?.mobile || f.customerId?.mobile || '',
        'Type': f.leadId ? 'Lead' : 'Customer',
        'City': f.leadId?.city || '',
        'Priority': f.priority || 'MEDIUM',
        'Status': f.status || 'PENDING',
        'Telecaller': f.telecallerId?.name || '',
        'Branch': f.branchId?.name || '',
        'Notes': f.notes || '',
        'Created Date': f.createdAt ? new Date(f.createdAt).toLocaleDateString('en-IN') : ''
      }));

      const fileName = `Shanthi_Ayurvedas_FollowUps_${activeTab}_${new Date().toISOString().split('T')[0]}`;
      if (format === 'csv') {
        exportToCSV(rows, fileName);
      } else {
        exportToExcel(rows, fileName, `FollowUps_${activeTab}`);
      }
      setActionMsg(`✓ Exported ${rows.length} follow-ups to ${format.toUpperCase()}`);
      setTimeout(() => setActionMsg(''), 3000);
    } catch (err) {
      console.error('Follow-ups export failed:', err);
      setActionMsg('⚠ Failed to export follow-ups');
      setTimeout(() => setActionMsg(''), 3000);
    } finally {
      setIsExporting(false);
    }
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
              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
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
              className="p-1.5 rounded-lg bg-ayur-50 hover:bg-ayur-100 text-ayur-800 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-ayur-700" />
            </button>

            {/* Edit / Reschedule */}
            <button
              type="button"
              onClick={() => {
                setSelectedFollowUp(row);
                const isoDate = row.scheduledAt ? new Date(row.scheduledAt).toISOString().slice(0, 16) : '';
                setEditFormData({
                  scheduledAt: isoDate,
                  notes: row.notes || '',
                  priority: row.priority || 'MEDIUM'
                });
                setEditModalOpen(true);
              }}
              title="Edit / Reschedule Follow-Up"
              className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors flex items-center cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>

            {/* Delete Follow-Up */}
            <button
              type="button"
              onClick={() => {
                setFollowUpToDelete(row);
                setDeleteModalOpen(true);
              }}
              title="Remove Follow-Up"
              className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold transition-colors flex items-center cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Telecaller Follow-Up Queue</h2>
          <p className="text-xs text-slate-500">Track, reschedule, and fulfill call-back commitments and customer touchpoints</p>
        </div>
        <ExportButton
          onExport={handleExportFollowUps}
          isLoading={isExporting}
          disabled={followups.length === 0}
        />
      </div>

      {/* Notification Toast */}
      {actionMsg && (
        <div className={`flex items-center gap-2 px-4 py-2.5 border text-sm font-semibold rounded-xl ${
          actionMsg.startsWith('⚠')
            ? 'bg-amber-50 border-amber-200 text-amber-700'
            : 'bg-emerald-50 border-emerald-200 text-emerald-700'
        }`}>
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          {actionMsg}
        </div>
      )}

      {/* Bento Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bento-card flex flex-col gap-1">
          <div className="bento-metric-title">Today's Scheduled</div>
          <div className="bento-metric-value text-slate-900">
            {followups.filter(f => f.status === 'PENDING').length}
          </div>
          <div className="text-[11px] text-slate-500 font-medium">Calls due today</div>
        </div>
        <div className="bento-card flex flex-col gap-1">
          <div className="bento-metric-title">Overdue Inquiries</div>
          <div className="bento-metric-value text-rose-600">
            {followups.filter(f => f.status === 'OVERDUE' || (new Date(f.scheduledAt) < new Date() && f.status === 'PENDING')).length}
          </div>
          <div className="text-[11px] text-rose-500 font-medium">Pending callback</div>
        </div>
        <div className="bento-card flex flex-col gap-1">
          <div className="bento-metric-title">Completed Care Follow-ups</div>
          <div className="bento-metric-value text-emerald-700">
            {followups.filter(f => f.status === 'COMPLETED').length}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium">Patient queries resolved</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bento-card p-2.5 flex items-center gap-2 overflow-x-auto">
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
      {selectedFollowUp && completeModalOpen && (
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

      {/* Edit / Reschedule Modal */}
      {selectedFollowUp && editModalOpen && (
        <Modal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedFollowUp(null);
          }}
          title="Reschedule / Edit Follow-Up"
          subtitle={`Customer: ${selectedFollowUp.leadId?.name || selectedFollowUp.customerId?.name}`}
          maxWidth="max-w-md"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateMutation.mutate({
                id: selectedFollowUp._id,
                data: {
                  scheduledAt: editFormData.scheduledAt,
                  notes: editFormData.notes
                }
              });
            }}
            className="space-y-3.5"
          >
            <Input
              label="Scheduled Date & Time *"
              type="datetime-local"
              required
              value={editFormData.scheduledAt}
              onChange={(e) => setEditFormData({ ...editFormData, scheduledAt: e.target.value })}
            />
            <Input
              label="Action Notes"
              value={editFormData.notes}
              onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
              placeholder="Customer inquiry, specific medicine requirements..."
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="secondary" type="button" onClick={() => setEditModalOpen(false)} disabled={updateMutation.isPending}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" isLoading={updateMutation.isPending}>
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Follow-Up Modal */}
      {followUpToDelete && deleteModalOpen && (
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setFollowUpToDelete(null);
          }}
          title="Remove Follow-Up Confirmation"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-100 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-red-800">
                <p className="font-bold mb-1">Are you sure you want to remove this follow-up reminder?</p>
                <p>
                  Follow-up for <strong>{followUpToDelete.leadId?.name || followUpToDelete.customerId?.name}</strong> will be permanently deleted.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setDeleteModalOpen(false)} disabled={deleteMutation.isPending}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => deleteMutation.mutate(followUpToDelete._id)}
                isLoading={deleteMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete Follow-Up
              </Button>
            </div>
          </div>
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
