import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User,
  Phone,
  MapPin,
  Package,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Percent,
  Truck,
  Smartphone,
  MessageSquare,
  Sparkles,
  Search,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import apiClient from '../../api/apiClient.js';
import { Modal } from '../../components/common/Modal.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Input } from '../../components/common/Input.jsx';
import { Select } from '../../components/common/Select.jsx';
import { Badge } from '../../components/common/Badge.jsx';

export function OrderCreateModal({ isOpen, onClose, initialPatientData = null }) {
  const queryClient = useQueryClient();

  // 1. Customer / Patient Details
  const [patientName, setPatientName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [mobile, setMobile] = useState('');
  const [altMobile, setAltMobile] = useState('');

  // 2. Delivery Address
  const [pincode, setPincode] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('Tamil Nadu');
  const [taluk, setTaluk] = useState('');
  const [village, setVillage] = useState('');
  const [street, setStreet] = useState('');
  const [landmark, setLandmark] = useState('');
  const [isManualAddressOpen, setIsManualAddressOpen] = useState(false);
  const [isPincodeLoading, setIsPincodeLoading] = useState(false);
  const [availablePostOffices, setAvailablePostOffices] = useState([]);

  // 3. Products (up to 5 items)
  const [products, setProducts] = useState([
    { productId: '', batchId: '', quantity: 1, unitPrice: 0 }
  ]);
  const [offerPrice, setOfferPrice] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);

  // 4. Payment
  const [paymentMethod, setPaymentMethod] = useState('COD'); // 'COD' | 'ONLINE'
  const [isFreeShippingWaived, setIsFreeShippingWaived] = useState(false);

  // 5. Patient App Registration
  const [registerPatientApp, setRegisterPatientApp] = useState(true);

  // 6. Notes
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Fetch product catalog
  const { data: productsData } = useQuery({
    queryKey: ['productsForOrder'],
    queryFn: async () => {
      const res = await apiClient.get('/products', { params: { limit: 100 } });
      return res.data?.data || [];
    },
    enabled: isOpen
  });

  // Pre-fill initial data if provided (e.g. from Lead)
  useEffect(() => {
    if (initialPatientData) {
      if (initialPatientData.name) setPatientName(initialPatientData.name);
      if (initialPatientData.mobile) setMobile(initialPatientData.mobile);
      if (initialPatientData.fatherName) setFatherName(initialPatientData.fatherName);
      if (initialPatientData.altMobile) setAltMobile(initialPatientData.altMobile);
      if (initialPatientData.city) setDistrict(initialPatientData.city);
      if (initialPatientData.state) setState(initialPatientData.state);
      if (initialPatientData.pincode) setPincode(initialPatientData.pincode);
    }
  }, [initialPatientData, isOpen]);

  // Real-time Pincode Lookup via India Postal API
  useEffect(() => {
    const cleanPin = pincode.trim();
    if (cleanPin.length === 6 && /^\d{6}$/.test(cleanPin)) {
      setIsPincodeLoading(true);
      fetch(`https://api.postalpincode.in/pincode/${cleanPin}`)
        .then((res) => res.json())
        .then((data) => {
          setIsPincodeLoading(false);
          if (data?.[0]?.Status === 'Success' && data[0].PostOffice?.length > 0) {
            const poList = data[0].PostOffice;
            const first = poList[0];
            setDistrict(first.District || '');
            setState(first.State || 'Tamil Nadu');
            setTaluk(first.Taluk || first.Block || '');
            setAvailablePostOffices(poList.map((p) => p.Name));
            if (!village && poList[0]?.Name) {
              setVillage(poList[0].Name);
            }
          }
        })
        .catch(() => {
          setIsPincodeLoading(false);
        });
    }
  }, [pincode]);

  // Product Selection Handlers
  const handleProductChange = (index, prodId) => {
    const prod = productsData?.find((p) => p._id === prodId);
    const updated = [...products];
    updated[index] = {
      ...updated[index],
      productId: prodId,
      batchId: prod?.batches?.[0]?._id || '',
      unitPrice: prod?.price || 0
    };
    setProducts(updated);
  };

  const handleBatchChange = (index, batchId) => {
    const updated = [...products];
    updated[index].batchId = batchId;
    setProducts(updated);
  };

  const handleQuantityChange = (index, qty) => {
    const updated = [...products];
    updated[index].quantity = Math.max(1, Number(qty) || 1);
    setProducts(updated);
  };

  const addProductRow = () => {
    if (products.length < 5) {
      setProducts([...products, { productId: '', batchId: '', quantity: 1, unitPrice: 0 }]);
    }
  };

  const removeProductRow = (index) => {
    if (products.length > 1) {
      setProducts(products.filter((_, i) => i !== index));
    }
  };

  // Price Calculations
  const productsSubtotal = products.reduce((acc, item) => {
    return acc + (Number(item.unitPrice) || 0) * (Number(item.quantity) || 1);
  }, 0);

  const discountAmount = discountPercent > 0 ? Math.round((productsSubtotal * discountPercent) / 100) : 0;
  const shippingCharge = paymentMethod === 'COD' && !isFreeShippingWaived ? 69 : 0;
  const autoCalculatedTotal = Math.max(0, productsSubtotal + shippingCharge - discountAmount);
  const finalPayableTotal = offerPrice.trim() !== '' ? Number(offerPrice) : autoCalculatedTotal;

  // Order Submission Mutation
  const createOrderMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await apiClient.post('/orders', payload);
      return res.data?.data;
    },
    onSuccess: (newOrder) => {
      queryClient.invalidateQueries(['orders']);
      queryClient.invalidateQueries(['dashboard']);
      queryClient.invalidateQueries(['inventory']);
      queryClient.invalidateQueries(['customers']);
      onClose();

      // Open WhatsApp directly with patient order confirmation text
      const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
      if (cleanMobile.length === 10) {
        const itemsList = (newOrder.items || [])
          .map((i) => `• ${i.quantity}x ${i.productName}`)
          .join('\n');
        const textMsg = encodeURIComponent(
          `🌿 *Shanthi Ayurvedas Order Confirmation*\n\n` +
            `Hello *${patientName}*,\n` +
            `Your Ayurvedic prescription order has been successfully placed!\n\n` +
            `📋 *Order ID:* ${newOrder.orderNumber}\n` +
            `📦 *Prescription Items:*\n${itemsList}\n\n` +
            `💰 *Total Amount:* ₹${finalPayableTotal} (${paymentMethod})\n` +
            `📍 *Delivery Address:* ${street}, ${village ? village + ', ' : ''}${district}, ${state} - ${pincode}\n\n` +
            `🚚 We are preparing your parcel for dispatch with tamper-proof seal.\n` +
            `📱 Track & view dosage guide on *my.ayuronemart.com*.\n\n` +
            `Thank you for trusting Shanthi Ayurvedas! 🙏`
        );
        window.open(`https://wa.me/91${cleanMobile}?text=${textMsg}`, '_blank');
      }
    },
    onError: (err) => {
      setFormError(err.response?.data?.message || 'Failed to place order. Check inventory stock.');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    const validItems = products.filter((p) => p.productId && p.batchId);
    if (validItems.length === 0) {
      setFormError('Please select at least one valid product and batch.');
      return;
    }

    createOrderMutation.mutate({
      patientName,
      fatherName,
      mobile,
      altMobile,
      items: validItems.map((p) => ({
        productId: p.productId,
        batchId: p.batchId,
        quantity: Number(p.quantity),
        unitPrice: Number(p.unitPrice),
        discount: 0
      })),
      shippingCharge,
      discountTotal: discountAmount,
      offerPrice: offerPrice.trim() !== '' ? Number(offerPrice) : undefined,
      paymentMethod,
      patientAppRegistered: registerPatientApp,
      deliveryAddress: {
        street,
        landmark,
        village,
        taluk,
        district,
        city: district || 'Hosur',
        state,
        pincode,
        phone: mobile,
        alternatePhone: altMobile
      },
      notes
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Prescription Order"
      subtitle="Atomically reserves herbal stock and triggers WhatsApp dispatch notification"
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6 text-slate-800">
        {formError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* SECTION 1: 👤 Customer Details */}
        <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-900">
            <User className="w-4 h-4 text-ayur-600" />
            <span>Customer Details</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Patient Name *"
              required
              placeholder="Full name"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
            />
            <Input
              label="Father's Name"
              placeholder="Father's name"
              value={fatherName}
              onChange={(e) => setFatherName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Mobile *"
              required
              placeholder="10 digit mobile"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              maxLength={10}
            />
            <Input
              label="Alternative Number (Optional)"
              placeholder="10 digit alternate mobile"
              value={altMobile}
              onChange={(e) => setAltMobile(e.target.value)}
              maxLength={10}
            />
          </div>
        </div>

        {/* SECTION 2: 📍 Delivery Address */}
        <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-900">
              <MapPin className="w-4 h-4 text-ayur-600" />
              <span>Delivery Address</span>
            </div>
            {isPincodeLoading && (
              <span className="text-[11px] text-ayur-700 font-semibold animate-pulse">
                Fetching postal data...
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Input
                label="Pincode * (auto fills village, taluk, district, state)"
                required
                placeholder="Enter 6-digit pincode"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                maxLength={6}
              />
            </div>
            <div>
              <Input
                label="District"
                placeholder="Auto filled"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
              />
            </div>
            <div>
              <Input
                label="State"
                placeholder="Auto filled"
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Input
              label="House No / Street *"
              required
              placeholder="e.g. No 12, Main Road"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Village, Taluk, District and State will be added automatically
            </p>
          </div>

          <Input
            label="Landmark"
            placeholder="Near school / temple / hospital"
            value={landmark}
            onChange={(e) => setLandmark(e.target.value)}
          />

          {/* Collapsible Manual Address Override */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setIsManualAddressOpen(!isManualAddressOpen)}
              className="text-xs text-amber-800 hover:text-amber-900 font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>⚠️ If pincode didn't auto-fill — enter manually:</span>
              {isManualAddressOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {isManualAddressOpen && (
              <div className="mt-3 p-3 bg-white rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {availablePostOffices.length > 0 ? (
                  <Select
                    label="Village / Post Office"
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                    options={[
                      { value: '', label: 'Select Post Office...' },
                      ...availablePostOffices.map((po) => ({ value: po, label: po }))
                    ]}
                  />
                ) : (
                  <Input
                    label="Village / Post Office"
                    placeholder="Village name"
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                  />
                )}
                <Input
                  label="Taluk"
                  placeholder="Taluk name"
                  value={taluk}
                  onChange={(e) => setTaluk(e.target.value)}
                />
                <Input
                  label="District"
                  placeholder="District"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                />
                <Input
                  label="State"
                  placeholder="State"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        {/* SECTION 3: 📦 Products */}
        <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-900">
              <Package className="w-4 h-4 text-ayur-600" />
              <span>Products</span>
            </div>
            {products.length < 5 && (
              <button
                type="button"
                onClick={addProductRow}
                className="text-xs text-ayur-700 hover:text-ayur-800 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Product ({products.length}/5)</span>
              </button>
            )}
          </div>

          <div className="space-y-2.5">
            {products.map((item, idx) => {
              const currentProd = productsData?.find((p) => p._id === item.productId);
              return (
                <div
                  key={idx}
                  className="grid grid-cols-12 gap-2 p-2.5 bg-white rounded-xl border border-slate-200 items-center text-xs shadow-xs"
                >
                  <div className="col-span-5">
                    <Select
                      label={`Product ${idx + 1} ${idx === 0 ? '*' : '(optional)'}`}
                      value={item.productId}
                      onChange={(e) => handleProductChange(idx, e.target.value)}
                      options={[
                        { value: '', label: `Select Product ${idx + 1}...` },
                        ...(productsData || []).map((p) => ({
                          value: p._id,
                          label: `${p.name} (₹${p.price})`
                        }))
                      ]}
                      required={idx === 0}
                    />
                  </div>

                  <div className="col-span-3">
                    <Select
                      label="Batch"
                      value={item.batchId}
                      onChange={(e) => handleBatchChange(idx, e.target.value)}
                      options={[
                        { value: '', label: 'Select batch...' },
                        ...(currentProd?.batches || []).map((b) => ({
                          value: b._id,
                          label: `${b.batchNumber}`
                        }))
                      ]}
                      required={Boolean(item.productId)}
                    />
                  </div>

                  <div className="col-span-2">
                    <Input
                      label="Qty"
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleQuantityChange(idx, e.target.value)}
                    />
                  </div>

                  <div className="col-span-2 flex items-center justify-between pt-4">
                    <div className="font-bold text-slate-900 text-right w-full">
                      ₹{((item.unitPrice || 0) * (item.quantity || 1)).toLocaleString()}
                    </div>
                    {products.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeProductRow(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors ml-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Offer Price & Discounts */}
          <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex-1 max-w-xs">
              <Input
                label="Offer Price ₹ (optional) — total for the whole order"
                placeholder="Leave blank for auto"
                type="number"
                value={offerPrice}
                onChange={(e) => {
                  setOfferPrice(e.target.value);
                  setDiscountPercent(0);
                }}
              />
            </div>

            <div className="flex items-center gap-2 pt-4 sm:pt-0">
              <button
                type="button"
                onClick={() => {
                  setDiscountPercent(10);
                  setOfferPrice('');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                  discountPercent === 10
                    ? 'bg-ayur-800 text-white border-ayur-800'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                🏷️ 10% Off
              </button>
              <button
                type="button"
                onClick={() => {
                  setDiscountPercent(20);
                  setOfferPrice('');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                  discountPercent === 20
                    ? 'bg-ayur-800 text-white border-ayur-800'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                🏷️ 20% Off
              </button>
              {discountPercent > 0 && (
                <button
                  type="button"
                  onClick={() => setDiscountPercent(0)}
                  className="px-2 py-1 text-xs text-rose-600 hover:text-rose-700 font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 4: 💰 Payment */}
        <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-900">Payment Mode</div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPaymentMethod('COD')}
              className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
                paymentMethod === 'COD'
                  ? 'border-ayur-700 bg-ayur-50/60 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="text-2xl mb-1">💵</div>
              <div className="font-bold text-slate-900 text-sm">Cash on Delivery (COD)</div>
              <div className="text-xs text-slate-500 mt-0.5">
                {isFreeShippingWaived ? 'Free delivery (Waived)' : '+₹69 shipping'}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('ONLINE')}
              className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
                paymentMethod === 'ONLINE'
                  ? 'border-emerald-700 bg-emerald-50/60 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="text-2xl mb-1">💳</div>
              <div className="font-bold text-slate-900 text-sm">Online Prepaid (UPI / Card)</div>
              <div className="text-xs text-emerald-700 font-semibold mt-0.5">Free delivery</div>
            </button>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="waiveShipping"
              checked={isFreeShippingWaived}
              onChange={(e) => setIsFreeShippingWaived(e.target.checked)}
              className="w-4 h-4 text-ayur-700 rounded border-slate-300 focus:ring-ayur-500 cursor-pointer"
            />
            <label htmlFor="waiveShipping" className="text-xs text-slate-700 font-medium cursor-pointer">
              🚚 Free Shipping (waive the ₹69 charge for this order)
            </label>
          </div>

          {/* Grand Total Bar */}
          <div className="p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between shadow-sm">
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Total Amount (Patient Pays)</div>
              <div className="text-[10px] text-slate-400">
                Products: ₹{productsSubtotal} + Shipping: ₹{shippingCharge}
                {discountAmount > 0 ? ` - Discount: ₹${discountAmount}` : ''}
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-400 font-mono">
              ₹{finalPayableTotal.toLocaleString()}
            </div>
          </div>
        </div>

        {/* SECTION 5: 📱 Patient App — my.ayuronemart.com */}
        <div className="p-4 bg-purple-50/70 rounded-2xl border border-purple-200 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-purple-700" />
              <span>Patient App — my.ayuronemart.com</span>
            </div>
            <span className="text-[10px] text-purple-700 font-semibold">
              💵 COD → Basic features now • Full access after delivery
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="appReg"
              checked={registerPatientApp}
              onChange={(e) => setRegisterPatientApp(e.target.checked)}
              className="w-4 h-4 text-purple-700 rounded border-purple-300 focus:ring-purple-500 cursor-pointer"
            />
            <label htmlFor="appReg" className="text-xs text-purple-900 font-medium cursor-pointer">
              Register patient on app (Patient said yes to app?)
            </label>
          </div>
        </div>

        {/* SECTION 6: 📝 Notes */}
        <Input
          label="Notes"
          placeholder="Special instructions / patient medical dietary notes..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            icon={MessageSquare}
            isLoading={createOrderMutation.isPending}
            className="px-6 py-2.5 bg-gradient-to-r from-emerald-700 to-ayur-800 hover:from-emerald-600 hover:to-ayur-700 text-white font-black shadow-md text-xs tracking-wide"
          >
            🛒 Save Order & Send WhatsApp
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default OrderCreateModal;
