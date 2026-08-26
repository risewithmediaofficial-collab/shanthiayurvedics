import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Truck, MapPin, CheckCircle2, Clock, AlertTriangle, ExternalLink } from 'lucide-react';
import apiClient from '../../api/apiClient.js';
import { Table } from '../../components/common/Table.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Input } from '../../components/common/Input.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { Modal } from '../../components/common/Modal.jsx';
import { Pagination } from '../../components/common/Pagination.jsx';

export function DeliveryTrackingPage() {
  const [page, setPage] = useState(1);
  const [searchAwb, setSearchAwb] = useState('');
  const [selectedShipmentAwb, setSelectedShipmentAwb] = useState(null);

  const { data: shipmentsResponse, isLoading } = useQuery({
    queryKey: ['shipments', page],
    queryFn: async () => {
      const res = await apiClient.get('/shipping', { params: { page, limit: 15 } });
      return res.data;
    }
  });

  const { data: trackingDetails, isLoading: isTrackingLoading } = useQuery({
    queryKey: ['tracking', selectedShipmentAwb],
    queryFn: async () => {
      const res = await apiClient.get(`/shipping/track/${selectedShipmentAwb}`);
      return res.data?.data;
    },
    enabled: Boolean(selectedShipmentAwb)
  });

  const shipments = shipmentsResponse?.data || [];
  const meta = shipmentsResponse?.meta || { page: 1, totalPages: 1, total: 0 };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DELIVERED': return <Badge variant="emerald">Delivered</Badge>;
      case 'OUT_FOR_DELIVERY': return <Badge variant="warning">Out For Delivery</Badge>;
      case 'IN_TRANSIT': return <Badge variant="info">In Transit</Badge>;
      case 'PICKED_UP': return <Badge variant="info">Picked Up</Badge>;
      case 'DELIVERY_FAILED': return <Badge variant="danger">Failed</Badge>;
      case 'RTO_INITIATED': return <Badge variant="danger">RTO Return</Badge>;
      default: return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const columns = [
    {
      header: 'AWB Barcode & Carrier',
      cell: (row) => (
        <div>
          <div className="font-bold text-slate-900 font-mono text-xs flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-ayur-600" />
            {row.awbNumber}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">{row.courierName}</div>
        </div>
      )
    },
    {
      header: 'Order Reference',
      cell: (row) => (
        <span className="font-mono text-xs font-semibold text-slate-800">
          {row.orderId?.orderNumber}
        </span>
      )
    },
    {
      header: 'Destination',
      cell: (row) => (
        <div className="text-xs text-slate-600">
          {row.orderId?.deliveryAddress?.city}, {row.orderId?.deliveryAddress?.pincode}
        </div>
      )
    },
    {
      header: 'Tracking Status',
      cell: (row) => getStatusBadge(row.trackingStatus)
    },
    {
      header: 'Actions',
      align: 'right',
      cell: (row) => (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setSelectedShipmentAwb(row.awbNumber)}
        >
          Track Timeline
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Shipments & Live Courier Tracking</h2>
        <p className="text-xs text-slate-500">Real-time parcel milestone sync across postal and commercial carriers</p>
      </div>

      {/* Quick AWB Lookup */}
      <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center gap-3">
        <div className="flex-1">
          <Input
            placeholder="Direct AWB lookup (e.g. EM123456789IN or TPC88291029)..."
            icon={Search}
            value={searchAwb}
            onChange={(e) => setSearchAwb(e.target.value)}
          />
        </div>
        <Button
          variant="primary"
          onClick={() => searchAwb.trim() && setSelectedShipmentAwb(searchAwb.trim())}
        >
          Track Consignment
        </Button>
      </div>

      <Table
        columns={columns}
        data={shipments}
        isLoading={isLoading}
        emptyMessage="No shipments recorded."
      />

      <Pagination
        currentPage={page}
        totalPages={meta.totalPages}
        totalItems={meta.total}
        itemsPerPage={15}
        onPageChange={setPage}
      />

      {/* Tracking Timeline Modal */}
      {selectedShipmentAwb && (
        <Modal
          isOpen={Boolean(selectedShipmentAwb)}
          onClose={() => setSelectedShipmentAwb(null)}
          title={`Live Tracking — ${selectedShipmentAwb}`}
          subtitle={`Carrier: ${trackingDetails?.shipment?.courierName || 'Logistics Partner'}`}
          maxWidth="max-w-md"
          icon="🚚"
          footer={
            <Button variant="secondary" onClick={() => setSelectedShipmentAwb(null)}>
              Close
            </Button>
          }
        >
          {isTrackingLoading ? (
            <div className="py-8 text-center text-xs text-slate-500">Connecting to carrier network...</div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Current Status:</span>
                  {getStatusBadge(trackingDetails?.shipment?.trackingStatus)}
                </div>
              </div>

              <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {(trackingDetails?.events || []).map((ev, idx) => (
                  <div key={idx} className="flex items-start gap-3 relative pl-1 text-xs">
                    <div className="w-5 h-5 rounded-full bg-ayur-100 text-ayur-800 flex items-center justify-center shrink-0 z-10">
                      <CheckCircle2 className="w-3 h-3" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{ev.activity}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400" /> {ev.location}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(ev.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

export default DeliveryTrackingPage;
