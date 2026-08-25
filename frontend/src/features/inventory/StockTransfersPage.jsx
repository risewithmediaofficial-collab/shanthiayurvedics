import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftRight, Plus, Send, CheckCircle2, Truck } from 'lucide-react';
import apiClient from '../../api/apiClient.js';
import { Table } from '../../components/common/Table.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { Modal } from '../../components/common/Modal.jsx';
import { Input } from '../../components/common/Input.jsx';
import { Select } from '../../components/common/Select.jsx';
import { Pagination } from '../../components/common/Pagination.jsx';

export function StockTransfersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const [fromBranchId, setFromBranchId] = useState('');
  const [toBranchId, setToBranchId] = useState('');
  const [productId, setProductId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');

  // Fetch branches
  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await apiClient.get('/branches');
      return res.data?.data || res.data || [];
    }
  });

  const branchesList = Array.isArray(branchesData)
    ? branchesData
    : Array.isArray(branchesData?.data)
    ? branchesData.data
    : [];

  // Fetch products
  const { data: productsData } = useQuery({
    queryKey: ['productsAll'],
    queryFn: async () => {
      const res = await apiClient.get('/products', { params: { limit: 100 } });
      return res.data?.data || [];
    }
  });

  // Fetch transfers
  const { data: transfersResponse, isLoading } = useQuery({
    queryKey: ['stockTransfers', page],
    queryFn: async () => {
      const res = await apiClient.get('/inventory/transfers', { params: { page, limit: 15 } });
      return res.data;
    }
  });

  const transfers = transfersResponse?.data || [];
  const meta = transfersResponse?.meta || { page: 1, totalPages: 1, total: 0 };

  const createMutation = useMutation({
    mutationFn: (data) => apiClient.post('/inventory/transfers', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['stockTransfers']);
      setCreateModalOpen(false);
      setQuantity('');
      setNotes('');
    }
  });

  const dispatchMutation = useMutation({
    mutationFn: (id) => apiClient.patch(`/inventory/transfers/${id}/dispatch`, { carrierDetails: 'Internal Van' }),
    onSuccess: () => queryClient.invalidateQueries(['stockTransfers'])
  });

  const receiveMutation = useMutation({
    mutationFn: (id) => apiClient.patch(`/inventory/transfers/${id}/receive`),
    onSuccess: () => {
      queryClient.invalidateQueries(['stockTransfers']);
      queryClient.invalidateQueries(['inventory']);
    }
  });

  const selectedProductObj = productsData?.find((p) => p._id === productId);

  const columns = [
    {
      header: 'Transfer Reference',
      cell: (row) => (
        <div>
          <div className="font-bold text-slate-900 font-mono text-xs">{row.transferNumber}</div>
          <div className="text-[10px] text-slate-500">{new Date(row.createdAt).toLocaleDateString()}</div>
        </div>
      )
    },
    {
      header: 'From Branch → To Branch',
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
          <span>{row.fromBranchId?.name}</span>
          <ArrowLeftRight className="w-3.5 h-3.5 text-slate-400" />
          <span>{row.toBranchId?.name}</span>
        </div>
      )
    },
    {
      header: 'Items',
      cell: (row) => (
        <div className="text-xs">
          {row.items?.map((item, idx) => (
            <div key={idx} className="text-slate-700">
              {item.quantity}x {item.productId?.name} ({item.batchId?.batchNumber})
            </div>
          ))}
        </div>
      )
    },
    {
      header: 'Status',
      cell: (row) => {
        if (row.status === 'RECEIVED') return <Badge variant="emerald">Received</Badge>;
        if (row.status === 'IN_TRANSIT') return <Badge variant="warning">In Transit</Badge>;
        return <Badge variant="primary">{row.status}</Badge>;
      }
    },
    {
      header: 'Actions',
      align: 'right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          {row.status === 'REQUESTED' && (
            <Button
              size="sm"
              variant="outline"
              icon={Send}
              onClick={() => dispatchMutation.mutate(row._id)}
            >
              Dispatch
            </Button>
          )}
          {row.status === 'IN_TRANSIT' && (
            <Button
              size="sm"
              variant="primary"
              icon={CheckCircle2}
              onClick={() => receiveMutation.mutate(row._id)}
            >
              Receive & Verify
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
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Inter-Branch Stock Transfers</h2>
          <p className="text-xs text-slate-500">Request, transit, and receipt confirmation across branches</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setCreateModalOpen(true)}>
          New Transfer Request
        </Button>
      </div>

      <Table
        columns={columns}
        data={transfers}
        isLoading={isLoading}
        emptyMessage="No stock transfers found."
      />

      <Pagination
        currentPage={page}
        totalPages={meta.totalPages}
        totalItems={meta.total}
        itemsPerPage={15}
        onPageChange={setPage}
      />

      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Request Inter-Branch Stock Transfer"
        subtitle="Reserve stock at source branch and initiate transfer protocol"
        maxWidth="max-w-lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate({
              fromBranchId,
              toBranchId,
              items: [{ productId, batchId, quantity: Number(quantity) }],
              notes
            });
          }}
          className="space-y-3.5"
        >
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Source (From Branch) *"
              required
              value={fromBranchId}
              onChange={(e) => setFromBranchId(e.target.value)}
              options={[
                { value: '', label: 'Select source branch...' },
                ...branchesList.map((b) => ({ value: b._id, label: `${b.name} (${b.code})` }))
              ]}
            />
            <Select
              label="Destination (To Branch) *"
              required
              value={toBranchId}
              onChange={(e) => setToBranchId(e.target.value)}
              options={[
                { value: '', label: 'Select destination...' },
                ...branchesList.filter((b) => b._id !== fromBranchId).map((b) => ({ value: b._id, label: `${b.name} (${b.code})` }))
              ]}
            />
          </div>

          <Select
            label="Product *"
            required
            value={productId}
            onChange={(e) => { setProductId(e.target.value); setBatchId(''); }}
            options={[
              { value: '', label: 'Select product...' },
              ...(productsData || []).map((p) => ({ value: p._id, label: `${p.name} (${p.sku})` }))
            ]}
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Batch Number *"
              required
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              options={[
                { value: '', label: 'Select batch...' },
                ...(selectedProductObj?.batches || []).map((b) => ({ value: b._id, label: b.batchNumber }))
              ]}
            />
            <Input
              label="Quantity *"
              type="number"
              min="1"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          <Input
            label="Transfer Reason / Notes"
            placeholder="Rebalancing warehouse inventory for festival season..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={createMutation.isPending}>
              Create Transfer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default StockTransfersPage;
