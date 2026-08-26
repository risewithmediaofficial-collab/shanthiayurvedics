import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, CheckCircle2, Scale, Box, Tag, RefreshCw } from 'lucide-react';
import apiClient from '../../api/apiClient.js';
import { Table } from '../../components/common/Table.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { Modal } from '../../components/common/Modal.jsx';
import { Input } from '../../components/common/Input.jsx';
import { Select } from '../../components/common/Select.jsx';

export function PackingStationPage() {
  const queryClient = useQueryClient();
  const [packModalOpen, setPackModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusTab, setStatusTab] = useState('ALL_AWAITING'); // ALL_AWAITING, PROCESSING, CONFIRMED, PACKED

  const [packForm, setPackForm] = useState({
    weightGrams: 450,
    boxType: 'Standard Corrugated Box',
    lengthCm: 20,
    widthCm: 15,
    heightCm: 10,
    sealNumber: `SEAL-${Date.now().toString().slice(-4)}`,
    notes: ''
  });

  const { data: ordersResponse, isLoading } = useQuery({
    queryKey: ['packingQueue', statusTab],
    queryFn: async () => {
      let params = { limit: 50 };
      if (statusTab === 'PACKED') {
        params.status = 'PACKED';
      } else if (statusTab === 'PROCESSING') {
        params.status = 'PROCESSING';
      } else if (statusTab === 'CONFIRMED') {
        params.status = 'CONFIRMED';
      }
      const res = await apiClient.get('/orders', { params });
      return res.data;
    }
  });

  const allOrders = ordersResponse?.data || [];
  const orders = statusTab === 'ALL_AWAITING'
    ? allOrders.filter((o) => o.status === 'CONFIRMED' || o.status === 'PROCESSING' || o.status === 'READY_FOR_PACKING')
    : allOrders;

  const packMutation = useMutation({
    mutationFn: ({ orderId, data }) => apiClient.post(`/operations/orders/${orderId}/pack`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['packingQueue']);
      queryClient.invalidateQueries(['orders']);
      queryClient.invalidateQueries(['operationsSummary']);
      setPackModalOpen(false);
    }
  });

  const columns = [
    {
      header: 'Order Reference',
      cell: (row) => (
        <div>
          <div className="font-bold text-slate-900 font-mono text-xs">{row.orderNumber}</div>
          <div className="text-[10px] text-slate-500">{new Date(row.createdAt).toLocaleDateString()}</div>
        </div>
      )
    },
    {
      header: 'Customer & City',
      cell: (row) => (
        <div>
          <div className="font-bold text-slate-900 text-xs">
            {row.patientDetails?.patientName || row.customerId?.name}
          </div>
          <div className="text-[10px] text-slate-500">{row.deliveryAddress?.city}, {row.deliveryAddress?.state}</div>
        </div>
      )
    },
    {
      header: 'Items to Pack',
      cell: (row) => (
        <div className="text-xs text-slate-700">
          {row.items?.map((item, idx) => (
            <div key={idx}>
              <span className="font-semibold text-slate-900">{item.quantity}x</span> {item.productName}
            </div>
          ))}
        </div>
      )
    },
    {
      header: 'Status',
      cell: (row) => (
        <Badge variant={row.status === 'PACKED' ? 'purple' : 'warning'} size="sm">
          {row.status}
        </Badge>
      )
    },
    {
      header: 'Actions',
      align: 'right',
      cell: (row) => (
        row.status !== 'PACKED' ? (
          <Button
            size="sm"
            variant="primary"
            icon={Package}
            onClick={() => {
              setSelectedOrder(row);
              setPackModalOpen(true);
            }}
          >
            Pack Parcel
          </Button>
        ) : (
          <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100">
            ✓ Box Sealed
          </span>
        )
      )
    }
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Packing Station Queue</h2>
        <p className="text-xs text-slate-500">
          Physical SKU order fulfillment, tamper-evident parcel sealing, and precision weigh-in
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setStatusTab('ALL_AWAITING')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            statusTab === 'ALL_AWAITING' ? 'bg-ayur-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All Awaiting Packing
        </button>
        <button
          onClick={() => setStatusTab('CONFIRMED')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            statusTab === 'CONFIRMED' ? 'bg-blue-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Confirmed Queue
        </button>
        <button
          onClick={() => setStatusTab('PROCESSING')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            statusTab === 'PROCESSING' ? 'bg-amber-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Processing Bay
        </button>
        <button
          onClick={() => setStatusTab('PACKED')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            statusTab === 'PACKED' ? 'bg-purple-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Packed & Ready
        </button>
      </div>

      <Table
        columns={columns}
        data={orders}
        isLoading={isLoading}
        emptyMessage="No orders found in this packing queue."
      />

      {/* Pack Modal */}
      {selectedOrder && (
        <Modal
          isOpen={packModalOpen}
          onClose={() => setPackModalOpen(false)}
          title={`Pack Order ${selectedOrder.orderNumber}`}
          subtitle="Record physical box dimensions, security seal, and calibrated weight"
          maxWidth="max-w-lg"
          icon="📦"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              packMutation.mutate({
                orderId: selectedOrder._id,
                data: {
                  weightGrams: Number(packForm.weightGrams),
                  dimensions: {
                    lengthCm: Number(packForm.lengthCm),
                    widthCm: Number(packForm.widthCm),
                    heightCm: Number(packForm.heightCm)
                  },
                  boxType: packForm.boxType,
                  sealNumber: packForm.sealNumber,
                  notes: packForm.notes
                }
              });
            }}
            className="space-y-4"
          >
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Order Items to Verify</div>
              <div className="space-y-1">
                {selectedOrder.items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-xs text-slate-800">
                    <span>{item.quantity}x {item.productName}</span>
                    <span className="font-mono text-slate-500">₹{item.total}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Parcel Weight (grams) *"
                type="number"
                required
                value={packForm.weightGrams}
                onChange={(e) => setPackForm({ ...packForm, weightGrams: e.target.value })}
              />
              <Select
                label="Outer Box Type *"
                value={packForm.boxType}
                onChange={(e) => setPackForm({ ...packForm, boxType: e.target.value })}
                options={[
                  { value: 'Standard Corrugated Box', label: 'Standard Corrugated Box' },
                  { value: 'Heavy Duty Herbal Pouch', label: 'Heavy Duty Herbal Pouch' },
                  { value: 'Fragile Glass Bottle Box', label: 'Fragile Glass Bottle Box' }
                ]}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Length (cm)"
                type="number"
                value={packForm.lengthCm}
                onChange={(e) => setPackForm({ ...packForm, lengthCm: e.target.value })}
              />
              <Input
                label="Width (cm)"
                type="number"
                value={packForm.widthCm}
                onChange={(e) => setPackForm({ ...packForm, widthCm: e.target.value })}
              />
              <Input
                label="Height (cm)"
                type="number"
                value={packForm.heightCm}
                onChange={(e) => setPackForm({ ...packForm, heightCm: e.target.value })}
              />
            </div>

            <Input
              label="Tamper Evident Seal Number"
              value={packForm.sealNumber}
              onChange={(e) => setPackForm({ ...packForm, sealNumber: e.target.value })}
            />

            <Input
              label="Packing Remarks"
              placeholder="e.g. Added bubble wrap for herbal oil bottles"
              value={packForm.notes}
              onChange={(e) => setPackForm({ ...packForm, notes: e.target.value })}
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="secondary" type="button" onClick={() => setPackModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" isLoading={packMutation.isPending}>
                Seal & Mark Packed
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default PackingStationPage;
