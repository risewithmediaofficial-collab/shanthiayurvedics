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
  ShieldCheck,
  Pencil,
  AlertTriangle,
  ExternalLink,
  Send
} from 'lucide-react';
import apiClient from '../../api/apiClient.js';
import { usePermissions } from '../../hooks/usePermissions.js';
import { Card } from '../../components/common/Card.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { Spinner } from '../../components/common/Spinner.jsx';
import { Modal } from '../../components/common/Modal.jsx';
import { Input } from '../../components/common/Input.jsx';
import { Select } from '../../components/common/Select.jsx';
import { PrintableInvoiceModal } from './PrintableInvoiceModal.jsx';
import { PrintableShippingLabelModal } from './PrintableShippingLabelModal.jsx';
import { CustomerProfileModal } from '../customers/CustomerProfileModal.jsx';
import { TPCShippingCard } from './components/TPCShippingCard.jsx';

export function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const [isCustomerProfileOpen, setIsCustomerProfileOpen] = useState(false);

  const [transitionModalOpen, setTransitionModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState('');
  const [transitionNotes, setTransitionNotes] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');

  // Print Modals
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [isLabelOpen, setIsLabelOpen] = useState(false);

  // MSG91 WhatsApp Trigger
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [isSendingDispatchWhatsApp, setIsSendingDispatchWhatsApp] = useState(false);
  const [whatsAppFeedback, setWhatsAppFeedback] = useState(null);

  // Edit & Delete Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    patientName: '', fatherName: '', mobile: '', alternateMobile: '',
    street: '', landmark: '', village: '', district: '', city: '', state: 'Tamil Nadu', pincode: '',
    courierName: 'India Post',
    paymentMethod: 'COD', paymentStatus: 'PENDING', notes: ''
  });

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
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setTransitionModalOpen(false);
      setTransitionNotes('');
      setCancellationReason('');
    }
  });

  const editMutation = useMutation({
    mutationFn: (payload) => apiClient.patch(`/orders/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setIsEditModalOpen(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete(`/orders/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigate('/orders');
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

  const handleSendMsg91WhatsApp = async () => {
    setIsSendingWhatsApp(true);
    setWhatsAppFeedback(null);
    try {
      const res = await apiClient.post(`/orders/${id}/send-whatsapp`);
      setWhatsAppFeedback({
        type: 'success',
        message: res.data?.message || 'WhatsApp template queued successfully via MSG91!'
      });
      queryClient.invalidateQueries({ queryKey: ['order', id] });
    } catch (err) {
      const errMsg = err.response?.data?.message || err.response?.data?.error || 'Failed to send WhatsApp message via MSG91';
      setWhatsAppFeedback({
        type: 'error',
        message: typeof errMsg === 'object' ? JSON.stringify(errMsg) : String(errMsg)
      });
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  const handleSendMsg91DispatchWhatsApp = async () => {
    setIsSendingDispatchWhatsApp(true);
    setWhatsAppFeedback(null);
    try {
      const res = await apiClient.post(`/orders/${id}/send-dispatch-whatsapp`);
      setWhatsAppFeedback({
        type: 'success',
        message: res.data?.message || 'WhatsApp dispatch notification queued successfully via MSG91!'
      });
      queryClient.invalidateQueries({ queryKey: ['order', id] });
    } catch (err) {
      const errMsg = err.response?.data?.message || err.response?.data?.error || 'Failed to send WhatsApp dispatch notification via MSG91';
      setWhatsAppFeedback({
        type: 'error',
        message: typeof errMsg === 'object' ? JSON.stringify(errMsg) : String(errMsg)
      });
    } finally {
      setIsSendingDispatchWhatsApp(false);
    }
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
              className="bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              <span>Confirm Order</span>
              <span className="text-[10px] font-normal opacity-90 hidden sm:inline">• Sends WhatsApp</span>
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
      case 'READY_FOR_DISPATCH':
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              icon={Send}
              onClick={() => handleOpenTransition('DISPATCHED')}
              className="bg-sky-700 hover:bg-sky-800 text-white"
            >
              <span>Mark as Dispatched</span>
              <span className="text-[10px] font-normal opacity-90 hidden sm:inline">• Sends WhatsApp Dispatch</span>
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
      case 'DISPATCHED':
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={Truck}
              onClick={() => handleOpenTransition('IN_TRANSIT')}
            >
              Mark In Transit
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

        {whatsAppFeedback && (
          <div
            className={`w-full p-3 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 shadow-sm ${
              whatsAppFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <span>{whatsAppFeedback.message}</span>
            <button
              onClick={() => setWhatsAppFeedback(null)}
              className="text-xs font-bold underline opacity-70 hover:opacity-100 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {/* WhatsApp Order Confirmation Status */}
          {order.whatsappConfirmationSentAt ? (
            <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span>✓ Confirmed WA ({new Date(order.whatsappConfirmationSentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</span>
            </div>
          ) : order.status === 'CONFIRMED' || order.status === 'PROCESSING' || order.status === 'READY_FOR_PACKING' || order.status === 'PACKED' || order.status === 'READY_FOR_DISPATCH' || order.status === 'DISPATCHED' ? (
            <Button
              variant="secondary"
              size="sm"
              icon={MessageSquare}
              isLoading={isSendingWhatsApp}
              onClick={handleSendMsg91WhatsApp}
              title="Resend WhatsApp confirmation template"
              className="border-slate-200 hover:border-emerald-300 text-slate-700 text-xs font-semibold"
            >
              Resend Confirm WA
            </Button>
          ) : (
            <span className="text-[11px] text-slate-500 font-medium hidden sm:inline-flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-1 rounded-md">
              <span>💬</span> WhatsApp auto-sends when Confirmed
            </span>
          )}

          {/* WhatsApp Order Dispatch Notification Status */}
          {order.whatsappDispatchSentAt ? (
            <div className="px-3 py-1.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-800 text-xs font-semibold flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
              <span>✓ Dispatched WA ({new Date(order.whatsappDispatchSentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</span>
            </div>
          ) : order.status === 'DISPATCHED' || order.status === 'IN_TRANSIT' || order.status === 'OUT_FOR_DELIVERY' || order.status === 'DELIVERED' ? (
            <Button
              variant="secondary"
              size="sm"
              icon={Send}
              isLoading={isSendingDispatchWhatsApp}
              onClick={handleSendMsg91DispatchWhatsApp}
              title="Send or resend WhatsApp dispatch & tracking notification"
              className="border-sky-300 hover:bg-sky-50 text-sky-800 text-xs font-semibold"
            >
              {order.whatsappDispatchStatus === 'FAILED' ? 'Retry Dispatch WA' : 'Send Dispatch WA'}
            </Button>
          ) : null}

          {/* Manual WhatsApp Web Fallback */}
          <Button
            variant="secondary"
            size="sm"
            icon={ExternalLink}
            onClick={handleShareWhatsApp}
            title="Open WhatsApp Web chat as manual fallback"
            className="text-slate-600 hover:bg-slate-100 text-xs font-semibold"
          >
            WhatsApp Web
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

          {/* Edit Order */}
          <Button
            variant="secondary"
            size="sm"
            icon={Pencil}
            onClick={() => {
              const pat = order.patientDetails || {};
              const addr = order.deliveryAddress || {};
              setEditFormData({
                patientName: pat.patientName || order.customerId?.name || '',
                fatherName: pat.fatherName || '',
                mobile: pat.mobile || order.customerId?.mobile || '',
                alternateMobile: pat.alternateMobile || '',
                street: addr.street || '',
                landmark: addr.landmark || '',
                village: addr.village || '',
                district: addr.district || '',
                city: addr.city || '',
                state: addr.state || 'Tamil Nadu',
                pincode: addr.pincode || '',
                courierName: order.courierName || 'India Post',
                paymentMethod: order.paymentMethod || 'COD',
                paymentStatus: order.paymentStatus || 'PENDING',
                advanceAmount: order.advanceAmount || '',
                advanceUtr: order.advanceUtr || '',
                notes: order.notes || ''
              });
              setIsEditModalOpen(true);
            }}
          >
            Edit
          </Button>

          {/* Delete Order */}
          <Button
            variant="danger"
            size="sm"
            icon={Trash2}
            onClick={() => setIsDeleteModalOpen(true)}
            className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
          >
            Delete
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
                <div key={idx} className="py-3 flex items-center justify-between text-xs border-b border-slate-100 last:border-none">
                  <div>
                    <div className="font-bold text-slate-900">{item.productName}</div>
                    <div className="text-slate-500 font-mono text-[11px] mt-0.5 flex items-center gap-1.5">
                      <span>SKU: {item.sku}</span>
                      {item.weight > 0 && (
                        <>
                          <span>•</span>
                          <span>⚖️ {item.weight}g</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <div>{item.quantity} x ₹{item.unitPrice}</div>
                    <div className="font-bold text-slate-900 text-sm mt-0.5">₹{item.total?.toLocaleString()}</div>
                    {item.weight > 0 && (
                      <div className="text-[10px] text-slate-400">Total WT: {item.weight * item.quantity}g</div>
                    )}
                  </div>
                </div>
              ))}

              <div className="pt-3 flex justify-between text-xs font-semibold text-slate-600">
                <span>Subtotal</span>
                <span>₹{order.subtotal?.toLocaleString()}</span>
              </div>
              <div className="py-1 flex justify-between text-xs font-semibold text-slate-600">
                <span>Total Parcel Weight</span>
                <span className="font-mono text-slate-800">
                  {order.weight >= 1000 ? `${(order.weight / 1000).toFixed(2)} kg (${order.weight} g)` : `${order.weight || 0} g`}
                </span>
              </div>
              <div className="py-1 flex justify-between text-xs font-semibold text-slate-600">
                <span>Shipping & Handling</span>
                <span>₹{order.shippingCharge || 0}</span>
              </div>
              {order.advanceAmount > 0 && (
                <div className="py-1.5 flex justify-between items-center text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  <div className="flex items-center gap-1.5">
                    <span>💳 Advance Paid</span>
                    {order.advanceUtr && (
                      <span className="font-mono text-[10px] text-emerald-700 font-normal bg-white px-1.5 py-0.5 rounded border border-emerald-200">
                        UTR: {order.advanceUtr}
                      </span>
                    )}
                  </div>
                  <span className="font-mono">-₹{order.advanceAmount?.toLocaleString()}</span>
                </div>
              )}
              {order.paymentMethod === 'COD' && (
                <div className="py-1.5 flex justify-between items-center text-xs font-bold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                  <span>Balance COD to Collect</span>
                  <span className="font-mono text-sm">₹{(order.codAmount ?? Math.max(0, (order.grandTotal || 0) - (order.advanceAmount || 0)))?.toLocaleString()}</span>
                </div>
              )}
              <div className="py-2 flex justify-between text-sm font-black text-slate-900 border-t border-slate-200 mt-1">
                <span>Grand Total ({order.paymentMethod})</span>
                <span className="text-emerald-800">₹{order.grandTotal?.toLocaleString()}</span>
              </div>
            </div>
          </Card>

          {/* Delivery & Customer Info */}
          <Card title="Customer & Delivery Details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setIsCustomerProfileOpen(true)}
                    className="font-bold text-slate-800 hover:text-emerald-700 hover:underline flex items-center gap-1.5 cursor-pointer text-left"
                    title="View Customer Profile & All Past Orders"
                  >
                    <User className="w-3.5 h-3.5 text-ayur-600 shrink-0" />
                    <span>{patientName}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCustomerProfileOpen(true)}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md transition-colors cursor-pointer shrink-0"
                  >
                    360° Profile ➔
                  </button>
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
                <div className="text-slate-500 text-[11px] flex items-center justify-between pt-1">
                  <div>
                    <span>Payment: <strong className="text-slate-800">{order.paymentStatus} ({order.paymentMethod || 'COD'})</strong></span>
                    {order.advanceAmount > 0 && (
                      <div className="text-emerald-700 font-bold text-[10px] mt-0.5">
                        Advance Paid: ₹{order.advanceAmount} {order.advanceUtr ? `• UTR: ${order.advanceUtr}` : ''}
                      </div>
                    )}
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    (order.courierName || '').includes('Professional')
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {(order.courierName || '').includes('Professional') ? '⚡ Professional Courier' : '📮 India Post'}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Courier Logistics (The Professional Couriers TPC Integration) */}
          <TPCShippingCard order={order} />
        </div>

        {/* Right Col: Timeline */}
        <div>
          <Card
            title="Order Lifecycle Timeline"
            subtitle="Append-only audit trail"
            action={
              statusHistory.length > 0 && (
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  {statusHistory.length} events
                </span>
              )
            }
          >
            {statusHistory.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No lifecycle events recorded yet.
              </div>
            ) : (
              <div className="max-h-[360px] sm:max-h-[440px] overflow-y-auto pr-2 scrollbar-thin touch-pan-y">
                <div className="space-y-4 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 py-1">
                  {statusHistory.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 relative pl-1">
                      <div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0 z-10 shadow-2xs">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-900 tracking-tight">{item.toStatus}</div>
                        {item.notes && (
                          <div className="text-[11px] text-slate-600 mt-0.5 break-words">{item.notes}</div>
                        )}
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {new Date(item.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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

      {/* Edit Order Modal */}
      {isEditModalOpen && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={`Edit Order #${order.orderNumber}`}
          subtitle="Update patient contact, delivery address, and payment details"
          maxWidth="max-w-2xl"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              editMutation.mutate({
                patientDetails: {
                  patientName: editFormData.patientName,
                  fatherName: editFormData.fatherName,
                  mobile: editFormData.mobile,
                  alternateMobile: editFormData.alternateMobile
                },
                deliveryAddress: {
                  street: editFormData.street,
                  landmark: editFormData.landmark,
                  village: editFormData.village,
                  district: editFormData.district,
                  city: editFormData.city,
                  state: editFormData.state,
                  pincode: editFormData.pincode,
                  phone: editFormData.mobile
                },
                courierName: editFormData.courierName,
                paymentMethod: editFormData.paymentMethod,
                paymentStatus: editFormData.paymentStatus,
                advanceAmount: Number(editFormData.advanceAmount) || 0,
                advanceUtr: (editFormData.advanceUtr || '').trim(),
                notes: editFormData.notes
              });
            }}
            className="space-y-4"
          >
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Patient / Customer Info</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Patient Name *"
                  required
                  value={editFormData.patientName}
                  onChange={(e) => setEditFormData({ ...editFormData, patientName: e.target.value })}
                />
                <Input
                  label="Father / Guardian Name"
                  value={editFormData.fatherName}
                  onChange={(e) => setEditFormData({ ...editFormData, fatherName: e.target.value })}
                />
                <Input
                  label="Primary Mobile *"
                  required
                  value={editFormData.mobile}
                  onChange={(e) => setEditFormData({ ...editFormData, mobile: e.target.value })}
                />
                <Input
                  label="Alternate Mobile"
                  value={editFormData.alternateMobile}
                  onChange={(e) => setEditFormData({ ...editFormData, alternateMobile: e.target.value })}
                />
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Delivery Address</h4>
              <div className="space-y-3">
                <Input
                  label="Street Address *"
                  required
                  value={editFormData.street}
                  onChange={(e) => setEditFormData({ ...editFormData, street: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Landmark"
                    value={editFormData.landmark}
                    onChange={(e) => setEditFormData({ ...editFormData, landmark: e.target.value })}
                  />
                  <Input
                    label="Village / Area"
                    value={editFormData.village}
                    onChange={(e) => setEditFormData({ ...editFormData, village: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Input
                    label="City / Town *"
                    required
                    value={editFormData.city}
                    onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                  />
                  <Input
                    label="District"
                    value={editFormData.district}
                    onChange={(e) => setEditFormData({ ...editFormData, district: e.target.value })}
                  />
                  <Input
                    label="Pincode *"
                    required
                    value={editFormData.pincode}
                    onChange={(e) => setEditFormData({ ...editFormData, pincode: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Courier Partner & Payment</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Select
                  label="Courier Partner"
                  value={editFormData.courierName}
                  onChange={(e) => {
                    const newCourier = e.target.value;
                    const isTPC = /professional/i.test(newCourier);
                    setEditFormData({
                      ...editFormData,
                      courierName: newCourier,
                      ...(isTPC && editFormData.paymentMethod === 'COD' ? { paymentMethod: 'ONLINE' } : {})
                    });
                  }}
                  options={[
                    { value: 'India Post', label: 'India Post (Speed Post) - COD & Prepaid' },
                    { value: 'The Professional Courier', label: 'The Professional Courier (TPC) - Prepaid Only' }
                  ]}
                />
                <Select
                  label="Payment Method"
                  value={editFormData.paymentMethod}
                  onChange={(e) => setEditFormData({ ...editFormData, paymentMethod: e.target.value })}
                  options={[
                    ...(!/professional/i.test(editFormData.courierName || '') ? [{ value: 'COD', label: 'Cash on Delivery (COD)' }] : []),
                    { value: 'ONLINE', label: 'Online / Gateway' },
                    { value: 'UPI', label: 'UPI Direct' },
                    { value: 'BANK_TRANSFER', label: 'Bank Transfer' }
                  ]}
                />
                <Select
                  label="Payment Status"
                  value={editFormData.paymentStatus}
                  onChange={(e) => setEditFormData({ ...editFormData, paymentStatus: e.target.value })}
                  options={[
                    { value: 'PENDING', label: 'Pending' },
                    { value: 'COD_PENDING', label: 'COD Pending' },
                    { value: 'PAID', label: 'Paid' },
                    { value: 'FAILED', label: 'Failed' },
                    { value: 'REFUNDED', label: 'Refunded' }
                  ]}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <Input
                  label="Advance Amount Paid (₹)"
                  type="number"
                  min="0"
                  value={editFormData.advanceAmount}
                  placeholder="0"
                  onChange={(e) => setEditFormData({ ...editFormData, advanceAmount: e.target.value })}
                />
                <Input
                  label="Advance UTR / Transaction No"
                  value={editFormData.advanceUtr}
                  placeholder="e.g. 428910284918 (GooglePay / UPI)"
                  onChange={(e) => setEditFormData({ ...editFormData, advanceUtr: e.target.value })}
                />
              </div>
              <div className="mt-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Order Notes / Prescription Info</label>
                <textarea
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-ayur-500 focus:bg-white outline-none"
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <Button variant="secondary" type="button" onClick={() => setIsEditModalOpen(false)} disabled={editMutation.isPending}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" isLoading={editMutation.isPending}>
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Delete Order Confirmation"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-100 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-red-800">
                <p className="font-bold mb-1">Are you sure you want to delete this order?</p>
                <p>
                  Order <strong className="font-mono">#{order.orderNumber}</strong> (₹{order.grandTotal?.toLocaleString()}) will be permanently removed.
                </p>
                <p className="mt-1 text-red-600">
                  ✓ Reserved inventory items will be restored back to branch stock.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)} disabled={deleteMutation.isPending}>
                Keep Order
              </Button>
              <Button
                variant="danger"
                onClick={() => deleteMutation.mutate()}
                isLoading={deleteMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete Order
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Printable Shipping Label Modal */}
      {isLabelOpen && (
        <PrintableShippingLabelModal
          isOpen={isLabelOpen}
          onClose={() => setIsLabelOpen(false)}
          order={order}
        />
      )}

      {/* Customer Profile Modal with complete order history & 15-day reorder alert */}
      {isCustomerProfileOpen && (
        <CustomerProfileModal
          isOpen={isCustomerProfileOpen}
          onClose={() => setIsCustomerProfileOpen(false)}
          customerId={order.customerId?._id || order.customerId}
          customerPhone={patientMobile}
          initialData={{
            name: patientName,
            mobile: patientMobile,
            addresses: [order.deliveryAddress].filter(Boolean)
          }}
          onOrderCreated={() => {
            queryClient.invalidateQueries({ queryKey: ['order', id] });
            queryClient.invalidateQueries({ queryKey: ['orders'] });
          }}
        />
      )}
    </div>
  );
}

export default OrderDetailPage;
