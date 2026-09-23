import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Layers, Calendar, Tag, Package, Pencil, Trash2, AlertTriangle } from 'lucide-react';
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
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const { selectedBranchId } = useBranch();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [isExporting, setIsExporting] = useState(false);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productToDelete, setProductToDelete] = useState(null);
  const [actionMsg, setActionMsg] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'OILS',
    price: '',
    mrp: '',
    costPrice: '',
    unit: 'BOTTLE',
    lowStockThreshold: 15,
    initialBatchNumber: ''
  });

  const [editData, setEditData] = useState({
    name: '',
    category: 'OILS',
    price: '',
    mrp: '',
    costPrice: '',
    unit: 'BOTTLE',
    lowStockThreshold: 15,
    description: ''
  });

  const [batchData, setBatchData] = useState({
    batchNumber: '',
    manufacturingDate: '',
    expiryDate: '',
    mrp: '',
    purchasePrice: ''
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

  const products = productResponse?.data || [];
  const meta = productResponse?.meta || { page: 1, totalPages: 1, total: 0 };

  const createProductMutation = useMutation({
    mutationFn: (data) => apiClient.post('/products', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      setCreateModalOpen(false);
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
        lowStockThreshold: 15,
        initialBatchNumber: ''
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
      queryClient.invalidateQueries(['products']);
      setEditModalOpen(false);
      setSelectedProduct(null);
      setActionMsg('✓ Product updated successfully');
      setTimeout(() => setActionMsg(''), 3000);
    }
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      setDeleteModalOpen(false);
      setProductToDelete(null);
      setActionMsg('✓ Product removed successfully');
      setTimeout(() => setActionMsg(''), 3000);
    }
  });

  const addBatchMutation = useMutation({
    mutationFn: ({ productId, data }) => apiClient.post(`/products/${productId}/batches`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      setBatchModalOpen(false);
      setActionMsg('✓ Batch added successfully');
      setTimeout(() => setActionMsg(''), 3000);
      setBatchData({ batchNumber: '', manufacturingDate: '', expiryDate: '', mrp: '', purchasePrice: '' });
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
        'Active Batches Count': p.batches?.length || 0,
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
      header: 'Active Batches',
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.batches?.length === 0 ? (
            <span className="text-xs text-slate-400 italic">No batches</span>
          ) : (
            row.batches?.map((b) => (
              <Badge key={b._id} variant="neutral" size="sm">
                {b.batchNumber} (Exp: {new Date(b.expiryDate).toLocaleDateString()})
              </Badge>
            ))
          )}
        </div>
      )
    },
    {
      header: 'Actions',
      align: 'right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            size="sm"
            variant="outline"
            icon={Plus}
            onClick={() => {
              setSelectedProduct(row);
              setBatchModalOpen(true);
            }}
          >
            Add Batch
          </Button>

          {/* Edit Product */}
          <button
            type="button"
            onClick={() => {
              setSelectedProduct(row);
              setEditData({
                name: row.name || '',
                category: row.category || 'OILS',
                price: row.price || '',
                mrp: row.mrp || '',
                costPrice: row.costPrice || '',
                unit: row.unit || 'BOTTLE',
                lowStockThreshold: row.lowStockThreshold || 15,
                description: row.description || ''
              });
              setEditModalOpen(true);
            }}
            title="Edit Product"
            className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors flex items-center cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>

          {/* Delete Product */}
          <button
            type="button"
            onClick={() => {
              setProductToDelete(row);
              setDeleteModalOpen(true);
            }}
            title="Delete Product"
            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold transition-colors flex items-center cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Product Catalog & Batches</h2>
          <p className="text-xs text-slate-500">Master Ayurvedic catalog, SKU numbers, MRPs, and batch lifecycles</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton
            onExport={handleExportProducts}
            isLoading={isExporting}
            disabled={products.length === 0}
          />
          <Button variant="primary" icon={Plus} onClick={() => setCreateModalOpen(true)}>
            New Product
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

      {/* Bento Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bento-card flex flex-col gap-1">
          <div className="bento-metric-title">Catalog Formulations</div>
          <div className="bento-metric-value text-slate-900">{meta.total || products.length}</div>
          <div className="text-[11px] text-slate-500 font-medium">Standard catalog SKUs</div>
        </div>
        <div className="bento-card flex flex-col gap-1">
          <div className="bento-metric-title">Product Categories</div>
          <div className="bento-metric-value text-emerald-700">7</div>
          <div className="text-[11px] text-emerald-600 font-medium">Oils, Churnas, Tonics, Kits</div>
        </div>
        <div className="bento-card flex flex-col gap-1">
          <div className="bento-metric-title">Batch Lifecycle Tracking</div>
          <div className="bento-metric-value text-indigo-600">Active</div>
          <div className="text-[11px] text-indigo-600 font-medium">Manufacturing & Expiry tracked</div>
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
              options={[
                { value: '', label: 'All Categories' },
                { value: 'OILS', label: 'Ayurvedic Oils' },
                { value: 'CHURNAS', label: 'Choornams / Powders' },
                { value: 'CAPSULES', label: 'Capsules / Tablets' },
                { value: 'TONICS', label: 'Tonics / Syrups' },
                { value: 'TABLETS', label: 'Tablets' },
                { value: 'KITS', label: 'Treatment Kits' },
                { value: 'OTHER', label: 'Other' }
              ]}
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

      {/* Create Product Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Add New Ayurvedic Product"
        subtitle="Catalog definition and initial batch registration"
        maxWidth="max-w-lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createProductMutation.mutate({
              ...formData,
              price: Number(formData.price),
              mrp: Number(formData.mrp),
              costPrice: Number(formData.costPrice || 0),
              initialBatch: formData.initialBatchNumber
                ? { batchNumber: formData.initialBatchNumber }
                : undefined
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

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="SKU Code *"
              required
              placeholder="e.g. MSO-200"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
            />
            <Select
              label="Category *"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              options={[
                { value: 'OILS', label: 'Ayurvedic Oils' },
                { value: 'CHURNAS', label: 'Choornams / Powders' },
                { value: 'CAPSULES', label: 'Capsules' },
                { value: 'TONICS', label: 'Tonics / Syrups' },
                { value: 'TABLETS', label: 'Tablets' },
                { value: 'KITS', label: 'Treatment Kits' },
                { value: 'OTHER', label: 'Other' }
              ]}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
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

          <Input
            label="Initial Batch Number (Optional)"
            placeholder="e.g. BAT-2026-01"
            value={formData.initialBatchNumber}
            onChange={(e) => setFormData({ ...formData, initialBatchNumber: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={createProductMutation.isPending}>
              Create Product
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Batch Modal */}
      {selectedProduct && (
        <Modal
          isOpen={batchModalOpen}
          onClose={() => setBatchModalOpen(false)}
          title={`Add Batch for ${selectedProduct.name}`}
          subtitle={`SKU: ${selectedProduct.sku}`}
          maxWidth="max-w-md"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addBatchMutation.mutate({
                productId: selectedProduct._id,
                data: {
                  ...batchData,
                  mrp: batchData.mrp ? Number(batchData.mrp) : selectedProduct.mrp,
                  purchasePrice: batchData.purchasePrice ? Number(batchData.purchasePrice) : selectedProduct.costPrice
                }
              });
            }}
            className="space-y-3.5"
          >
            <Input
              label="Batch Number *"
              required
              placeholder="e.g. BAT-2026-02"
              value={batchData.batchNumber}
              onChange={(e) => setBatchData({ ...batchData, batchNumber: e.target.value.toUpperCase() })}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Manufacturing Date"
                type="date"
                value={batchData.manufacturingDate}
                onChange={(e) => setBatchData({ ...batchData, manufacturingDate: e.target.value })}
              />
              <Input
                label="Expiry Date *"
                type="date"
                required
                value={batchData.expiryDate}
                onChange={(e) => setBatchData({ ...batchData, expiryDate: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="secondary" type="button" onClick={() => setBatchModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" isLoading={addBatchMutation.isPending}>
                Save Batch
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
            setSelectedProduct(null);
          }}
          title={`Edit Product: ${selectedProduct.name}`}
          subtitle={`SKU: ${selectedProduct.sku}`}
          maxWidth="max-w-xl"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              editProductMutation.mutate({
                id: selectedProduct._id,
                data: {
                  name: editData.name.trim(),
                  category: editData.category,
                  price: Number(editData.price),
                  mrp: Number(editData.mrp),
                  costPrice: editData.costPrice ? Number(editData.costPrice) : undefined,
                  unit: editData.unit,
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

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Category *"
                value={editData.category}
                onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                options={[
                  { value: 'OILS', label: 'Ayurvedic Taila / Oils' },
                  { value: 'CHURNAS', label: 'Churnas & Powders' },
                  { value: 'RASAYANAS', label: 'Rasayanas & Lehyams' },
                  { value: 'TABLETS', label: 'Vati / Tablets' },
                  { value: 'CAPSULES', label: 'Capsules' },
                  { value: 'KITS', label: 'Treatment Kits' },
                  { value: 'RAW_HERBS', label: 'Raw Herbs' }
                ]}
              />
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

            <div className="grid grid-cols-3 gap-3">
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

            <Input
              label="Low Stock Alert Threshold"
              type="number"
              value={editData.lowStockThreshold}
              onChange={(e) => setEditData({ ...editData, lowStockThreshold: e.target.value })}
            />

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

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="secondary" type="button" onClick={() => setEditModalOpen(false)} disabled={editProductMutation.isPending}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" isLoading={editProductMutation.isPending}>
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
    </div>
  );
}

export default ProductCatalogPage;
