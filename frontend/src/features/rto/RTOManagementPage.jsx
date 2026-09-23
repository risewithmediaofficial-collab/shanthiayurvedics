import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RotateCcw, CheckCircle2, AlertTriangle, ShieldCheck, Box, Package, Search } from 'lucide-react';
import apiClient from '../../api/apiClient.js';
import { usePermissions } from '../../hooks/usePermissions.js';
import { Table } from '../../components/common/Table.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { Modal } from '../../components/common/Modal.jsx';
import { Input } from '../../components/common/Input.jsx';
import { Select } from '../../components/common/Select.jsx';
import { Pagination } from '../../components/common/Pagination.jsx';
import { DateRangeFilter } from '../../components/common/DateRangeFilter.jsx';
import { ExportButton } from '../../components/common/ExportButton.jsx';
import { exportToExcel, exportToCSV } from '../../utils/exportUtils.js';

export function RTOManagementPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [selectedRTO, setSelectedRTO] = useState(null);

  const [condition, setCondition] = useState('SALEABLE');
  const [notes, setNotes] = useState('');

  const { data: rtoResponse, isLoading } = useQuery({
    queryKey: ['rtoRecords', page, search, startDate, endDate],
    queryFn: async () => {
      const res = await apiClient.get('/rto', {
        params: {
          page,
          limit: 15,
          search,
          startDate,
          endDate
        }
      });
      return res.data;
    }
  });

  const rtoRecords = rtoResponse?.data || [];
  const meta = rtoResponse?.meta || { page: 1, totalPages: 1, total: 0 };

  const receiveMutation = useMutation({
    mutationFn: (id) => apiClient.patch(`/rto/${id}/receive`),
    onSuccess: () => {
      queryClient.invalidateQueries(['rtoRecords']);
      queryClient.invalidateQueries(['operationsSummary']);
    }
  });

  const verifyMutation = useMutation({
    mutationFn: ({ id, data }) => apiClient.patch(`/rto/${id}/verify`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['rtoRecords']);
      queryClient.invalidateQueries(['inventory']);
      queryClient.invalidateQueries(['operationsSummary']);
      setVerifyModalOpen(false);
      setNotes('');
    }
  });

  const handleExportRTO = async (format) => {
    try {
      setIsExporting(true);
      const res = await apiClient.get('/rto', {
        params: {
          search,
          startDate,
          endDate,
          export: true
        }
      });
      const exportList = res.data?.data || rtoRecords;
      if (!exportList.length) return;

      const rows = exportList.map((r) => ({
        'Order Number': r.orderId?.orderNumber || '',
        'Return AWB': r.returnAwbNumber || '',
        'Carrier': r.shipmentId?.courierName || '',
        'RTO Reason': r.reason || '',
        'Status': r.status || '',
        'Condition': r.condition || 'Pending Verification',
        'Branch': r.branchId?.name || '',
        'Received By': r.receivedBy?.name || '',
        'Verified By': r.verifiedBy?.name || '',
        'Return Date': r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN') : ''
      }));

      const fileName = `Shanthi_Ayurvedas_RTO_${new Date().toISOString().split('T')[0]}`;
      if (format === 'csv') exportToCSV(rows, fileName);
      else exportToExcel(rows, fileName, 'RTO Recovery');
    } catch (err) {
      console.error('RTO export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const columns = [
    {
      header: 'Return Reference & Order',
      cell: (row) => (
        <div>
          <div className="font-bold text-slate-900 font-mono text-xs">{row.orderId?.orderNumber}</div>
          <div className="text-[10px] text-slate-500 font-mono">Return AWB: {row.returnAwbNumber}</div>
        </div>
      )
    },
    {
      header: 'RTO Reason',
      cell: (row) => (
        <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded text-[11px] font-semibold">
          {row.reason}
        </span>
      )
    },
    {
      header: 'Return Status',
      cell: (row) => {
        if (row.status === 'VERIFIED') return <Badge variant="emerald">Stock Restored</Badge>;
        if (row.status === 'RECEIVED_AT_BRANCH') return <Badge variant="warning">Received at Branch</Badge>;
        return <Badge variant="danger">RTO In Transit</Badge>;
      }
    },
    {
      header: 'Verified Condition',
      cell: (row) => (
        <span className="text-xs font-semibold text-slate-700">
          {row.condition || 'Pending Verification'}
        </span>
      )
    },
    {
      header: 'Actions',
      align: 'right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          {row.status === 'RTO_INITIATED' && (
            <Button
              size="sm"
              variant="secondary"
              icon={Box}
              onClick={() => receiveMutation.mutate(row._id)}
            >
              Mark Received
            </Button>
          )}
          {row.status === 'RECEIVED_AT_BRANCH' && (
            <Button
              size="sm"
              variant="primary"
              icon={ShieldCheck}
              onClick={() => {
                setSelectedRTO(row);
                setVerifyModalOpen(true);
              }}
            >
              Verify Condition
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Return to Origin (RTO) & Stock Recovery</h2>
          <p className="text-xs text-slate-500">Physical receipt, medicine seal verification, and conditional inventory restock</p>
        </div>
        <ExportButton
          onExport={handleExportRTO}
          isLoading={isExporting}
          disabled={rtoRecords.length === 0}
        />
      </div>

      {/* Filter and Date Range Bar */}
      <div className="bento-card p-4 space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
          <div className="lg:col-span-5">
            <Input
              placeholder="Search by Return AWB or reason..."
              icon={Search}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="lg:col-span-7">
            <DateRangeFilter
              startDate={startDate}
              endDate={endDate}
              onChange={({ startDate: s, endDate: e }) => {
                setStartDate(s);
                setEndDate(e);
                setPage(1);
              }}
            />
          </div>
        </div>
      </div>

      <Table
        columns={columns}
        data={rtoRecords}
        isLoading={isLoading}
        emptyMessage="No RTO returned parcels in queue."
      />

      <Pagination
        currentPage={page}
        totalPages={meta.totalPages}
        totalItems={meta.total}
        itemsPerPage={15}
        onPageChange={setPage}
      />

      {/* Verify Condition Modal */}
      {selectedRTO && (
        <Modal
          isOpen={verifyModalOpen}
          onClose={() => setVerifyModalOpen(false)}
          title={`Physical Condition Verification for Order ${selectedRTO.orderId?.orderNumber}`}
          subtitle="Non-destructive stock recovery workflow"
          maxWidth="max-w-md"
          icon="📦"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              verifyMutation.mutate({
                id: selectedRTO._id,
                data: { condition, notes }
              });
            }}
            className="space-y-4"
          >
            <Select
              label="Physical Condition Assessment *"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              options={[
                { value: 'SALEABLE', label: 'SALEABLE (Seal Intact — Restock to Available Inventory)' },
                { value: 'DAMAGED', label: 'DAMAGED (Seal Broken / Leakage — Record Damaged Stock)' },
                { value: 'MISSING', label: 'MISSING / TAMPERED (Log Audit Discrepancy)' }
              ]}
            />

            <Input
              label="Inspection Notes *"
              required
              placeholder="Outer packaging opened, bottles inspected and intact..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="secondary" type="button" onClick={() => setVerifyModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" isLoading={verifyMutation.isPending}>
                Execute Stock Recovery
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default RTOManagementPage;
