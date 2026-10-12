import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X,
  User,
  Phone,
  MessageSquare,
  ShoppingBag,
  Clock,
  MapPin,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Package,
  Truck,
  RotateCcw,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  FileText,
  Copy,
  Check
} from 'lucide-react';
import apiClient from '../../api/apiClient.js';
import { Badge } from '../../components/common/Badge.jsx';
import { Button } from '../../components/common/Button.jsx';
import { OrderCreateModal } from '../orders/OrderCreateModal.jsx';

const STATUS_COLORS = {
  NEW: 'bg-blue-50 text-blue-700 border-blue-200',
  CONFIRMED: 'bg-sky-50 text-sky-700 border-sky-200',
  PROCESSING: 'bg-amber-50 text-amber-700 border-amber-200',
  PACKED: 'bg-purple-50 text-purple-700 border-purple-200',
  READY_FOR_DISPATCH: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  DISPATCHED: 'bg-blue-50 text-blue-700 border-blue-200',
  IN_TRANSIT: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  DELIVERED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200',
  RTO: 'bg-red-50 text-red-700 border-red-200'
};

export function CustomerProfileModal({
  isOpen,
  onClose,
  customerId,
  customerPhone,
  initialData = null,
  onOrderCreated = null
}) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'addresses' | 'activity'
  const [copiedText, setCopiedText] = useState('');
  const [isRepeatOrderOpen, setIsRepeatOrderOpen] = useState(false);
  const [selectedOrderForRepeat, setSelectedOrderForRepeat] = useState(null);

  // Fetch full 360-degree customer profile timeline with ALL orders
  const { data: profileResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['customer-profile-360', customerId, customerPhone],
    queryFn: async () => {
      if (customerId) {
        const res = await apiClient.get(`/customers/${customerId}`);
        return res.data?.data || null;
      }
      if (customerPhone) {
        const clean = customerPhone.replace(/[^0-9]/g, '').slice(-10);
        const res = await apiClient.get(`/customers/by-phone/${clean}`);
        return res.data?.data || null;
      }
      return null;
    },
    enabled: Boolean(isOpen && (customerId || customerPhone)),
    staleTime: 30000
  });

  if (!isOpen) return null;

  const data = profileResponse || initialData || {};
  const customer = data.customer || initialData || {};
  const orders = Array.isArray(data.orders) ? data.orders : [];
  const calls = Array.isArray(data.calls) ? data.calls : [];
  const followups = Array.isArray(data.followups) ? data.followups : [];
  const reorderStatus = data.reorderStatus || {};

  const patientName = customer.name || customer.patientName || 'Customer Profile';
  const mobile = customer.mobile || customerPhone || '';
  const altMobile = customer.altMobile || customer.alternateMobile || '';
  const cleanPhone = mobile.replace(/[^0-9]/g, '').slice(-10);
  const totalOrdersCount = customer.totalOrders ?? orders.length;
  const totalSpent = customer.totalSpent ?? orders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
  const avgOrderValue = totalOrdersCount > 0 ? Math.round(totalSpent / totalOrdersCount) : 0;

  const handleCopy = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(''), 2000);
  };

  const handleOpenWhatsApp = () => {
    if (!cleanPhone) return;
    const msg = encodeURIComponent(
      `Vanakkam ${patientName}! Greetings from Shanthi Ayurvedas. Hope you are doing well with your Ayurvedic treatment course. Let us know if you need assistance or a repeat medicine refill.`
    );
    window.open(`https://wa.me/91${cleanPhone}?text=${msg}`, '_blank');
  };

  const handleTriggerRepeatOrder = (specificOrder = null) => {
    setSelectedOrderForRepeat(specificOrder || orders[0] || null);
    setIsRepeatOrderOpen(true);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-emerald-50/70 via-teal-50/40 to-white shrink-0">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0 uppercase">
                {patientName ? patientName.slice(0, 2) : 'PT'}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-black text-slate-900 truncate">{patientName}</h3>
                  {customer.branchId?.name && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      {customer.branchId?.name}
                    </span>
                  )}
                  {customer.assignedTelecallerId?.name && (
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-medium flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" /> Caller: {customer.assignedTelecallerId?.name}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-600">
                  <div className="flex items-center gap-1 font-mono font-bold text-slate-800">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{mobile || 'No phone'}</span>
                    {mobile && (
                      <button
                        type="button"
                        onClick={() => handleCopy(mobile, 'phone')}
                        className="text-slate-400 hover:text-slate-600 p-0.5"
                        title="Copy phone"
                      >
                        {copiedText === 'phone' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    )}
                  </div>

                  {altMobile && (
                    <span className="text-slate-400 font-mono text-[11px]">Alt: {altMobile}</span>
                  )}

                  {customer.email && (
                    <span className="text-slate-500 text-[11px] truncate max-w-[180px]">{customer.email}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {mobile && (
                <>
                  <a
                    href={`tel:${mobile}`}
                    className="p-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors shadow-xs"
                    title="Call Patient"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                  <button
                    type="button"
                    onClick={handleOpenWhatsApp}
                    className="p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors shadow-xs cursor-pointer"
                    title="WhatsApp Patient"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 15-Day Reorder Alert Banner */}
          {reorderStatus.isDue && (
            <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-emerald-700 text-white px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                  <RotateCcw className="w-5 h-5 text-white animate-spin-slow" />
                </div>
                <div>
                  <div className="font-black text-sm flex items-center gap-2">
                    <span>15-Day Medicine Refill Due</span>
                    <span className="px-2 py-0.2 rounded-full bg-white text-amber-900 text-[10px] font-black tracking-wide uppercase">
                      Course Complete
                    </span>
                  </div>
                  <p className="text-xs text-amber-100">
                    Patient completed 15+ days of treatment ({reorderStatus.daysSinceLastOrder} days since last order). Call now for repeat medication refill.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => handleTriggerRepeatOrder()}
                  className="px-3 py-1.5 rounded-xl bg-white text-emerald-900 hover:bg-emerald-50 text-xs font-black shadow-sm flex items-center gap-1.5 transition-all cursor-pointer hover:scale-102"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Book Reorder Now</span>
                </button>
              </div>
            </div>
          )}

          {/* Quick Metrics Bar */}
          <div className="bg-slate-50/80 px-5 py-3 border-b border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Orders</div>
              <div className="text-lg font-black text-slate-900 mt-0.5">{totalOrdersCount}</div>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Lifetime Spend</div>
              <div className="text-lg font-black text-emerald-700 mt-0.5">₹{totalSpent.toLocaleString()}</div>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Average Order</div>
              <div className="text-lg font-black text-slate-900 mt-0.5">₹{avgOrderValue.toLocaleString()}</div>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Treatment Status</div>
              <div className="text-xs font-bold text-slate-800 mt-1 flex items-center gap-1.5">
                {reorderStatus.isDue ? (
                  <span className="text-amber-700 font-extrabold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Refill Due ({reorderStatus.daysSinceLastOrder}d)
                  </span>
                ) : (
                  <span className="text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Active Course
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="px-5 pt-3 border-b border-slate-200 bg-white flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className={`px-3.5 py-2 font-bold text-xs rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'orders'
                    ? 'border-emerald-600 text-emerald-800 bg-emerald-50/40'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>All Orders ({orders.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('addresses')}
                className={`px-3.5 py-2 font-bold text-xs rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'addresses'
                    ? 'border-emerald-600 text-emerald-800 bg-emerald-50/40'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Saved Addresses ({customer.addresses?.length || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('activity')}
                className={`px-3.5 py-2 font-bold text-xs rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'activity'
                    ? 'border-emerald-600 text-emerald-800 bg-emerald-50/40'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Consultations & Notes ({calls.length + followups.length})</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleTriggerRepeatOrder()}
              className="mb-1 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs flex items-center gap-1 transition-colors cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>+ New Order</span>
            </button>
          </div>

          {/* Modal Body / Tab Content */}
          <div className="flex-1 overflow-y-auto p-5 bg-slate-50/50">
            {isLoading ? (
              <div className="py-16 text-center text-slate-400 space-y-3">
                <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-semibold text-slate-600">Loading complete customer order history...</p>
              </div>
            ) : error ? (
              <div className="py-12 text-center text-red-500 space-y-2">
                <AlertCircle className="w-8 h-8 mx-auto text-red-400" />
                <p className="text-xs font-bold">Failed to load customer profile details.</p>
                <Button size="sm" variant="secondary" onClick={() => refetch()}>
                  Retry
                </Button>
              </div>
            ) : activeTab === 'orders' ? (
              /* TAB 1: ALL ORDERS */
              orders.length === 0 ? (
                <div className="py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200/80 p-8 space-y-3">
                  <Package className="w-12 h-12 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-700">No orders found for this customer.</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    This customer has not placed any prescription orders yet. Click below to place their first order.
                  </p>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleTriggerRepeatOrder()}
                    className="mt-2"
                  >
                    Create First Order
                  </Button>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {orders.map((ord, idx) => {
                    const daysAgo = Math.floor(
                      (Date.now() - new Date(ord.createdAt).getTime()) / (1000 * 60 * 60 * 24)
                    );
                    const statusClass = STATUS_COLORS[ord.status] || 'bg-slate-100 text-slate-700 border-slate-200';
                    const itemsList = ord.items || [];

                    return (
                      <div
                        key={ord._id || idx}
                        className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 transition-all p-4 shadow-xs space-y-3"
                      >
                        {/* Order Header: ID, Date, Status */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-slate-900 text-sm">
                              #{ord.orderNumber}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusClass}`}
                            >
                              {ord.status}
                            </span>
                            {idx === 0 && (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 text-[10px] font-black border border-emerald-200">
                                LATEST
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1 font-mono text-[11px]">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {new Date(ord.createdAt).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium">
                              ({daysAgo === 0 ? 'Today' : `${daysAgo}d ago`})
                            </span>
                          </div>
                        </div>

                        {/* Order Details: Products, Total, Payment, Courier */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                          {/* Col 1: Items List */}
                          <div className="md:col-span-2 space-y-1.5">
                            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                              Prescribed Products ({itemsList.length})
                            </div>
                            <div className="space-y-1">
                              {itemsList.map((item, iIdx) => (
                                <div
                                  key={iIdx}
                                  className="flex items-center justify-between bg-slate-50/80 px-2.5 py-1.5 rounded-lg text-slate-800 font-medium"
                                >
                                  <span className="truncate pr-2">
                                    {item.productName || 'Ayurvedic Medicine'}
                                  </span>
                                  <span className="font-mono text-slate-600 shrink-0 text-[11px]">
                                    {item.quantity} × ₹{item.unitPrice}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Col 2: Amount & Logistics */}
                          <div className="space-y-2 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500">Grand Total:</span>
                              <span className="font-mono font-black text-slate-900 text-sm">
                                ₹{(ord.grandTotal || 0).toLocaleString()}
                              </span>
                            </div>

                            <div className="flex justify-between items-center text-[11px]">
                              <span className="text-slate-500">Payment:</span>
                              <span className="font-bold text-slate-700">
                                {ord.paymentMethod || 'COD'} ({ord.paymentStatus || 'PENDING'})
                              </span>
                            </div>

                            <div className="flex justify-between items-center text-[11px] pt-1 border-t border-slate-200/60">
                              <span className="text-slate-500">Courier:</span>
                              <span className="font-semibold text-slate-700">
                                {ord.courierName || 'TPC Express'}
                              </span>
                            </div>

                            {ord.trackingNumber && (
                              <div className="flex items-center justify-between text-[11px] bg-white px-2 py-1 rounded border border-slate-200">
                                <span className="font-mono text-slate-800 truncate font-semibold">
                                  {ord.trackingNumber}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(ord.trackingNumber, `track-${ord._id}`)}
                                  className="text-slate-400 hover:text-slate-600 p-0.5 ml-1"
                                  title="Copy Tracking #"
                                >
                                  {copiedText === `track-${ord._id}` ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Order Footer: Repeat Reorder Button */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                            {ord.telecallerName && (
                              <span>Booked by: <strong>{ord.telecallerName}</strong></span>
                            )}
                            {ord.deliveryAddress?.city && (
                              <span>• To: {ord.deliveryAddress.city}</span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleTriggerRepeatOrder(ord)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3 text-emerald-700" />
                            <span>Repeat This Basket</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : activeTab === 'addresses' ? (
              /* TAB 2: SAVED ADDRESSES */
              <div className="space-y-3">
                {customer.addresses && customer.addresses.length > 0 ? (
                  customer.addresses.map((addr, aIdx) => (
                    <div
                      key={aIdx}
                      className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                          {addr.addressType || 'Primary Delivery Address'}
                        </span>
                        {addr.isDefault && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            DEFAULT
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {addr.street ? `${addr.street}, ` : ''}
                        {addr.landmark ? `Near ${addr.landmark}, ` : ''}
                        {addr.village ? `${addr.village}, ` : ''}
                        {addr.city || 'Hosur'}, {addr.state || 'Tamil Nadu'} - {addr.pincode}
                      </p>
                      {addr.phone && (
                        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" /> {addr.phone}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 p-6">
                    <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-600">No saved addresses on file.</p>
                  </div>
                )}
              </div>
            ) : (
              /* TAB 3: ACTIVITY & NOTES */
              <div className="space-y-4">
                {/* Notes */}
                {customer.notes && (
                  <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-1">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Medical / Case Notes
                    </div>
                    <p className="text-xs text-slate-800 whitespace-pre-line leading-relaxed">
                      {customer.notes}
                    </p>
                  </div>
                )}

                {/* Call History */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Telecaller Consultation Calls ({calls.length})
                  </div>
                  {calls.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No logged call history.</p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {calls.slice(0, 10).map((call, cIdx) => (
                        <div key={cIdx} className="py-2.5 text-xs space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-slate-800">
                              {call.telecallerId?.name || 'Telecaller'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(call.createdAt).toLocaleString()}
                            </span>
                          </div>
                          {call.notes && <p className="text-slate-600">{call.notes}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Follow Ups */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Scheduled Follow-ups ({followups.length})
                  </div>
                  {followups.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No scheduled follow-ups.</p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {followups.slice(0, 10).map((fu, fIdx) => (
                        <div key={fIdx} className="py-2.5 text-xs space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-slate-800">
                              {fu.status} • {fu.telecallerId?.name || 'Staff'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(fu.scheduledAt).toLocaleString()}
                            </span>
                          </div>
                          {fu.notes && <p className="text-slate-600">{fu.notes}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="px-5 py-3 border-t border-slate-100 bg-white flex items-center justify-between shrink-0">
            <div className="text-xs text-slate-500 font-mono">
              ID: {customer._id ? String(customer._id).slice(-8) : 'N/A'}
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={onClose}>
                Close
              </Button>
              <Button
                size="sm"
                variant="primary"
                icon={ShoppingBag}
                onClick={() => handleTriggerRepeatOrder()}
              >
                Book Repeat Order
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Repeat Order Create Modal */}
      {isRepeatOrderOpen && (
        <OrderCreateModal
          isOpen={isRepeatOrderOpen}
          onClose={() => setIsRepeatOrderOpen(false)}
          prefillCustomer={customer}
          initialPatientData={
            selectedOrderForRepeat
              ? {
                  patientName: selectedOrderForRepeat.patientDetails?.patientName || customer.name,
                  mobile: selectedOrderForRepeat.patientDetails?.mobile || customer.mobile,
                  altMobile: selectedOrderForRepeat.patientDetails?.alternateMobile || customer.altMobile,
                  street: selectedOrderForRepeat.deliveryAddress?.street,
                  landmark: selectedOrderForRepeat.deliveryAddress?.landmark,
                  city: selectedOrderForRepeat.deliveryAddress?.city,
                  state: selectedOrderForRepeat.deliveryAddress?.state || 'Tamil Nadu',
                  pincode: selectedOrderForRepeat.deliveryAddress?.pincode,
                  items: selectedOrderForRepeat.items?.map((i) => ({
                    productId: i.productId?._id || i.productId,
                    productName: i.productName,
                    quantity: i.quantity,
                    unitPrice: i.unitPrice
                  }))
                }
              : {
                  patientName: customer.name,
                  mobile: customer.mobile,
                  altMobile: customer.altMobile,
                  street: customer.addresses?.[0]?.street,
                  landmark: customer.addresses?.[0]?.landmark,
                  city: customer.addresses?.[0]?.city,
                  state: customer.addresses?.[0]?.state || 'Tamil Nadu',
                  pincode: customer.addresses?.[0]?.pincode
                }
          }
          onSuccess={() => {
            setIsRepeatOrderOpen(false);
            queryClient.invalidateQueries({ queryKey: ['customer-profile-360'] });
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            if (onOrderCreated) onOrderCreated();
          }}
        />
      )}
    </>
  );
}

export default CustomerProfileModal;
