import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Minus, SlidersHorizontal, ArrowLeftRight, History, Package, AlertTriangle } from 'lucide-react';
import apiClient from '../../api/apiClient.js';
import { usePermissions } from '../../hooks/usePermissions.js';
import { useBranch } from '../../context/BranchContext.jsx';
import { Table } from '../../components/common/Table.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Input } from '../../components/common/Input.jsx';
import { Select } from '../../components/common/Select.jsx';
import { Modal } from '../../components/common/Modal.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { Pagination } from '../../components/common/Pagination.jsx';

export function InventoryLedgerPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const { selectedBranchId } = useBranch();

  const [activeTab, setActiveTab] = useState('CURRENT'); // 'CURRENT' | 'MOVEMENTS'
  const [page, setPage] = useState(1);

  // Modals
  const [stockInModalOpen, setStockInModalOpen] = useState(false);
  const [stockOutModalOpen, setStockOutModalOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    productId: '',
    batchId: '',
    quantity: '',
    reason: 'PURCHASE',
    notes: '',
    newAvailable: ''
  });

  // Fetch Products & Batches for dropdowns
  const { data: productsData } = useQuery({
    queryKey: ['productsAll'],
    queryFn: async () => {
      const res = await apiClient.get('/products', { params: { limit: 100 } });
      return res.data?.data || [];
    }
  });

  // Fetch Current Inventory
  const { data: invResponse, isLoading: isInvLoading } = useQuery({
    queryKey: ['inventory', page, selectedBranchId],
    queryFn: async () => {
      const res = await apiClient.get('/inventory', { params: { page, limit: 15 } });
      return res.data;
    },
    enabled: activeTab === 'CURRENT'
  });

  // Fetch Movements Ledger
  const { data: movementsResponse, isLoading: isMovLoading } = useQuery({
    queryKey: ['inventoryMovements', page, selectedBranchId],
    queryFn: async () => {
      const res = await apiClient.get('/inventory/movements', { params: { page, limit: 15 } });
      return res.data;
    },
    enabled: activeTab === 'MOVEMENTS'
  });

  const inventory = invResponse?.data || [];
  const movements = movementsResponse?.data || [];
  const meta = (activeTab === 'CURRENT' ? invResponse?.meta : movementsResponse?.meta) || { page: 1, totalPages: 1, total: 0 };

  const stockInMutation = useMutation({
    mutationFn: (data) => apiClient.post('/inventory/in', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['inventory']);
      queryClient.invalidateQueries(['inventoryMovements']);
      setStockInModalOpen(false);
      setFormData({ productId: '', batchId: '', quantity: '', reason: 'PURCHASE', notes: '', newAvailable: '' });
    }
  });

  const stockOutMutation = useMutation({
    mutationFn: (data) => apiClient.post('/inventory/out', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['inventory']);
      queryClient.invalidateQueries(['inventoryMovements']);
      setStockOutModalOpen(false);
      setFormData({ productId: '', batchId: '', quantity: '', reason: 'PURCHASE', notes: '', newAvailable: '' });
    }
  });

  const adjustMutation = useMutation({
    mutationFn: (data) => apiClient.post('/inventory/adjust', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['inventory']);
      queryClient.invalidateQueries(['inventoryMovements']);
      setAdjustModalOpen(false);
      setFormData({ productId: '', batchId: '', quantity: '', reason: 'PURCHASE', notes: '', newAvailable: '' });
    }
  });

  const selectedProductObj = productsData?.find((p) => p._id === formData.productId);

  const invColumns = [
    {
      header: 'Product & SKU',
      cell: (row) => (
        <div>
          <div className="font-bold text-slate-900">{row.productId?.name}</div>
          <div className="text-xs text-slate-500 font-mono">{row.productId?.sku}</div>
        </div>
      )
    },
    {
      header: 'Batch Number',
      cell: (row) => (
        <div>
          <span className="font-mono text-xs font-semibold text-slate-800">{row.batchId?.batchNumber}</span>
          <div className="text-[10px] text-slate-400">Exp: {new Date(row.batchId?.expiryDate).toLocaleDateString()}</div>
        </div>
      )
    },
    {
      header: 'Branch',
      cell: (row) => <Badge variant="neutral" size="sm">{row.branchId?.name}</Badge>
    },
    {
      header: 'Available Stock',
      cell: (row) => (
        <span className={`font-black text-sm ${row.availableQuantity <= (row.productId?.lowStockThreshold || 10) ? 'text-rose-600' : 'text-emerald-700'}`}>
          {row.availableQuantity}
        </span>
      )
    },
    {
      header: 'Reserved',
      cell: (row) => <span className="text-xs font-semibold text-amber-700">{row.reservedQuantity}</span>
    },
    {
      header: 'Damaged',
      cell: (row) => <span className="text-xs text-slate-400">{row.damagedQuantity || 0}</span>
    }
  ];

  const movColumns = [
    {
      header: 'Date & Time',
      cell: (row) => (
        <div className="text-xs text-slate-600">
          {new Date(row.timestamp).toLocaleDateString()} {new Date(row.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      )
    },
    {
      header: 'Type',
      cell: (row) => {
        let variant = 'neutral';
        if (row.type === 'IN' || row.type === 'RETURN') variant = 'success';
        if (row.type === 'OUT' || row.type === 'DAMAGE') variant = 'danger';
        if (row.type === 'RESERVE') variant = 'warning';
        return <Badge variant={variant} size="sm">{row.type}</Badge>;
      }
    },
    {
      header: 'Product & Batch',
      cell: (row) => (
        <div className="text-xs">
          <span className="font-semibold text-slate-900">{row.productId?.name}</span>
          <span className="text-slate-500 font-mono ml-1">({row.batchId?.batchNumber})</span>
        </div>
      )
    },
    {
      header: 'Quantity Delta',
      cell: (row) => (
        <div className="text-xs font-bold font-mono">
          {row.quantity} units
        </div>
      )
    },
    {
      header: 'Stock Before → After',
      cell: (row) => (
        <div className="text-xs font-mono text-slate-600">
          {row.previousAvailable} → <span className="font-bold text-slate-900">{row.newAvailable}</span>
        </div>
      )
    },
    {
      header: 'Reason & Notes',
      cell: (row) => (
        <div className="text-xs text-slate-500 max-w-xs truncate">
          <span className="font-semibold text-slate-700">{row.reason}:</span> {row.notes || '—'}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Multi-Branch Inventory & Stock Ledger</h2>
          <p className="text-xs text-slate-500">Atomic ledger movements, purchase stock-in, and audit logging</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" icon={Minus} onClick={() => setStockOutModalOpen(true)}>
            Stock Out
          </Button>
          <Button variant="outline" icon={SlidersHorizontal} onClick={() => setAdjustModalOpen(true)}>
            Adjust Stock
          </Button>
          <Button variant="primary" icon={Plus} onClick={() => setStockInModalOpen(true)}>
            Stock In
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => { setActiveTab('CURRENT'); setPage(1); }}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'CURRENT' ? 'bg-ayur-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          📦 Available Stock Matrix
        </button>
        <button
          onClick={() => { setActiveTab('MOVEMENTS'); setPage(1); }}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'MOVEMENTS' ? 'bg-ayur-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          📜 Transaction Movements Ledger
        </button>
      </div>

      <Table
        columns={activeTab === 'CURRENT' ? invColumns : movColumns}
        data={activeTab === 'CURRENT' ? inventory : movements}
        isLoading={activeTab === 'CURRENT' ? isInvLoading : isMovLoading}
        emptyMessage="No inventory records found."
      />

      <Pagination
        currentPage={page}
        totalPages={meta.totalPages}
        totalItems={meta.total}
        itemsPerPage={15}
        onPageChange={setPage}
      />

      {/* Stock In Modal */}
      <Modal
        isOpen={stockInModalOpen}
        onClose={() => setStockInModalOpen(false)}
        title="Stock In (Physical Stock Addition)"
        subtitle="Record new factory shipments or supplier purchase intake"
        maxWidth="max-w-md"
        icon="📥"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            stockInMutation.mutate({
              productId: formData.productId,
              batchId: formData.batchId,
              quantity: Number(formData.quantity),
              reason: formData.reason,
              notes: formData.notes
            });
          }}
          className="space-y-3.5"
        >
          <Select
            label="Select Product *"
            required
            value={formData.productId}
            onChange={(e) => setFormData({ ...formData, productId: e.target.value, batchId: '' })}
            options={[
              { value: '', label: 'Select a product...' },
              ...(productsData || []).map((p) => ({ value: p._id, label: `${p.name} (${p.sku})` }))
            ]}
          />

          <Select
            label="Select Batch *"
            required
            value={formData.batchId}
            onChange={(e) => setFormData({ ...formData, batchId: e.target.value })}
            options={[
              { value: '', label: 'Select batch...' },
              ...(selectedProductObj?.batches || []).map((b) => ({
                value: b._id,
                label: `${b.batchNumber} (Exp: ${new Date(b.expiryDate).toLocaleDateString()})`
              }))
            ]}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Quantity to Add *"
              type="number"
              min="1"
              required
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
            />
            <Select
              label="Reason *"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              options={[
                { value: 'PURCHASE', label: 'Supplier Purchase' },
                { value: 'PRODUCTION', label: 'Factory Production' },
                { value: 'INITIAL_STOCK', label: 'Initial Baseline' }
              ]}
            />
          </div>

          <Input
            label="Invoice / GRN Notes"
            placeholder="e.g. GRN-2026-992 from Mysore unit"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="secondary" type="button" onClick={() => setStockInModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={stockInMutation.isPending}>
              Record Stock In
            </Button>
          </div>
        </form>
      </Modal>

      {/* Adjust Modal */}
      <Modal
        isOpen={adjustModalOpen}
        onClose={() => setAdjustModalOpen(false)}
        title="Stock Adjustment (Cycle Count)"
        subtitle="Recalibrate physical on-hand quantity after physical count"
        maxWidth="max-w-md"
        icon="⚖️"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            adjustMutation.mutate({
              productId: formData.productId,
              batchId: formData.batchId,
              newAvailable: Number(formData.newAvailable),
              reason: 'PHYSICAL_VERIFICATION',
              notes: formData.notes
            });
          }}
          className="space-y-3.5"
        >
          <Select
            label="Select Product *"
            required
            value={formData.productId}
            onChange={(e) => setFormData({ ...formData, productId: e.target.value, batchId: '' })}
            options={[
              { value: '', label: 'Select a product...' },
              ...(productsData || []).map((p) => ({ value: p._id, label: `${p.name} (${p.sku})` }))
            ]}
          />

          <Select
            label="Select Batch *"
            required
            value={formData.batchId}
            onChange={(e) => setFormData({ ...formData, batchId: e.target.value })}
            options={[
              { value: '', label: 'Select batch...' },
              ...(selectedProductObj?.batches || []).map((b) => ({
                value: b._id,
                label: `${b.batchNumber} (Exp: ${new Date(b.expiryDate).toLocaleDateString()})`
              }))
            ]}
          />

          <Input
            label="New Actual Available Count *"
            type="number"
            min="0"
            required
            value={formData.newAvailable}
            onChange={(e) => setFormData({ ...formData, newAvailable: e.target.value })}
          />

          <Input
            label="Reason & Auditor Notes *"
            required
            placeholder="Audit discrepancy reconciliation..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="secondary" type="button" onClick={() => setAdjustModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={adjustMutation.isPending}>
              Apply Adjustment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default InventoryLedgerPage;
