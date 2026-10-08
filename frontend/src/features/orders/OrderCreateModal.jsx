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
  ChevronUp,
  Printer
} from 'lucide-react';
import apiClient from '../../api/apiClient.js';
import { Modal } from '../../components/common/Modal.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Input } from '../../components/common/Input.jsx';
import { Select } from '../../components/common/Select.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { PrintableInvoiceModal } from './PrintableInvoiceModal.jsx';

const INDIAN_STATES = [
  { value: 'Tamil Nadu', label: 'Tamil Nadu' },
  { value: 'Karnataka', label: 'Karnataka' },
  { value: 'Kerala', label: 'Kerala' },
  { value: 'Andhra Pradesh', label: 'Andhra Pradesh' },
  { value: 'Telangana', label: 'Telangana' },
  { value: 'Maharashtra', label: 'Maharashtra' },
  { value: 'Delhi', label: 'Delhi' },
  { value: 'Gujarat', label: 'Gujarat' },
  { value: 'Rajasthan', label: 'Rajasthan' },
  { value: 'Uttar Pradesh', label: 'Uttar Pradesh' },
  { value: 'West Bengal', label: 'West Bengal' },
  { value: 'Madhya Pradesh', label: 'Madhya Pradesh' },
  { value: 'Odisha', label: 'Odisha' },
  { value: 'Punjab', label: 'Punjab' },
  { value: 'Haryana', label: 'Haryana' },
  { value: 'Other', label: 'Other' }
];

