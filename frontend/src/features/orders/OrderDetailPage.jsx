import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Phone,
  User,
  MessageSquare,
  Printer,
  Tag,
  ShieldCheck
} from 'lucide-react';
import apiClient from '../../api/apiClient.js';
import { usePermissions } from '../../hooks/usePermissions.js';
import { Card } from '../../components/common/Card.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { Spinner } from '../../components/common/Spinner.jsx';
import { Modal } from '../../components/common/Modal.jsx';
import { Input } from '../../components/common/Input.jsx';
import { PrintableInvoiceModal } from './PrintableInvoiceModal.jsx';
import { PrintableShippingLabelModal } from './PrintableShippingLabelModal.jsx';

export function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();

  const [transitionModalOpen, setTransitionModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState('');
  const [transitionNotes, setTransitionNotes] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');

  // Print Modals
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [isLabelOpen, setIsLabelOpen] = useState(false);

  const { data: orderData, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const res = await apiClient.get(`/orders/${id}`);
      return res.data?.data;
    }
  });

  const transitionMutation = useMutation({
    mutationFn: (payload) => apiClient.patch(`/orders/${id}/transition`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['order', id]);
      queryClient.invalidateQueries(['orders']);
      queryClient.invalidateQueries(['dashboard']);
      setTransitionModalOpen(false);
      setTransitionNotes('');
      setCancellationReason('');
    }
  });

  if (isLoading) {
    return <Spinner size="lg" text="Loading order details..." className="py-24" />;
  }

  if (!orderData) {
    return <div className="p-8 text-center text-slate-500">Order not found.</div>;
  }

  const order = orderData;
  const statusHistory = orderData.statusHistory || [];
  const patientMobile = order.patientDetails?.mobile || order.customerId?.mobile || '';
  const patientName = order.patientDetails?.patientName || order.customerId?.name || 'Customer';

  const handleOpenTransition = (status) => {
    setTargetStatus(status);
    setTransitionModalOpen(true);
  };

  const handleShareWhatsApp = () => {
    const cleanMobile = patientMobile.replace(/\D/g, '').slice(-10);
    if (!cleanMobile) return;

    const itemList = order.items?.map((i) => `• ${i.quantity}x ${i.productName}`).join('\n') || '';
    const textMsg = encodeURIComponent(
      `🌿 *Shanthi Ayurvedas Order Update*\n\n` +
        `Hello *${patientName}*,\n` +
        `Your order *#${order.orderNumber}* status is: *${order.status}*!\n\n` +
        `📦 *Prescribed Products:*\n${itemList}\n\n` +
        `💰 *Grand Total:* ₹${order.grandTotal?.toLocaleString()} (${order.paymentMethod})\n` +
        `📍 *Delivery Address:* ${order.deliveryAddress?.city}, ${order.deliveryAddress?.pincode}\n\n` +
        `Thank you for trusting Shanthi Ayurvedas authentic holistic care. 🙏`
    );
    window.open(`https://wa.me/91${cleanMobile}?text=${textMsg}`, '_blank');
  };

  const renderAvailableTransitions = () => {
    switch (order.status) {
      case 'NEW':
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              icon={CheckCircle2}
              onClick={() => handleOpenTransition('CONFIRMED')}
            >
              Confirm Order
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={XCircle}
              onClick={() => handleOpenTransition('CANCELLED')}
            >
              Cancel Order
            </Button>
          </div>
        );
      case 'CONFIRMED':
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              icon={Package}
              onClick={() => handleOpenTransition('PROCESSING')}
            >
              Send to Processing Bay
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={XCircle}
              onClick={() => handleOpenTransition('CANCELLED')}
            >
              Cancel Order
            </Button>
          </div>
        );
      case 'PROCESSING':
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              icon={Package}
              onClick={() => navigate(`/operations/packing`)}
            >
              Go to Packing Station
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={XCircle}
              onClick={() => handleOpenTransition('CANCELLED')}
            >
              Cancel Order
            </Button>
          </div>
        );
      case 'PACKED':
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              icon={Truck}
              onClick={() => navigate(`/operations/dispatch`)}
            >
              Dispatch Parcel
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/orders')}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 font-mono">{order.orderNumber}</h2>
              <Badge variant="primary">{order.status}</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Placed on {new Date(order.createdAt).toLocaleString()} • Branch: {order.branchId?.name}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* WhatsApp Notification */}
          <Button
            variant="secondary"
            size="sm"
            icon={MessageSquare}
            onClick={handleShareWhatsApp}
            className="text-emerald-700 hover:bg-emerald-50 border-emerald-200"
          >
            WhatsApp Patient
          </Button>

          {/* Tax Invoice */}
          <Button
            variant="secondary"
            size="sm"
            icon={Printer}
            onClick={() => setIsInvoiceOpen(true)}
          >
            Tax Invoice
          </Button>

          {/* Shipping Label */}
          <Button
            variant="secondary"
            size="sm"
            icon={Tag}
            onClick={() => setIsLabelOpen(true)}
          >
            Shipping Label
          </Button>

          {renderAvailableTransitions()}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Items & Customer Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items Table */}
          <Card title="Ordered Herbal Products" subtitle="Prescribed units with reserved batch allocations">
            <div className="divide-y divide-slate-100">
              {order.items?.map((item, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-900">{item.productName}</div>
                    <div className="text-slate-500 font-mono text-[11px] mt-0.5">
                      SKU: {item.sku}
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <div>{item.quantity} x ₹{item.unitPrice}</div>
                    <div className="font-bold text-slate-900 text-sm mt-0.5">₹{item.total?.toLocaleString()}</div>
                  </div>
                </div>
              ))}

              <div className="pt-3 flex justify-between text-xs font-semibold text-slate-600">
                <span>Subtotal</span>
                <span>₹{order.subtotal?.toLocaleString()}</span>
              </div>
              <div className="py-1.5 flex justify-between text-xs font-semibold text-slate-600">
                <span>Shipping & Handling</span>
                <span>₹{order.shippingCharge || 0}</span>
              </div>
              <div className="py-2 flex justify-between text-sm font-black text-slate-900 border-t border-slate-200">
                <span>Grand Total ({order.paymentMethod})</span>
                <span className="text-emerald-800">₹{order.grandTotal?.toLocaleString()}</span>
              </div>
            </div>
          </Card>

          {/* Delivery & Customer Info */}
          <Card title="Customer & Delivery Details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl space-y-1.5">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-ayur-600" /> {patientName}
                </div>
                <div className="text-slate-600 flex items-center gap-1.5 font-mono">
                  <Phone className="w-3.5 h-3.5 text-slate-400" /> {patientMobile}
                </div>
                <div className="text-slate-500 text-[11px]">
                  Assigned Telecaller: {order.telecallerId?.name || 'Staff'}
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl space-y-1.5">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-ayur-600" /> Delivery Address
                </div>
                <div className="text-slate-600">
                  {order.deliveryAddress?.street}, {order.deliveryAddress?.city}, {order.deliveryAddress?.state} - {order.deliveryAddress?.pincode}
                </div>
                <div className="text-slate-500 text-[11px]">
                  Payment Status: <span className="font-semibold text-slate-800">{order.paymentStatus}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Col: Timeline */}
        <div>
          <Card title="Order Lifecycle Timeline" subtitle="Append-only audit trail">
            <div className="space-y-4 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {statusHistory.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 relative pl-1">
                  <div className="w-6 h-6 rounded-full bg-ayur-100 text-ayur-800 flex items-center justify-center shrink-0 z-10">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">{item.toStatus}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{item.notes}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(item.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Transition Modal */}
      <Modal
        isOpen={transitionModalOpen}
        onClose={() => setTransitionModalOpen(false)}
        title={`Transition Order to ${targetStatus}`}
        maxWidth="max-w-md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            transitionMutation.mutate({
              status: targetStatus,
              notes: transitionNotes,
              cancellationReason: targetStatus === 'CANCELLED' ? cancellationReason : undefined
            });
          }}
          className="space-y-3.5"
        >
          {targetStatus === 'CANCELLED' && (
            <Input
              label="Cancellation Reason *"
              required
              placeholder="e.g. Customer cancelled order / phone unreachable"
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
            />
          )}

          <Input
            label="Internal Notes"
            placeholder="Operational notes regarding this status change..."
            value={transitionNotes}
            onChange={(e) => setTransitionNotes(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setTransitionModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={transitionMutation.isPending}>
              Confirm Transition
            </Button>
          </div>
        </form>
      </Modal>

      {/* Printable Tax Invoice Modal */}
      {isInvoiceOpen && (
        <PrintableInvoiceModal
          isOpen={isInvoiceOpen}
          onClose={() => setIsInvoiceOpen(false)}
          order={order}
        />
      )}

      {/* Printable Shipping Label Modal */}
      {isLabelOpen && (
        <PrintableShippingLabelModal
          isOpen={isLabelOpen}
          onClose={() => setIsLabelOpen(false)}
          order={order}
        />
      )}
    </div>
  );
}

export default OrderDetailPage;
