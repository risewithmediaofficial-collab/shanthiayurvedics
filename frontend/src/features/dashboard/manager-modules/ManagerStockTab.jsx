import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package,
  AlertTriangle,
  Plus,
  Search,
  CheckCircle2,
  RefreshCw,
  ArrowUpDown,
  Tag,
  Boxes,
  Minus
} from 'lucide-react';
import apiClient from '../../../api/apiClient.js';
import { useBranch } from '../../../context/BranchContext.jsx';
import { Button } from '../../../components/common/Button.jsx';
import { Badge } from '../../../components/common/Badge.jsx';
import { Modal } from '../../../components/common/Modal.jsx';
import { Spinner } from '../../../components/common/Spinner.jsx';

export function ManagerStockTab() {
  const { selectedBranchId } = useBranch();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedProductForAdjust, setSelectedProductForAdjust] = useState(null);
  const [adjustQuantity, setAdjustQuantity] = useState(10);
  const [adjustReason, setAdjustReason] = useState('RESTOCK');
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  // Form data for adding product
  const [newProductData, setNewProductData] = useState({
    name: '',
    sku: '',
    category: 'Oils & Thailams',
    costPrice: '',
    price: '',
    initialStock: 50,
    lowStockThreshold: 20,
    description: ''
  });

  // 1. Fetch Products & Inventory
  const { data: productsData = [], isLoading, refetch } = useQuery({
    queryKey: ['manager-stock-matrix', selectedBranchId],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/products', { params: { limit: 100 } });
        return res.data?.data || [];
      } catch (e) {
        return [];
      }
    }
  });

  // Inline Stock Adjust Mutation
  const adjustStockMutation = useMutation({
    mutationFn: async ({ productId, changeQty, reason }) => {
      // Either call inventory adjust or product update
      if (changeQty > 0) {
        const res = await apiClient.post('/inventory/in', {
          productId,
          quantity: changeQty,
          notes: reason || 'Manager Quick In-Stock Adjustment'
        });
        return res.data;
      } else {
        const res = await apiClient.post('/inventory/out', {
          productId,
          quantity: Math.abs(changeQty),
          reason: reason || 'Manager Quick Stock Reduction'
        });
        return res.data;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['manager-stock-matrix']);
      queryClient.invalidateQueries(['sidebar-metrics']);
      setIsAdjustModalOpen(false);
      setActionSuccessMsg('Stock quantity updated successfully!');
      setTimeout(() => setActionSuccessMsg(''), 4000);
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to adjust stock');
    }
  });

  // Add Product Mutation
  const addProductMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await apiClient.post('/products', {
        ...payload,
        price: Number(payload.price),
        costPrice: Number(payload.costPrice),
        lowStockThreshold: Number(payload.lowStockThreshold) || 20
      });
      return res.data;
    },
    onSuccess: () => {
      setIsAddModalOpen(false);
      setNewProductData({
        name: '',
        sku: '',
        category: 'Oils & Thailams',
        costPrice: '',
        price: '',
        initialStock: 50,
        lowStockThreshold: 20,
        description: ''
      });
      queryClient.invalidateQueries(['manager-stock-matrix']);
      setActionSuccessMsg('Product added successfully!');
      setTimeout(() => setActionSuccessMsg(''), 4000);
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to add product. Ensure SKU is unique.');
    }
  });

  const handleQuickInlineAdjust = (product, delta) => {
    adjustStockMutation.mutate({
      productId: product._id,
      changeQty: delta,
      reason: delta > 0 ? 'Quick Restock +1' : 'Quick Stock Deduct -1'
    });
  };

  const handleCustomAdjustSubmit = (e) => {
    e.preventDefault();
    if (!selectedProductForAdjust) return;
    adjustStockMutation.mutate({
      productId: selectedProductForAdjust._id,
      changeQty: adjustReason === 'DEDUCTION' ? -Math.abs(Number(adjustQuantity)) : Math.abs(Number(adjustQuantity)),
      reason: `Manager Adjustment: ${adjustReason}`
    });
  };

  // Filter products
  const filteredProducts = productsData.filter((p) => {
    const stockQty = p.stock ?? p.totalStock ?? p.availableQuantity ?? 45;
    const threshold = p.lowStockThreshold || 20;

    if (filterStatus === 'LOW_STOCK' && stockQty > threshold) return false;
    if (filterStatus === 'ADEQUATE' && stockQty <= threshold) return false;
    if (filterStatus === 'OUT_OF_STOCK' && stockQty > 0) return false;

    if (search) {
      const q = search.toLowerCase();
      return p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q));
    }
    return true;
  });

  const lowStockCount = productsData.filter((p) => {
    const stockQty = p.stock ?? p.totalStock ?? p.availableQuantity ?? 45;
    return stockQty <= (p.lowStockThreshold || 20);
  }).length;

  const totalUnits = productsData.reduce((sum, p) => sum + (p.stock ?? p.totalStock ?? p.availableQuantity ?? 45), 0);
  const totalValuation = productsData.reduce((sum, p) => {
    const qty = p.stock ?? p.totalStock ?? p.availableQuantity ?? 45;
    return sum + (qty * (p.costPrice || p.price || 500));
  }, 0);

  return (
    <div className="space-y-4">
      {actionSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Low Stock Banner Alert */}
      {lowStockCount > 0 && (
        <div className="p-4 bg-rose-50 border border-rose-200/90 text-rose-950 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 border border-rose-200 flex items-center justify-center text-lg shrink-0 font-bold">
              ⚠️
            </div>
            <div>
              <h4 className="font-bold text-sm text-rose-950 tracking-tight">Low Stock Alert: {lowStockCount} Products at or below threshold</h4>
              <p className="text-xs text-rose-800 mt-0.5">Replenish these inventory items to prevent delayed customer dispatches.</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setFilterStatus(filterStatus === 'LOW_STOCK' ? 'ALL' : 'LOW_STOCK')}
            className="bg-white hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-semibold shrink-0 self-start sm:self-center shadow-xs"
          >
            {filterStatus === 'LOW_STOCK' ? 'View All Products' : 'Filter Low Stock Items'}
          </Button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total Catalog SKUs</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">{productsData.length}</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Low Stock SKUs</div>
          <div className="text-2xl font-bold text-rose-600 mt-1 font-mono">{lowStockCount}</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total Available Units</div>
          <div className="text-2xl font-bold text-blue-700 mt-1 font-mono">{totalUnits.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Estimated Valuation</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1 font-mono">₹{totalValuation.toLocaleString()}</div>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by product name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
          >
            <option value="ALL">All Stock Statuses</option>
            <option value="LOW_STOCK">Low Stock Alert (&le; threshold)</option>
            <option value="ADEQUATE">Adequate Stock</option>
            <option value="OUT_OF_STOCK">Out of Stock (0 units)</option>
          </select>
        </div>

        <Button
          size="sm"
          variant="primary"
          icon={Plus}
          onClick={() => setIsAddModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
        >
          Add New Product
        </Button>
      </div>

      {/* Stock Matrix Table */}
      {isLoading ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-slate-200">
          <Spinner size="lg" text="Loading branch inventory..." />
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
          <div className="text-3xl mb-2">📦</div>
          <div className="text-sm font-bold text-slate-800">No products found</div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-bold">Product / SKU</th>
                  <th className="py-3 px-4 font-bold">Category</th>
                  <th className="py-3 px-4 font-bold text-right">Cost Price</th>
                  <th className="py-3 px-4 font-bold text-right">Catalog MRP</th>
                  <th className="py-3 px-4 font-bold text-center">In Stock Units</th>
                  <th className="py-3 px-4 font-bold text-center">Status</th>
                  <th className="py-3 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((prod) => {
                  const stockQty = prod.stock ?? prod.totalStock ?? prod.availableQuantity ?? 45;
                  const threshold = prod.lowStockThreshold || 20;
                  const isLow = stockQty <= threshold;
                  const cost = prod.costPrice || Math.round(prod.price * 0.6) || 300;
                  const mrp = prod.price || 500;
                  const marginPct = Math.round(((mrp - cost) / mrp) * 100);

                  return (
                    <tr key={prod._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{prod.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">SKU: {prod.sku || 'SH-MED-01'}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {prod.category || 'Ayurvedic Products'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        ₹{cost.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        ₹{mrp.toLocaleString()}
                        <div className="text-[10px] text-emerald-600 font-semibold">{marginPct}% margin</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleQuickInlineAdjust(prod, -1)}
                            disabled={stockQty <= 0}
                            title="Decrement stock by 1"
                            className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-600 flex items-center justify-center font-bold text-sm transition-colors cursor-pointer disabled:opacity-30"
                          >
                            -
                          </button>

                          <span className={`font-mono font-bold text-sm px-2.5 py-0.5 rounded-lg ${
                            isLow ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-slate-100 text-slate-900'
                          }`}>
                            {stockQty}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleQuickInlineAdjust(prod, 1)}
                            title="Increment stock by 1"
                            className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {stockQty <= 0 ? (
                          <Badge variant="danger" size="sm">Out of Stock</Badge>
                        ) : isLow ? (
                          <Badge variant="danger" size="sm">Low Stock (&le;{threshold})</Badge>
                        ) : (
                          <Badge variant="emerald" size="sm">In Stock</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => {
                            setSelectedProductForAdjust(prod);
                            setIsAdjustModalOpen(true);
                          }}
                          className="text-xs"
                        >
                          Batch Adjust
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {isAddModalOpen && (
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Add New Ayurvedic Product"
          maxWidth="max-w-md"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addProductMutation.mutate(newProductData);
            }}
            className="space-y-3 text-xs"
          >
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Product Name *</label>
              <input
                type="text"
                required
                value={newProductData.name}
                onChange={(e) => setNewProductData({ ...newProductData, name: e.target.value })}
                placeholder="e.g. Maha Bhringraj Taila 200ml"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">SKU Code *</label>
                <input
                  type="text"
                  required
                  value={newProductData.sku}
                  onChange={(e) => setNewProductData({ ...newProductData, sku: e.target.value.toUpperCase() })}
                  placeholder="MBT-200"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono uppercase"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Category</label>
                <select
                  value={newProductData.category}
                  onChange={(e) => setNewProductData({ ...newProductData, category: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                >
                  <option value="Oils & Thailams">Oils & Thailams</option>
                  <option value="Churnas & Powders">Churnas & Powders</option>
                  <option value="Tablets & Vatis">Tablets & Vatis</option>
                  <option value="Asavas & Arishtas">Asavas & Arishtas</option>
                  <option value="General Health">General Health</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cost Price (₹) *</label>
                <input
                  type="number"
                  required
                  value={newProductData.costPrice}
                  onChange={(e) => setNewProductData({ ...newProductData, costPrice: e.target.value })}
                  placeholder="280"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catalog MRP (₹) *</label>
                <input
                  type="number"
                  required
                  value={newProductData.price}
                  onChange={(e) => setNewProductData({ ...newProductData, price: e.target.value })}
                  placeholder="499"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Initial Stock Units</label>
                <input
                  type="number"
                  value={newProductData.initialStock}
                  onChange={(e) => setNewProductData({ ...newProductData, initialStock: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Low Stock Alert Threshold</label>
                <input
                  type="number"
                  value={newProductData.lowStockThreshold}
                  onChange={(e) => setNewProductData({ ...newProductData, lowStockThreshold: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={addProductMutation.isPending}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
              >
                Add Product
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Batch Adjust Modal */}
      {isAdjustModalOpen && selectedProductForAdjust && (
        <Modal
          isOpen={isAdjustModalOpen}
          onClose={() => setIsAdjustModalOpen(false)}
          title={`Batch Adjust Stock: ${selectedProductForAdjust.name}`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleCustomAdjustSubmit} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Adjustment Type</label>
              <select
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
              >
                <option value="RESTOCK">Add Stock (Supplier Restock / Transfer In)</option>
                <option value="DEDUCTION">Deduct Stock (Damage / Expiry / Adjustment)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Quantity Units</label>
              <input
                type="number"
                min="1"
                required
                value={adjustQuantity}
                onChange={(e) => setAdjustQuantity(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <Button variant="secondary" onClick={() => setIsAdjustModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={adjustStockMutation.isPending}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
              >
                Confirm Adjustment
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default ManagerStockTab;
