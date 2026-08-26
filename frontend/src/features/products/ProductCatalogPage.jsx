import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Layers, Calendar, Tag, Package } from 'lucide-react';
import apiClient from '../../api/apiClient.js';
import { usePermissions } from '../../hooks/usePermissions.js';
import { Table } from '../../components/common/Table.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Input } from '../../components/common/Input.jsx';
import { Select } from '../../components/common/Select.jsx';
import { Modal } from '../../components/common/Modal.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { Pagination } from '../../components/common/Pagination.jsx';

export function ProductCatalogPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

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

  const [batchData, setBatchData] = useState({
    batchNumber: '',
    manufacturingDate: '',
    expiryDate: '',
    mrp: '',
    purchasePrice: ''
  });

  const { data: productResponse, isLoading } = useQuery({
    queryKey: ['products', page, search, categoryFilter],
    queryFn: async () => {
      const res = await apiClient.get('/products', {
        params: { page, limit: 15, search, category: categoryFilter }
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
    }
  });

  const addBatchMutation = useMutation({
    mutationFn: ({ productId, data }) => apiClient.post(`/products/${productId}/batches`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      setBatchModalOpen(false);
      setBatchData({ batchNumber: '', manufacturingDate: '', expiryDate: '', mrp: '', purchasePrice: '' });
    }
  });

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
        <Button variant="primary" icon={Plus} onClick={() => setCreateModalOpen(true)}>
          New Product
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-white rounded-xl border border-slate-200">
        <div className="flex-1 min-w-[200px]">
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
        <div className="w-48">
          <Select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All Categories' },
              { value: 'OILS', label: 'Ayurvedic Oils' },
              { value: 'CAPSULES', label: 'Capsules / Tablets' },
              { value: 'POWDERS', label: 'Choornams / Powders' },
              { value: 'SYRUPS', label: 'Arishtams / Syrups' },
              { value: 'CREAMS', label: 'Balms & Creams' }
            ]}
          />
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
                { value: 'CAPSULES', label: 'Capsules / Tablets' },
                { value: 'POWDERS', label: 'Choornams / Powders' },
                { value: 'SYRUPS', label: 'Arishtams / Syrups' },
                { value: 'CREAMS', label: 'Balms & Creams' }
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
    </div>
  );
}

export default ProductCatalogPage;