export function OrderCreateModal({
  isOpen,
  onClose,
  initialPatientData = null,
  telecallerId = null,
  isOfficeSale = false,
  onOrderCreated = null
}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const isOfficeSaleRoute = typeof window !== 'undefined' && window.location.pathname.includes('/orders/counter-sale');
  const isTelecaller = user?.role === 'TELECALLER' || Boolean(telecallerId);
  const [isOfficeOrder, setIsOfficeOrder] = useState(Boolean(!isTelecaller && (isOfficeSale || isOfficeSaleRoute)));
  const [createdOrderForInvoice, setCreatedOrderForInvoice] = useState(null);

  // Sync office order mode and defaults
  useEffect(() => {
    if (isTelecaller) {
      setIsOfficeOrder(false);
      if (shippingCharge === '0') setShippingCharge('69');
    } else if (isOfficeSale || isOfficeSaleRoute) {
      setIsOfficeOrder(true);
      setShippingCharge('0');
      setPaymentMethod('CASH');
    }
  }, [isTelecaller, isOfficeSale, isOfficeSaleRoute, isOpen]);

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
  const [isCustomVillage, setIsCustomVillage] = useState(false);

  // 3. Products
  const [products, setProducts] = useState([
    { productId: '', batchId: '', quantity: 1, unitPrice: 0, discountPercent: 0, weight: 0 }
  ]);
  const [offerPrice, setOfferPrice] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);

  // 4. Logistics & Payment (Manual Entry Supported)
  const [courierName, setCourierName] = useState('India Post'); // 'India Post' | 'The Professional Courier'
  const [paymentMethod, setPaymentMethod] = useState('COD'); // 'COD' | 'ONLINE'
  const [shippingCharge, setShippingCharge] = useState('69');
  const [codAmount, setCodAmount] = useState('');

  const handleCourierChange = (newCourier) => {
    setCourierName(newCourier);
    if (newCourier === 'The Professional Courier') {
      setPaymentMethod('ONLINE');
      setCodAmount('');
    }
  };

  useEffect(() => {
    if (courierName === 'The Professional Courier' && paymentMethod === 'COD') {
      setPaymentMethod('ONLINE');
      setCodAmount('');
    }
  }, [courierName, paymentMethod]);

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
      const _rd = res.data?.data; return Array.isArray(_rd) ? _rd : [];
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
            const names = poList.map((p) => p.Name).filter(Boolean);
            const first = poList[0];
            setDistrict(first.District || '');
            setState(first.State || 'Tamil Nadu');
            setTaluk(first.Taluk || first.Block || '');
            setAvailablePostOffices(names);
            setIsCustomVillage(false);
            setVillage((prev) => (names.includes(prev) ? prev : names[0] || ''));
          } else {
            setAvailablePostOffices([]);
          }
        })
        .catch(() => {
          setIsPincodeLoading(false);
          setAvailablePostOffices([]);
        });
    } else {
      setAvailablePostOffices([]);
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
      unitPrice: prod?.price || 0,
      discountPercent: updated[index]?.discountPercent || 0,
      weight: Number(prod?.weight) || 0
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

  const handleDiscountPercentChange = (index, pct) => {
    const cleanPct = Math.min(100, Math.max(0, Number(pct) || 0));
    const updated = [...products];
    updated[index] = {
      ...updated[index],
      discountPercent: cleanPct
    };
    setProducts(updated);
  };

  const addProductRow = () => {
    setProducts([...products, { productId: '', batchId: '', quantity: 1, unitPrice: 0, discountPercent: 0, weight: 0 }]);
  };

  const removeProductRow = (index) => {
    if (products.length > 1) {
      setProducts(products.filter((_, i) => i !== index));
    } else {
      setProducts([{ productId: '', batchId: '', quantity: 1, unitPrice: 0, discountPercent: 0, weight: 0 }]);
    }
  };

  // Calculations: Subtotal, Total Weight, Item Discounts, Shipping, and COD
  const productsGrossSubtotal = products.reduce((acc, item) => {
    return acc + (Number(item.unitPrice) || 0) * (Number(item.quantity) || 1);
  }, 0);

  const itemsDiscountTotal = products.reduce((acc, item) => {
    const unitPrice = Number(item.unitPrice) || 0;
    const pct = Number(item.discountPercent) || 0;
    const discountPerUnit = Math.round((unitPrice * pct) / 100);
    return acc + (discountPerUnit * (Number(item.quantity) || 1));
  }, 0);

  const productsNetSubtotal = Math.max(0, productsGrossSubtotal - itemsDiscountTotal);

  const totalWeightGrams = products.reduce((acc, item) => {
    const prod = productsData?.find((p) => p._id === item.productId);
    const w = Number(item.weight ?? prod?.weight ?? 0);
    return acc + (w * (Number(item.quantity) || 1));
  }, 0);

  const formattedTotalWeight = totalWeightGrams >= 1000
    ? `${(totalWeightGrams / 1000).toFixed(2)} kg (${totalWeightGrams} g)`
    : `${totalWeightGrams} g`;

  // Additional order-level discount (from 10% / 20% overall buttons)
  const orderLevelDiscountAmount = discountPercent > 0 ? Math.round((productsNetSubtotal * discountPercent) / 100) : 0;
  const totalDiscountAmount = itemsDiscountTotal + orderLevelDiscountAmount;
  const parsedShippingCharge = isOfficeOrder ? 0 : (Number(shippingCharge) || 0);
  const autoCalculatedTotal = Math.max(0, productsGrossSubtotal - totalDiscountAmount + parsedShippingCharge);
  const finalPayableTotal = offerPrice.trim() !== '' ? Number(offerPrice) : autoCalculatedTotal;
  const effectiveCodAmount = isOfficeOrder || courierName === 'The Professional Courier'
    ? 0
    : (paymentMethod === 'COD'
        ? (codAmount.trim() !== '' ? Number(codAmount) : finalPayableTotal)
        : 0);

  // Order Submission Mutation
  const createOrderMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await apiClient.post('/orders', payload);
      return res.data?.data;
    },
    onSuccess: (newOrder) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['counterOrders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });

      if (onOrderCreated) {
        onOrderCreated(newOrder);
        onClose();
      } else if (isOfficeOrder) {
        setCreatedOrderForInvoice(newOrder);
      } else {
        onClose();
      }

      // Open WhatsApp directly with patient order confirmation text
      const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
      if (cleanMobile.length === 10) {
        const itemsList = (newOrder.items || [])
          .map((i) => {
            const hasDisc = (i.discount || 0) > 0 || (i.discountPercent || 0) > 0;
            return `• ${i.quantity}x ${i.productName}${hasDisc ? ` (${i.discountPercent ? `${i.discountPercent}% off` : `₹${i.discount} off`})` : ''} - ₹${i.total}`;
          })
          .join('\n');
        const textMsg = encodeURIComponent(
          `🌿 *Shanthi Ayurvedas ${isOfficeOrder ? 'Office Counter Receipt' : 'Order Confirmation'}*\n\n` +
            `Hello *${patientName}*,\n` +
            `Your Ayurvedic prescription order has been successfully ${isOfficeOrder ? 'billed at the counter' : 'placed'}!\n\n` +
            `📋 *Order ID:* ${newOrder.orderNumber}\n` +
            `📦 *Prescription Items:*\n${itemsList}\n\n` +
            `${isOfficeOrder ? '' : `🚚 *Courier Partner:* ${courierName}\n`}` +
            `💰 *Total Amount:* ₹${finalPayableTotal} (${isOfficeOrder ? `Direct Counter Payment (${paymentMethod})` : (courierName === 'The Professional Courier' ? 'Pre-Payment (TPC Online/UPI)' : (paymentMethod === 'COD' ? 'Cash on Delivery' : 'Prepaid Online/UPI'))})\n` +
            `${isOfficeOrder ? `📍 *Counter Location:* Hosur Main Branch Desk\n\n` : `📍 *Delivery Address:* ${street}, ${village ? village + ', ' : ''}${district}, ${state} - ${pincode}\n\n`}` +
            `📱 Track & view dosage guide on *my.shanthiayurvedas.com*.\n\n` +
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

    const validItems = products.filter((p) => p.productId);
    if (validItems.length === 0) {
      setFormError('Please select at least one valid product.');
      return;
    }

    if (!isOfficeOrder && courierName === 'The Professional Courier' && paymentMethod === 'COD') {
      setFormError('The Professional Courier does not support Cash on Delivery (COD). Pre-payment (UPI/Online) is required.');
      return;
    }

    createOrderMutation.mutate({
      patientName,
      fatherName,
      mobile,
      altMobile,
      courierName: isOfficeOrder ? 'Direct Office Counter' : courierName,
      telecallerId: telecallerId || (user?.role === 'TELECALLER' ? (user._id || user.id) : undefined),
      telecallerName: user?.role === 'TELECALLER' ? user?.name : undefined,
      telecallerPhone: user?.role === 'TELECALLER' ? (user?.phone || user?.mobile) : undefined,
      items: validItems.map((p) => {
        const prod = productsData?.find((pr) => pr._id === p.productId);
        const uPrice = Number(p.unitPrice);
        const dPct = Number(p.discountPercent || 0);
        const dAmount = Math.round((uPrice * dPct) / 100);
        return {
          productId: p.productId,
          batchId: p.batchId || undefined,
          quantity: Number(p.quantity),
          unitPrice: uPrice,
          discountPercent: dPct,
          discount: dAmount,
          weight: Number(p.weight ?? prod?.weight ?? 0)
        };
      }),
      weight: totalWeightGrams,
      shippingCharge: isOfficeOrder ? 0 : parsedShippingCharge,
      codAmount: isOfficeOrder || courierName === 'The Professional Courier' ? 0 : effectiveCodAmount,
      discountTotal: totalDiscountAmount,
      offerPrice: offerPrice.trim() !== '' ? Number(offerPrice) : undefined,
      paymentMethod: isOfficeOrder ? paymentMethod : (courierName === 'The Professional Courier' ? 'ONLINE' : paymentMethod),
      orderChannel: isOfficeOrder ? 'COUNTER_SALE' : 'DIRECT',
      isOfficeSale: isOfficeOrder,
      status: isOfficeOrder ? 'DELIVERED' : undefined,
      patientAppRegistered: registerPatientApp,
      deliveryAddress: {
        street: isOfficeOrder ? 'Direct Walk-In Office Counter' : (street || 'Main Clinic Road'),
        landmark: isOfficeOrder ? undefined : landmark,
        village: isOfficeOrder ? undefined : village,
        taluk: isOfficeOrder ? undefined : taluk,
        district: district || 'Hosur',
        city: district || 'Hosur',
        state: isOfficeOrder ? 'Tamil Nadu' : state,
        pincode: isOfficeOrder ? '635109' : (pincode || '635109'),
        phone: mobile,
        alternatePhone: altMobile
      },
      notes: notes || (isOfficeOrder ? 'Direct Office Counter Sale' : undefined)
    });
  };

  const footerActions = (
    <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between w-full gap-2.5">
      <Button variant="secondary" type="button" onClick={onClose} className="w-full sm:w-auto">
        Cancel
      </Button>
      <div className="flex items-center gap-2 w-full sm:w-auto">
        {isOfficeOrder ? (
          <Button
            variant="primary"
            type="submit"
            form="order-create-form"
            icon={Printer}
            isLoading={createOrderMutation.isPending}
            className="w-full sm:w-auto px-5 bg-purple-700 hover:bg-purple-800 text-white font-bold shadow-sm text-xs tracking-wide cursor-pointer"
          >
            Save & Print Counter Bill
          </Button>
        ) : (
          <Button
            variant="primary"
            type="submit"
            form="order-create-form"
            icon={MessageSquare}
            isLoading={createOrderMutation.isPending}
            className="w-full sm:w-auto px-5 bg-gradient-to-r from-emerald-700 to-ayur-800 hover:from-emerald-600 hover:to-ayur-700 text-white font-bold shadow-sm text-xs tracking-wide cursor-pointer"
          >
            Save Order & WhatsApp
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isOfficeOrder ? "Office Sale / Counter Bill" : "Create Prescription Order"}
      subtitle={isOfficeOrder ? "Direct walk-in counter billing with instant stock reservation (₹0 shipping)" : "Atomically reserves herbal stock and triggers WhatsApp dispatch notification"}
      maxWidth="max-w-3xl"
      icon="/shanthi_logo.png"
      footer={footerActions}
    >
      <form id="order-create-form" onSubmit={handleSubmit} className="space-y-6 text-slate-800">
        {formError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Order Mode Switcher (Hidden for Telecallers - Telecaller orders are strictly Courier Delivery) */}
        {!isTelecaller && (
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Order Mode:</span>
              <button
                type="button"
                onClick={() => {
                  setIsOfficeOrder(false);
                  if (shippingCharge === '0') setShippingCharge('69');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  !isOfficeOrder
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                📦 Courier Delivery
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsOfficeOrder(true);
                  setShippingCharge('0');
                  setCodAmount('');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isOfficeOrder
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                🏪 Office / Counter Sale
              </button>
            </div>
            {isOfficeOrder && (
              <span className="px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 border border-purple-200 text-[11px] font-bold">
                Walk-in Patient • Direct Counter Sale
              </span>
            )}
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

        {/* SECTION 2: Delivery Address for Courier OR Simplified Walk-In Counter Info */}
        {isOfficeOrder ? (
          <div className="p-4 bg-purple-50/70 rounded-2xl border border-purple-200 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-950">
                <span className="text-base">🏪</span>
                <span>Counter Walk-In Sale (No Courier Shipping Required)</span>
              </div>
              <span className="text-[11px] font-bold text-purple-800 bg-purple-100/90 px-2.5 py-0.5 rounded-full border border-purple-200">
                Hosur Main Clinic Desk • Direct Patient Handover (₹0 Delivery)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Payment Mode *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'CASH', label: '💵 Cash' },
                    { id: 'ONLINE', label: '📱 UPI / QR' },
                    { id: 'CARD', label: '💳 Card POS' }
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setPaymentMethod(mode.id)}
                      className={`py-2 px-1 text-center rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        paymentMethod === mode.id
                          ? 'border-purple-600 bg-purple-700 text-white shadow-xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-purple-300'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Input
                  label="Patient City / Area (Optional)"
                  placeholder="e.g. Hosur / Bagalur / Bangalore"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Pincode, courier partner, and postal address are not needed for counter walk-ins.
                </p>
              </div>
            </div>
          </div>
        ) : (
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <Input
                  label="Pincode *"
                  required
                  placeholder="6-digit pincode"
                  value={pincode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setPincode(val);
                  }}
                  maxLength={6}
                />
              </div>

              <div>
                {availablePostOffices.length > 0 && !isCustomVillage ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-700 tracking-wide">
                        Post Office *
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsCustomVillage(true)}
                        className="text-[10px] text-ayur-700 hover:underline font-semibold cursor-pointer"
                      >
                        ✏ Type custom
                      </button>
                    </div>
                    <Select
                      placeholder="Select Post Office..."
                      value={village}
                      onChange={(e) => {
                        if (e.target.value === '__CUSTOM__') {
                          setIsCustomVillage(true);
                          setVillage('');
                        } else {
                          setVillage(e.target.value);
                        }
                      }}
                      options={[
                        { value: '', label: 'Select Post Office...' },
                        ...availablePostOffices.map((po) => ({ value: po, label: po })),
                        { value: '__CUSTOM__', label: '✏ Other / Type manually...' }
                      ]}
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-700 tracking-wide">
                        Post Office / Village
                      </label>
                      {availablePostOffices.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setIsCustomVillage(false)}
                          className="text-[10px] text-ayur-700 hover:underline font-semibold cursor-pointer"
                        >
                          Choose from list
                        </button>
                      )}
                    </div>
                    <Input
                      placeholder={isPincodeLoading ? 'Fetching post offices...' : 'Village or post office name'}
                      value={village}
                      onChange={(e) => setVillage(e.target.value)}
                    />
                  </div>
                )}
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
                <Select
                  label="State"
                  placeholder="Auto filled"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  options={INDIAN_STATES}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Landmark"
                placeholder="Near school / temple / hospital"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
              />
              <Input
                label="Taluk (Optional)"
                placeholder="Taluk / Block name"
                value={taluk}
                onChange={(e) => setTaluk(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* SECTION 3: 📦 Products & Weight */}
        <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-900">
              <Package className="w-4 h-4 text-ayur-600" />
              <span>Products</span>
              {totalWeightGrams > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold font-mono">
                  ⚖️ Total Weight: {formattedTotalWeight}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={addProductRow}
              className="text-xs text-ayur-700 hover:text-ayur-800 font-bold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Product</span>
            </button>
          </div>

          <div className="space-y-3">
            {products.map((item, idx) => {
              const currentProd = productsData?.find((p) => p._id === item.productId);
              const itemWeight = Number(item.weight ?? currentProd?.weight ?? 0);
              const qty = Number(item.quantity) || 1;
              const lineWeight = itemWeight * qty;
              const unitPrice = Number(item.unitPrice) || 0;
              const pct = Number(item.discountPercent) || 0;
              const discountPerUnit = Math.round((unitPrice * pct) / 100);
              const netUnitPrice = Math.max(0, unitPrice - discountPerUnit);
              const grossLineTotal = unitPrice * qty;
              const netLineTotal = netUnitPrice * qty;
              const discountLineTotal = discountPerUnit * qty;

              return (
                <div
                  key={idx}
                  className="p-3.5 sm:p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3 transition-all hover:border-slate-300"
                >
                  {/* Row Header on Mobile (shows Product number & Trash) */}
                  <div className="flex items-center justify-between sm:hidden pb-1 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-800">
                      Product #{idx + 1} {idx === 0 && <span className="text-rose-500">*</span>}
                    </span>
                    {(products.length > 1 || Boolean(item.productId)) && (
                      <button
                        type="button"
                        onClick={() => removeProductRow(idx)}
                        className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title={products.length > 1 ? "Remove product row" : "Clear selected product"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                    {/* Product Selection */}
                    <div className="sm:col-span-5">
                      <div className="hidden sm:block">
                        <label className="block text-xs font-semibold text-slate-700 tracking-wide mb-1.5">
                          Product {idx + 1} {idx === 0 && <span className="text-rose-500">*</span>}
                        </label>
                      </div>
                      <Select
                        placeholder={`Select Product ${idx + 1}...`}
                        value={item.productId}
                        onChange={(e) => handleProductChange(idx, e.target.value)}
                        options={[
                          { value: '', label: `Select Product ${idx + 1}...` },
                          ...(productsData || []).map((p) => ({
                            value: p._id,
                            label: `${p.name} (₹${p.price}${p.weight ? ` • ${p.weight}g` : ''})`
                          }))
                        ]}
                        required={idx === 0}
                      />
                      {currentProd && (
                        <div className="text-[10px] text-slate-500 font-medium mt-1.5 flex items-center gap-1.5 pl-0.5 flex-wrap">
                          <span className="font-mono">Base Rate: ₹{unitPrice}</span>
                          <span>•</span>
                          <span className="font-mono">⚖️ {itemWeight}g</span>
                          {lineWeight > 0 && (
                            <>
                              <span>•</span>
                              <span className="font-semibold text-slate-700 font-mono">Row: {lineWeight}g</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Qty, Discount %, and Row Pricing */}
                    <div className="sm:col-span-7 flex items-end justify-between gap-2.5 flex-wrap sm:flex-nowrap">
                      {/* Qty */}
                      <div className="w-[84px] shrink-0">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Qty
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(idx, e.target.value)}
                          className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold text-slate-900 text-center"
                        />
                      </div>

                      {/* Discount % */}
                      <div className="w-[96px] shrink-0">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Disc %
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="0"
                            value={item.discountPercent || ''}
                            onChange={(e) => handleDiscountPercentChange(idx, e.target.value)}
                            className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold text-slate-900 pr-6"
                          />
                          <span className="absolute right-2 top-2 text-xs text-slate-400 font-bold pointer-events-none">%</span>
                        </div>
                      </div>

                      {/* Subtotal & Desktop Delete */}
                      <div className="flex-1 flex items-center justify-end gap-2 min-w-[90px]">
                        <div className="text-right">
                          {pct > 0 && (
                            <div className="text-[10px] text-slate-400 line-through font-mono">
                              ₹{grossLineTotal.toLocaleString()}
                            </div>
                          )}
                          <div className={`font-black font-mono text-base ${pct > 0 ? 'text-emerald-700' : 'text-slate-900'}`}>
                            ₹{netLineTotal.toLocaleString()}
                          </div>
                          {pct > 0 && (
                            <div className="text-[9px] text-emerald-600 font-semibold font-mono whitespace-nowrap">
                              Saved ₹{discountLineTotal}
                            </div>
                          )}
                        </div>
                        {(products.length > 1 || Boolean(item.productId)) && (
                          <button
                            type="button"
                            onClick={() => removeProductRow(idx)}
                            className="hidden sm:inline-flex p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors ml-1 cursor-pointer shrink-0"
                            title={products.length > 1 ? "Remove product row" : "Clear selected product"}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick Discount % Pill Buttons & Per-Product Breakdown */}
                  {Boolean(item.productId) && (
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-2 text-[11px]">
                      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none whitespace-nowrap py-0.5">
                        <span className="text-[10px] text-slate-500 font-semibold mr-0.5 shrink-0">Quick Disc:</span>
                        {[0, 5, 10, 15, 20].map((presetPct) => (
                          <button
                            key={presetPct}
                            type="button"
                            onClick={() => handleDiscountPercentChange(idx, presetPct)}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors cursor-pointer shrink-0 ${
                              pct === presetPct
                                ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {presetPct === 0 ? '0%' : `${presetPct}%`}
                          </button>
                        ))}
                      </div>

                      {pct > 0 && (
                        <div className="text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1.5">
                          <span>🏷️ {pct}% Off:</span>
                          <span className="font-mono font-bold">-₹{discountLineTotal}</span>
                          <span className="text-slate-500">(@ ₹{netUnitPrice}/unit)</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Offer Price & Discounts */}
          <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="w-full sm:max-w-xs">
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

        {/* SECTION 4: 🚚 Courier Partner & Payment Method (Only for Courier Delivery) */}
        {!isOfficeOrder && (
          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-4">
            {/* 4A. Courier Partner Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  1. Select Courier Service Partner *
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  {courierName === 'The Professional Courier' ? '⚡ Professional Express' : '📮 India Post Speed Post'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* India Post Option */}
                <button
                  type="button"
                  onClick={() => handleCourierChange('India Post')}
                  className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer relative ${
                    courierName === 'India Post'
                      ? 'border-ayur-700 bg-ayur-50/70 shadow-sm ring-2 ring-ayur-600/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="text-2xl mb-1">📮</div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      COD + UPI
                    </span>
                  </div>
                  <div className="font-bold text-slate-900 text-sm">India Post (Speed Post)</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Government postal service · Supports Doorstep COD & Prepaid UPI
                  </div>
                </button>

                {/* The Professional Courier Option */}
                <button
                  type="button"
                  onClick={() => handleCourierChange('The Professional Courier')}
                  className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer relative ${
                    courierName === 'The Professional Courier'
                      ? 'border-blue-600 bg-blue-50/70 shadow-sm ring-2 ring-blue-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="text-2xl mb-1">⚡</div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      Pre-Payment Only
                    </span>
                  </div>
                  <div className="font-bold text-slate-900 text-sm">The Professional Courier (TPC)</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Express courier network · Strictly Pre-Payment (API booking later)
                  </div>
                </button>
              </div>
            </div>

            {/* 4B. Payment Method Selection */}
            <div className="pt-2 border-t border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  2. Payment Method *
                </span>
                {courierName === 'The Professional Courier' ? (
                  <span className="text-[11px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    COD not supported for Professional Courier
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500">
                    Choose doorstep cash or advance prepaid
                  </span>
                )}
              </div>

              {courierName === 'The Professional Courier' ? (
                /* ONLY Pre-Payment Option for Professional Courier */
                <div className="space-y-2.5">
                  <div className="p-3.5 rounded-xl border-2 border-blue-600 bg-white shadow-sm flex items-start gap-3">
                    <div className="text-2xl shrink-0 mt-0.5">💳</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-slate-900 text-sm">
                          Online Pre-Payment (UPI / Card / Bank Transfer)
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                          Prepaid Only
                        </span>
                      </div>
                      <div className="text-xs text-blue-900 font-medium mt-1">
                        Collect payment in advance via Google Pay, PhonePe, Paytm, or Net Banking prior to shipment.
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 bg-amber-50/90 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
                    <span className="text-base">ℹ️</span>
                    <span>
                      <strong>Notice:</strong> The Professional Courier does not offer Cash on Delivery (COD). All orders with this partner must be pre-paid. (Courier API booking will be integrated later).
                    </span>
                  </div>
                </div>
              ) : (
                /* BOTH COD and Online Prepaid for India Post */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('COD');
                      if (shippingCharge === '0') setShippingCharge('69');
                    }}
                    className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                      paymentMethod === 'COD'
                        ? 'border-ayur-700 bg-ayur-50/60 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">💵</div>
                    <div className="font-bold text-slate-900 text-sm">Cash on Delivery (COD)</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Collect payment at doorstep via Postman
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('ONLINE');
                      setShippingCharge('0');
                    }}
                    className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                      paymentMethod === 'ONLINE'
                        ? 'border-emerald-700 bg-emerald-50/60 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">💳</div>
                    <div className="font-bold text-slate-900 text-sm">Prepaid UPI / Online</div>
                    <div className="text-xs text-emerald-700 font-semibold mt-0.5">
                      Payment collected online prior to dispatch
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* 4C. Shipping Charge & COD Amount */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Manual Shipping Charge Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>🚚 Shipping Charge (₹) *</span>
                    <span className="text-[10px] text-slate-400 font-normal">Enter manually</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={shippingCharge}
                      onChange={(e) => setShippingCharge(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {['0', '50', '69', '100'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setShippingCharge(preset)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                          shippingCharge === preset
                            ? 'bg-ayur-800 text-white border-ayur-800'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {preset === '0' ? '₹0 Free' : `₹${preset}`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Manual COD Collect Amount (Only for COD with India Post) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>💵 COD Collect Amount (₹)</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {courierName === 'The Professional Courier' ? 'Not Applicable' : 'Enter manually'}
                    </span>
                  </label>
                  {courierName !== 'The Professional Courier' && paymentMethod === 'COD' ? (
                    <>
                      <Input
                        type="number"
                        min="0"
                        placeholder={`₹${finalPayableTotal} (default)`}
                        value={codAmount}
                        onChange={(e) => setCodAmount(e.target.value)}
                      />
                      <div className="flex items-center justify-between mt-1.5 text-[10px]">
                        <span className="text-slate-500">
                          Collecting: <strong className="text-slate-900 font-mono">₹{effectiveCodAmount}</strong>
                        </span>
                        {codAmount.trim() !== '' && codAmount !== String(finalPayableTotal) && (
                          <button
                            type="button"
                            onClick={() => setCodAmount(String(finalPayableTotal))}
                            className="text-ayur-700 hover:underline font-bold cursor-pointer"
                          >
                            Sync Total (₹{finalPayableTotal})
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 font-medium">
                      {courierName === 'The Professional Courier'
                        ? '₹0 (Professional Courier is Pre-Payment Only)'
                        : '₹0 (Prepaid Order — No Doorstep Cash Collection)'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Order Summary & Grand Total Bar */}
        <div className="p-3.5 bg-slate-900 text-white rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
          <div>
            <div className="text-[11px] text-slate-400 font-medium">Order Summary & Total</div>
            <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5 flex-wrap">
              <span>Gross Products: ₹{productsGrossSubtotal.toLocaleString()}</span>
              {!isOfficeOrder && <span>• Shipping: ₹{parsedShippingCharge}</span>}
              {!isOfficeOrder && (
                <span className="text-cyan-300 font-semibold">• {courierName} ({courierName === 'The Professional Courier' ? 'Pre-Payment Only' : (paymentMethod === 'COD' ? 'COD' : 'Prepaid')})</span>
              )}
              {isOfficeOrder && (
                <span className="text-purple-300 font-bold">• Office Counter Sale (₹0 Shipping)</span>
              )}
              {totalDiscountAmount > 0 && (
                <>
                  <span>•</span>
                  <span className="text-emerald-400 font-bold">Total Discount: -₹{totalDiscountAmount.toLocaleString()}</span>
                </>
              )}
              <span>•</span>
              <span className="text-emerald-300 font-mono">Weight: {formattedTotalWeight}</span>
            </div>
          </div>
          <div className="text-left sm:text-right pt-2 sm:pt-0 border-t sm:border-t-0 border-white/10 flex items-center sm:block justify-between">
            <div className="text-2xl font-black text-emerald-400 font-mono">
              ₹{finalPayableTotal.toLocaleString()}
            </div>
            {!isOfficeOrder && courierName !== 'The Professional Courier' && paymentMethod === 'COD' ? (
              <div className="text-[10px] text-amber-300 font-bold font-mono">
                COD: ₹{effectiveCodAmount.toLocaleString()}
              </div>
            ) : !isOfficeOrder && (courierName === 'The Professional Courier' || paymentMethod === 'ONLINE') ? (
              <div className="text-[10px] text-cyan-300 font-bold font-mono">
                Prepaid Total: ₹{finalPayableTotal.toLocaleString()}
              </div>
            ) : isOfficeOrder ? (
              <div className="text-[10px] text-purple-300 font-bold">
                Counter Bill ({paymentMethod})
              </div>
            ) : null}
          </div>
        </div>

        {/* SECTION 5: 📱 Patient App — my.shanthiayurvedas.com */}
        <div className="p-4 bg-purple-50/70 rounded-2xl border border-purple-200 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-purple-700" />
              <span>Patient App — my.shanthiayurvedas.com</span>
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

      </form>

      {/* Direct Counter Printable Invoice Modal (if not intercepted by parent) */}
      {createdOrderForInvoice && (
        <PrintableInvoiceModal
          isOpen={Boolean(createdOrderForInvoice)}
          onClose={() => {
            setCreatedOrderForInvoice(null);
            onClose();
          }}
          order={createdOrderForInvoice}
          autoPrint={true}
        />
      )}
    </Modal>
  );
}

export default OrderCreateModal;
