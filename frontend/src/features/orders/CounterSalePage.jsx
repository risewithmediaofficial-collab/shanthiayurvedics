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
  AlertTriangle,
  MessageSquare,
  Share2,
  RefreshCw,
  Clock,
  PhoneCall
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
  const isTelecaller = user?.role === 'TELECALLER';
  const queryClient = useQueryClient();
  const { selectedBranchId, branches } = useBranch();

  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState(null);
  const [selectedOrderForEdit, setSelectedOrderForEdit] = useState(null);
  const [selectedOrderForDelete, setSelectedOrderForDelete] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sendingWhatsAppId, setSendingWhatsAppId] = useState(null);
  const [whatsAppToast, setWhatsAppToast] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [editError, setEditError] = useState('');
  const [deleteError, setDeleteError] = useState('');

  // Fetch only offline orders (walk-in counter sales)
  const { data: ordersResponse, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['counterOrders', selectedBranchId],
    queryFn: async () => {
      const res = await apiClient.get('/orders', {
        params: {
          limit: 100,
          orderChannel: 'COUNTER_SALE',
          isOfficeSale: 'true'
        }
      });
      return res.data;
    },
    enabled: !isTelecaller
  });

  const rawOrders = Array.isArray(ordersResponse?.data) ? ordersResponse?.data : [];

  // Strictly filter for offline orders (walk-in customers only)
  const offlineOrders = rawOrders.filter((o) =>
    o.orderChannel === 'COUNTER_SALE' ||
    o.isOfficeSale === true ||
    /counter/i.test(o.courierName || '') ||
    /counter|walk-in|office/i.test(o.notes || '') ||
    /counter|walk-in/i.test(o.deliveryAddress?.street || '')
  );

  // Search filter
  const filteredOrders = offlineOrders.filter((ord) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const pName = (ord.patientDetails?.patientName || ord.customerId?.name || '').toLowerCase();
    const pMobile = ord.patientDetails?.mobile || ord.customerId?.mobile || '';
    const ordNum = (ord.orderNumber || '').toLowerCase();
    return pName.includes(q) || pMobile.includes(q) || ordNum.includes(q);
  });

  const currentBranch = branches?.find((b) => b._id === selectedBranchId) || { name: 'Hosur Main Branch' };

  // Calculate totals strictly for offline walk-in orders
  const totalSales = offlineOrders.reduce((acc, curr) => acc + (curr.grandTotal || 0), 0);
  const cashSales = offlineOrders.filter((o) => o.paymentMethod === 'CASH' || o.paymentMethod === 'OFFLINE').reduce((acc, curr) => acc + (curr.grandTotal || 0), 0);
  const upiPrepaidSales = offlineOrders.filter((o) => o.paymentMethod !== 'CASH' && o.paymentMethod !== 'COD').reduce((acc, curr) => acc + (curr.grandTotal || 0), 0);

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

  if (isTelecaller) {
    return <Navigate to="/dashboard?view=telecaller" replace />;
  }

  // Handle direct WhatsApp send for an offline walk-in order
  const handleSendWhatsApp = async (ord) => {
    if (!ord?._id || sendingWhatsAppId) return;
    setSendingWhatsAppId(ord._id);
    setWhatsAppToast(null);

    try {
      const res = await apiClient.post(`/orders/${ord._id}/send-whatsapp`);
      const msg = res.data?.message || `Order confirmed bill sent to ${ord.patientDetails?.mobile || 'patient'} via WhatsApp template!`;
      setWhatsAppToast({ type: 'success', message: msg });
      queryClient.invalidateQueries({ queryKey: ['counterOrders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    } catch (err) {
      const errMsg = err.response?.data?.message || err.response?.data?.error || 'Failed to send WhatsApp message via MSG91';
      setWhatsAppToast({ type: 'error', message: errMsg });
    } finally {
      setSendingWhatsAppId(null);
      setTimeout(() => setWhatsAppToast(null), 6000);
    }
  };

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
      {/* Toast notification */}
      {whatsAppToast && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between gap-3 shadow-md border animate-in slide-in-from-top-2 duration-200 ${
            whatsAppToast.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {whatsAppToast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{whatsAppToast.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setWhatsAppToast(null)}
            className="text-sm font-bold opacity-70 hover:opacity-100 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <img
            src="/shanthi_logo.png"
            alt="Shanthi Ayurvedas"
            className="h-10 w-auto max-w-[140px] object-contain shrink-0"
          />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-slate-900 leading-tight">
                Office Sale — Walk-in Customer Orders
              </h2>
              <Badge variant="emerald" size="sm">Offline Orders Only</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {currentBranch.name} • Counter Walk-in Bills & Instant WhatsApp Confirmation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            icon={RefreshCw}
            isLoading={isFetching}
            onClick={() => refetch()}
            className="text-xs"
            title="Refresh offline orders"
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            icon={Plus}
            onClick={() => setIsOrderModalOpen(true)}
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs"
          >
            New Counter Bill
          </Button>
        </div>
      </div>

      {/* Counter Sales KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
            Total Offline Walk-In Sales
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 font-mono">
            ₹{totalSales.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
            <Store className="w-3 h-3 text-slate-400" />
            <span>{offlineOrders.length} walk-in bills recorded</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
            Cash Till Collections
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1 font-mono">
            ₹{cashSales.toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-600 mt-0.5">Direct cash counter tender</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
            UPI / Prepaid Counter Sales
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-700 mt-1 font-mono">
            ₹{upiPrepaidSales.toLocaleString()}
          </div>
          <div className="text-[10px] text-blue-600 mt-0.5">QR UPI / Card register billing</div>
        </div>
      </div>

      {/* Offline Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Walk-in Customer Offline Orders</span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full">
                {filteredOrders.length}
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Only direct walk-in customer orders are shown. Print bills and send confirmed bills via WhatsApp template.
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search patient, phone, or bill #..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 text-center">
            <Spinner size="lg" text="Loading walk-in offline orders..." />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <div className="text-3xl mb-2">🧾</div>
            <div className="text-sm font-semibold text-slate-800">
              {searchQuery ? 'No matching walk-in orders found' : 'No offline walk-in orders yet'}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {searchQuery
                ? 'Try searching with a different mobile number or patient name.'
                : 'Click "New Counter Bill" above to create an offline walk-in bill.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {filteredOrders.map((ord) => {
              const pat = ord.patientDetails || {};
              const patientName = pat.patientName || ord.customerId?.name || 'Walk-In Patient';
              const mobile = pat.mobile || ord.customerId?.mobile || '—';
              const isSendingWA = sendingWhatsAppId === ord._id;

              return (
                <div
                  key={ord._id}
                  className="py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 hover:bg-slate-50/60 p-2 rounded-xl transition-colors"
                >
                  {/* Order & Patient Details */}
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {ord.orderNumber}
                      </span>
                      <Badge variant="emerald" size="sm">
                        Walk-in Offline
                      </Badge>
                      <Badge variant="primary" size="sm">
                        {ord.paymentMethod || 'CASH'}
                      </Badge>

                      {/* WhatsApp Status Indicator */}
                      {ord.whatsappConfirmationSentAt ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>WA Sent ({new Date(ord.whatsappConfirmationSentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                          <Clock className="w-3 h-3" />
                          <span>WA Pending</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-slate-700 flex-wrap">
                      <span className="font-bold text-sm text-slate-900">{patientName}</span>
                      <span className="font-mono font-bold text-slate-700 flex items-center gap-1">
                        📱 {mobile}
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        📅 {new Date(ord.createdAt).toLocaleDateString('en-GB')} at {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Medicines Prescribed */}
                    <div className="text-slate-500 text-[11px] truncate max-w-xl">
                      <span className="font-semibold text-slate-600">Prescribed: </span>
                      {(ord.items || []).map((i) => `${i.quantity}x ${i.productName}`).join(', ') || 'Herbal Formulations'}
                    </div>
                  </div>

                  {/* Pricing and Action Buttons */}
                  <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    <div className="text-left lg:text-right pr-2">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Amount</div>
                      <div className="font-mono font-black text-slate-900 text-base">
                        ₹{ord.grandTotal?.toLocaleString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Make Print / Print Bill */}
                      <button
                        type="button"
                        onClick={() => setSelectedOrderForInvoice(ord)}
                        className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs touch-manipulation min-h-[36px]"
                        title="Make Print: View and print official tax bill"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Make Print</span>
                      </button>

                      {/* Send WhatsApp (Existing Template) */}
                      <button
                        type="button"
                        disabled={isSendingWA}
                        onClick={() => handleSendWhatsApp(ord)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer touch-manipulation min-h-[36px] ${
                          ord.whatsappConfirmationSentAt
                            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                        }`}
                        title="Send order confirmed bill via MSG91 WhatsApp template"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{isSendingWA ? 'Sending...' : ord.whatsappConfirmationSentAt ? 'Resend WA' : 'Send WA'}</span>
                      </button>

                      {/* Edit */}
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(ord)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer touch-manipulation min-h-[36px]"
                        title="Edit Receipt Details"
                      >
                        <Pencil className="w-3.5 h-3.5 text-slate-500" />
                        <span className="hidden sm:inline">Edit</span>
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedOrderForDelete(ord);
                          setDeleteError('');
                        }}
                        className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer touch-manipulation min-h-[36px]"
                        title="Delete Counter Receipt"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
          onOrderCreated={(newOrder) => {
            setSelectedOrderForInvoice(newOrder);
            queryClient.invalidateQueries({ queryKey: ['counterOrders'] });
          }}
        />
      )}

      {/* Printable Invoice Modal with Auto-Print & WhatsApp Trigger */}
      {selectedOrderForInvoice && (
        <PrintableInvoiceModal
          isOpen={Boolean(selectedOrderForInvoice)}
          onClose={() => setSelectedOrderForInvoice(null)}
          order={selectedOrderForInvoice}
          autoPrint={true}
          onWhatsAppSent={() => {
            queryClient.invalidateQueries({ queryKey: ['counterOrders'] });
          }}
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
                    Edit Walk-In Receipt #{selectedOrderForEdit.orderNumber}
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
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-600"
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
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Alternate Phone</label>
                    <input
                      type="tel"
                      value={editFormData.alternateMobile || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, alternateMobile: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Father / Guardian</label>
                    <input
                      type="text"
                      value={editFormData.fatherName || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, fatherName: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Financial & Payment */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">2. Payment & Amounts</h4>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Grand Total (₹)</label>
                    <input
                      type="number"
                      value={editFormData.grandTotal}
                      onChange={(e) => setEditFormData({ ...editFormData, grandTotal: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Payment Method</label>
                    <select
                      value={editFormData.paymentMethod || 'CASH'}
                      onChange={(e) => setEditFormData({ ...editFormData, paymentMethod: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                    >
                      <option value="CASH">CASH</option>
                      <option value="UPI">UPI</option>
                      <option value="ONLINE">ONLINE</option>
                      <option value="COD">COD</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Payment Status</label>
                    <select
                      value={editFormData.paymentStatus || 'PAID'}
                      onChange={(e) => setEditFormData({ ...editFormData, paymentStatus: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                    >
                      <option value="PAID">PAID</option>
                      <option value="PENDING">PENDING</option>
                      <option value="COD_PENDING">COD_PENDING</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1 pt-2 border-t border-slate-100">
                <label className="block text-slate-600 font-semibold">Regimen / Treatment Notes</label>
                <textarea
                  rows={2}
                  value={editFormData.notes || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              {/* Actions */}
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
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
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
              <h3 className="font-bold text-slate-900 text-base">Delete Walk-In Receipt?</h3>
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
