import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Eye, CheckCircle2, XCircle, ShoppingBag, Truck, Package, Printer, Tag } from 'lucide-react';
import apiClient from '../../api/apiClient.js';
import { usePermissions } from '../../hooks/usePermissions.js';
import { useBranch } from '../../context/BranchContext.jsx';
import { Table } from '../../components/common/Table.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Input } from '../../components/common/Input.jsx';
import { Select } from '../../components/common/Select.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { Pagination } from '../../components/common/Pagination.jsx';
import { OrderCreateModal } from './OrderCreateModal.jsx';
import { PrintableInvoiceModal } from './PrintableInvoiceModal.jsx';
import { PrintableShippingLabelModal } from './PrintableShippingLabelModal.jsx';

export function OrderListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { hasPermission, isTelecaller } = usePermissions();
  const { selectedBranchId } = useBranch();

  const initialStatus = searchParams.get('status') || '';
  const isNewRequested = searchParams.get('new') === 'true';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [createModalOpen, setCreateModalOpen] = useState(isNewRequested);
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState(null);
  const [selectedOrderForLabel, setSelectedOrderForLabel] = useState(null);

  useEffect(() => {
    const status = searchParams.get('status');
    if (status !== null) {
      setStatusFilter(status);
    }
    if (searchParams.get('new') === 'true') {
      setCreateModalOpen(true);
    }
  }, [searchParams]);

  // Fetch Orders
  const { data: ordersResponse, isLoading } = useQuery({
    queryKey: ['orders', page, search, statusFilter, selectedBranchId],
    queryFn: async () => {
      const params = { page, limit: 15 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await apiClient.get('/orders', { params });
      return res.data;
    }
  });

  const orders = ordersResponse?.data || [];
  const meta = ordersResponse?.meta || { page: 1, totalPages: 1, total: 0 };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'NEW': return <Badge variant="primary">New</Badge>;
      case 'CONFIRMED': return <Badge variant="info">Confirmed</Badge>;
      case 'PROCESSING': return <Badge variant="warning">Processing</Badge>;
      case 'READY_FOR_PACKING': return <Badge variant="warning">Ready for Packing</Badge>;
      case 'PACKED': return <Badge variant="purple">Packed</Badge>;
      case 'READY_FOR_DISPATCH': return <Badge variant="info">Ready Dispatch</Badge>;
      case 'DISPATCHED': return <Badge variant="info">Dispatched</Badge>;
      case 'DELIVERED': return <Badge variant="emerald">Delivered</Badge>;
      case 'RTO': return <Badge variant="danger">RTO Return</Badge>;
      case 'CANCELLED': return <Badge variant="neutral">Cancelled</Badge>;
      default: return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const columns = [
    {
      header: 'Order Number',
      cell: (row) => (
        <div>
          <div className="font-bold text-slate-900 font-mono text-xs">{row.orderNumber}</div>
          <div className="text-[10px] text-slate-500">{new Date(row.createdAt).toLocaleDateString()}</div>
        </div>
      )
    },
    {
      header: 'Customer',
      cell: (row) => {
        const name = row.patientDetails?.patientName || row.customerId?.name || 'Customer';
        const mobile = row.patientDetails?.mobile || row.customerId?.mobile || '—';
        return (
          <div>
            <div className="font-bold text-slate-900 text-xs">{name}</div>
            <div className="text-[10px] text-slate-500 font-mono">{mobile}</div>
          </div>
        );
      }
    },
    {
      header: 'Items & Units',
      cell: (row) => (
        <div className="text-xs text-slate-700">
          {row.items?.map((item, idx) => (
            <div key={idx}>
              {item.quantity}x {item.productName}
            </div>
          ))}
        </div>
      )
    },
    {
      header: 'Grand Total',
      cell: (row) => (
        <div className="text-xs font-bold text-slate-900">
          ₹{row.grandTotal?.toLocaleString()}
          <span className="text-[10px] font-normal text-slate-500 block">({row.paymentMethod})</span>
        </div>
      )
    },
    {
      header: 'Status',
      cell: (row) => getStatusBadge(row.status)
    },
    {
      header: 'Branch',
      cell: (row) => <Badge variant="neutral" size="sm">{row.branchId?.name}</Badge>
    },
    {
      header: 'Actions',
      align: 'right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedOrderForInvoice(row)}
            title="Tax Invoice"
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
          >
            📄
          </button>
          <button
            type="button"
            onClick={() => setSelectedOrderForLabel(row)}
            title="Shipping Label"
            className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold"
          >
            🏷️
          </button>
          <Button
            size="sm"
            variant="outline"
            icon={Eye}
            onClick={() => navigate(`/orders/${row._id}`)}
          >
            Details
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Order Lifecycle & Management</h2>
          <p className="text-xs text-slate-500">Stock reservation, state transitions, invoice printing, and courier dispatch</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setCreateModalOpen(true)}>
          Create Order
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-white rounded-xl border border-slate-200">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search by order number or city..."
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
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'NEW', label: 'New' },
              { value: 'CONFIRMED', label: 'Confirmed' },
              { value: 'PROCESSING', label: 'Processing' },
              { value: 'PACKED', label: 'Packed' },
              { value: 'DISPATCHED', label: 'Dispatched' },
              { value: 'DELIVERED', label: 'Delivered' },
              { value: 'RTO', label: 'RTO' },
              { value: 'CANCELLED', label: 'Cancelled' }
            ]}
          />
        </div>
      </div>

      <Table
        columns={columns}
        data={orders}
        isLoading={isLoading}
        emptyMessage="No orders found."
      />

      <Pagination
        currentPage={page}
        totalPages={meta.totalPages}
        totalItems={meta.total}
        itemsPerPage={15}
        onPageChange={setPage}
      />

      {/* Full Order Creation Modal */}
      {createModalOpen && (
        <OrderCreateModal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
        />
      )}

      {/* Printable Tax Invoice Modal */}
      {selectedOrderForInvoice && (
        <PrintableInvoiceModal
          isOpen={Boolean(selectedOrderForInvoice)}
          onClose={() => setSelectedOrderForInvoice(null)}
          order={selectedOrderForInvoice}
        />
      )}

      {/* Printable Shipping Label Modal */}
      {selectedOrderForLabel && (
        <PrintableShippingLabelModal
          isOpen={Boolean(selectedOrderForLabel)}
          onClose={() => setSelectedOrderForLabel(null)}
          order={selectedOrderForLabel}
        />
      )}
    </div>
  );
}

export default OrderListPage;
