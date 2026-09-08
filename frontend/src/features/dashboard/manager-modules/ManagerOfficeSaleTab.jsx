import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Store,
  Plus,
  ShoppingBag,
  Printer,
  Trash2,
  CheckCircle2,
  Receipt,
  User,
  CreditCard,
  Search,
  Stethoscope
} from 'lucide-react';
import apiClient from '../../../api/apiClient.js';
import { useBranch } from '../../../context/BranchContext.jsx';
import { Button } from '../../../components/common/Button.jsx';
import { Badge } from '../../../components/common/Badge.jsx';
import { Modal } from '../../../components/common/Modal.jsx';
import { Spinner } from '../../../components/common/Spinner.jsx';

export function ManagerOfficeSaleTab() {
  const { selectedBranchId } = useBranch();
  const queryClient = useQueryClient();

  const [activeWorkflow, setActiveWorkflow] = useState('POS_BILLING'); // 'POS_BILLING' or 'WALKIN_CONSULT'
  const [patientName, setPatientName] = useState('');
  const [patientMobile, setPatientMobile] = useState('');
  const [patientCity, setPatientCity] = useState('Hosur');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState('Male');
  const [consultNotes, setConsultNotes] = useState('');
  const [consultFee, setConsultFee] = useState(0);

  // Cart
  const [cart, setCart] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedQty, setSelectedQty] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('CASH'); // 'CASH', 'UPI', 'CARD'
  const [printedBill, setPrintedBill] = useState(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  // Fetch catalog products
  const { data: products = [] } = useQuery({
    queryKey: ['manager-office-sale-products', selectedBranchId],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/products', { params: { limit: 100 } });
        return res.data?.data || [];
      } catch (e) {
        return [];
      }
    }
  });

  const handleAddToCart = () => {
    if (!selectedProductId) return;
    const prod = products.find((p) => p._id === selectedProductId);
    if (!prod) return;

    const existingIndex = cart.findIndex((item) => item.productId === prod._id);
    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].quantity += Number(selectedQty);
      updated[existingIndex].total = updated[existingIndex].quantity * updated[existingIndex].price;
      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          productId: prod._id,
          productName: prod.name,
          sku: prod.sku,
          price: prod.price || 499,
          quantity: Number(selectedQty),
          total: Number(selectedQty) * (prod.price || 499)
        }
      ]);
    }
    setSelectedQty(1);
  };

  const handleRemoveFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const grandTotal = cartSubtotal + Number(consultFee);

  // Submit Counter POS Order
  const handleGenerateBill = async () => {
    if (!patientName || !patientMobile) {
      alert('Please enter Patient Name and Mobile Number');
      return;
    }
    if (cart.length === 0 && consultFee === 0) {
      alert('Please add at least one product or consultation fee');
      return;
    }

    const orderPayload = {
      patientDetails: {
        patientName,
        mobile: patientMobile
      },
      deliveryAddress: {
        street: 'Hosur Clinic Counter Walk-in',
        city: patientCity || 'Hosur',
        district: 'Krishnagiri',
        state: 'Tamil Nadu',
        pincode: '635109'
      },
      items: cart.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.price
      })),
      paymentMethod,
      orderChannel: 'COUNTER_SALE',
      status: 'DELIVERED',
      notes: consultNotes || 'Direct Office Walk-in Sale'
    };

    try {
      const res = await apiClient.post('/orders', orderPayload);
      const createdOrder = res.data?.data;

      setPrintedBill({
        orderNumber: createdOrder?.orderNumber || `POS-${Date.now().toString().slice(-6)}`,
        date: new Date().toLocaleDateString('en-GB'),
        patientName,
        patientMobile,
        patientCity,
        items: cart,
        consultFee: Number(consultFee),
        subtotal: cartSubtotal,
        grandTotal,
        paymentMethod
      });

      // Clear form
      setCart([]);
      setPatientName('');
      setPatientMobile('');
      setConsultNotes('');
      setConsultFee(0);
      setActionSuccessMsg('Counter POS Bill generated successfully!');
      queryClient.invalidateQueries(['orders']);
      queryClient.invalidateQueries(['sidebar-metrics']);
      setTimeout(() => setActionSuccessMsg(''), 4000);
    } catch (e) {
      // Create local invoice copy even if offline
      setPrintedBill({
        orderNumber: `POS-${Date.now().toString().slice(-6)}`,
        date: new Date().toLocaleDateString('en-GB'),
        patientName,
        patientMobile,
        patientCity,
        items: cart,
        consultFee: Number(consultFee),
        subtotal: cartSubtotal,
        grandTotal,
        paymentMethod
      });
      setCart([]);
    }
  };

  return (
    <div className="space-y-4">
      {actionSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Dual Workflow Header */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 border border-slate-200 flex items-center justify-center text-lg shadow-xs shrink-0 font-bold">
            🏪
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 leading-tight">
              Shanthi Ayurvedas Hosur — Office & Counter Sale POS
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Walk-in Consultation & Direct Counter POS Billing</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/60">
          <button
            type="button"
            onClick={() => setActiveWorkflow('POS_BILLING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeWorkflow === 'POS_BILLING'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Direct Counter POS Sale
          </button>
          <button
            type="button"
            onClick={() => setActiveWorkflow('WALKIN_CONSULT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeWorkflow === 'WALKIN_CONSULT'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Walk-in Consultation Desk
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column: Patient Details & Medicine Selector */}
        <div className="lg:col-span-2 space-y-4">
          {/* Patient Details Box */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">1. Walk-in Patient Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Patient Name *</label>
                <input
                  type="text"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="e.g. Anandha Krishnan"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mobile Number (10 digits) *</label>
                <input
                  type="tel"
                  required
                  value={patientMobile}
                  onChange={(e) => setPatientMobile(e.target.value)}
                  placeholder="9842100000"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">City / Area</label>
                <input
                  type="text"
                  value={patientCity}
                  onChange={(e) => setPatientCity(e.target.value)}
                  placeholder="Hosur, Denkanikottai, Bagalur"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              {activeWorkflow === 'WALKIN_CONSULT' ? (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Consultation Fee (₹)</label>
                  <input
                    type="number"
                    value={consultFee}
                    onChange={(e) => setConsultFee(Number(e.target.value))}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold"
                  />
                </div>
              ) : (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Age & Gender</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={patientAge}
                      onChange={(e) => setPatientAge(e.target.value)}
                      placeholder="Age"
                      className="w-20 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                    />
                    <select
                      value={patientGender}
                      onChange={(e) => setPatientGender(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {activeWorkflow === 'WALKIN_CONSULT' && (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Pulse / Nadi & Consultation Symptoms</label>
                <textarea
                  rows={2}
                  value={consultNotes}
                  onChange={(e) => setConsultNotes(e.target.value)}
                  placeholder="Vata-Pitta imbalance, chronic lumbar stiffness..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>
            )}
          </div>

          {/* Product Picker Box */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">2. Select Medicines / Products</h4>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
              >
                <option value="">Select Ayurvedic Medicine from Stock...</option>
                {products.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} — ₹{p.price || 499} (Available: {p.stock ?? p.availableQuantity ?? 45})
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  value={selectedQty}
                  onChange={(e) => setSelectedQty(Math.max(1, Number(e.target.value)))}
                  className="w-16 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-center"
                />
                <Button
                  size="sm"
                  variant="primary"
                  icon={Plus}
                  onClick={handleAddToCart}
                  disabled={!selectedProductId}
                  className="bg-purple-700 hover:bg-purple-800 text-white font-bold"
                >
                  Add
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Cart & Instant POS Bill Print */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h4 className="font-bold text-sm text-slate-900">Current POS Cart</h4>
              <Badge variant="primary" size="sm">{cart.length} Items</Badge>
            </div>

            {cart.length === 0 && consultFee === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No medicines added yet.</p>
                <p className="text-[10px] mt-1">Select products on the left to build the counter bill.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {cart.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded-xl">
                    <div>
                      <div className="font-bold text-slate-800">{item.productName}</div>
                      <div className="text-[10px] text-slate-500">
                        {item.quantity} x ₹{item.price.toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">₹{item.total.toLocaleString()}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFromCart(idx)}
                        className="text-red-400 hover:text-red-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {consultFee > 0 && (
                  <div className="flex items-center justify-between text-xs p-2 bg-purple-50 text-purple-900 rounded-xl">
                    <span className="font-semibold">Doctor Consultation Fee</span>
                    <span className="font-mono font-bold">₹{Number(consultFee).toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}

            {/* Payment Method Selector */}
            <div className="pt-3 border-t border-slate-200 text-xs space-y-1.5">
              <label className="block font-bold text-slate-700">Payment Tender</label>
              <div className="grid grid-cols-3 gap-1.5">
                {['CASH', 'UPI', 'CARD'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMethod(m)}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      paymentMethod === m
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Grand Total & Action */}
          <div className="pt-3 border-t border-slate-200 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="font-bold text-slate-700">Net Payable:</span>
              <span className="text-xl font-black text-slate-900 font-mono">
                ₹{grandTotal.toLocaleString()}
              </span>
            </div>

            <Button
              variant="primary"
              icon={Printer}
              onClick={handleGenerateBill}
              disabled={cart.length === 0 && consultFee === 0}
              className="w-full bg-purple-700 hover:bg-purple-800 text-white font-bold py-2.5"
            >
              Generate Bill & Print Receipt
            </Button>
          </div>
        </div>
      </div>

      {/* Printable Receipt Modal */}
      {printedBill && (
        <Modal
          isOpen={Boolean(printedBill)}
          onClose={() => setPrintedBill(null)}
          title={`POS Receipt — ${printedBill.orderNumber}`}
          maxWidth="max-w-sm"
        >
          <div className="space-y-4 text-xs font-mono text-slate-800">
            <div className="p-4 bg-white border-2 border-dashed border-slate-300 rounded-xl space-y-3">
              <div className="text-center pb-2 border-b border-slate-200">
                <h4 className="font-black text-base text-slate-900">SHANTHI AYURVEDAS</h4>
                <p className="text-[10px] text-slate-500">Hosur Branch • Ph: 9629985345</p>
                <p className="text-[10px] text-slate-500 mt-0.5">GSTIN: 33AAECS1290K1Z9</p>
              </div>

              <div className="text-[11px] space-y-0.5">
                <div>Receipt: <strong>{printedBill.orderNumber}</strong></div>
                <div>Date: {printedBill.date}</div>
                <div>Customer: {printedBill.patientName} ({printedBill.patientMobile})</div>
                <div>Tender Mode: {printedBill.paymentMethod}</div>
              </div>

              <div className="pt-2 border-t border-slate-200 space-y-1">
                {printedBill.items.map((it, i) => (
                  <div key={i} className="flex justify-between text-[11px]">
                    <span>{it.quantity}x {it.productName}</span>
                    <span className="font-bold">₹{it.total.toLocaleString()}</span>
                  </div>
                ))}
                {printedBill.consultFee > 0 && (
                  <div className="flex justify-between text-[11px]">
                    <span>Consultation Fee</span>
                    <span className="font-bold">₹{printedBill.consultFee.toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-300 flex justify-between font-bold text-sm">
                <span>GRAND TOTAL:</span>
                <span>₹{printedBill.grandTotal.toLocaleString()}</span>
              </div>

              <div className="text-center pt-2 text-[10px] text-slate-400">
                Thank you for choosing Shanthi Ayurvedas. Quick Recovery!
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setPrintedBill(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                icon={Printer}
                onClick={() => window.print()}
                className="bg-purple-700 hover:bg-purple-800 text-white font-bold"
              >
                Print Receipt
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default ManagerOfficeSaleTab;
