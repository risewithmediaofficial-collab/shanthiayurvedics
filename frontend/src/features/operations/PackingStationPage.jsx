import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, CheckCircle2, Scale, Box, Tag } from 'lucide-react';
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
    queryKey: ['packingQueue'],
    queryFn: async () => {
      const res = await apiClient.get('/orders', { params: { status: 'PROCESSING', limit: 30 } });
      return res.data;
    }
  });

  const orders = ordersResponse?.data || [];

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
      header: 'Customer',
      cell: (row) => (
        <div>
          <div className="font-bold text-slate-900 text-xs">{row.customerId?.name}</div>
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
              <span className="font-semibold text-slate-900">{item.quantity}x</span> {item.productName} ({item.sku})
            </div>
          ))}
        </div>
      )
    },
    {
      header: 'Actions',
      align: 'right',
      cell: (row) => (
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
      )
    }
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Packing Station Queue</h2>
        <p className="text-xs text-slate-500">Inspect prescriptions, package bottles, and attach security seals</p>
      </div>

      <Table
        columns={columns}
        data={orders}
        isLoading={isLoading}
        emptyMessage="Packing station clear! No orders pending packaging."
      />

      {selectedOrder && (
        <Modal
          isOpen={packModalOpen}
          onClose={() => setPackModalOpen(false)}
          title={`Pack Order ${selectedOrder.orderNumber}`}
          subtitle={`Customer: ${selectedOrder.customerId?.name}`}
          maxWidth="max-w-lg"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              packMutation.mutate({
                orderId: selectedOrder._id,
                data: {
                  weightGrams: Number(packForm.weightGrams),
                  boxType: packForm.boxType,
                  dimensions: {
                    lengthCm: Number(packForm.lengthCm),
                    widthCm: Number(packForm.widthCm),
                    heightCm: Number(packForm.heightCm)
                  },
                  sealNumber: packForm.sealNumber,
                  notes: packForm.notes
                }
              });
            }}
            className="space-y-3.5"
          >
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Total Weight (Grams) *"
                type="number"
                required
                value={packForm.weightGrams}
                onChange={(e) => setPackForm({ ...packForm, weightGrams: e.target.value })}
              />
              <Select
                label="Box Type *"
                value={packForm.boxType}
                onChange={(e) => setPackForm({ ...packForm, boxType: e.target.value })}
                options={[
                  { value: 'Small Corrugated Box', label: 'Small Box (1-2 Oils)' },
                  { value: 'Standard Corrugated Box', label: 'Standard Box (3-5 Items)' },
                  { value: 'Large Heavy Box', label: 'Large Box (Combos)' }
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
              label="Security Seal Barcode *"
              required
              value={packForm.sealNumber}
              onChange={(e) => setPackForm({ ...packForm, sealNumber: e.target.value })}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" type="button" onClick={() => setPackModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" isLoading={packMutation.isPending}>
                Complete Packing & Seal
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default PackingStationPage;
