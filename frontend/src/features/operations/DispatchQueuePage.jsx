import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Truck, Barcode, Send, CheckCircle2, Building, ShieldCheck } from 'lucide-react';
import apiClient from '../../api/apiClient.js';
import { Table } from '../../components/common/Table.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { Modal } from '../../components/common/Modal.jsx';
import { Select } from '../../components/common/Select.jsx';

export function DispatchQueuePage() {
  const queryClient = useQueryClient();
  const [awbModalOpen, setAwbModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [carrierCode, setCarrierCode] = useState('INDIA_POST');

  const { data: packedOrdersResponse, isLoading } = useQuery({
    queryKey: ['dispatchQueue'],
    queryFn: async () => {
      const res = await apiClient.get('/orders', { params: { status: 'PACKED', limit: 30 } });
      return res.data;
    }
  });

  const orders = packedOrdersResponse?.data || [];

  const createShipmentMutation = useMutation({
    mutationFn: ({ orderId, carrierCode }) =>
      apiClient.post(`/shipping/orders/${orderId}/shipment`, { carrierCode }),
    onSuccess: () => {
      queryClient.invalidateQueries(['dispatchQueue']);
      queryClient.invalidateQueries(['orders']);
      queryClient.invalidateQueries(['operationsSummary']);
      setAwbModalOpen(false);
    }
  });

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
      header: 'Customer & Address',
      cell: (row) => (
        <div>
          <div className="font-bold text-slate-900 text-xs">
            {row.patientDetails?.patientName || row.customerId?.name}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            {row.deliveryAddress?.city}, {row.deliveryAddress?.pincode}
          </div>
        </div>
      )
    },
    {
      header: 'Items',
      cell: (row) => (
        <div className="text-xs text-slate-700">
          {row.items?.reduce((acc, i) => acc + i.quantity, 0)} total units
        </div>
      )
    },
    {
      header: 'Grand Total',
      cell: (row) => (
        <div className="text-xs font-bold text-slate-900">
          ₹{row.grandTotal?.toLocaleString()} ({row.paymentMethod})
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
          icon={Barcode}
          onClick={() => {
            setSelectedOrder(row);
            setAwbModalOpen(true);
          }}
        >
          Generate AWB & Dispatch
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Courier Dispatch Queue</h2>
        <p className="text-xs text-slate-500">
          Book carrier consignments, print AWB barcodes, and hand over parcels to logistics partners
        </p>
      </div>

      <Table
        columns={columns}
        data={orders}
        isLoading={isLoading}
        emptyMessage="Dispatch bay clear! No parcels awaiting courier handover."
      />

      {selectedOrder && (
        <Modal
          isOpen={awbModalOpen}
          onClose={() => setAwbModalOpen(false)}
          title={`Generate Courier AWB for ${selectedOrder.orderNumber}`}
          subtitle={`Destination: ${selectedOrder.deliveryAddress?.city} (${selectedOrder.deliveryAddress?.pincode})`}
          maxWidth="max-w-md"
          icon="🚚"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createShipmentMutation.mutate({
                orderId: selectedOrder._id,
                carrierCode
              });
            }}
            className="space-y-4"
          >
            <Select
              label="Select Shipping Courier Partner *"
              value={carrierCode}
              onChange={(e) => setCarrierCode(e.target.value)}
              options={[
                { value: 'INDIA_POST', label: 'India Post Speed Post (Pan-India Coverage)' },
                { value: 'PROFESSIONAL_COURIER', label: 'The Professional Courier (Express Network)' }
              ]}
            />

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span>Estimated TAT:</span>
                <span className="font-bold text-slate-800">2-3 Business Days</span>
              </div>
              <div className="flex justify-between">
                <span>Payment Mode:</span>
                <span className="font-bold text-slate-800">{selectedOrder.paymentMethod}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="secondary" type="button" onClick={() => setAwbModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" isLoading={createShipmentMutation.isPending}>
                Generate AWB & Confirm
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default DispatchQueuePage;
