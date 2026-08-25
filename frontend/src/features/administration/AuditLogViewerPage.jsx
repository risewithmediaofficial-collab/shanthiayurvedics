import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, History, User, Building, Clock } from 'lucide-react';
import apiClient from '../../api/apiClient.js';
import { Table } from '../../components/common/Table.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { Pagination } from '../../components/common/Pagination.jsx';

export function AuditLogViewerPage() {
  const [page, setPage] = useState(1);

  const { data: auditResponse, isLoading } = useQuery({
    queryKey: ['auditLogs', page],
    queryFn: async () => {
      const res = await apiClient.get('/audit', { params: { page, limit: 20 } });
      return res.data;
    }
  });

  const logs = auditResponse?.data || [];
  const meta = auditResponse?.meta || { page: 1, totalPages: 1, total: 0 };

  const columns = [
    {
      header: 'Timestamp',
      cell: (row) => (
        <div className="text-xs text-slate-600">
          <div>{new Date(row.timestamp).toLocaleDateString()}</div>
          <div className="text-[10px] text-slate-400 font-mono">
            {new Date(row.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>
      )
    },
    {
      header: 'Staff User',
      cell: (row) => (
        <div>
          <div className="font-bold text-slate-900 text-xs">{row.userId?.name || 'System / Automated'}</div>
          <div className="text-[10px] text-slate-500 font-mono">{row.ipAddress}</div>
        </div>
      )
    },
    {
      header: 'Action',
      cell: (row) => (
        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-[11px] font-bold">
          {row.action}
        </span>
      )
    },
    {
      header: 'Module & Resource',
      cell: (row) => (
        <div className="text-xs text-slate-700">
          <span className="font-semibold uppercase tracking-wider text-[10px] text-slate-400 block">{row.module}</span>
          <span>{row.resourceType} ({row.resourceId?.slice(-6) || '—'})</span>
        </div>
      )
    },
    {
      header: 'Branch',
      align: 'right',
      cell: (row) => (
        <Badge variant="neutral" size="sm">
          {row.branchId?.name || 'Global / Master'}
        </Badge>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">System Audit Log Trail</h2>
        <p className="text-xs text-slate-500">
          Append-only tamper-proof security log documenting all sensitive database transactions
        </p>
      </div>

      <Table
        columns={columns}
        data={logs}
        isLoading={isLoading}
        emptyMessage="No audit logs recorded yet."
      />

      <Pagination
        currentPage={page}
        totalPages={meta.totalPages}
        totalItems={meta.total}
        itemsPerPage={20}
        onPageChange={setPage}
      />
    </div>
  );
}

export default AuditLogViewerPage;
