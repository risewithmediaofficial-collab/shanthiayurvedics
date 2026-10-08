import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Layers, Calendar, Tag, Package, Pencil, Trash2, AlertTriangle, Boxes, FolderPlus } from 'lucide-react';
import apiClient from '../../api/apiClient.js';
import { usePermissions } from '../../hooks/usePermissions.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useBranch } from '../../context/BranchContext.jsx';
import { Table } from '../../components/common/Table.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Input } from '../../components/common/Input.jsx';
import { Select } from '../../components/common/Select.jsx';
import { Modal } from '../../components/common/Modal.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { Pagination } from '../../components/common/Pagination.jsx';
import { DateRangeFilter } from '../../components/common/DateRangeFilter.jsx';
import { ExportButton } from '../../components/common/ExportButton.jsx';
import { SortDropdown } from '../../components/common/SortDropdown.jsx';
import { exportToExcel, exportToCSV } from '../../utils/exportUtils.js';

const PRODUCT_SORT_OPTIONS = [
  { value: 'name', label: 'Product Name' },
  { value: 'price', label: 'Selling Price' },
  { value: 'mrp', label: 'MRP' },
  { value: 'costPrice', label: 'Cost Price' },
  { value: 'sku', label: 'SKU Code' },
  { value: 'createdAt', label: 'Date Added' }
];

