import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { selectedBranchId, availableBranches = [] } = useBranch();

  const [activeTab, setActiveTab] = useState('CURRENT'); // 'CURRENT' | 'MOVEMENTS'
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('productName');
  const [sortOrder, setSortOrder] = useState('asc');

  // Unified Stock Modal
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [stockModalMode, setStockModalMode] = useState('IN'); // 'IN' | 'ADJUST' | 'OUT'
  const [deleteStockModalOpen, setDeleteStockModalOpen] = useState(false);
  const [stockItemToDelete, setStockItemToDelete] = useState(null);
  const [actionMsg, setActionMsg] = useState('');

  const [formData, setFormData] = useState({
    inventoryId: '',
    productId: '',
    productName: '',
    productSku: '',
    branchId: '',
    currentAvailable: 0,
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
      const _rd = res.data?.data; return Array.isArray(_rd) ? _rd : [];
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

  const inventory = Array.isArray(invResponse?.data) ? invResponse?.data : [];
  const movements = Array.isArray(movementsResponse?.data) ? movementsResponse?.data : [];
  const meta = (activeTab === 'CURRENT' ? invResponse?.pagination || invResponse?.meta : movementsResponse?.pagination || movementsResponse?.meta) || { page: 1, totalPages: 1, total: 0 };

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

  const stockMutation = useMutation({
    mutationFn: async ({ mode, payload }) => {
      if (mode === 'IN') {
        return apiClient.post('/inventory/in', payload);
      } else if (mode === 'OUT') {
        return apiClient.post('/inventory/out', payload);
      } else {
        return apiClient.post('/inventory/adjust', payload);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryMovements'] });
      setStockModalOpen(false);
      const actionLabel =
        variables.mode === 'IN'
          ? 'Stock In (+)'
          : variables.mode === 'OUT'
          ? 'Stock Out (-)'
          : 'Stock count adjusted (=)';
      setActionMsg(`✓ ${actionLabel} recorded successfully`);
      setTimeout(() => setActionMsg(''), 4000);
    },
    onError: (err) => {
      setActionMsg(`⚠ ${err.response?.data?.message || 'Failed to update stock'}`);
      setTimeout(() => setActionMsg(''), 6000);
    }
  });

  const deleteStockMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`/inventory/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryMovements'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setDeleteStockModalOpen(false);
      setStockItemToDelete(null);
      setActionMsg('✓ Stock item removed from matrix successfully');
      setTimeout(() => setActionMsg(''), 4000);
    },
    onError: (err) => {
      setActionMsg(`⚠ ${err.response?.data?.message || 'Failed to delete stock item'}`);
      setTimeout(() => setActionMsg(''), 4000);
    }
  });

  const handleStockSubmit = (e) => {
    e.preventDefault();
    if (!formData.productId) {
      setActionMsg('⚠ Please select a product');
      setTimeout(() => setActionMsg(''), 4000);
      return;
    }

    const payload = {
      inventoryId: formData.inventoryId || undefined,
      productId: formData.productId,
      branchId: formData.branchId || (availableBranches[0]?._id ? String(availableBranches[0]._id) : undefined),
      reason: formData.reason,
      notes: formData.notes
    };

    if (stockModalMode === 'IN') {
      const qty = parseInt(formData.quantity, 10);
      if (!qty || qty <= 0) {
        setActionMsg('⚠ Please enter a valid quantity to add');
        setTimeout(() => setActionMsg(''), 4000);
        return;
      }
      payload.quantity = qty;
    } else if (stockModalMode === 'OUT') {
      const qty = parseInt(formData.quantity, 10);
      if (!qty || qty <= 0) {
        setActionMsg('⚠ Please enter a valid quantity to remove');
        setTimeout(() => setActionMsg(''), 4000);
        return;
      }
      payload.quantity = qty;
    } else {
      // ADJUST mode
      const newAvail = parseInt(formData.newAvailable, 10);
      if (isNaN(newAvail) || newAvail < 0) {
        setActionMsg('⚠ Please enter a valid available stock count (0 or higher)');
        setTimeout(() => setActionMsg(''), 4000);
        return;
      }
      payload.newAvailable = newAvail;
      payload.newAvailableQuantity = newAvail;
    }

    stockMutation.mutate({ mode: stockModalMode, payload });
  };

  const openStockModal = (mode = 'IN', row = null) => {
    setStockModalMode(mode);
    if (row) {
      const bId = row.branchId?._id || (typeof row.branchId === 'string' ? row.branchId : '') || (selectedBranchId !== 'ALL' ? selectedBranchId : (availableBranches[0]?._id ? String(availableBranches[0]._id) : ''));
      setFormData({
        inventoryId: row._id || '',
        productId: row.productId?._id || row.productId || '',
        productName: row.productId?.name || '',
        productSku: row.productId?.sku || '',
        branchId: bId,
        currentAvailable: Number(row.availableQuantity || 0),
        quantity: '',
        reason: mode === 'IN' ? 'PURCHASE' : mode === 'OUT' ? 'DAMAGED' : 'PHYSICAL_VERIFICATION',
        notes: '',
        newAvailable: row.availableQuantity != null ? String(row.availableQuantity) : '0'
      });
    } else {
      const firstProd = productsData?.[0];
      const defaultBranch = selectedBranchId !== 'ALL' ? selectedBranchId : (availableBranches[0]?._id ? String(availableBranches[0]._id) : '');
      const existingMatch = firstProd ? inventory.find(inv => (inv.productId?._id || inv.productId) === firstProd._id) : null;
      setFormData({
        inventoryId: existingMatch?._id || '',
        productId: firstProd?._id || '',
        productName: firstProd?.name || '',
        productSku: firstProd?.sku || '',
        branchId: defaultBranch,
        currentAvailable: existingMatch ? Number(existingMatch.availableQuantity || 0) : 0,
        quantity: '',
        reason: mode === 'IN' ? 'PURCHASE' : mode === 'OUT' ? 'DAMAGED' : 'PHYSICAL_VERIFICATION',
        notes: '',
        newAvailable: existingMatch ? String(existingMatch.availableQuantity || 0) : '0'
      });
    }
    setStockModalOpen(true);
  };

  const handleProductSelect = (selectedProdId) => {
    const prodObj = (productsData || []).find(p => p._id === selectedProdId);
    const existing = inventory.find(inv => (inv.productId?._id || inv.productId) === selectedProdId);
    setFormData(prev => ({
      ...prev,
      productId: selectedProdId,
      productName: prodObj?.name || '',
      productSku: prodObj?.sku || '',
      inventoryId: existing?._id || '',
      currentAvailable: existing ? Number(existing.availableQuantity || 0) : 0,
      newAvailable: existing ? String(existing.availableQuantity || 0) : '0'
    }));
  };

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
      header: 'Branch',
      cell: (row) => (
        <Badge variant="neutral" size="sm">
          {row.branchId?.name || availableBranches[0]?.name || 'Hosur Main Hub'}
        </Badge>
      )
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
            onClick={() => openStockModal('IN', row)}
            title="Stock In: Add new purchase or shipment units to this product (+)"
            className="px-2 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer border border-emerald-200/80 shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="text-[11px]">Stock In</span>
          </button>
          <button
            type="button"
            onClick={() => openStockModal('ADJUST', row)}
            title="Adjust Stock: Recalibrate actual count to match physical shelf audit (=)"
            className="px-2 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer border border-blue-200/80 shadow-2xs"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="text-[11px]">Adjust</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setStockItemToDelete(row);
              setDeleteStockModalOpen(true);
            }}
            title="Delete Stock Item"
            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold transition-colors flex items-center cursor-pointer border border-red-200/60 shadow-2xs"
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
      header: 'Product & SKU',
      cell: (row) => (
        <div className="text-xs">
          <span className="font-semibold text-slate-900">{row.productId?.name}</span>
          {row.productId?.sku && <span className="text-slate-500 font-mono ml-1">({row.productId.sku})</span>}
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

  // Live calculation helpers for modal
  const currentAvailableNum = Number(formData.currentAvailable || 0);
  const inputQtyNum = parseInt(formData.quantity, 10) || 0;
  const inputNewAvailNum = formData.newAvailable !== '' ? parseInt(formData.newAvailable, 10) : currentAvailableNum;

  let previewNewCount = currentAvailableNum;
  let formulaDisplay = '';
  let previewBadgeClass = 'bg-slate-50 border-slate-200 text-slate-800';

  if (stockModalMode === 'IN') {
    previewNewCount = currentAvailableNum + inputQtyNum;
    formulaDisplay = `${currentAvailableNum} current + ${inputQtyNum} incoming = ${previewNewCount} total`;
    previewBadgeClass = 'bg-emerald-50/80 border-emerald-200 text-emerald-900';
  } else if (stockModalMode === 'OUT') {
    previewNewCount = Math.max(0, currentAvailableNum - inputQtyNum);
    formulaDisplay = `${currentAvailableNum} current - ${inputQtyNum} deduction = ${previewNewCount} remaining`;
    previewBadgeClass = 'bg-rose-50/80 border-rose-200 text-rose-900';
  } else {
    // ADJUST mode
    const diff = (isNaN(inputNewAvailNum) ? currentAvailableNum : inputNewAvailNum) - currentAvailableNum;
    previewNewCount = isNaN(inputNewAvailNum) ? currentAvailableNum : inputNewAvailNum;
    formulaDisplay = `${currentAvailableNum} current → ${previewNewCount} physical audit (${diff >= 0 ? `+${diff}` : diff} adjustment)`;
    previewBadgeClass = 'bg-blue-50/80 border-blue-200 text-blue-900';
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Multi-Branch Inventory & Stock Ledger</h2>
          <p className="text-xs text-slate-500">Atomic ledger movements, purchase stock-in, and audit logging</p>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
          <Button
            variant="secondary"
            icon={Package}
            onClick={() => navigate('/products')}
            className="col-span-2 sm:col-auto bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold shadow-2xs cursor-pointer justify-center"
          >
            📦 Master Products Catalog →
          </Button>
          <Button variant="outline" icon={Minus} onClick={() => openStockModal('OUT')} className="justify-center text-xs">
            Stock Out (-)
          </Button>
          <Button variant="outline" icon={SlidersHorizontal} onClick={() => openStockModal('ADJUST')} className="justify-center text-xs">
            Adjust Stock (=)
          </Button>
          <Button variant="primary" icon={Plus} onClick={() => openStockModal('IN')} className="col-span-2 sm:col-auto justify-center text-xs">
            Stock In
          </Button>
        </div>
      </div>

      {/* Visual Guide Banner explaining Stock In vs Adjust Stock */}
      <div className="p-3 bg-gradient-to-r from-emerald-50/90 via-teal-50/90 to-blue-50/90 border border-emerald-200/80 rounded-xl text-xs text-slate-700 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-start sm:items-center gap-2.5">
          <span className="text-lg shrink-0">💡</span>
          <div>
            <span className="font-bold text-slate-900">Understanding Stock Actions:</span>
            <span className="ml-1.5">
              Use <strong className="text-emerald-800 bg-emerald-100/80 px-1.5 py-0.5 rounded font-semibold">+ Stock In</strong> to <em>add incoming units</em> (supplier purchases or factory shipments) to current inventory.
              Use <strong className="text-blue-800 bg-blue-100/80 px-1.5 py-0.5 rounded font-semibold">⚖️ Adjust Stock</strong> to <em>recalibrate the exact total count</em> to match physical shelf audits.
            </span>
          </div>
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
      <div className="crm-table-wrap flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto scrollbar-none whitespace-nowrap">
        <button
          onClick={() => { setActiveTab('CURRENT'); setPage(1); setSortBy('productName'); }}
          className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all ${
            activeTab === 'CURRENT' ? 'bg-ayur-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          📦 Available Stock Matrix
        </button>
        <button
          onClick={() => { setActiveTab('MOVEMENTS'); setPage(1); setSortBy('createdAt'); }}
          className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all ${
            activeTab === 'MOVEMENTS' ? 'bg-ayur-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          📜 Transaction Movements Ledger
        </button>
      </div>

      {/* Search, Filter, Sort & Export Toolbar */}
      <div className="bento-card p-2.5 sm:p-3 space-y-2.5">
        {/* Row 1: Search bar (full width) */}
        {activeTab === 'CURRENT' && (
          <div className="relative w-full">
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

        {/* Row 2: Date presets, Sort & Export */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
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

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 flex-wrap">
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

            <ExportButton
              onExport={handleExportInventory}
              disabled={(activeTab === 'CURRENT' ? inventory : movements).length === 0}
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
                className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                title="Reset filters"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table with horizontal scroll on mobile */}
      <div className="crm-table-wrap w-full max-w-full overflow-x-auto -mx-0 rounded-2xl">
        <Table
          columns={activeTab === 'CURRENT' ? invColumns : movColumns}
          data={activeTab === 'CURRENT' ? inventory : movements}
          isLoading={activeTab === 'CURRENT' ? isInvLoading : isMovLoading}
          emptyMessage="No inventory records found."
        />
      </div>

      <Pagination
        currentPage={page}
        totalPages={meta.totalPages}
        totalItems={meta.total}
        itemsPerPage={15}
        onPageChange={setPage}
      />

      {/* Unified Stock Action Modal */}
      <Modal
        isOpen={stockModalOpen}
        onClose={() => setStockModalOpen(false)}
        title={
          stockModalMode === 'IN'
            ? 'Stock In (Add Incoming Units)'
            : stockModalMode === 'OUT'
            ? 'Stock Out (Controlled Reduction)'
            : 'Adjust Stock (Physical Shelf Count)'
        }
        subtitle={
          stockModalMode === 'IN'
            ? 'Add newly received factory shipments or purchase intake to existing stock'
            : stockModalMode === 'OUT'
            ? 'Deduct damaged, expired, or clinic sample stock from available inventory'
            : 'Directly overwrite and recalibrate total available stock after physical count'
        }
        maxWidth="max-w-md"
        icon={stockModalMode === 'IN' ? '📥' : stockModalMode === 'OUT' ? '📤' : '⚖️'}
      >
        <form onSubmit={handleStockSubmit} className="space-y-3.5">
          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-3 p-1 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold gap-1">
            <button
              type="button"
              onClick={() => {
                setStockModalMode('IN');
                if (formData.reason === 'DAMAGED' || formData.reason === 'PHYSICAL_AUDIT') {
                  setFormData(prev => ({ ...prev, reason: 'PURCHASE' }));
                }
              }}
              className={`py-2 px-1 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                stockModalMode === 'IN'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Stock In (+)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setStockModalMode('ADJUST');
                if (formData.reason === 'PURCHASE' || formData.reason === 'DAMAGED') {
                  setFormData(prev => ({ ...prev, reason: 'PHYSICAL_AUDIT' }));
                }
              }}
              className={`py-2 px-1 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                stockModalMode === 'ADJUST'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Adjust Stock (=)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setStockModalMode('OUT');
                if (formData.reason === 'PURCHASE' || formData.reason === 'PHYSICAL_AUDIT') {
                  setFormData(prev => ({ ...prev, reason: 'DAMAGED' }));
                }
              }}
              className={`py-2 px-1 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                stockModalMode === 'OUT'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Minus className="w-3.5 h-3.5" />
              <span>Stock Out (-)</span>
            </button>
          </div>

          {/* Target Branch */}
          {availableBranches.length > 1 ? (
            <Select
              label="Target Branch *"
              required
              value={formData.branchId || (availableBranches[0]?._id ? String(availableBranches[0]._id) : '')}
              onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
              options={availableBranches.map((b) => ({ value: String(b._id || b.id), label: b.name }))}
            />
          ) : (
            <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs">
              <span className="text-slate-500 font-medium">Target Branch:</span>
              <span className="font-bold text-slate-800">
                {availableBranches[0]?.name || 'Hosur Main Hub'}
              </span>
            </div>
          )}

          {/* Product Selection / Display */}
          {formData.productName ? (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Selected Product</div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 text-sm">{formData.productName}</div>
                  <div className="text-xs text-slate-500 font-mono">{formData.productSku}</div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-slate-500">Current In Stock</div>
                  <div className="text-sm font-black text-slate-900 font-mono">{currentAvailableNum} units</div>
                </div>
              </div>
            </div>
          ) : (
            <Select
              label="Select Product *"
              required
              value={formData.productId}
              onChange={(e) => handleProductSelect(e.target.value)}
              options={[
                { value: '', label: 'Select a product...' },
                ...(productsData || []).map((p) => ({ value: p._id, label: `${p.name} (${p.sku})` }))
              ]}
            />
          )}

          {/* Dynamic Quantity Input Based on Mode */}
          {stockModalMode === 'IN' && (
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Quantity to Add (+)*"
                type="number"
                min="1"
                required
                placeholder="e.g. 50"
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
          )}

          {stockModalMode === 'OUT' && (
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Quantity to Remove (-)*"
                type="number"
                min="1"
                max={currentAvailableNum}
                required
                placeholder="e.g. 5"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              />
              <Select
                label="Reason *"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                options={[
                  { value: 'DAMAGED', label: 'Damaged Stock' },
                  { value: 'SAMPLE', label: 'Doctor Sample' },
                  { value: 'INTERNAL_USE', label: 'Internal Clinic Use' },
                  { value: 'MANUAL_ADJUSTMENT', label: 'Manual Correction' }
                ]}
              />
            </div>
          )}

          {stockModalMode === 'ADJUST' && (
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="New Actual Available Count (=)*"
                type="number"
                min="0"
                required
                placeholder="e.g. 80"
                value={formData.newAvailable}
                onChange={(e) => setFormData({ ...formData, newAvailable: e.target.value })}
              />
              <Select
                label="Reason *"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                options={[
                  { value: 'PHYSICAL_VERIFICATION', label: 'Physical Shelf Audit' },
                  { value: 'MANUAL_ADJUSTMENT', label: 'Discrepancy Reconciliation' },
                  { value: 'CYCLE_COUNT', label: 'Cycle Count' }
                ]}
              />
            </div>
          )}

          {/* Live Calculation Preview Card */}
          <div className={`p-3 rounded-xl border text-xs ${previewBadgeClass}`}>
            <div className="flex items-center justify-between font-medium mb-1">
              <span>Current Stock: <strong className="font-mono text-slate-900">{currentAvailableNum}</strong> units</span>
              <span className="font-bold uppercase tracking-wider text-[10px]">
                {stockModalMode === 'IN' ? 'Addition (+)' : stockModalMode === 'OUT' ? 'Deduction (-)' : 'Recalibration (=)'}
              </span>
            </div>
            <div className="text-sm font-bold flex items-center justify-between pt-1 border-t border-slate-200/60">
              <span className="text-slate-700">Resulting Available Stock:</span>
              <span className="font-mono text-base font-black">
                {previewNewCount} units
              </span>
            </div>
            <div className="text-[11px] text-slate-600 mt-1 font-mono">
              {formulaDisplay}
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 pt-1 border-t border-slate-200/40">
              {stockModalMode === 'IN' && '💡 "Stock In" adds newly received incoming units to your existing stock.'}
              {stockModalMode === 'ADJUST' && '💡 "Adjust Stock" directly sets the exact physical count counted on your shelf.'}
              {stockModalMode === 'OUT' && '💡 "Stock Out" removes damaged, expired, or clinic sample units.'}
            </p>
          </div>

          <Input
            label="Invoice / Audit Notes (Optional)"
            placeholder={
              stockModalMode === 'IN'
                ? 'e.g. Supplier PO-8812 from Bangalore unit'
                : stockModalMode === 'OUT'
                ? 'e.g. Broken packaging or leakage'
                : 'e.g. Monthly shelf reconciliation audit'
            }
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="secondary" type="button" onClick={() => setStockModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={stockModalMode === 'OUT' ? 'danger' : 'primary'}
              type="submit"
              isLoading={stockMutation.isPending}
              className={stockModalMode === 'OUT' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
            >
              {stockModalMode === 'IN' && 'Record Stock In (+)'}
              {stockModalMode === 'OUT' && 'Record Stock Out (-)'}
              {stockModalMode === 'ADJUST' && 'Apply Stock Adjustment (=)'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Stock Item Confirmation Modal */}
      {stockItemToDelete && (
        <Modal
          isOpen={deleteStockModalOpen}
          onClose={() => {
            setDeleteStockModalOpen(false);
            setStockItemToDelete(null);
          }}
          title="Delete Stock Item"
          maxWidth="max-w-md"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button
                variant="secondary"
                type="button"
                onClick={() => {
                  setDeleteStockModalOpen(false);
                  setStockItemToDelete(null);
                }}
                disabled={deleteStockMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                type="button"
                onClick={() => deleteStockMutation.mutate(stockItemToDelete._id)}
                isLoading={deleteStockMutation.isPending}
              >
                Delete Stock
              </Button>
            </div>
          }
        >
          <div className="space-y-3 text-xs text-slate-600">
            <p>
              Are you sure you want to permanently delete the stock record for{' '}
              <strong className="text-slate-900">{stockItemToDelete.productId?.name || 'this product'}</strong>{' '}
              {stockItemToDelete.productId?.sku && (
                <span className="font-mono text-slate-700">({stockItemToDelete.productId.sku})</span>
              )}?
            </p>
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800">
              This will remove this product and its <strong>{stockItemToDelete.availableQuantity || 0} available units</strong> from the inventory matrix.
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default InventoryLedgerPage;
