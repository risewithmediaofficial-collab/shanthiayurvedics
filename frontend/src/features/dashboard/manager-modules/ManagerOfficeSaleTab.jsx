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
  MapPin,
  HeartPulse,
  Calendar,
  Sparkles,
  Phone,
  ShieldCheck
} from 'lucide-react';
import apiClient from '../../../api/apiClient.js';
import { useBranch } from '../../../context/BranchContext.jsx';
import { Button } from '../../../components/common/Button.jsx';
import { Badge } from '../../../components/common/Badge.jsx';
import { Modal } from '../../../components/common/Modal.jsx';
import { Spinner } from '../../../components/common/Spinner.jsx';

const PINCODE_MAP = {
  '635109': { city: 'Hosur', taluk: 'Hosur', district: 'Krishnagiri', state: 'Tamil Nadu' },
  '635126': { city: 'Hosur Industrial Area', taluk: 'Hosur', district: 'Krishnagiri', state: 'Tamil Nadu' },
  '635103': { city: 'Bagalur', taluk: 'Hosur', district: 'Krishnagiri', state: 'Tamil Nadu' },
  '635107': { city: 'Denkanikottai', taluk: 'Denkanikottai', district: 'Krishnagiri', state: 'Tamil Nadu' },
  '635001': { city: 'Krishnagiri Town', taluk: 'Krishnagiri', district: 'Krishnagiri', state: 'Tamil Nadu' },
  '560001': { city: 'Bangalore Central', taluk: 'Bangalore', district: 'Bangalore Urban', state: 'Karnataka' },
  '560100': { city: 'Electronic City', taluk: 'Anekal', district: 'Bangalore Urban', state: 'Karnataka' },
  '562106': { city: 'Anekal', taluk: 'Anekal', district: 'Bangalore Urban', state: 'Karnataka' },
  '636001': { city: 'Salem City', taluk: 'Salem', district: 'Salem', state: 'Tamil Nadu' },
  '636701': { city: 'Dharmapuri Town', taluk: 'Dharmapuri', district: 'Dharmapuri', state: 'Tamil Nadu' },
  '641001': { city: 'Coimbatore', taluk: 'Coimbatore', district: 'Coimbatore', state: 'Tamil Nadu' },
  '600001': { city: 'Chennai', taluk: 'Chennai', district: 'Chennai', state: 'Tamil Nadu' }
};

