import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PhoneCall, Calendar, Clock, User, CheckCircle2 } from 'lucide-react';
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

  const getOutcomeBadge = (outcome) => {
    switch (outcome) {
      case 'CONNECTED_INTERESTED':
        return <Badge variant="success">Interested</Badge>;
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
      cell: (row) => (
        <div>
          <div className="font-bold text-slate-900">{row.leadId?.name || row.customerId?.name || 'Customer'}</div>
          <div className="text-xs text-slate-500 font-mono">{row.leadId?.mobile || row.customerId?.mobile}</div>
        </div>
      )
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
      align: 'right',
      cell: (row) => (
        <div className="text-xs text-slate-500 text-right">
          {new Date(row.createdAt).toLocaleDateString()} {new Date(row.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      )
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