export function ProductCatalogPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission, isManager, isOwner } = usePermissions();
  const { user } = useAuth();
  const { selectedBranchId, availableBranches = [] } = useBranch();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [isExporting, setIsExporting] = useState(false);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productToDelete, setProductToDelete] = useState(null);
  const [actionMsg, setActionMsg] = useState('');

  // Category Management Modal State
  const [categoriesModalOpen, setCategoriesModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatCode, setNewCatCode] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [catError, setCatError] = useState('');

  // Inline custom category states for Create and Edit modals
  const [isCustomCategoryCreate, setIsCustomCategoryCreate] = useState(false);
  const [customCategoryCreateName, setCustomCategoryCreateName] = useState('');
  const [isCustomCategoryEdit, setIsCustomCategoryEdit] = useState(false);
  const [customCategoryEditName, setCustomCategoryEditName] = useState('');

  // Stock Management Modal State for Manager and Owner
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [stockTargetProduct, setStockTargetProduct] = useState(null);
  const [stockActionType, setStockActionType] = useState('IN'); // 'IN' | 'OUT' | 'ADJUST'
  const [stockQuantity, setStockQuantity] = useState('');
  const [stockReason, setStockReason] = useState('PURCHASE');
  const [stockNotes, setStockNotes] = useState('');
  const [stockTargetBranch, setStockTargetBranch] = useState('');

  const openManageStock = (product) => {
    setStockTargetProduct(product);
    setStockActionType('IN');
    setStockReason('PURCHASE');
    setStockQuantity('');
    setStockNotes('');
    const defBranch = selectedBranchId && selectedBranchId !== 'ALL' ? selectedBranchId : (availableBranches[0]?._id ? String(availableBranches[0]._id) : '');
    setStockTargetBranch(defBranch);
    setStockModalOpen(true);
  };

  const manageStockMutation = useMutation({
    mutationFn: async ({ productId, branchId, actionType, quantity, reason, notes }) => {
      const effectiveBranchId = branchId || (selectedBranchId && selectedBranchId !== 'ALL' ? selectedBranchId : null) || (availableBranches[0]?._id ? String(availableBranches[0]._id) : user?.branchId?._id || user?.branchId);
      if (actionType === 'IN') {
        return apiClient.post('/inventory/in', {
          productId,
          branchId: effectiveBranchId,
          quantity: Number(quantity),
          reason,
          notes
        });
      } else if (actionType === 'OUT') {
        return apiClient.post('/inventory/out', {
          productId,
          branchId: effectiveBranchId,
          quantity: Number(quantity),
          reason,
          notes
        });
      } else {
        return apiClient.post('/inventory/adjust', {
          productId,
          branchId: effectiveBranchId,
          newAvailable: Number(quantity),
          reason,
          notes
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['sidebar-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['manager-stock-matrix'] });
      setStockModalOpen(false);
      setStockQuantity('');
      setStockNotes('');
      setActionMsg('✓ Stock level updated successfully');
      setTimeout(() => setActionMsg(''), 4000);
    },
    onError: (err) => {
      setActionMsg(`⚠ ${err.response?.data?.message || 'Failed to update stock'}`);
      setTimeout(() => setActionMsg(''), 5000);
    }
  });

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'OILS',
    price: '',
    mrp: '',
    costPrice: '',
    unit: 'BOTTLE',
    weight: '',
    lowStockThreshold: 15
  });

  const [editData, setEditData] = useState({
    name: '',
    category: 'OILS',
    price: '',
    mrp: '',
    costPrice: '',
    unit: 'BOTTLE',
    weight: '',
    lowStockThreshold: 15,
    description: ''
  });

  // Categories Query
  const { data: categories = [] } = useQuery({
    queryKey: ['product-categories'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/products/categories');
        const _rd = res.data?.data;
        return Array.isArray(_rd) ? _rd : [];
      } catch (e) {
        return [];
      }
    }
  });

  const displayCategories = useMemo(() => {
    if (categories.length > 0) return categories;
    return [
      { code: 'OILS', name: 'Ayurvedic Oils', isSystem: true },
      { code: 'CHURNAS', name: 'Choornams / Powders', isSystem: true },
      { code: 'CAPSULES', name: 'Capsules', isSystem: true },
      { code: 'TONICS', name: 'Tonics / Syrups', isSystem: true },
      { code: 'TABLETS', name: 'Tablets / Vati', isSystem: true },
      { code: 'KITS', name: 'Treatment Kits', isSystem: true },
      { code: 'OTHER', name: 'Other Formulations', isSystem: true }
    ];
  }, [categories]);

  const categoryOptions = useMemo(() => {
    return displayCategories.map((c) => ({
      value: c.code || c.name,
      label: c.name || c.code
    }));
  }, [displayCategories]);

  const filterCategoryOptions = useMemo(() => {
    return [
      { value: '', label: 'All Categories' },
      ...categoryOptions
    ];
  }, [categoryOptions]);

  const createCategoryMutation = useMutation({
    mutationFn: (data) => apiClient.post('/products/categories', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
      setNewCatName('');
      setNewCatCode('');
      setNewCatDesc('');
      setCatError('');
      setActionMsg('✓ Category added successfully');
      setTimeout(() => setActionMsg(''), 3500);
    },
    onError: (err) => {
      setCatError(err.response?.data?.message || 'Failed to add category');
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`/products/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
      setActionMsg('✓ Category deleted successfully');
      setTimeout(() => setActionMsg(''), 3500);
    },
    onError: (err) => {
      setActionMsg(`⚠ ${err.response?.data?.message || 'Failed to delete category'}`);
      setTimeout(() => setActionMsg(''), 4000);
    }
  });

  const { data: productResponse, isLoading } = useQuery({
    queryKey: ['products', page, search, categoryFilter, selectedBranchId, sortBy, sortOrder, startDate, endDate],
    queryFn: async () => {
      const res = await apiClient.get('/products', {
        params: {
          page,
          limit: 15,
          search,
          category: categoryFilter,
          sortBy,
          sortOrder,
          startDate,
          endDate
        }
      });
      return res.data;
    }
  });

  const products = Array.isArray(productResponse?.data) ? productResponse?.data : [];
  const meta = productResponse?.pagination || productResponse?.meta || { page: 1, totalPages: 1, total: 0 };

  const createProductMutation = useMutation({
    mutationFn: (data) => apiClient.post('/products', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
      setCreateModalOpen(false);
      setIsCustomCategoryCreate(false);
      setCustomCategoryCreateName('');
      setActionMsg('✓ Product created successfully');
      setTimeout(() => setActionMsg(''), 3000);
      setFormData({
        name: '',
        sku: '',
        category: 'OILS',
        price: '',
        mrp: '',
        costPrice: '',
        unit: 'BOTTLE',
        lowStockThreshold: 15
      });
    },
    onError: (err) => {
      setActionMsg(`⚠ ${err.response?.data?.message || 'Failed to create product'}`);
      setTimeout(() => setActionMsg(''), 4000);
    }
  });

  const editProductMutation = useMutation({
    mutationFn: ({ id, data }) => apiClient.patch(`/products/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
      setEditModalOpen(false);
      setIsCustomCategoryEdit(false);
      setCustomCategoryEditName('');
      setSelectedProduct(null);
      setActionMsg('✓ Product updated successfully');
      setTimeout(() => setActionMsg(''), 3000);
    }
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['productsAll'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setDeleteModalOpen(false);
      setProductToDelete(null);
      setActionMsg('✓ Product and its stock removed successfully');
      setTimeout(() => setActionMsg(''), 3000);
    }
  });

  const handleExportProducts = async (format) => {
    try {
      setIsExporting(true);
      const res = await apiClient.get('/products', {
        params: {
          search,
          category: categoryFilter,
          sortBy,
          sortOrder,
          startDate,
          endDate,
          export: true
        }
      });
      const exportList = res.data?.data || products;
      if (!exportList.length) {
        setActionMsg('⚠ No products to export');
        setTimeout(() => setActionMsg(''), 3000);
        return;
      }

      const rows = exportList.map((p) => ({
        'SKU': p.sku || '',
        'Product Name': p.name || '',
        'Category': p.category || '',
        'Unit': p.unit || '',
        'Selling Price (₹)': p.price || 0,
        'MRP (₹)': p.mrp || 0,
        'Cost Price (₹)': p.costPrice || 0,
        'Available Stock': p.availableQuantity ?? p.stock ?? 0,
        'Reserved Stock': p.reservedQuantity || 0,
        'Low Stock Threshold': p.lowStockThreshold || 15,
        'Date Added': p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN') : ''
      }));

      const fileName = `Shanthi_Ayurvedas_Products_${new Date().toISOString().split('T')[0]}`;
      if (format === 'csv') {
        exportToCSV(rows, fileName);
      } else {
        exportToExcel(rows, fileName, 'Products');
      }
      setActionMsg(`✓ Exported ${rows.length} products to ${format.toUpperCase()}`);
      setTimeout(() => setActionMsg(''), 3000);
    } catch (err) {
      console.error('Products export failed:', err);
      setActionMsg('⚠ Failed to export products');
      setTimeout(() => setActionMsg(''), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  const columns = [
    {
      header: 'Product Name & SKU',
      cell: (row) => (
        <div>
          <div className="font-bold text-slate-900">{row.name}</div>
          <div className="text-xs text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
            <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-semibold text-slate-700">{row.sku}</span>
            <span>•</span>
            <span className="text-[11px] text-slate-500">{row.category}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Pricing (Selling / MRP)',
      cell: (row) => (
        <div>
          <div className="font-bold text-xs text-slate-900">₹{row.price}</div>
          <div className="text-[10px] text-slate-400 line-through">MRP: ₹{row.mrp}</div>
        </div>
      )
    },
    {
      header: 'Weight',
      cell: (row) => (
        <span className="text-xs font-semibold text-slate-700 font-mono">
          {row.weight ? `${row.weight} g` : '—'}
        </span>
      )
    },
    {
      header: 'Branch Stock',
      cell: (row) => {
        const qty = row.stock ?? row.availableQuantity ?? 0;
        const low = row.lowStockThreshold || 15;
        const isLow = qty <= low;
        return (
          <div>
            <span
              className={`inline-flex items-center gap-1 font-mono font-bold text-xs px-2.5 py-0.5 rounded-lg border ${
                qty <= 0
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : isLow
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}
            >
              <Package className="w-3 h-3 shrink-0" />
              <span>{qty} units</span>
            </span>
            {isLow && qty > 0 && (
              <div className="text-[10px] text-amber-600 font-semibold mt-0.5 flex items-center gap-0.5">
                <AlertTriangle className="w-2.5 h-2.5" /> Low stock
              </div>
            )}
            {qty <= 0 && (
              <div className="text-[10px] text-rose-600 font-semibold mt-0.5">Out of stock</div>
            )}
          </div>
        );
      }
    },
    {
      header: 'Status',
      cell: (row) => (
        <Badge
          variant={row.isActive !== false ? 'emerald' : 'neutral'}
          size="sm"
          className={row.isActive === false ? 'bg-slate-100 text-slate-700 border border-slate-300 font-bold' : ''}
        >
          {row.isActive !== false ? '● Active' : '○ Inactive'}
        </Badge>
      )
    },
    {
      header: 'Actions',
      align: 'right',
      cell: (row) => {
        const canManageStock = hasPermission('inventory.manage') || hasPermission('inventory.adjust') || isManager || isOwner;
        return (
          <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
            {/* Manage Stock Action Button (Available for Manager and Owner) */}
            {canManageStock && (
              <button
                type="button"
                onClick={() => openManageStock(row)}
                title="Manage & Adjust Stock for this product"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold transition-all shadow-2xs cursor-pointer shrink-0"
              >
                <Boxes className="w-3.5 h-3.5 text-emerald-700" />
                <span>Manage Stock</span>
              </button>
            )}

            {/* Stock Active/Inactive Toggle Button (Owner Only) */}
            {isOwner && (
              <button
                type="button"
                onClick={() => editProductMutation.mutate({ id: row._id, data: { isActive: row.isActive === false } })}
                title={row.isActive !== false ? 'Click to mark as Inactive' : 'Click to mark as Active'}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer select-none shadow-2xs shrink-0 ${
                  row.isActive !== false
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300'
                    : 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300'
                }`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${row.isActive !== false ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                <span>{row.isActive !== false ? 'Active' : 'Inactive'}</span>
              </button>
            )}

            {/* Edit Product (Owner Only) */}
            {isOwner && (
              <button
                type="button"
                onClick={() => {
                  setSelectedProduct(row);
                  setIsCustomCategoryEdit(false);
                  setCustomCategoryEditName('');
                  setEditData({
                    name: row.name || '',
                    category: row.category || 'OILS',
                    price: row.price || '',
                    mrp: row.mrp || '',
                    costPrice: row.costPrice || '',
                    unit: row.unit || 'BOTTLE',
                    weight: row.weight || '',
                    lowStockThreshold: row.lowStockThreshold || 15,
                    description: row.description || ''
                  });
                  setEditModalOpen(true);
                }}
                title="Edit Product"
                className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors flex items-center cursor-pointer shrink-0"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Delete Product (Owner Only) */}
            {isOwner && (
              <button
                type="button"
                onClick={() => {
                  setProductToDelete(row);
                  setDeleteModalOpen(true);
                }}
                title="Delete Product"
                className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold transition-colors flex items-center cursor-pointer shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            {!canManageStock && !isOwner && (
              <span className="text-[11px] text-slate-400 italic">View Only</span>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Product Catalog & Formulations</h2>
          <p className="text-xs text-slate-500">Master Ayurvedic catalog, SKU numbers, MRPs, and active pricing</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            icon={Boxes}
            onClick={() => navigate('/inventory')}
            className="text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-2xs"
          >
            Stock Ledger →
          </Button>
          <ExportButton
            onExport={handleExportProducts}
            isLoading={isExporting}
            disabled={products.length === 0}
          />
          {isOwner && (
            <Button
              variant="outline"
              icon={Tag}
              onClick={() => setCategoriesModalOpen(true)}
              className="text-xs font-semibold bg-white hover:bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs"
            >
              Categories
            </Button>
          )}
          {isOwner && (
            <Button variant="primary" icon={Plus} onClick={() => setCreateModalOpen(true)}>
              New Product
            </Button>
          )}
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

      {/* Bento Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bento-card flex flex-col gap-1">
          <div className="bento-metric-title">Catalog Formulations</div>
          <div className="bento-metric-value text-slate-900">{meta.total || products.length}</div>
          <div className="text-[11px] text-slate-500 font-medium">Standard catalog SKUs</div>
        </div>
        <div
          onClick={() => isOwner && setCategoriesModalOpen(true)}
          className={`bento-card flex flex-col gap-1 group transition-all ${
            isOwner ? 'cursor-pointer hover:border-emerald-300 hover:shadow-xs' : ''
          }`}
          title={isOwner ? 'Click to manage and add categories manually' : undefined}
        >
          <div className="flex items-center justify-between">
            <span className="bento-metric-title">Product Categories</span>
            {isOwner && (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 group-hover:bg-emerald-100 transition-colors flex items-center gap-1">
                <Tag className="w-2.5 h-2.5" /> Manage / Add +
              </span>
            )}
          </div>
          <div className="bento-metric-value text-emerald-700">{displayCategories.length}</div>
          <div className="text-[11px] text-emerald-600 font-medium truncate">
            {displayCategories.slice(0, 4).map((c) => c.name.split('/')[0].trim()).join(', ')}
            {displayCategories.length > 4 ? ` +${displayCategories.length - 4} more` : ''}
          </div>
        </div>
        <div className="bento-card flex flex-col gap-1">
          <div className="bento-metric-title">Stock Architecture</div>
          <div className="bento-metric-value text-indigo-600">Branch Direct</div>
          <div className="text-[11px] text-indigo-600 font-medium">Simplified stock ledger</div>
        </div>
      </div>

      {/* Filter Bar with Search, Category, Date Range, and Sorting */}
      <div className="bento-card p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          <div className="lg:col-span-4">
            <Input
              placeholder="Search by product name or SKU..."
              icon={Search}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="lg:col-span-2">
            <Select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              options={filterCategoryOptions}
            />
          </div>
          <div className="lg:col-span-4">
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
          <div className="lg:col-span-2 flex justify-end">
            <SortDropdown
              options={PRODUCT_SORT_OPTIONS}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onChange={({ sortBy: sb, sortOrder: so }) => {
                setSortBy(sb);
                setSortOrder(so);
                setPage(1);
              }}
            />
          </div>
        </div>
      </div>

      <Table
        columns={columns}
        data={products}
        isLoading={isLoading}
        emptyMessage="No products found in catalog."
      />

      <Pagination
        currentPage={page}
        totalPages={meta.totalPages}
        totalItems={meta.total}
        itemsPerPage={15}
        onPageChange={setPage}
      />

      {/* Create Product Modal (Owner Only) */}
      {isOwner && (
        <Modal
          isOpen={createModalOpen}
          onClose={() => {
            setCreateModalOpen(false);
            setIsCustomCategoryCreate(false);
            setCustomCategoryCreateName('');
          }}
          title="Add New Ayurvedic Product"
          subtitle="Define product name, SKU, category, and pricing"
          maxWidth="max-w-lg"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const finalCat = (isCustomCategoryCreate && customCategoryCreateName.trim())
                ? customCategoryCreateName.trim().toUpperCase()
                : (formData.category || 'OILS');
              createProductMutation.mutate({
                ...formData,
                category: finalCat,
                price: Number(formData.price),
                mrp: Number(formData.mrp),
                costPrice: Number(formData.costPrice || 0),
                weight: Number(formData.weight || 0)
              });
            }}
            className="space-y-3.5"
          >
            <Input
              label="Product Name *"
              required
              placeholder="e.g. Maha Sandhi Oil 200ml"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
              <Input
                label="SKU Code *"
                required
                placeholder="e.g. MSO-200"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
              />
              <div>
                {!isCustomCategoryCreate ? (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">Category *</label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomCategoryCreate(true);
                          setCustomCategoryCreateName('');
                        }}
                        className="text-[10.5px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-0.5 cursor-pointer"
                        title="Add a custom formulation category manually"
                      >
                        <Plus className="w-3 h-3" /> + Add New
                      </button>
                    </div>
                    <Select
                      value={formData.category}
                      onChange={(e) => {
                        if (e.target.value === '__NEW__') {
                          setIsCustomCategoryCreate(true);
                          setCustomCategoryCreateName('');
                        } else {
                          setFormData({ ...formData, category: e.target.value });
                        }
                      }}
                      options={[
                        ...categoryOptions,
                        { value: '__NEW__', label: '+ Add New Category Manually...' }
                      ]}
                    />
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">New Category *</label>
                      <button
                        type="button"
                        onClick={() => setIsCustomCategoryCreate(false)}
                        className="text-[10.5px] font-semibold text-slate-500 hover:text-slate-800 hover:underline cursor-pointer"
                      >
                        ← Existing
                      </button>
                    </div>
                    <Input
                      required
                      placeholder="e.g. Herbal Shampoos"
                      value={customCategoryCreateName}
                      onChange={(e) => {
                        setCustomCategoryCreateName(e.target.value);
                        setFormData({ ...formData, category: e.target.value.trim().toUpperCase() });
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Unit *"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                options={[
                  { value: 'BOTTLE', label: 'Bottle' },
                  { value: 'JAR', label: 'Jar' },
                  { value: 'BOX', label: 'Box' },
                  { value: 'PACKET', label: 'Packet' },
                  { value: 'STRIP', label: 'Strip' }
                ]}
              />
              <Input
                label="Weight (grams) *"
                type="number"
                placeholder="e.g. 250"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Selling Price (₹) *"
                type="number"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              />
              <Input
                label="MRP (₹) *"
                type="number"
                required
                value={formData.mrp}
                onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
              />
              <Input
                label="Cost Price (₹)"
                type="number"
                value={formData.costPrice}
                onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="secondary" type="button" className="w-full sm:w-auto" onClick={() => setCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" className="w-full sm:w-auto" isLoading={createProductMutation.isPending}>
                Create Product
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Product Modal */}
      {selectedProduct && editModalOpen && (
        <Modal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setIsCustomCategoryEdit(false);
            setCustomCategoryEditName('');
            setSelectedProduct(null);
          }}
          title={`Edit Product: ${selectedProduct.name}`}
          subtitle={`SKU: ${selectedProduct.sku}`}
          maxWidth="max-w-xl"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const finalCat = (isCustomCategoryEdit && customCategoryEditName.trim())
                ? customCategoryEditName.trim().toUpperCase()
                : (editData.category || 'OILS');
              editProductMutation.mutate({
                id: selectedProduct._id,
                data: {
                  name: editData.name.trim(),
                  category: finalCat,
                  price: Number(editData.price),
                  mrp: Number(editData.mrp),
                  costPrice: editData.costPrice ? Number(editData.costPrice) : undefined,
                  unit: editData.unit,
                  weight: Number(editData.weight || 0),
                  lowStockThreshold: Number(editData.lowStockThreshold || 15),
                  description: editData.description?.trim()
                }
              });
            }}
            className="space-y-3.5"
          >
            <Input
              label="Product Name *"
              required
              value={editData.name}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
              <div>
                {!isCustomCategoryEdit ? (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">Category *</label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomCategoryEdit(true);
                          setCustomCategoryEditName('');
                        }}
                        className="text-[10.5px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-0.5 cursor-pointer"
                        title="Add a custom formulation category manually"
                      >
                        <Plus className="w-3 h-3" /> + Add New
                      </button>
                    </div>
                    <Select
                      value={editData.category}
                      onChange={(e) => {
                        if (e.target.value === '__NEW__') {
                          setIsCustomCategoryEdit(true);
                          setCustomCategoryEditName('');
                        } else {
                          setEditData({ ...editData, category: e.target.value });
                        }
                      }}
                      options={[
                        ...categoryOptions,
                        { value: '__NEW__', label: '+ Add New Category Manually...' }
                      ]}
                    />
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">New Category *</label>
                      <button
                        type="button"
                        onClick={() => setIsCustomCategoryEdit(false)}
                        className="text-[10.5px] font-semibold text-slate-500 hover:text-slate-800 hover:underline cursor-pointer"
                      >
                        ← Existing
                      </button>
                    </div>
                    <Input
                      required
                      placeholder="e.g. Pain Relief Balms"
                      value={customCategoryEditName}
                      onChange={(e) => {
                        setCustomCategoryEditName(e.target.value);
                        setEditData({ ...editData, category: e.target.value.trim().toUpperCase() });
                      }}
                    />
                  </div>
                )}
              </div>
              <Select
                label="Unit of Measurement *"
                value={editData.unit}
                onChange={(e) => setEditData({ ...editData, unit: e.target.value })}
                options={[
                  { value: 'BOTTLE', label: 'Bottle' },
                  { value: 'JAR', label: 'Jar' },
                  { value: 'BOX', label: 'Box' },
                  { value: 'PACKET', label: 'Packet' },
                  { value: 'STRIP', label: 'Strip' },
                  { value: 'KG', label: 'Kilogram' },
                  { value: 'GM', label: 'Gram' }
                ]}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Selling Price (₹) *"
                type="number"
                required
                value={editData.price}
                onChange={(e) => setEditData({ ...editData, price: e.target.value })}
              />
              <Input
                label="MRP (₹) *"
                type="number"
                required
                value={editData.mrp}
                onChange={(e) => setEditData({ ...editData, mrp: e.target.value })}
              />
              <Input
                label="Cost Price (₹)"
                type="number"
                value={editData.costPrice}
                onChange={(e) => setEditData({ ...editData, costPrice: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Weight (grams)"
                type="number"
                placeholder="e.g. 250"
                value={editData.weight}
                onChange={(e) => setEditData({ ...editData, weight: e.target.value })}
              />
              <Input
                label="Low Stock Alert Threshold"
                type="number"
                value={editData.lowStockThreshold}
                onChange={(e) => setEditData({ ...editData, lowStockThreshold: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Product Description</label>
              <textarea
                rows={2}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-ayur-500 focus:bg-white outline-none"
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                placeholder="Ingredients, benefits, dosage guidelines..."
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="secondary" type="button" className="w-full sm:w-auto" onClick={() => setEditModalOpen(false)} disabled={editProductMutation.isPending}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" className="w-full sm:w-auto" isLoading={editProductMutation.isPending}>
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Product Confirmation Modal */}
      {productToDelete && deleteModalOpen && (
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setProductToDelete(null);
          }}
          title="Remove Product Confirmation"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-100 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-red-800">
                <p className="font-bold mb-1">Are you sure you want to remove this product?</p>
                <p>
                  <strong>{productToDelete.name}</strong> ({productToDelete.sku}) will be deactivated and removed from the active catalog.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setDeleteModalOpen(false)} disabled={deleteProductMutation.isPending}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => deleteProductMutation.mutate(productToDelete._id)}
                isLoading={deleteProductMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Remove Product
              </Button>
            </div>
          </div>
        </Modal>
      )}
      {/* Manage Stock Modal (Available for Manager and Owner) */}
      {stockModalOpen && stockTargetProduct && (
        <Modal
          isOpen={stockModalOpen}
          onClose={() => {
            setStockModalOpen(false);
            setStockTargetProduct(null);
          }}
          title={`Manage Stock: ${stockTargetProduct.name}`}
          subtitle={`SKU: ${stockTargetProduct.sku} • Selling Price: ₹${stockTargetProduct.price}`}
          maxWidth="max-w-md"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              manageStockMutation.mutate({
                productId: stockTargetProduct._id,
                actionType: stockActionType,
                quantity: stockQuantity,
                reason: stockReason,
                notes: stockNotes,
                branchId: stockTargetBranch
              });
            }}
            className="space-y-4 text-xs"
          >
            {/* Current Stock Banner */}
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Current Branch Stock</span>
                <span className="font-bold text-slate-800 text-xs">
                  {availableBranches.find(b => String(b._id || b.id) === String(stockTargetBranch || selectedBranchId))?.name || availableBranches[0]?.name || 'Assigned Branch'}
                </span>
              </div>
              <div className="text-right">
                <span className={`text-base font-black font-mono ${
                  (stockTargetProduct.stock ?? stockTargetProduct.availableQuantity ?? 0) <= (stockTargetProduct.lowStockThreshold || 15)
                    ? 'text-rose-600'
                    : 'text-emerald-700'
                }`}>
                  {stockTargetProduct.stock ?? stockTargetProduct.availableQuantity ?? 0} units
                </span>
                <span className="text-[10px] text-slate-400 block">Available</span>
              </div>
            </div>

            {/* Action Type Toggle (Stock In, Stock Out, Direct Adjust) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Select Stock Operation *</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setStockActionType('IN');
                    setStockReason('PURCHASE');
                  }}
                  className={`py-2 px-2.5 rounded-xl border font-bold text-center transition-all cursor-pointer ${
                    stockActionType === 'IN'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  <div className="text-sm">📥</div>
                  <div className="text-[11px] mt-0.5">Stock In (+)</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStockActionType('OUT');
                    setStockReason('DAMAGED');
                  }}
                  className={`py-2 px-2.5 rounded-xl border font-bold text-center transition-all cursor-pointer ${
                    stockActionType === 'OUT'
                      ? 'bg-rose-50 text-rose-800 border-rose-400 ring-2 ring-rose-500/20 shadow-xs'
                      : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  <div className="text-sm">📤</div>
                  <div className="text-[11px] mt-0.5">Stock Out (-)</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStockActionType('ADJUST');
                    setStockReason('PHYSICAL_AUDIT');
                  }}
                  className={`py-2 px-2.5 rounded-xl border font-bold text-center transition-all cursor-pointer ${
                    stockActionType === 'ADJUST'
                      ? 'bg-blue-50 text-blue-800 border-blue-400 ring-2 ring-blue-500/20 shadow-xs'
                      : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  <div className="text-sm">⚖️</div>
                  <div className="text-[11px] mt-0.5">Audit Set</div>
                </button>
              </div>
            </div>

            {/* If Owner with multiple branches, show branch picker */}
            {isOwner && availableBranches.length > 1 && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Branch *</label>
                <select
                  value={stockTargetBranch || selectedBranchId}
                  onChange={(e) => setStockTargetBranch(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                >
                  {availableBranches.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Quantity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label={stockActionType === 'ADJUST' ? 'New Available Stock Level *' : 'Quantity Units *'}
                type="number"
                min="1"
                required
                placeholder="e.g. 10"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
              />

              <Select
                label="Reason / Category *"
                value={stockReason}
                onChange={(e) => setStockReason(e.target.value)}
                options={
                  stockActionType === 'IN'
                    ? [
                        { value: 'PURCHASE', label: 'Supplier Purchase / Restock' },
                        { value: 'PRODUCTION', label: 'Factory Production' },
                        { value: 'INITIAL_STOCK', label: 'Initial Baseline' },
                        { value: 'RETURN', label: 'Customer Return Restock' }
                      ]
                    : stockActionType === 'OUT'
                    ? [
                        { value: 'DAMAGED', label: 'Damaged / Broken' },
                        { value: 'EXPIRED', label: 'Expired Product' },
                        { value: 'SAMPLE', label: 'Doctor / Marketing Sample' },
                        { value: 'INTERNAL_USE', label: 'Internal Branch Consumption' }
                      ]
                    : [
                        { value: 'PHYSICAL_AUDIT', label: 'Physical Count Audit' },
                        { value: 'SYSTEM_CORRECTION', label: 'Discrepancy Correction' }
                      ]
                }
              />
            </div>

            <Input
              label="Reference / Movement Notes"
              placeholder="e.g. GRN-2026-081 or Monthly Stocktake verification"
              value={stockNotes}
              onChange={(e) => setStockNotes(e.target.value)}
            />

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="secondary"
                type="button"
                className="w-full sm:w-auto"
                onClick={() => {
                  setStockModalOpen(false);
                  setStockTargetProduct(null);
                }}
                disabled={manageStockMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                isLoading={manageStockMutation.isPending}
                className={
                  stockActionType === 'OUT'
                    ? 'w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white font-bold'
                    : 'w-full sm:w-auto bg-emerald-700 hover:bg-emerald-800 text-white font-bold'
                }
              >
                {stockActionType === 'IN' ? 'Confirm Stock In' : stockActionType === 'OUT' ? 'Confirm Stock Out' : 'Save Stock Adjustment'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Category Management Modal (Owner Only) */}
      {isOwner && categoriesModalOpen && (
        <Modal
          isOpen={categoriesModalOpen}
          onClose={() => {
            setCategoriesModalOpen(false);
            setCatError('');
          }}
          title="Product Formulation Categories"
          subtitle="Manage product categories or add new custom categories manually"
          maxWidth="max-w-xl"
        >
          <div className="space-y-4">
            {/* Add New Category Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newCatName.trim()) return;
                createCategoryMutation.mutate({
                  name: newCatName.trim(),
                  code: newCatCode.trim() ? newCatCode.trim().toUpperCase() : undefined,
                  description: newCatDesc.trim() || undefined
                });
              }}
              className="p-3.5 bg-emerald-50/60 border border-emerald-200/80 rounded-xl space-y-3"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                <Tag className="w-4 h-4 text-emerald-700" />
                <span>Add New Category Manually</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <Input
                  label="Category Name *"
                  required
                  placeholder="e.g. Pain Relief Balms"
                  value={newCatName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewCatName(val);
                    if (!newCatCode || newCatCode === newCatName.toUpperCase().replace(/[^A-Z0-9]/g, '_')) {
                      setNewCatCode(val.toUpperCase().replace(/[^A-Z0-9]/g, '_'));
                    }
                  }}
                />
                <Input
                  label="Code / Tag (Optional)"
                  placeholder="e.g. BALMS"
                  value={newCatCode}
                  onChange={(e) => setNewCatCode(e.target.value.toUpperCase())}
                />
              </div>
              <Input
                label="Description (Optional)"
                placeholder="e.g. Topical herbal balms and pain relief ointments"
                value={newCatDesc}
                onChange={(e) => setNewCatDesc(e.target.value)}
              />
              {catError && (
                <div className="text-xs text-rose-600 font-semibold bg-rose-50 p-2 rounded-lg border border-rose-200">
                  {catError}
                </div>
              )}
              <div className="flex justify-end pt-1">
                <Button
                  variant="primary"
                  type="submit"
                  size="sm"
                  icon={Plus}
                  isLoading={createCategoryMutation.isPending}
                >
                  Save Category
                </Button>
              </div>
            </form>

            {/* Existing Categories List */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Active Categories ({displayCategories.length})
                </h4>
                <span className="text-[11px] text-slate-500">System & Custom formulation tags</span>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100 border border-slate-100 rounded-xl p-2 bg-slate-50/50">
                {displayCategories.map((cat) => (
                  <div
                    key={cat._id || cat.code}
                    className="pt-2 first:pt-0 flex items-center justify-between text-xs py-1.5 px-2 hover:bg-white rounded-lg transition-colors"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{cat.name}</span>
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-mono font-semibold">
                          {cat.code}
                        </span>
                        {cat.isSystem ? (
                          <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            Standard
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                            Custom
                          </span>
                        )}
                      </div>
                      {cat.description && (
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">{cat.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-[11px] font-mono text-slate-500">
                        {cat.productCount ?? 0} products
                      </span>
                      {!cat.isSystem && cat._id && (
                        <button
                          type="button"
                          onClick={() => deleteCategoryMutation.mutate(cat._id)}
                          title="Delete Custom Category"
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button variant="secondary" onClick={() => setCategoriesModalOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default ProductCatalogPage;
