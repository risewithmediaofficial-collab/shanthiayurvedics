import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  AlertTriangle,
  Search,
  Filter,
  CheckCircle2,
  Package,
  Truck,
  Phone,
  MessageSquare,
  Printer,
  Tag,
  ArrowRight,
  RefreshCw,
  Eye
} from 'lucide-react';
import apiClient from '../../api/apiClient.js';
import { useBranch } from '../../context/BranchContext.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Input } from '../../components/common/Input.jsx';
import { Select } from '../../components/common/Select.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { Spinner } from '../../components/common/Spinner.jsx';
import { PrintableInvoiceModal } from './PrintableInvoiceModal.jsx';
import { PrintableShippingLabelModal } from './PrintableShippingLabelModal.jsx';

export function StuckOrdersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { selectedBranchId } = useBranch();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState(null);
  const [selectedOrderForLabel, setSelectedOrderForLabel] = useState(null);

  // Fetch pending / stuck orders
  const { data: ordersResponse, isLoading, refetch } = useQuery({
    queryKey: ['stuckOrders', selectedBranchId, search, statusFilter],
    queryFn: async () => {
      const params = { limit: 50 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await apiClient.get('/orders', { params });
      return res.data;
    }
  });

  // Fast Advance Status Mutation
  const advanceMutation = useMutation({
    mutationFn: async ({ orderId, nextStatus }) => {
      const res = await apiClient.patch(`/orders/${orderId}/transition`, {
        status: nextStatus,
        notes: 'Quick status update from Stuck & Outstanding manager queue'
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['stuckOrders']);
      queryClient.invalidateQueries(['orders']);
      queryClient.invalidateQueries(['dashboard']);
    }
  });

  const allOrders = ordersResponse?.data || [];
  
  // Filter for outstanding states (not DELIVERED or CANCELLED)
  const stuckOrders = allOrders.filter(
    (o) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED'
  );

  const awaitingVerifyCount = stuckOrders.filter((o) => o.status === 'NEW').length;
  const awaitingPackingCount = stuckOrders.filter(
    (o) => o.status === 'CONFIRMED' || o.status === 'PROCESSING' || o.status === 'READY_FOR_PACKING'
  ).length;
  const awaitingDispatchCount = stuckOrders.filter(
    (o) => o.status === 'PACKED' || o.status === 'READY_FOR_DISPATCH'
  ).length;
  const inTransitCount = stuckOrders.filter((o) => o.status === 'DISPATCHED').length;

  const getNextStatusInfo = (currentStatus) => {
    switch (currentStatus) {
      case 'NEW':
        return { nextStatus: 'CONFIRMED', label: 'Verify & Confirm', color: 'bg-blue-700 hover:bg-blue-800' };
      case 'CONFIRMED':
        return { nextStatus: 'PROCESSING', label: 'Send to Packing', color: 'bg-amber-700 hover:bg-amber-800' };
      case 'PROCESSING':
      case 'READY_FOR_PACKING':
        return { nextStatus: 'PACKED', label: 'Mark as Packed', color: 'bg-purple-700 hover:bg-purple-800' };
      case 'PACKED':
      case 'READY_FOR_DISPATCH':
        return { nextStatus: 'DISPATCHED', label: 'Dispatch Courier', color: 'bg-emerald-700 hover:bg-emerald-800' };
      case 'DISPATCHED':
        return { nextStatus: 'DELIVERED', label: 'Mark Delivered', color: 'bg-emerald-800 hover:bg-emerald-900' };
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            <span>Stuck & Outstanding Orders Queue</span>
          </h2>
          <p className="text-xs text-slate-500">
            Real-time fulfillment bottleneck tracking, verification backlogs & courier dispatch resolution
          </p>
        </div>

        <Button variant="outline" size="sm" icon={RefreshCw} onClick={() => refetch()}>
          Refresh Queue
        </Button>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Awaiting Verification</div>
          <div className="text-2xl sm:text-3xl font-black text-blue-700 mt-1">{awaitingVerifyCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Status: NEW</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Packing Station</div>
          <div className="text-2xl sm:text-3xl font-black text-amber-700 mt-1">{awaitingPackingCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Processing / Packing</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Awaiting Dispatch</div>
          <div className="text-2xl sm:text-3xl font-black text-purple-700 mt-1">{awaitingDispatchCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Packed / Ready Courier</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">In Transit / Courier</div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">{inTransitCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Dispatched out</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search order number, patient name, phone..."
            icon={Search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="w-56">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'All Outstanding Orders' },
              { value: 'NEW', label: 'New (To Verify)' },
              { value: 'CONFIRMED', label: 'Confirmed' },
              { value: 'PROCESSING', label: 'Processing' },
              { value: 'PACKED', label: 'Packed' },
              { value: 'DISPATCHED', label: 'Dispatched (In Transit)' }
            ]}
          />
        </div>
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-slate-200">
          <Spinner size="lg" text="Loading stuck orders queue..." />
        </div>
      ) : stuckOrders.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
          <div className="text-3xl mb-2">🎉</div>
          <div className="text-sm font-semibold text-slate-900">Zero Outstanding Bottlenecks!</div>
          <p className="text-xs text-slate-400 mt-1">All orders have been packed, dispatched, and fulfilled.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {stuckOrders.map((ord) => {
            const pat = ord.patientDetails || {};
            const addr = ord.deliveryAddress || {};
            const nextAction = getNextStatusInfo(ord.status);
            const cleanMobile = (pat.mobile || ord.customerId?.mobile || '').replace(/\D/g, '').slice(-10);

            return (
              <div
                key={ord._id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 space-y-3 hover:border-slate-300 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-900 text-sm">
                      {pat.patientName || ord.customerId?.name || 'Customer'}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      📱 {cleanMobile || '—'}
                    </span>
                    <span className="font-bold text-slate-900 font-mono text-sm">
                      ₹{ord.grandTotal?.toLocaleString()}
                    </span>
                    <Badge variant="primary" size="sm">{ord.status}</Badge>
                  </div>

                  <div className="text-xs text-slate-400 font-mono">
                    {ord.orderNumber} • {new Date(ord.createdAt).toLocaleDateString('en-GB')}
                  </div>
                </div>

                <div className="text-xs text-slate-600 flex flex-wrap items-center gap-4">
                  <div>
                    <strong>Items:</strong>{' '}
                    {ord.items?.map((i) => `${i.quantity}x ${i.productName}`).join(', ')} • ({ord.paymentMethod})
                  </div>
                  {addr.street && (
                    <div>
                      <strong>Address:</strong> {addr.street}, {addr.city || addr.district}, {addr.state} - {addr.pincode}
                    </div>
                  )}
                </div>

                {/* Actions Strip */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedOrderForInvoice(ord)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Bill</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedOrderForLabel(ord)}
                      className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Tag className="w-3.5 h-3.5" />
                      <span>Label</span>
                    </button>

                    {cleanMobile && (
                      <button
                        type="button"
                        onClick={() => {
                          window.open(
                            `https://wa.me/91${cleanMobile}?text=Hello%20${encodeURIComponent(pat.patientName || 'Customer')},%20update%20on%20your%20order%20${ord.orderNumber}:%20Current%20status%20is%20${ord.status}.`,
                            '_blank'
                          );
                        }}
                        className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      icon={Eye}
                      onClick={() => navigate(`/orders/${ord._id}`)}
                    >
                      Details
                    </Button>
                  </div>

                  {/* Advance Stage Button */}
                  {nextAction && (
                    <Button
                      size="sm"
                      variant="primary"
                      icon={ArrowRight}
                      isLoading={advanceMutation.isPending}
                      onClick={() => advanceMutation.mutate({ orderId: ord._id, nextStatus: nextAction.nextStatus })}
                      className={`${nextAction.color} text-white font-bold text-xs`}
                    >
                      {nextAction.label} &rarr;
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
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

export default StuckOrdersPage;