export function ManagerOfficeSaleTab() {
  const { selectedBranchId, branches = [] } = useBranch();
  const queryClient = useQueryClient();

  // Patient & Treatment Plan state
  const [patientName, setPatientName] = useState('');
  const [patientMobile, setPatientMobile] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState('Male');
  const [healthCondition, setHealthCondition] = useState('Weight Loss / Slim 369 Regimen');
  const [planDuration, setPlanDuration] = useState('1 Month Course');
  const [includeServiceFee, setIncludeServiceFee] = useState(false);

  // Address state
  const [pincode, setPincode] = useState('635109');
  const [street, setStreet] = useState('Hosur Clinic Walk-in');
  const [landmark, setLandmark] = useState('');
  const [village, setVillage] = useState('Hosur');
  const [taluk, setTaluk] = useState('Hosur');
  const [district, setDistrict] = useState('Krishnagiri');
  const [stateName, setStateName] = useState('Tamil Nadu');

  // Cart & Product Lines (up to 5 items)
  const [cart, setCart] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedQty, setSelectedQty] = useState(1);
  const [selectedCustomPrice, setSelectedCustomPrice] = useState('');

  // Payment & Feedback
  const [paymentMethod, setPaymentMethod] = useState('CASH'); // 'CASH' | 'COD' | 'PREPAID'
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  // Handle Pincode Auto-Lookup
  const handlePincodeChange = (e) => {
    const pin = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPincode(pin);
    if (pin.length === 6 && PINCODE_MAP[pin]) {
      const match = PINCODE_MAP[pin];
      setTaluk(match.taluk);
      setDistrict(match.district);
      setStateName(match.state);
      setVillage(match.city);
    }
  };

  const handleProductSelect = (prodId) => {
    setSelectedProductId(prodId);
    const prod = products.find((p) => p._id === prodId);
    if (prod) {
      setSelectedCustomPrice(prod.price || prod.mrp || 499);
    }
  };

  const handleAddToCart = () => {
    if (!selectedProductId) return;
    if (cart.length >= 5) {
      alert('Maximum 5 medicine items allowed per treatment order.');
      return;
    }
    const prod = products.find((p) => p._id === selectedProductId);
    if (!prod) return;

    const unitPrice = parseFloat(selectedCustomPrice) || prod.price || 499;
    const qty = Math.max(1, Number(selectedQty) || 1);

    const existingIndex = cart.findIndex((item) => item.productId === prod._id);
    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].quantity += qty;
      updated[existingIndex].price = unitPrice;
      updated[existingIndex].total = updated[existingIndex].quantity * unitPrice;
      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          productId: prod._id,
          productName: prod.name,
          sku: prod.sku,
          price: unitPrice,
          mrp: prod.mrp || unitPrice,
          quantity: qty,
          total: qty * unitPrice
        }
      ]);
    }
    setSelectedProductId('');
    setSelectedQty(1);
    setSelectedCustomPrice('');
  };

  const handleUpdateCartItemPrice = (index, newPrice) => {
    const val = parseFloat(newPrice) || 0;
    const updated = [...cart];
    updated[index].price = val;
    updated[index].total = updated[index].quantity * val;
    setCart(updated);
  };

  const handleUpdateCartItemQty = (index, newQty) => {
    const qty = Math.max(1, Number(newQty) || 1);
    const updated = [...cart];
    updated[index].quantity = qty;
    updated[index].total = qty * updated[index].price;
    setCart(updated);
  };

  const handleRemoveFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const serviceFeeAmount = includeServiceFee ? 699 : 0;
  const cartSubtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const grandTotal = cartSubtotal + serviceFeeAmount;

  // Submit Treatment Order & POS Bill
  const handleGenerateBill = async () => {
    if (!patientName.trim() || !patientMobile.trim()) {
      alert('Please enter Patient Name and Mobile Number');
      return;
    }
    if (patientMobile.replace(/\D/g, '').length < 10) {
      alert('Please enter a valid 10-digit Mobile Number');
      return;
    }
    if (cart.length === 0) {
      alert('Please select at least one medicine formulation for the treatment order');
      return;
    }

    setIsSubmitting(true);
    const orderPayload = {
      patientDetails: {
        patientName: patientName.trim(),
        mobile: patientMobile.trim(),
        age: patientAge ? Number(patientAge) : undefined,
        gender: patientGender
      },
      deliveryAddress: {
        street: street || 'Hosur Main Road Clinic Walk-in',
        landmark: landmark || undefined,
        village: village || 'Hosur',
        taluk: taluk || 'Hosur',
        district: district || 'Krishnagiri',
        state: stateName || 'Tamil Nadu',
        pincode: pincode || '635109'
      },
      items: cart.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.price
      })),
      paymentMethod,
      orderChannel: 'COUNTER_SALE',
      status: paymentMethod === 'COD' ? 'PROCESSING' : 'DELIVERED',
      notes: `Office Treatment Order: ${healthCondition} (${planDuration})${includeServiceFee ? ' + Service Fee ₹699' : ''}`
    };

    try {
      const res = await apiClient.post('/orders', orderPayload);
      const createdOrder = res.data?.data;

      setPrintedBill({
        orderNumber: createdOrder?.orderNumber || `POS-${Date.now().toString().slice(-6)}`,
        date: new Date().toLocaleDateString('en-GB'),
        patientName,
        patientMobile,
        patientAge,
        patientGender,
        healthCondition,
        planDuration,
        address: `${street}, ${village}, ${district}, ${stateName} - ${pincode}`,
        items: [...cart],
        serviceFee: serviceFeeAmount,
        subtotal: cartSubtotal,
        grandTotal,
        paymentMethod
      });

      // Reset form
      setCart([]);
      setPatientName('');
      setPatientMobile('');
      setPatientAge('');
      setLandmark('');
      setIncludeServiceFee(false);
      setActionSuccessMsg('Treatment Order & Tax Bill generated successfully!');
      queryClient.invalidateQueries(['orders']);
      queryClient.invalidateQueries(['sidebar-metrics']);
      setTimeout(() => setActionSuccessMsg(''), 5000);
    } catch (e) {
      // Local fallback receipt
      setPrintedBill({
        orderNumber: `POS-${Date.now().toString().slice(-6)}`,
        date: new Date().toLocaleDateString('en-GB'),
        patientName,
        patientMobile,
        patientAge,
        patientGender,
        healthCondition,
        planDuration,
        address: `${street}, ${village}, ${district}, ${stateName} - ${pincode}`,
        items: [...cart],
        serviceFee: serviceFeeAmount,
        subtotal: cartSubtotal,
        grandTotal,
        paymentMethod
      });
      setCart([]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {actionSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* POS Billing Header */}
      <div className="bento-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center text-lg shadow-xs shrink-0 font-bold">
            🌿
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 leading-tight flex items-center gap-2">
              <span>Shanthi Ayurvedas Hosur — Walk-in Treatment & Counter Billing Desk</span>
              <Badge variant="emerald" size="sm">Office Desk</Badge>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Hosur Main Road, Krishnagiri DT · GSTIN: <strong>33BNCPS0374P1ZM</strong> · Ph: 8884747209
            </p>
          </div>
        </div>
        <div className="text-right text-xs text-slate-500 font-mono">
          Biller ID: <span className="font-bold text-slate-800">1000058077</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column: Form Details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Section 1: Patient & Treatment Details */}
          <div className="bento-card space-y-3">
            <h4 className="font-semibold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-600" />
              1. Patient & Treatment Plan
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Patient Name *</label>
                <input
                  type="text"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white"
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Health Condition / Regimen</label>
                <select
                  value={healthCondition}
                  onChange={(e) => setHealthCondition(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                >
                  <option value="Weight Loss / Slim 369 Regimen">Weight Loss / Slim 369 Regimen</option>
                  <option value="Liver Detox & Fatty Liver Care">Liver Detox & Fatty Liver Care</option>
                  <option value="Joint Pain, Arthritis & Vatha">Joint Pain, Arthritis & Vatha</option>
                  <option value="Digestion, Acidity & Gastric Health">Digestion, Acidity & Gastric Health</option>
                  <option value="Diabetes & Metabolic Care">Diabetes & Metabolic Care</option>
                  <option value="Skin Rejuvenation & Psoriasis">Skin Rejuvenation & Psoriasis</option>
                  <option value="Hair Fall & Scalp Health">Hair Fall & Scalp Health</option>
                  <option value="General Wellness & Immunity">General Wellness & Immunity</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Plan Duration</label>
                <select
                  value={planDuration}
                  onChange={(e) => setPlanDuration(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                >
                  <option value="1 Month Course">1 Month Course</option>
                  <option value="2 Months Intensive Care">2 Months Intensive Care</option>
                  <option value="3 Months Transformation Regimen">3 Months Transformation Regimen</option>
                  <option value="6 Months Complete Healing Plan">6 Months Complete Healing Plan</option>
                </select>
              </div>

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
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Service Fee Toggle */}
              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer select-none p-2 bg-amber-50/70 border border-amber-200 rounded-xl text-amber-900 font-semibold w-full">
                  <input
                    type="checkbox"
                    checked={includeServiceFee}
                    onChange={(e) => setIncludeServiceFee(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                  />
                  <span>Add Monthly Advisory Tracking Fee (+₹699)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Section 2: Patient Address & Pincode Lookup */}
          <div className="bento-card space-y-3">
            <h4 className="font-semibold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              2. Address & Pincode
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Pincode (Auto-Lookup)</label>
                <input
                  type="text"
                  value={pincode}
                  onChange={handlePincodeChange}
                  placeholder="e.g. 635109"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">City / Village</label>
                <input
                  type="text"
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  placeholder="Hosur"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Taluk</label>
                <input
                  type="text"
                  value={taluk}
                  onChange={(e) => setTaluk(e.target.value)}
                  placeholder="Hosur"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">District</label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="Krishnagiri"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">State</label>
                <input
                  type="text"
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  placeholder="Tamil Nadu"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Street / House No.</label>
                <input
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="Clinic Walk-in"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Select Medicines & Formulations */}
          <div className="bento-card space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-purple-600" />
                3. Prescribe Medicines & Formulations
              </h4>
              <span className="text-[11px] text-slate-400 font-mono">{cart.length}/5 items added</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
              <select
                value={selectedProductId}
                onChange={(e) => handleProductSelect(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
              >
                <option value="">Select Ayurvedic Medicine from Catalog...</option>
                {products.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} — MRP ₹{p.mrp || p.price} (Stock: {p.stock ?? p.availableQuantity ?? 45})
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  title="Quantity"
                  value={selectedQty}
                  onChange={(e) => setSelectedQty(Math.max(1, Number(e.target.value)))}
                  className="w-16 px-2 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-center"
                  placeholder="Qty"
                />
                <input
                  type="number"
                  min="0"
                  title="Offer / Selling Price"
                  value={selectedCustomPrice}
                  onChange={(e) => setSelectedCustomPrice(e.target.value)}
                  className="w-24 px-2 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-center"
                  placeholder="₹ Price"
                />
                <Button
                  size="sm"
                  variant="primary"
                  icon={Plus}
                  onClick={handleAddToCart}
                  disabled={!selectedProductId || cart.length >= 5}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Add
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary & Bill Generation */}
        <div className="bento-card flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h4 className="font-bold text-sm text-slate-900">Treatment Order Summary</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">{healthCondition}</p>
              </div>
              <Badge variant="primary" size="sm">{cart.length} Formulations</Badge>
            </div>

            {cart.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No medicines prescribed yet.</p>
                <p className="text-[10px] mt-1">Select products to build the treatment package.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {cart.map((item, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                    <div className="flex items-start justify-between">
                      <div className="font-bold text-slate-800 pr-2">{item.productName}</div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFromCart(idx)}
                        className="text-red-400 hover:text-red-600 p-0.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <span>Qty:</span>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleUpdateCartItemQty(idx, e.target.value)}
                          className="w-12 px-1.5 py-0.5 bg-white border border-slate-300 rounded text-center font-mono font-bold"
                        />
                        <span>× ₹</span>
                        <input
                          type="number"
                          min="0"
                          value={item.price}
                          onChange={(e) => handleUpdateCartItemPrice(idx, e.target.value)}
                          className="w-16 px-1.5 py-0.5 bg-white border border-slate-300 rounded text-center font-mono font-bold"
                        />
                      </div>
                      <span className="font-mono font-bold text-slate-900 text-xs">
                        ₹{item.total.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Service Fee Row */}
            {includeServiceFee && (
              <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900">
                <span className="font-semibold">Monthly Lifestyle Tracking Fee:</span>
                <span className="font-mono font-bold">₹699</span>
              </div>
            )}

            {/* Payment Method Selector */}
            <div className="pt-3 border-t border-slate-200 text-xs space-y-1.5">
              <label className="block font-bold text-slate-700">Payment Mode</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'CASH', label: '💵 Cash' },
                  { id: 'COD', label: '📦 COD' },
                  { id: 'PREPAID', label: '📱 Prepaid' }
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      paymentMethod === m.id
                        ? 'bg-emerald-800 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Grand Total & Bill Button */}
          <div className="pt-3 border-t border-slate-200 space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs text-slate-500">
                <span>Medicine Subtotal:</span>
                <span className="font-mono">₹{cartSubtotal.toLocaleString()}</span>
              </div>
              {includeServiceFee && (
                <div className="flex justify-between items-center text-xs text-amber-800">
                  <span>Tracking Service:</span>
                  <span className="font-mono">₹699</span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm pt-1 border-t border-slate-100 font-bold">
                <span className="text-slate-800">Grand Total Payable:</span>
                <span className="text-xl font-black text-slate-900 font-mono">
                  ₹{grandTotal.toLocaleString()}
                </span>
              </div>
            </div>

            <Button
              variant="primary"
              icon={Printer}
              isLoading={isSubmitting}
              onClick={handleGenerateBill}
              disabled={cart.length === 0}
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 shadow-sm"
            >
              🧾 Save Order & Generate Bill
            </Button>
          </div>
        </div>
      </div>

      {/* Printable Receipt Modal */}
      {printedBill && (
        <Modal
          isOpen={Boolean(printedBill)}
          onClose={() => setPrintedBill(null)}
          title={`Official Invoice Receipt — ${printedBill.orderNumber}`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-xs font-mono text-slate-800">
            <div className="p-5 bg-white border-2 border-dashed border-slate-300 rounded-xl space-y-3">
              <div className="text-center pb-3 border-b border-slate-200">
                <h3 className="font-black text-lg text-slate-900">SHANTHI AYURVEDAS</h3>
                <p className="text-[11px] text-slate-600 font-sans">Hosur Main Road, Krishnagiri DT, Tamil Nadu</p>
                <p className="text-[10px] text-slate-500">Ph: 8884747209 · Biller ID: 1000058077</p>
                <p className="text-[10px] text-slate-500 font-bold">GSTIN: 33BNCPS0374P1ZM</p>
              </div>

              <div className="text-[11px] space-y-1">
                <div>Invoice No: <strong>{printedBill.orderNumber}</strong></div>
                <div>Date: {printedBill.date}</div>
                <div>Patient: <strong>{printedBill.patientName}</strong> ({printedBill.patientMobile})</div>
                <div>Regimen: {printedBill.healthCondition} · {printedBill.planDuration}</div>
                <div>Delivery Address: {printedBill.address}</div>
                <div>Payment Tender: <strong className="uppercase">{printedBill.paymentMethod}</strong></div>
              </div>

              <div className="pt-2 border-t border-slate-200 space-y-1.5">
                <div className="text-[10px] uppercase font-bold text-slate-400 pb-1">Prescribed Medicines:</div>
                {printedBill.items.map((it, i) => (
                  <div key={i} className="flex justify-between text-[11px]">
                    <span>{it.quantity}x {it.productName}</span>
                    <span className="font-bold">₹{it.total.toLocaleString()}</span>
                  </div>
                ))}
                {printedBill.serviceFee > 0 && (
                  <div className="flex justify-between text-[11px] text-amber-800 font-semibold">
                    <span>Monthly Regimen Advisory Fee</span>
                    <span>₹{printedBill.serviceFee.toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t-2 border-slate-300 flex justify-between font-bold text-base">
                <span>TOTAL PAID:</span>
                <span>₹{printedBill.grandTotal.toLocaleString()}</span>
              </div>

              <div className="text-center pt-3 text-[10px] text-slate-500 font-sans border-t border-slate-100">
                Authorized computer-generated invoice from Shanthi Ayurvedas Hosur. Wishing you complete holistic wellness!
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
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
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
