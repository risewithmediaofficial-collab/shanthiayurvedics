import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PhoneCall, Calendar, Clock, User, CheckCircle2, MessageSquare, Phone } from 'lucide-react';
import apiClient from '../../api/apiClient.js';
import { Table } from '../../components/common/Table.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { Pagination } from '../../components/common/Pagination.jsx';

export function CallHistoryPage() {
  const [page, setPage] = useState(1);

  const { data: callsResponse, isLoading } = useQuery({
    queryKey: ['callHistory', page],
    queryFn: async () => {
      const res = await apiClient.get('/leads/calls/history', { params: { page, limit: 15 } });
      return res.data;
    }
  });

  const calls = callsResponse?.data || [];
  const meta = callsResponse?.meta || { page: 1, totalPages: 1, total: 0 };

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
      case 'NO_ANSWER':
      case 'BUSY':
        return <Badge variant="danger">{outcome}</Badge>;
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
        return (
          <div>
            <div className="font-bold text-slate-900">{name}</div>
            <div className="text-xs text-slate-500 font-mono">{mobile}</div>
          </div>
        );
      }
    },
    {
      header: 'Outcome',
      cell: (row) => getOutcomeBadge(row.outcome)
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
        return (
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => handleOpenWhatsApp(row)}
              title="WhatsApp Follow-up"
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
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Call History Ledger</h2>
        <p className="text-xs text-slate-500">Immutable record of all telecaller communication and customer interactions</p>
      </div>

      <Table
        columns={columns}
        data={calls}
        isLoading={isLoading}
        emptyMessage="No call interactions recorded yet."
      />

      <Pagination
        currentPage={page}
        totalPages={meta.totalPages}
        totalItems={meta.total}
        itemsPerPage={15}
        onPageChange={setPage}
      />
    </div>
  );
}

export default CallHistoryPage;
