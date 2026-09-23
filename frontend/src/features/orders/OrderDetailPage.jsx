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
  Trash2,
  AlertTriangle
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

  // Edit & Delete Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    patientName: '', fatherName: '', mobile: '', alternateMobile: '',
    street: '', landmark: '', village: '', district: '', city: '', state: 'Tamil Nadu', pincode: '',
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
                paymentMethod: order.paymentMethod || 'COD',
                paymentStatus: order.paymentStatus || 'PENDING',
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
                paymentMethod: editFormData.paymentMethod,
                paymentStatus: editFormData.paymentStatus,
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
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Payment & Notes</h4>
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Payment Method"
                  value={editFormData.paymentMethod}
                  onChange={(e) => setEditFormData({ ...editFormData, paymentMethod: e.target.value })}
                  options={[
                    { value: 'COD', label: 'Cash on Delivery (COD)' },
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
    </div>
  );
}

export default OrderDetailPage;
