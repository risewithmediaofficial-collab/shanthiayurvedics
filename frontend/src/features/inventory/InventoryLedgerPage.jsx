import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Minus, SlidersHorizontal, ArrowLeftRight, History, Package, AlertTriangle, Pencil, Trash2, Search, X } from 'lucide-react';
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
import { exportToExcel, exportToCSV } from '../../utils/exportUtils.js';
import { DateRangeFilter } from '../../components/common/DateRangeFilter.jsx';
import { ExportButton } from '../../components/common/ExportButton.jsx';
import { SortDropdown } from '../../components/common/SortDropdown.jsx';

const INVENTORY_SORT_OPTIONS = [
  { value: 'productName', label: '📦 Product Name' },
  { value: 'availableQuantity', label: '📊 Available Stock' },
  { value: 'reservedQuantity', label: '🔒 Reserved Stock' },
  { value: 'updatedAt', label: '⏱️ Last Updated' }
];

const MOVEMENT_SORT_OPTIONS = [
  { value: 'createdAt', label: '📅 Movement Date' },
  { value: 'quantity', label: '🔢 Quantity' },
  { value: 'type', label: '🏷️ Movement Type' }
];

export function InventoryLedgerPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const { selectedBranchId } = useBranch();

  const [activeTab, setActiveTab] = useState('CURRENT'); // 'CURRENT' | 'MOVEMENTS'
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('productName');
  const [sortOrder, setSortOrder] = useState('asc');

  // Modals
  const [stockInModalOpen, setStockInModalOpen] = useState(false);
  const [stockOutModalOpen, setStockOutModalOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  const [formData, setFormData] = useState({
    productId: '',
    batchId: '',
    branchId: '',
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
    queryKey: ['inventory', page, search, startDate, endDate, sortBy, sortOrder, selectedBranchId],
    queryFn: async () => {
      const params = { page, limit: 15, sortBy, sortOrder };
      if (search?.trim()) params.search = search.trim();
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await apiClient.get('/inventory', { params });
      return res.data;
    },
    enabled: activeTab === 'CURRENT'
  });

  // Fetch Movements Ledger
  const { data: movementsResponse, isLoading: isMovLoading } = useQuery({
    queryKey: ['inventoryMovements', page, startDate, endDate, sortBy, sortOrder, selectedBranchId],
    queryFn: async () => {
      const params = { page, limit: 15, sortBy, sortOrder };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await apiClient.get('/inventory/movements', { params });
      return res.data;
    },
    enabled: activeTab === 'MOVEMENTS'
  });

  const inventory = invResponse?.data || [];
  const movements = movementsResponse?.data || [];
  const meta = (activeTab === 'CURRENT' ? invResponse?.meta : movementsResponse?.meta) || { page: 1, totalPages: 1, total: 0 };

  const handleExportInventory = async (format = 'excel') => {
    try {
      setActionMsg('⏳ Preparing inventory data for export...');
      if (activeTab === 'CURRENT') {
        const params = { export: true, sortBy, sortOrder };
        if (search?.trim()) params.search = search.trim();
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;

        const res = await apiClient.get('/inventory', { params });
        const list = res.data?.data || inventory;

        const rows = list.map((item, idx) => ({
          'S.No': idx + 1,
          'Product Name': item.productId?.name || '—',
          'SKU': item.productId?.sku || '—',
          'Category': item.productId?.category || '—',
          'Batch Number': item.batchId?.batchNumber || '—',
          'Expiry Date': item.batchId?.expiryDate ? new Date(item.batchId.expiryDate).toLocaleDateString('en-GB') : '—',
          'Unit Price (₹)': item.productId?.price || 0,
          'Available Units': item.availableQuantity || 0,
          'Reserved Units': item.reservedQuantity || 0,
          'Stock Value (₹)': ((item.availableQuantity || 0) * (item.productId?.price || 0)).toFixed(2),
          'Branch': item.branchId?.name || 'Hosur Main Hub'
        }));

        const filePrefix = `Shanthi_Inventory_Stock_${startDate ? `${startDate}_to_${endDate || 'today'}` : 'Current'}`;
        if (format === 'excel') exportToExcel(rows, filePrefix, 'Stock_Ledger');
        else exportToCSV(rows, filePrefix);
      } else {
        const params = { export: true, sortBy, sortOrder };
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;

        const res = await apiClient.get('/inventory/movements', { params });
        const list = res.data?.data || movements;

        const rows = list.map((m, idx) => ({
          'S.No': idx + 1,
          'Date': new Date(m.createdAt).toLocaleDateString('en-GB'),
          'Product': m.productId?.name || '—',
          'Type': m.type || '—',
          'Quantity': m.quantity || 0,
          'Batch': m.batchId?.batchNumber || '—',
          'Reason / Reference': m.reason || m.notes || '—',
          'Performed By': m.performedBy?.name || 'Admin',
          'Branch': m.branchId?.name || 'Hosur'
        }));

        const filePrefix = `Shanthi_Stock_Movements_${startDate ? `${startDate}_to_${endDate || 'today'}` : 'All'}`;
        if (format === 'excel') exportToExcel(rows, filePrefix, 'Stock_Movements');
        else exportToCSV(rows, filePrefix);
      }
      setActionMsg('✓ Export completed successfully');
      setTimeout(() => setActionMsg(''), 4000);
    } catch (err) {
      console.error('Inventory export error:', err);
      setActionMsg('⚠️ Failed to export inventory');
      setTimeout(() => setActionMsg(''), 4000);
    }
  };

  const stockInMutation = useMutation({
    mutationFn: (data) => apiClient.post('/inventory/in', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['inventory']);
      queryClient.invalidateQueries(['inventoryMovements']);
      setStockInModalOpen(false);
      setFormData({ productId: '', batchId: '', quantity: '', reason: 'PURCHASE', notes: '', newAvailable: '' });
    },
    onError: (err) => {
      setActionMsg(`⚠ ${err.response?.data?.message || 'Failed to record stock in'}`);
    }
  });

  const stockOutMutation = useMutation({
    mutationFn: (data) => apiClient.post('/inventory/out', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['inventory']);
      queryClient.invalidateQueries(['inventoryMovements']);
      setStockOutModalOpen(false);
      setFormData({ productId: '', batchId: '', quantity: '', reason: 'PURCHASE', notes: '', newAvailable: '' });
    },
    onError: (err) => {
      setActionMsg(`⚠ ${err.response?.data?.message || 'Failed to record stock out'}`);
    }
  });

  const adjustMutation = useMutation({
    mutationFn: (data) => apiClient.post('/inventory/adjust', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['inventory']);
      queryClient.invalidateQueries(['inventoryMovements']);
      setAdjustModalOpen(false);
      setFormData({ productId: '', batchId: '', quantity: '', reason: 'PURCHASE', notes: '', newAvailable: '' });
    },
    onError: (err) => {
      setActionMsg(`⚠ ${err.response?.data?.message || 'Failed to adjust stock'}`);
    }
  });

  const selectedProductObj = productsData?.find((p) => p._id === formData.productId);
  const writeBranchId = selectedBranchId !== 'ALL' ? selectedBranchId : formData.branchId;

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
    },
    {
      header: 'Actions',
      align: 'right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => {
              setFormData({
                productId: row.productId?._id || '',
                batchId: row.batchId?._id || '',
                branchId: row.branchId?._id || row.branchId || '',
                quantity: '',
                reason: 'PHYSICAL_AUDIT',
                notes: `Audited from current available ${row.availableQuantity}`,
                newAvailable: row.availableQuantity
              });
              setAdjustModalOpen(true);
            }}
            title="Edit / Adjust Stock Level"
            className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors flex items-center cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setFormData({
                productId: row.productId?._id || '',
                batchId: row.batchId?._id || '',
                branchId: row.branchId?._id || row.branchId || '',
                quantity: '',
                reason: 'DAMAGED',
                notes: '',
                newAvailable: ''
              });
              setStockOutModalOpen(true);
            }}
            title="Remove / Stock Out"
            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold transition-colors flex items-center cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
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

      {actionMsg && (
        <div className={`px-4 py-2.5 border text-sm font-semibold rounded-xl ${
          actionMsg.startsWith('⚠')
            ? 'bg-rose-50 border-rose-200 text-rose-700'
            : 'bg-emerald-50 border-emerald-200 text-emerald-700'
        }`}>
          {actionMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => { setActiveTab('CURRENT'); setPage(1); setSortBy('productName'); }}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'CURRENT' ? 'bg-ayur-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          📦 Available Stock Matrix
        </button>
        <button
          onClick={() => { setActiveTab('MOVEMENTS'); setPage(1); setSortBy('createdAt'); }}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'MOVEMENTS' ? 'bg-ayur-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          📜 Transaction Movements Ledger
        </button>
      </div>

      {/* Search, Filter, Sort & Export Toolbar */}
      <div className="bento-card p-3 flex flex-wrap items-center gap-2.5">
        {activeTab === 'CURRENT' && (
          <div className="flex-1 min-w-[200px] relative">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search product name or SKU..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:border-ayur-600 transition-colors"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>
        )}

        {/* Date to Date Range Filter */}
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onChange={({ startDate: s, endDate: e }) => {
            setStartDate(s);
            setEndDate(e);
            setPage(1);
          }}
          label={activeTab === 'CURRENT' ? 'Updated Between' : 'Movement Date'}
        />

        {/* Dynamic Sort Dropdown */}
        <SortDropdown
          options={activeTab === 'CURRENT' ? INVENTORY_SORT_OPTIONS : MOVEMENT_SORT_OPTIONS}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={(field, order) => {
            setSortBy(field);
            setSortOrder(order);
            setPage(1);
          }}
        />

        {/* Direct Export Button */}
        <ExportButton
          onExport={handleExportInventory}
          label="Export Ledger"
        />

        {/* Reset Filter Button */}
        {(search || startDate || endDate || (activeTab === 'CURRENT' ? sortBy !== 'productName' : sortBy !== 'createdAt')) && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setStartDate('');
              setEndDate('');
              setSortBy(activeTab === 'CURRENT' ? 'productName' : 'createdAt');
              setSortOrder('asc');
              setPage(1);
            }}
            className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
            title="Reset filters"
          >
            <X className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        )}
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
            if (!writeBranchId) {
              setActionMsg('⚠ Select a specific branch before recording stock.');
              return;
            }
            stockInMutation.mutate({
              productId: formData.productId,
              batchId: formData.batchId,
              branchId: writeBranchId,
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
            if (!writeBranchId) {
              setActionMsg('⚠ Select a specific branch before adjusting stock.');
              return;
            }
            adjustMutation.mutate({
              productId: formData.productId,
              batchId: formData.batchId,
              branchId: writeBranchId,
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
