import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  ShoppingBag,
  Store,
  Printer,
  Receipt,
  Search,
  CheckCircle2,
  Calendar,
  CreditCard,
  DollarSign,
  Pencil,
  Trash2,
  X,
  AlertTriangle
} from 'lucide-react';
import apiClient from '../../api/apiClient.js';
import { useBranch } from '../../context/BranchContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { Spinner } from '../../components/common/Spinner.jsx';
import { OrderCreateModal } from './OrderCreateModal.jsx';
import { PrintableInvoiceModal } from './PrintableInvoiceModal.jsx';

export function CounterSalePage() {
  const { user } = useAuth();
  if (user?.role === 'TELECALLER') {
    return <Navigate to="/dashboard?view=telecaller" replace />;
  }

  const queryClient = useQueryClient();
  const { selectedBranchId, branches } = useBranch();
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState(null);
  const [selectedOrderForEdit, setSelectedOrderForEdit] = useState(null);
  const [selectedOrderForDelete, setSelectedOrderForDelete] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [editError, setEditError] = useState('');
  const [deleteError, setDeleteError] = useState('');

  // Fetch recent counter orders
  const { data: ordersResponse, isLoading } = useQuery({
    queryKey: ['counterOrders', selectedBranchId],
    queryFn: async () => {
      const res = await apiClient.get('/orders', { params: { limit: 25 } });
      return res.data;
    }
  });

  const orders = Array.isArray(ordersResponse?.data) ? ordersResponse?.data : [];
  const currentBranch = branches?.find((b) => b._id === selectedBranchId) || { name: 'Hosur Main Branch' };

  // Calculate totals
  const totalSales = orders.reduce((acc, curr) => acc + (curr.grandTotal || 0), 0);
  const codSales = orders.filter((o) => o.paymentMethod === 'COD').reduce((acc, curr) => acc + (curr.grandTotal || 0), 0);
  const counterSales = orders.filter((o) => o.paymentMethod !== 'COD').reduce((acc, curr) => acc + (curr.grandTotal || 0), 0);

  // Update Order Mutation
  const updateOrderMutation = useMutation({
    mutationFn: async ({ orderId, payload }) => {
      const res = await apiClient.patch(`/orders/${orderId}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['counterOrders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setSelectedOrderForEdit(null);
      setEditError('');
    },
    onError: (err) => {
      setEditError(err.response?.data?.message || 'Failed to update order');
    }
  });

  // Delete Order Mutation
  const deleteOrderMutation = useMutation({
    mutationFn: async (orderId) => {
      const res = await apiClient.delete(`/orders/${orderId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['counterOrders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setSelectedOrderForDelete(null);
      setDeleteError('');
    },
    onError: (err) => {
      setDeleteError(err.response?.data?.message || 'Failed to delete order');
    }
  });

  const handleOpenEdit = (ord) => {
    setSelectedOrderForEdit(ord);
    setEditError('');
    const pat = ord.patientDetails || {};
    const addr = ord.deliveryAddress || {};
    setEditFormData({
      patientName: pat.patientName || ord.customerId?.name || '',
      fatherName: pat.fatherName || '',
      mobile: pat.mobile || ord.customerId?.mobile || '',
      alternateMobile: pat.alternateMobile || '',
      street: addr.street || '',
      village: addr.village || '',
      district: addr.district || '',
      state: addr.state || 'Tamil Nadu',
      pincode: addr.pincode || '635109',
      grandTotal: ord.grandTotal ?? '',
      offerPrice: ord.offerPrice ?? '',
      paymentMethod: ord.paymentMethod || 'CASH',
      paymentStatus: ord.paymentStatus || 'PAID',
      notes: ord.notes || ''
    });
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editFormData.patientName?.trim() || !editFormData.mobile?.trim()) {
      setEditError('Patient name and mobile number are required.');
      return;
    }
    updateOrderMutation.mutate({
      orderId: selectedOrderForEdit._id,
      payload: {
        patientName: editFormData.patientName.trim(),
        fatherName: editFormData.fatherName?.trim(),
        mobile: editFormData.mobile.trim(),
        alternateMobile: editFormData.alternateMobile?.trim(),
        street: editFormData.street?.trim(),
        village: editFormData.village?.trim(),
        district: editFormData.district?.trim(),
        state: editFormData.state?.trim(),
        pincode: editFormData.pincode?.trim(),
        grandTotal: editFormData.grandTotal !== '' ? Number(editFormData.grandTotal) : undefined,
        offerPrice: editFormData.offerPrice !== '' ? Number(editFormData.offerPrice) : undefined,
        paymentMethod: editFormData.paymentMethod,
        paymentStatus: editFormData.paymentStatus,
        notes: editFormData.notes
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-700 text-white flex items-center justify-center text-xl shadow-xs">
            🏪
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">
              Direct Counter & Office Walk-In POS
            </h2>
            <p className="text-xs text-slate-500">
              {currentBranch.name} • Instant Walk-In Invoicing & Direct Counter Billing
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          icon={Plus}
          onClick={() => setIsOrderModalOpen(true)}
          className="bg-purple-700 hover:bg-purple-800 text-white font-bold"
        >
          New Counter Invoice
        </Button>
      </div>

      {/* Counter Sales KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Counter Invoiced</div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 font-mono">
            ₹{totalSales.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">{orders.length} transactions recorded</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Direct Counter Sales</div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1 font-mono">
            ₹{counterSales.toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-600 mt-0.5">Instant register billing</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Cash / Counter COD</div>
          <div className="text-2xl sm:text-3xl font-black text-amber-700 mt-1 font-mono">
            ₹{codSales.toLocaleString()}
          </div>
          <div className="text-[10px] text-amber-600 mt-0.5">Till register collection</div>
        </div>
      </div>

      {/* Recent Counter Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">Recent Counter Receipts</h3>
          <span className="text-xs text-slate-400">{orders.length} total orders</span>
        </div>

        {isLoading ? (
          <div className="py-16 text-center">
            <Spinner size="lg" text="Loading counter receipts..." />
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <div className="text-3xl mb-2">🧾</div>
            <div className="text-sm font-semibold text-slate-800">No counter sales yet</div>
            <p className="text-xs text-slate-400 mt-1">Click "New Counter Invoice" to bill a walk-in patient.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {orders.map((ord) => {
              const pat = ord.patientDetails || {};
              return (
                <div key={ord._id} className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm font-mono">{ord.orderNumber}</span>
                      <span className="text-slate-700 font-semibold truncate">{pat.patientName || ord.customerId?.name || 'Walk-In Patient'}</span>
                      <Badge variant="primary" size="sm">{ord.paymentMethod}</Badge>
                    </div>
                    <div className="text-slate-400 text-[11px] truncate">
                      {ord.items?.map((i) => `${i.quantity}x ${i.productName}`).join(', ')} • {new Date(ord.createdAt).toLocaleDateString('en-GB')}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <span className="font-bold text-slate-900 font-mono text-sm sm:mr-2">
                      ₹{ord.grandTotal?.toLocaleString()}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(ord)}
                        className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Edit Counter Receipt"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedOrderForInvoice(ord)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Print Tax Invoice"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedOrderForDelete(ord);
                          setDeleteError('');
                        }}
                        className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Delete Counter Receipt"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Slide-over Order Creation Drawer */}
      {isOrderModalOpen && (
        <OrderCreateModal
          isOpen={isOrderModalOpen}
          onClose={() => setIsOrderModalOpen(false)}
          isOfficeSale={true}
          onOrderCreated={(newOrder) => setSelectedOrderForInvoice(newOrder)}
        />
      )}

      {/* Printable Invoice Modal */}
      {selectedOrderForInvoice && (
        <PrintableInvoiceModal
          isOpen={Boolean(selectedOrderForInvoice)}
          onClose={() => setSelectedOrderForInvoice(null)}
          order={selectedOrderForInvoice}
          autoPrint={true}
        />
      )}

      {/* Edit Order Modal */}
      {selectedOrderForEdit && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Edit Counter Receipt #{selectedOrderForEdit.orderNumber}
                  </h3>
                  <p className="text-[11px] text-slate-400">Update patient details, billing amounts, or notes</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderForEdit(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEdit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {editError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-medium flex items-center gap-2 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              {/* Patient Info */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">1. Patient Details</h4>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Patient Name *</label>
                    <input
                      type="text"
                      required
                      value={editFormData.patientName || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, patientName: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Mobile Number *</label>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={editFormData.mobile || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, mobile: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Alternate Phone</label>
                    <input
                      type="tel"
                      maxLength={10}
                      value={editFormData.alternateMobile || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, alternateMobile: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Father / Caretaker</label>
                    <input
                      type="text"
                      value={editFormData.fatherName || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, fatherName: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                </div>
              </div>

              {/* Billing Amounts & Payment Mode */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">2. Billing & Payment</h4>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Grand Total (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={editFormData.grandTotal || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, grandTotal: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Offer / Discounted Price (₹)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Optional"
                      value={editFormData.offerPrice || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, offerPrice: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Payment Method</label>
                    <select
                      value={editFormData.paymentMethod || 'CASH'}
                      onChange={(e) => setEditFormData({ ...editFormData, paymentMethod: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-600"
                    >
                      <option value="CASH">💵 Cash</option>
                      <option value="UPI">📱 UPI</option>
                      <option value="ONLINE">💳 Online / Card</option>
                      <option value="COD">📦 Cash on Delivery (COD)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Payment Status</label>
                    <select
                      value={editFormData.paymentStatus || 'PAID'}
                      onChange={(e) => setEditFormData({ ...editFormData, paymentStatus: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-600"
                    >
                      <option value="PAID">PAID (Settled)</option>
                      <option value="PENDING">PENDING</option>
                      <option value="COD_PENDING">COD PENDING</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Address (Optional) */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">3. Address (Optional)</h4>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="col-span-2">
                    <label className="block text-slate-600 font-semibold mb-1">Street / Clinic Location</label>
                    <input
                      type="text"
                      value={editFormData.street || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, street: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">District / City</label>
                    <input
                      type="text"
                      value={editFormData.district || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, district: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Pincode</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={editFormData.pincode || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, pincode: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-slate-600 font-semibold mb-1">Notes / Remarks</label>
                <textarea
                  rows={2}
                  value={editFormData.notes || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"
                  placeholder="Additional order or patient instructions..."
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => setSelectedOrderForEdit(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  isLoading={updateOrderMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {selectedOrderForDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto text-xl">
              🗑️
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Delete Counter Receipt?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete receipt <strong className="font-mono text-slate-800">{selectedOrderForDelete.orderNumber}</strong>?
              </p>
              <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg mt-2 border border-amber-200 text-left">
                ⚠️ Any reserved items for this counter order will be automatically released back to branch inventory stock.
              </p>
            </div>

            {deleteError && (
              <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs text-left">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => setSelectedOrderForDelete(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                type="button"
                isLoading={deleteOrderMutation.isPending}
                onClick={() => deleteOrderMutation.mutate(selectedOrderForDelete._id)}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                Delete Receipt
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CounterSalePage;
