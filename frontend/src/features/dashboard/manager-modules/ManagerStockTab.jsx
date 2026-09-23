import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package,
  AlertTriangle,
  Plus,
  Search,
  CheckCircle2,
  RefreshCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
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
  const { selectedBranchId, branches = [] } = useBranch();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedProductForAdjust, setSelectedProductForAdjust] = useState(null);
  const [targetBranchId, setTargetBranchId] = useState('');
  const [adjustQuantity, setAdjustQuantity] = useState(10);
  const [adjustReason, setAdjustReason] = useState('RESTOCK');
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [duplicateClusters, setDuplicateClusters] = useState([]);
  const [mergingId, setMergingId] = useState(null);

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
    mutationFn: async ({ productId, batchId, branchId, changeQty, reason }) => {
      const targetBranch = branchId || (selectedBranchId && selectedBranchId !== 'ALL' ? selectedBranchId : branches[0]?._id);
      // Either call inventory adjust or product update
      if (changeQty > 0) {
        const res = await apiClient.post('/inventory/in', {
          productId,
          batchId,
          branchId: targetBranch,
          quantity: changeQty,
          notes: reason || 'Manager Quick In-Stock Adjustment'
        });
        return res.data;
      } else {
        const res = await apiClient.post('/inventory/out', {
          productId,
          batchId,
          branchId: targetBranch,
          quantity: Math.abs(changeQty),
          reason: reason || 'Manager Quick Stock Reduction'
        });
        return res.data;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['manager-stock-matrix'] });
      queryClient.invalidateQueries({ queryKey: ['sidebar-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
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
      queryClient.invalidateQueries({ queryKey: ['manager-stock-matrix'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setActionSuccessMsg('Product added successfully!');
      setTimeout(() => setActionSuccessMsg(''), 4000);
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to add product. Ensure SKU is unique.');
    }
  });

  const handleQuickInlineAdjust = (product, delta) => {
    const finalBranchId = selectedBranchId && selectedBranchId !== 'ALL' ? selectedBranchId : branches[0]?._id;
    adjustStockMutation.mutate({
      productId: product._id,
      batchId: product.batches?.[0]?._id,
      branchId: finalBranchId,
      changeQty: delta,
      reason: delta > 0 ? 'Quick Restock +1' : 'Quick Stock Deduct -1'
    });
  };

  // Duplicate Products Scanner
  const scanForDuplicates = () => {
    const map = new Map();
    productsData.forEach((prod) => {
      // Normalization heuristic: remove spaces, punctuation, common suffixes
      const cleanName = (prod.name || '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .replace(/(100ml|200ml|500ml|60caps|30caps|oil|taila|tailam|churna|tablet|capsule|kit|syrup)/g, '')
        .trim();

      // Cluster key based on normalized root or first 6 SKU chars
      const key = cleanName || (prod.sku || '').slice(0, 6).toLowerCase();
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(prod);
    });

    const duplicates = [];
    map.forEach((group, key) => {
      if (group.length > 1) {
        duplicates.push({ key, products: group });
      }
    });

    setDuplicateClusters(duplicates);
    setIsDuplicateModalOpen(true);
  };

  const handleMergeDuplicate = async (primaryProd, duplicateProd) => {
    if (!window.confirm(`Merge ${duplicateProd.name} (${duplicateProd.sku}) stock into ${primaryProd.name}? The duplicate product will be deactivated.`)) {
      return;
    }
    try {
      setMergingId(duplicateProd._id);
      const dupStock = duplicateProd.availableStock || duplicateProd.stock || 0;
      if (dupStock > 0) {
        const targetBranch = selectedBranchId && selectedBranchId !== 'ALL' ? selectedBranchId : branches[0]?._id;
        await apiClient.post('/inventory/in', {
          productId: primaryProd._id,
          branchId: targetBranch,
          quantity: dupStock,
          notes: `Merged duplicate product stock from SKU ${duplicateProd.sku}`
        });
      }
      await apiClient.delete(`/products/${duplicateProd._id}`);
      setActionSuccessMsg(`Merged stock and removed duplicate ${duplicateProd.sku}`);
      queryClient.invalidateQueries({ queryKey: ['manager-stock-matrix'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      // Update local duplicate list
      setDuplicateClusters((prev) =>
        prev
          .map((c) => ({
            ...c,
            products: c.products.filter((p) => p._id !== duplicateProd._id)
          }))
          .filter((c) => c.products.length > 1)
      );
      setTimeout(() => setActionSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to merge duplicate product');
    } finally {
      setMergingId(null);
    }
  };

  const handleCustomAdjustSubmit = (e) => {
    e.preventDefault();
    if (!selectedProductForAdjust) return;
    const finalBranchId = targetBranchId || (selectedBranchId && selectedBranchId !== 'ALL' ? selectedBranchId : branches[0]?._id);
    adjustStockMutation.mutate({
      productId: selectedProductForAdjust._id,
      batchId: selectedProductForAdjust.batches?.[0]?._id,
      branchId: finalBranchId,
      changeQty: adjustReason === 'DEDUCTION' ? -Math.abs(Number(adjustQuantity)) : Math.abs(Number(adjustQuantity)),
      reason: `Manager Adjustment: ${adjustReason}`
    });
  };

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set();
    productsData.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [productsData]);

  // Header click sorting
  const handleHeaderSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Reset filters
  const handleResetFilters = () => {
    setSearch('');
    setFilterStatus('ALL');
    setCategoryFilter('ALL');
    setSortBy('name');
    setSortOrder('asc');
  };

  // Filter and sort products
  const sortedAndFilteredProducts = useMemo(() => {
    return productsData
      .filter((p) => {
        const stockQty = p.stock ?? p.totalStock ?? p.availableQuantity ?? 0;
        const threshold = p.lowStockThreshold || 20;

        if (filterStatus === 'LOW_STOCK' && stockQty > threshold) return false;
        if (filterStatus === 'ADEQUATE' && stockQty <= threshold) return false;
        if (filterStatus === 'OUT_OF_STOCK' && stockQty > 0) return false;

        if (categoryFilter !== 'ALL' && p.category !== categoryFilter) return false;

        if (search) {
          const q = search.toLowerCase();
          return (
            (p.name && p.name.toLowerCase().includes(q)) ||
            (p.sku && p.sku.toLowerCase().includes(q))
          );
        }
        return true;
      })
      .sort((a, b) => {
        let valA, valB;
        if (sortBy === 'name') {
          valA = (a.name || '').toLowerCase();
          valB = (b.name || '').toLowerCase();
        } else if (sortBy === 'sku') {
          valA = (a.sku || '').toLowerCase();
          valB = (b.sku || '').toLowerCase();
        } else if (sortBy === 'category') {
          valA = (a.category || '').toLowerCase();
          valB = (b.category || '').toLowerCase();
        } else if (sortBy === 'costPrice') {
          valA = a.costPrice || Math.round((a.price || 0) * 0.6) || 0;
          valB = b.costPrice || Math.round((b.price || 0) * 0.6) || 0;
        } else if (sortBy === 'price') {
          valA = a.price || 0;
          valB = b.price || 0;
        } else if (sortBy === 'stock') {
          valA = a.stock ?? a.totalStock ?? a.availableQuantity ?? 0;
          valB = b.stock ?? b.totalStock ?? b.availableQuantity ?? 0;
        } else {
          return 0;
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [productsData, filterStatus, categoryFilter, search, sortBy, sortOrder]);

  const filteredProducts = sortedAndFilteredProducts;

  const lowStockCount = productsData.filter((p) => {
    const stockQty = p.stock ?? p.totalStock ?? p.availableQuantity ?? 0;
    return stockQty <= (p.lowStockThreshold || 20);
  }).length;

  const totalUnits = productsData.reduce((sum, p) => sum + (p.stock ?? p.totalStock ?? p.availableQuantity ?? 0), 0);
  const totalValuation = productsData.reduce((sum, p) => {
    const qty = p.stock ?? p.totalStock ?? p.availableQuantity ?? 0;
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

      {/* Low Stock Bento Alert */}
      {lowStockCount > 0 && (
        <div className="p-3.5 bg-rose-50/80 border border-rose-200 text-rose-950 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
            <span className="font-semibold text-xs text-rose-900">
              Low Stock Alert: <strong className="font-mono">{lowStockCount}</strong> SKUs at or below safety threshold
            </span>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setFilterStatus(filterStatus === 'LOW_STOCK' ? 'ALL' : 'LOW_STOCK')}
            className="bg-white hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-semibold shrink-0 self-start sm:self-center shadow-xs"
          >
            {filterStatus === 'LOW_STOCK' ? 'View All SKUs' : 'Filter Low Stock'}
          </Button>
        </div>
      )}

      {/* ── Bento KPI Metrics Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bento-card flex flex-col gap-1">
          <div className="bento-metric-title">Total Catalog SKUs</div>
          <div className="bento-metric-value text-slate-900">{productsData.length}</div>
          <div className="text-[11px] text-slate-400 font-medium">Active products</div>
        </div>
        <div className="bento-card flex flex-col gap-1">
          <div className="bento-metric-title">Low Stock SKUs</div>
          <div className="bento-metric-value text-rose-600">{lowStockCount}</div>
          <div className="text-[11px] text-rose-400 font-medium">{lowStockCount > 0 ? 'Need restocking' : 'All adequate'}</div>
        </div>
        <div className="bento-card flex flex-col gap-1">
          <div className="bento-metric-title">Available Units</div>
          <div className="bento-metric-value text-blue-600">{totalUnits.toLocaleString()}</div>
          <div className="text-[11px] text-blue-400 font-medium">Combined inventory</div>
        </div>
        <div className="bento-card flex flex-col gap-1">
          <div className="bento-metric-title">Est. Valuation</div>
          <div className="bento-metric-value text-emerald-700">₹{totalValuation.toLocaleString()}</div>
          <div className="text-[11px] text-emerald-500 font-medium">Cost price basis</div>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="bento-card flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
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

          {categories.length > 0 && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 max-w-[180px] truncate"
            >
              <option value="ALL">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          )}

          {/* Sort Dropdown */}
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field);
              setSortOrder(order);
            }}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
          >
            <option value="name-asc">Name: A to Z</option>
            <option value="name-desc">Name: Z to A</option>
            <option value="stock-desc">Stock: High to Low</option>
            <option value="stock-asc">Stock: Low to High</option>
            <option value="price-desc">MRP: High to Low</option>
            <option value="price-asc">MRP: Low to High</option>
            <option value="costPrice-desc">Cost: High to Low</option>
            <option value="costPrice-asc">Cost: Low to High</option>
            <option value="sku-asc">SKU: A to Z</option>
          </select>

          {(search || filterStatus !== 'ALL' || categoryFilter !== 'ALL' || sortBy !== 'name' || sortOrder !== 'asc') && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              icon={Search}
              onClick={scanForDuplicates}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold shadow-xs"
            >
              🔍 Find Duplicate Products
            </Button>

            <Button
              size="sm"
              variant="primary"
              icon={Plus}
              onClick={() => setIsAddModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
            >
              Add Product
            </Button>
          </div>
        </div>
      </div>

      {/* Stock Matrix Table */}
      {isLoading ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-slate-200">
          <Spinner size="lg" text="Loading branch inventory..." />
        </div>
      ) : sortedAndFilteredProducts.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
          <div className="text-3xl mb-2">📦</div>
          <div className="text-sm font-bold text-slate-800">No products found</div>
          <p className="text-xs text-slate-400 mt-1">Try changing filters or search terms</p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="mt-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200 select-none">
                <tr>
                  <th
                    className="py-3 px-4 font-bold cursor-pointer hover:bg-slate-100/80 transition-colors"
                    onClick={() => handleHeaderSort('name')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Product / SKU</span>
                      {sortBy === 'name' ? (
                        <span className="text-emerald-700 font-bold">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                      ) : (
                        <span className="text-slate-300">↕</span>
                      )}
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 font-bold cursor-pointer hover:bg-slate-100/80 transition-colors"
                    onClick={() => handleHeaderSort('category')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Category</span>
                      {sortBy === 'category' ? (
                        <span className="text-emerald-700 font-bold">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                      ) : (
                        <span className="text-slate-300">↕</span>
                      )}
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 font-bold text-right cursor-pointer hover:bg-slate-100/80 transition-colors"
                    onClick={() => handleHeaderSort('costPrice')}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Cost Price</span>
                      {sortBy === 'costPrice' ? (
                        <span className="text-emerald-700 font-bold">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                      ) : (
                        <span className="text-slate-300">↕</span>
                      )}
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 font-bold text-right cursor-pointer hover:bg-slate-100/80 transition-colors"
                    onClick={() => handleHeaderSort('price')}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Catalog MRP</span>
                      {sortBy === 'price' ? (
                        <span className="text-emerald-700 font-bold">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                      ) : (
                        <span className="text-slate-300">↕</span>
                      )}
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 font-bold text-center cursor-pointer hover:bg-slate-100/80 transition-colors"
                    onClick={() => handleHeaderSort('stock')}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>In Stock Units</span>
                      {sortBy === 'stock' ? (
                        <span className="text-emerald-700 font-bold">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                      ) : (
                        <span className="text-slate-300">↕</span>
                      )}
                    </div>
                  </th>
                  <th className="py-3 px-4 font-bold text-center">Status</th>
                  <th className="py-3 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedAndFilteredProducts.map((prod) => {
                  const stockQty = prod.stock ?? prod.totalStock ?? prod.availableQuantity ?? 0;
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
                            setTargetBranchId(selectedBranchId && selectedBranchId !== 'ALL' ? selectedBranchId : (branches[0]?._id || ''));
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

            {(!selectedBranchId || selectedBranchId === 'ALL') && branches.length > 0 && (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Branch *</label>
                <select
                  value={targetBranchId || branches[0]?._id}
                  onChange={(e) => setTargetBranchId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                >
                  {branches.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

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

      {/* Modal 3: Find Duplicate Products (AyurOne Mart Feature) */}
      {isDuplicateModalOpen && (
        <Modal
          isOpen={isDuplicateModalOpen}
          onClose={() => setIsDuplicateModalOpen(false)}
          title="🔍 Inventory Duplicate Products Detector"
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
              <span className="font-bold">Duplicate Detection Rule:</span> Scans products with matching or phonetically similar names and overlapping SKU prefixes. Merge stock into the primary item and safely deactivate duplicate SKUs.
            </div>

            {duplicateClusters.length === 0 ? (
              <div className="py-12 text-center bg-slate-50 rounded-2xl border border-slate-200">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl mx-auto mb-2">
                  ✓
                </div>
                <h4 className="font-bold text-slate-800 text-sm">No Duplicate Products Found!</h4>
                <p className="text-slate-500 mt-1">Your inventory catalog has unique SKUs and clean product designations.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {duplicateClusters.map((cluster, idx) => {
                  const primary = cluster.products[0];
                  const duplicates = cluster.products.slice(1);

                  return (
                    <div key={cluster.key || idx} className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          Duplicate Cluster #{idx + 1} ({cluster.products.length} matching SKUs)
                        </span>
                        <span className="font-mono text-[11px] text-slate-400">Match Key: {cluster.key}</span>
                      </div>

                      {/* Primary Product Card */}
                      <div className="p-2.5 bg-emerald-50/60 border border-emerald-200 rounded-lg flex items-center justify-between">
                        <div>
                          <span className="px-1.5 py-0.5 bg-emerald-700 text-white rounded text-[9px] font-bold uppercase mr-1.5">Primary</span>
                          <strong className="text-slate-900 font-semibold">{primary.name}</strong>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            SKU: {primary.sku} · MRP: ₹{primary.mrp || primary.price} · Available: {primary.availableStock || 0} units
                          </div>
                        </div>
                      </div>

                      {/* Duplicate Items to Merge */}
                      <div className="space-y-2 pl-3 border-l-2 border-amber-200">
                        {duplicates.map((dup) => (
                          <div key={dup._id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                            <div>
                              <strong className="text-slate-800 font-semibold">{dup.name}</strong>
                              <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                SKU: {dup.sku} · MRP: ₹{dup.mrp || dup.price} · Available: {dup.availableStock || 0} units
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="secondary"
                              isLoading={mergingId === dup._id}
                              onClick={() => handleMergeDuplicate(primary, dup)}
                              className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs shrink-0"
                            >
                              ⚡ Merge Stock
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <Button variant="secondary" onClick={() => setIsDuplicateModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default ManagerStockTab;
