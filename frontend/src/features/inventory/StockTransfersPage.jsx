import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftRight, Plus, Send, CheckCircle2, Truck, Trash2, Package } from 'lucide-react';
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
  const [transferItems, setTransferItems] = useState([
    { productId: '', quantity: 1 }
  ]);
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
      const _rd = res.data?.data; return Array.isArray(_rd) ? _rd : [];
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

  const transfers = Array.isArray(transfersResponse?.data) ? transfersResponse?.data : [];
  const meta = transfersResponse?.pagination || transfersResponse?.meta || { page: 1, totalPages: 1, total: 0 };

  const createMutation = useMutation({
    mutationFn: (data) => apiClient.post('/inventory/transfers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stockTransfers'] });
      setCreateModalOpen(false);
      setTransferItems([{ productId: '', quantity: 1 }]);
      setNotes('');
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to request stock transfer');
    }
  });

  const dispatchMutation = useMutation({
    mutationFn: (id) => apiClient.patch(`/inventory/transfers/${id}/dispatch`, { carrierDetails: 'Internal Van' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stockTransfers'] })
  });

  const receiveMutation = useMutation({
    mutationFn: (id) => apiClient.patch(`/inventory/transfers/${id}/receive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stockTransfers'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    }
  });

  const handleAddItem = () => {
    setTransferItems((prev) => [...prev, { productId: '', quantity: 1 }]);
  };

  const handleRemoveItem = (index) => {
    if (transferItems.length <= 1) return;
    setTransferItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index, field, value) => {
    setTransferItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

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
              {item.quantity}x {item.productId?.name || 'Ayurvedic Product'}
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
        subtitle="Reserve stock at source branch and transfer multiple products across branches"
        maxWidth="max-w-xl"
        icon="🔄"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const validItems = transferItems
              .filter((i) => i.productId && Number(i.quantity) > 0)
              .map((i) => ({ productId: i.productId, quantity: Number(i.quantity) }));

            if (validItems.length === 0) {
              alert('Please select at least one product with a valid quantity');
              return;
            }

            createMutation.mutate({
              fromBranchId,
              toBranchId,
              items: validItems,
              notes
            });
          }}
          className="space-y-4 max-h-[80vh] overflow-y-auto px-1 pr-1.5"
        >
          {/* Branch Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

          {/* Multiple Products Selection */}
          <div className="space-y-2.5 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-emerald-600" />
                <span>Products to Transfer ({transferItems.length}) *</span>
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Product</span>
              </button>
            </div>

            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {transferItems.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-2xs">
                  <div className="flex-1">
                    <Select
                      label={idx === 0 ? "Product *" : ""}
                      required
                      value={item.productId}
                      onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                      options={[
                        { value: '', label: 'Select product...' },
                        ...(productsData || []).map((p) => ({
                          value: p._id,
                          label: `${p.name} (${p.sku || 'SKU'})`
                        }))
                      ]}
                    />
                  </div>
                  <div className="w-28 shrink-0">
                    <Input
                      label={idx === 0 ? "Quantity *" : ""}
                      type="number"
                      min="1"
                      required
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                    />
                  </div>
                  {transferItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className={`p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0 ${idx === 0 ? 'mt-5' : 'mt-1'}`}
                      title="Remove product"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Input
            label="Transfer Reason / Notes"
            placeholder="Rebalancing warehouse inventory for festival season..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-slate-100 sticky bottom-0 bg-white py-1">
            <Button variant="outline" type="button" className="w-full sm:w-auto" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" className="w-full sm:w-auto" isLoading={createMutation.isPending}>
              Create Transfer ({transferItems.filter(i => i.productId).length} items)
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default StockTransfersPage;
