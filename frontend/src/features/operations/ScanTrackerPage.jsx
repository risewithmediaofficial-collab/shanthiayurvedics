import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package,
  Boxes,
  Camera,
  CheckCircle2,
  RotateCcw,
  Download,
  ArrowRight,
  ArrowLeft,
  X,
  Copy,
  RefreshCw,
  Truck,
  ShieldCheck,
  AlertTriangle,
  Search,
  Filter,
  Phone,
  MapPin,
  DollarSign,
  FileSpreadsheet,
  Check,
  Calendar,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Printer,
  Edit2,
  Trash2,
  Building2,
  CheckCheck
} from 'lucide-react';
import * as XLSX from 'xlsx';
import apiClient from '../../api/apiClient.js';
import { useBranch } from '../../context/BranchContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { AccountSwitcherPill } from '../../components/layout/AccountSwitcher.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Spinner } from '../../components/common/Spinner.jsx';

// Audio feedback helper for industrial barcode scanning
const playAudioBeep = (type = 'success') => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 chime
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.14);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime); // Warning tone
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.28);
    }
  } catch (e) {
    // Ignore audio policy errors
  }
};

export function ScanTrackerPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { selectedBranchId, branches, setSelectedBranchId } = useBranch();

  // Active Main Tab: 'SCAN' | 'EXPORT' | 'RTO' | 'DELIVERED' | 'RE_EXPORT'
  const activeTab = searchParams.get('subtab')?.toUpperCase() || 'SCAN';
  const setActiveTab = (tab) => {
    setSearchParams({ subtab: tab.toLowerCase() });
  };

  // ─────────────────────────────────────────────────────────────
  // 1. DATA: Fetch Orders Scoped to Current Branch
  // ─────────────────────────────────────────────────────────────
  const { data: ordersResponse, isLoading: isOrdersLoading, refetch: refetchOrders } = useQuery({
    queryKey: ['orders', 'scan-tracker', selectedBranchId],
    queryFn: async () => {
      try {
        const params = { limit: 200 };
        if (selectedBranchId && selectedBranchId !== 'ALL') {
          params.branchId = selectedBranchId;
        }
        const res = await apiClient.get('/orders', { params });
        return res.data?.data || [];
      } catch (e) {
        console.error('Failed to load orders for scan tracker:', e);
        return [];
      }
    },
    enabled: Boolean(user),
    refetchInterval: 4000,
    refetchOnWindowFocus: true
  });

  const allOrders = ordersResponse || [];

  // Scannable Queue (Orders pending dispatch or ready for barcode assignment)
  const scannableOrders = allOrders.filter(
    (o) =>
      o.status === 'NEW' ||
      o.status === 'CONFIRMED' ||
      o.status === 'PROCESSING' ||
      o.status === 'READY_FOR_PACKING' ||
      o.status === 'PACKED' ||
      o.status === 'READY_FOR_DISPATCH'
  );

  // Scanned orders that currently have a valid tracking number
  const scannedOrders = allOrders.filter((o) => Boolean(o.trackingNumber && o.trackingNumber.trim() !== ''));

  // ─────────────────────────────────────────────────────────────
  // 2. SCANNING WORKFLOW STATE (Step 1 of 2)
  // ─────────────────────────────────────────────────────────────
  const [currentIndex, setCurrentIndex] = useState(0);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [strictIndiaPost, setStrictIndiaPost] = useState(true);
  const [inputError, setInputError] = useState('');
  const [successToast, setSuccessToast] = useState('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [cameraTarget, setCameraTarget] = useState('DISPATCH'); // 'DISPATCH' | 'RTO'
  const barcodeInputRef = useRef(null);
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);

  const activeOrder = scannableOrders[currentIndex] || null;
  const totalOrdersToScan = scannableOrders.length;
  const scannedInQueueCount = scannableOrders.filter((o) => Boolean(o.trackingNumber)).length;

  // Auto-focus input on tab change or order index change
  useEffect(() => {
    if (activeTab === 'SCAN' && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [currentIndex, activeTab]);

  const showToast = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 4500);
  };

  // Format validation: India Post standard is 2 letters + 9 numbers + 2 letters (e.g. EK452095441IN)
  const validateBarcode = (code) => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return { valid: false, message: 'Please enter or scan a barcode' };
    if (strictIndiaPost) {
      const indiaPostRegex = /^[A-Z]{2}\d{9}[A-Z]{2}$/;
      if (!indiaPostRegex.test(trimmed)) {
        return {
          valid: false,
          message: 'Invalid India Post barcode format! Must be 2 letters + 9 digits + 2 letters (e.g. EK452095441IN)'
        };
      }
    }
    return { valid: true, code: trimmed };
  };

  // Mutation: Save Barcode to Order & Transition to Dispatched/Packed
  const saveBarcodeMutation = useMutation({
    mutationFn: async ({ orderId, trackingNumber }) => {
      const res = await apiClient.patch(`/orders/${orderId}`, {
        trackingNumber,
        courierName: 'India Post',
        status: 'DISPATCHED',
        shippingDate: new Date()
      });
      return res.data;
    },
    onSuccess: (_, variables) => {
      playAudioBeep('success');
      queryClient.invalidateQueries(['scan-tracker-orders']);
      queryClient.invalidateQueries(['orders']);
      queryClient.invalidateQueries(['order-metrics-summary']);

      showToast(`✓ Order #${activeOrder?.orderNumber} scanned with Barcode: ${variables.trackingNumber}`);
      setBarcodeInput('');
      setInputError('');

      if (currentIndex < scannableOrders.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        showToast('🎉 All orders in queue have been scanned! Moving to Export Manifest tab...');
        setTimeout(() => setActiveTab('EXPORT'), 1200);
      }
    },
    onError: (err) => {
      playAudioBeep('error');
      setInputError(err.response?.data?.message || 'Failed to save barcode for order');
    }
  });

  const handleSaveAndNext = (e) => {
    if (e) e.preventDefault();
    if (!activeOrder) return;

    const validation = validateBarcode(barcodeInput);
    if (!validation.valid) {
      playAudioBeep('error');
      setInputError(validation.message);
      return;
    }

    saveBarcodeMutation.mutate({
      orderId: activeOrder._id,
      trackingNumber: validation.code
    });
  };

  const handleSkipOrder = () => {
    if (currentIndex < scannableOrders.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setBarcodeInput('');
      setInputError('');
    } else {
      showToast('Reached end of order queue');
    }
  };

  const handlePreviousOrder = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setBarcodeInput('');
      setInputError('');
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 3. CAMERA BARCODE SCANNER (HTML5 Viewfinder & BarcodeDetector)
  // ─────────────────────────────────────────────────────────────
  const startCamera = async (target = 'DISPATCH') => {
    setCameraTarget(target);
    setIsCameraOpen(true);
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      if ('BarcodeDetector' in window) {
        const barcodeDetector = new window.BarcodeDetector({
          formats: ['code_128', 'code_39', 'ean_13', 'upc_a', 'qr_code']
        });

        const detectFrame = async () => {
          if (!videoRef.current || !mediaStreamRef.current) return;
          try {
            const barcodes = await barcodeDetector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const scannedRaw = barcodes[0].rawValue.trim().toUpperCase();
              stopCamera();
              playAudioBeep('success');
              if (target === 'RTO') {
                setRtoSearchInput(scannedRaw);
                performRtoSearch(scannedRaw);
              } else {
                setBarcodeInput(scannedRaw);
                showToast(`📷 Scanned from camera: ${scannedRaw}`);
              }
              return;
            }
          } catch (err) {
            console.error('Barcode detection frame error:', err);
          }
          if (mediaStreamRef.current) {
            requestAnimationFrame(detectFrame);
          }
        };

        requestAnimationFrame(detectFrame);
      }
    } catch (err) {
      console.warn('Camera access denied:', err);
      setCameraError('Camera access denied or unavailable. Please use physical USB scanner or manual entry.');
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  // ─────────────────────────────────────────────────────────────
  // 4. EXPORT MANIFEST (Step 2 of 2)
  // ─────────────────────────────────────────────────────────────
  const [exportSearchQuery, setExportSearchQuery] = useState('');
  const [exportPaymentFilter, setExportPaymentFilter] = useState('ALL');
  const [editBarcodeModal, setEditBarcodeModal] = useState(null);
  const [newBarcodeVal, setNewBarcodeVal] = useState('');

  const filteredExportOrders = scannedOrders.filter((order) => {
    const q = exportSearchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      order.orderNumber?.toLowerCase().includes(q) ||
      order.trackingNumber?.toLowerCase().includes(q) ||
      order.patientDetails?.patientName?.toLowerCase().includes(q) ||
      order.patientDetails?.mobile?.includes(q) ||
      order.deliveryAddress?.city?.toLowerCase().includes(q) ||
      order.deliveryAddress?.pincode?.includes(q);

    const matchesPayment =
      exportPaymentFilter === 'ALL' ||
      (exportPaymentFilter === 'COD' && (order.paymentMethod === 'COD' || order.paymentMethod === 'CASH_ON_DELIVERY')) ||
      (exportPaymentFilter === 'PREPAID' && order.paymentMethod !== 'COD' && order.paymentMethod !== 'CASH_ON_DELIVERY');

    return matchesSearch && matchesPayment;
  });

  // Official India Post Speed Post / COD Bulk Excel Upload File (.xlsx)
  const exportToIndiaPostExcel = () => {
    if (scannedOrders.length === 0) {
      alert('No scanned orders available to export.');
      return;
    }

    const rows = scannedOrders.map((order, idx) => {
      const patient = order.patientDetails || {};
      const addr = order.deliveryAddress || {};
      const isCod = order.paymentMethod === 'COD' || order.paymentMethod === 'CASH_ON_DELIVERY';
      const itemsStr = (order.items || []).map((i) => `${i.productName || 'Item'} x${i.quantity}`).join(', ');

      return {
        'SL NO': idx + 1,
        'ARTICLE NUMBER': order.trackingNumber || '',
        'CUSTOMER NAME': patient.patientName || order.customerId?.name || 'Customer',
        'MOBILE': patient.mobile || order.customerId?.phone || '',
        'ADDRESS LINE 1': `${addr.street || ''} ${addr.landmark ? `, Near ${addr.landmark}` : ''}`.trim(),
        'CITY / TOWN': addr.city || addr.district || '',
        'DISTRICT': addr.district || '',
        'STATE': addr.state || 'Tamil Nadu',
        'PINCODE': addr.pincode || '',
        'PAYMENT TYPE': isCod ? 'COD' : 'PREPAID',
        'COD AMOUNT': isCod ? Number(order.grandTotal || 0) : 0,
        'DECLARED VALUE': Number(order.grandTotal || 0),
        'WEIGHT (G)': 450,
        'ORDER REF': order.orderNumber || order._id?.slice(-6)?.toUpperCase(),
        'CONTENTS': itemsStr
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'IndiaPost_Booking');
    XLSX.writeFile(workbook, `IndiaPost_SpeedPost_Manifest_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('✓ India Post Excel Booking Sheet (.xlsx) downloaded successfully');
  };

  const exportToCsv = () => {
    if (scannedOrders.length === 0) {
      alert('No scanned orders available to export.');
      return;
    }

    const headers = [
      'Sl No',
      'Order Number',
      'Barcode / Tracking AWB',
      'Customer Name',
      'Mobile',
      'Address',
      'City',
      'State',
      'Pincode',
      'Amount (Rs)',
      'Payment Mode',
      'Items Ordered',
      'Status'
    ];

    const csvRows = scannedOrders.map((o, idx) => {
      const itemsStr = (o.items || []).map((i) => `${i.productName} (${i.quantity})`).join(' | ');
      return [
        idx + 1,
        o.orderNumber,
        `"${o.trackingNumber || ''}"`,
        `"${o.patientDetails?.patientName || o.customerId?.name || ''}"`,
        `"${o.patientDetails?.mobile || o.customerId?.phone || ''}"`,
        `"${(o.deliveryAddress?.street || '').replace(/"/g, '""')}"`,
        `"${o.deliveryAddress?.city || ''}"`,
        `"${o.deliveryAddress?.state || ''}"`,
        `"${o.deliveryAddress?.pincode || ''}"`,
        o.grandTotal || 0,
        o.paymentMethod || 'COD',
        `"${itemsStr}"`,
        o.status
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...csvRows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Dispatch_Manifest_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('✓ CSV Manifest downloaded');
  };

  const copyAllTrackingIds = () => {
    const ids = scannedOrders.map((o) => o.trackingNumber).filter(Boolean).join('\n');
    if (!ids) {
      alert('No tracking numbers available to copy.');
      return;
    }
    navigator.clipboard.writeText(ids);
    showToast(`✓ Copied ${scannedOrders.length} Tracking IDs to clipboard!`);
  };

  const bulkDispatchMutation = useMutation({
    mutationFn: async (orderIds) => {
      const res = await apiClient.patch('/orders/bulk-status', {
        orderIds,
        status: 'DISPATCHED'
      });
      return res.data;
    },
    onSuccess: (res) => {
      playAudioBeep('success');
      queryClient.invalidateQueries(['scan-tracker-orders']);
      queryClient.invalidateQueries(['orders']);
      showToast(`🚀 Dispatched ${res.data?.successCount || scannedOrders.length} orders successfully!`);
    },
    onError: (err) => {
      playAudioBeep('error');
      alert(err.response?.data?.message || 'Failed to bulk dispatch orders');
    }
  });

  // Edit barcode mutation
  const updateBarcodeMutation = useMutation({
    mutationFn: async ({ orderId, trackingNumber }) => {
      const res = await apiClient.patch(`/orders/${orderId}`, {
        trackingNumber
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['scan-tracker-orders']);
      queryClient.invalidateQueries(['orders']);
      setEditBarcodeModal(null);
      showToast('✓ Barcode updated successfully');
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to update barcode');
    }
  });

  // Remove barcode from order (unscan)
  const removeBarcodeMutation = useMutation({
    mutationFn: async (orderId) => {
      const res = await apiClient.patch(`/orders/${orderId}`, {
        trackingNumber: '',
        status: 'CONFIRMED'
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['scan-tracker-orders']);
      queryClient.invalidateQueries(['orders']);
      showToast('✓ Tracking barcode cleared; order returned to scanning queue');
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 5. RTO RETURN STATION WORKFLOW
  // ─────────────────────────────────────────────────────────────
  const [rtoSearchInput, setRtoSearchInput] = useState('');
  const [rtoFoundOrder, setRtoFoundOrder] = useState(null);
  const [rtoReason, setRtoReason] = useState('Customer Refused');
  const [rtoCondition, setRtoCondition] = useState('SALEABLE');
  const [rtoNotes, setRtoNotes] = useState('');
  const [rtoTableSearch, setRtoTableSearch] = useState('');

  const rtoOrders = allOrders.filter((o) => o.status === 'RTO' || o.status === 'DELIVERY_FAILED');

  const filteredRtoOrders = rtoOrders.filter((o) => {
    const q = rtoTableSearch.trim().toLowerCase();
    return (
      !q ||
      o.orderNumber?.toLowerCase().includes(q) ||
      o.trackingNumber?.toLowerCase().includes(q) ||
      o.patientDetails?.patientName?.toLowerCase().includes(q) ||
      o.patientDetails?.mobile?.includes(q) ||
      o.notes?.toLowerCase().includes(q)
    );
  });

  const performRtoSearch = (queryStr) => {
    const query = (queryStr || rtoSearchInput).trim().toUpperCase();
    if (!query) return;

    const matched = allOrders.find(
      (o) =>
        o.orderNumber?.toUpperCase() === query ||
        o.trackingNumber?.toUpperCase() === query ||
        o.patientDetails?.mobile?.includes(query) ||
        o._id?.toString() === query
    );

    if (matched) {
      playAudioBeep('success');
      setRtoFoundOrder(matched);
      showToast(`✓ Found Order #${matched.orderNumber} for Return Processing`);
    } else {
      playAudioBeep('error');
      alert(`No active order found matching barcode / order number / phone: "${query}"`);
    }
  };

  const markRtoMutation = useMutation({
    mutationFn: async ({ orderId, reason, condition, notes }) => {
      const res = await apiClient.patch(`/orders/${orderId}`, {
        status: 'RTO',
        notes: `RTO via Scan Tracker. Reason: ${reason}. Condition: ${condition}. Notes: ${notes || 'None'}`
      });
      return res.data;
    },
    onSuccess: () => {
      playAudioBeep('success');
      queryClient.invalidateQueries(['scan-tracker-orders']);
      queryClient.invalidateQueries(['orders']);
      showToast('✓ Order marked as RTO & stock recorded');
      setRtoFoundOrder(null);
      setRtoSearchInput('');
      setRtoNotes('');
    },
    onError: (err) => {
      playAudioBeep('error');
      alert(err.response?.data?.message || 'Failed to update order to RTO');
    }
  });

  // Export RTO list
  const exportRtoExcel = () => {
    if (rtoOrders.length === 0) {
      alert('No RTO orders to export.');
      return;
    }

    const rows = rtoOrders.map((o, idx) => ({
      'SL NO': idx + 1,
      'ORDER NUMBER': o.orderNumber,
      'TRACKING AWB': o.trackingNumber || 'N/A',
      'PATIENT NAME': o.patientDetails?.patientName || o.customerId?.name || 'Customer',
      'MOBILE': o.patientDetails?.mobile || o.customerId?.phone || '',
      'CITY': o.deliveryAddress?.city || '',
      'STATE': o.deliveryAddress?.state || '',
      'ITEMS RETURNED': (o.items || []).map((i) => `${i.productName} x${i.quantity}`).join(', '),
      'ORDER AMOUNT': o.grandTotal,
      'PAYMENT MODE': o.paymentMethod,
      'STATUS': o.status,
      'RTO NOTES': o.notes || ''
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'RTO_Records');
    XLSX.writeFile(wb, `RTO_Returns_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('✓ RTO Report (.xlsx) downloaded successfully');
  };

  // ─────────────────────────────────────────────────────────────
  // 6. DELIVERED SCAN & SETTLEMENT
  // ─────────────────────────────────────────────────────────────
  const [deliveredSearchInput, setDeliveredSearchInput] = useState('');
  const deliveredOrders = allOrders.filter((o) => o.status === 'DELIVERED');
  const totalDeliveredCod = deliveredOrders
    .filter((o) => o.paymentMethod === 'COD' || o.paymentMethod === 'CASH_ON_DELIVERY')
    .reduce((sum, o) => sum + (o.grandTotal || 0), 0);

  const markDeliveredMutation = useMutation({
    mutationFn: async (orderId) => {
      const res = await apiClient.patch(`/orders/${orderId}`, {
        status: 'DELIVERED',
        paymentStatus: 'PAID'
      });
      return res.data;
    },
    onSuccess: () => {
      playAudioBeep('success');
      queryClient.invalidateQueries(['scan-tracker-orders']);
      queryClient.invalidateQueries(['orders']);
      showToast('✓ Order marked as Delivered & Payment confirmed');
      setDeliveredSearchInput('');
    },
    onError: (err) => {
      playAudioBeep('error');
      alert(err.response?.data?.message || 'Failed to mark order delivered');
    }
  });

  const handleDeliveredScan = (e) => {
    if (e) e.preventDefault();
    const query = deliveredSearchInput.trim().toUpperCase();
    if (!query) return;

    const matched = allOrders.find(
      (o) =>
        o.orderNumber?.toUpperCase() === query ||
        o.trackingNumber?.toUpperCase() === query ||
        o.patientDetails?.mobile?.includes(query)
    );

    if (matched) {
      if (window.confirm(`Mark Order #${matched.orderNumber} (${matched.patientDetails?.patientName}) as DELIVERED & PAID?`)) {
        markDeliveredMutation.mutate(matched._id);
      }
    } else {
      alert(`No order found matching: "${query}"`);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 select-text">
      {/* ── TOAST NOTIFICATION ── */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 p-4 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{successToast}</span>
          <button type="button" onClick={() => setSuccessToast('')} className="ml-2 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TOP NAVBAR: Exact match to crm2.ayuronemart.com/scan_tracker.php
      ───────────────────────────────────────────────────────────── */}
      <header className="w-full bg-[#1b254b] text-white px-4 sm:px-6 py-3 flex items-center justify-between border-b border-indigo-950/40 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-xs">
            <Boxes className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
              Scan Tracker
            </h1>
            <p className="text-[11px] text-slate-300 font-normal">
              Scan · Export · Ship
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Quick Account Switcher (Boss / Manager) */}
          <div className="hidden sm:block">
            <AccountSwitcherPill variant="dark" />
          </div>

          {/* Branch Scoping Pill */}
          {branches && branches.length > 0 && (
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-slate-200 text-xs font-semibold border border-white/10">
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              <select
                value={selectedBranchId || 'ALL'}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-slate-900 text-white">All Branches</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id} className="bg-slate-900 text-white">
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Refresh Queue Button */}
          <button
            type="button"
            onClick={() => refetchOrders()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all cursor-pointer select-none shadow-xs"
            title="Refresh order queue"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isOrdersLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Return to Orders Button */}
          <button
            type="button"
            onClick={() => navigate('/orders')}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-[#2d3d75] hover:bg-[#394c8e] border border-white/20 text-white transition-all cursor-pointer select-none shadow-xs"
          >
            <span>← Orders</span>
          </button>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          NAVIGATION TABS RIBBON (Scan Barcodes | Export | RTO | Delivered | Re-Export)
      ───────────────────────────────────────────────────────────── */}
      <nav className="w-full bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center gap-1 sm:gap-2 overflow-x-auto shadow-2xs shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('SCAN')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'SCAN'
              ? 'text-[#1b254b] border-[#1b254b]'
              : 'text-slate-500 border-transparent hover:text-slate-900'
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shrink-0" />
          <span>Scan Barcodes</span>
          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
            {totalOrdersToScan}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('EXPORT')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'EXPORT'
              ? 'text-rose-600 border-rose-600'
              : 'text-slate-500 border-transparent hover:text-slate-900'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-rose-500" />
          <span>Export</span>
          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700">
            {scannedOrders.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('RTO')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'RTO'
              ? 'text-blue-600 border-blue-600'
              : 'text-slate-500 border-transparent hover:text-slate-900'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5 text-blue-500" />
          <span>RTO</span>
          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700">
            {rtoOrders.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('DELIVERED')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'DELIVERED'
              ? 'text-emerald-600 border-emerald-600'
              : 'text-slate-500 border-transparent hover:text-slate-900'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span>Delivered</span>
          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700">
            {deliveredOrders.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('RE_EXPORT')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ml-auto ${
            activeTab === 'RE_EXPORT'
              ? 'text-[#1b254b] border-[#1b254b]'
              : 'text-slate-500 border-transparent hover:text-slate-900'
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5 text-cyan-600" />
          <span>Re-Export</span>
        </button>
      </nav>

      {/* ─────────────────────────────────────────────────────────────
          MAIN BODY CONTAINER
      ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 w-full p-2.5 sm:p-4">
        {/* ─────────────────────────────────────────────────────────
            TAB 1: SCAN BARCODES (STEP 1 OF 2)
        ───────────────────────────────────────────────────────── */}
        {activeTab === 'SCAN' && (
          <div className="max-w-6xl mx-auto space-y-2.5">
            {/* ── SLEEK WORKFLOW & PROGRESS RIBBON (Replaces bulky stacked boxes) ── */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2.5 text-xs">
              {/* Left: Step badge + Inline Progress */}
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider bg-[#1b254b] text-white flex items-center gap-1.5 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  Step 1: Scan Barcodes
                </span>

                <div className="flex items-center gap-2 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                  <span className="font-bold text-slate-700 font-mono text-[11px]">
                    {scannedInQueueCount} of {totalOrdersToScan} scanned
                  </span>
                  <div className="w-20 sm:w-28 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 transition-all duration-300 rounded-full"
                      style={{
                        width: `${totalOrdersToScan > 0 ? (scannedInQueueCount / totalOrdersToScan) * 100 : 0}%`
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Center: Scanner hints */}
              <div className="hidden lg:flex items-center gap-3 text-[11px] text-slate-500 font-medium">
                <span>⚡ <strong>USB Scanner:</strong> Scan label → auto saves</span>
                <span className="text-slate-300">•</span>
                <span>📷 <strong>Camera:</strong> Click camera icon</span>
                <span className="text-slate-300">•</span>
                <span>⌨️ <strong>Manual:</strong> Type & press Enter</span>
              </div>

              {/* Right: Validation Toggle + Export button */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStrictIndiaPost(!strictIndiaPost)}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors border flex items-center gap-1 ${
                    strictIndiaPost
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                      : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                  }`}
                  title="Click to toggle India Post format validation"
                >
                  <Check className="w-3 h-3 text-emerald-600 shrink-0 font-bold" />
                  <span>{strictIndiaPost ? 'India Post Only (EK...IN)' : 'Any Barcode Allowed'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('EXPORT')}
                  className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#1b254b] hover:bg-slate-800 text-white transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <span>Export Tab →</span>
                </button>
              </div>
            </div>

            {/* Active Order Card & Scanner Input */}
            {isOrdersLoading ? (
              <div className="py-12 text-center bg-white rounded-2xl border border-slate-200">
                <Spinner size="lg" text="Loading orders for scan station..." />
              </div>
            ) : !activeOrder ? (
              <div className="bg-white p-8 text-center rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h3 className="text-base font-bold text-slate-900">All Orders Scanned!</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Every order in the queue has been scanned with a tracking number.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('EXPORT')}
                  className="px-4 py-2 rounded-xl bg-[#1b254b] text-white text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer shadow-sm"
                >
                  Proceed to Export Manifest →
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Header Strip with Order Counter and Prev/Skip Nav */}
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-mono text-slate-700 uppercase tracking-wider">
                      ORDER {currentIndex + 1} OF {totalOrdersToScan}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-100 text-sky-700">
                      {activeOrder.status}
                    </span>
                    {activeOrder.orderNumber && (
                      <span className="text-xs font-mono text-slate-400">
                        #{activeOrder.orderNumber}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handlePreviousOrder}
                      disabled={currentIndex === 0}
                      className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Prev
                    </button>
                    <button
                      type="button"
                      onClick={handleSkipOrder}
                      className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                    >
                      Skip <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 2-Column Grid Layout: Details on Left | Scan & Next on Right */}
                <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
                  {/* ── LEFT COLUMN: ORDER & CUSTOMER DETAILS ── */}
                  <div className="lg:col-span-6 p-3.5 sm:p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Customer & Order Details
                        </div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-tight">
                          {activeOrder.patientDetails?.patientName || activeOrder.customerId?.name || 'Customer'}
                        </h2>
                      </div>

                      {/* Phone Chip */}
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs">
                        <span className="text-sm">📱</span>
                        <span className="font-mono font-bold text-slate-900 text-xs">
                          {activeOrder.patientDetails?.mobile || activeOrder.customerId?.phone || 'No phone'}
                        </span>
                      </div>
                    </div>

                    {/* Medicines Breakdown (Compact) */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <span className="flex items-center gap-1">
                          <span>📦</span>
                          <span>Items to Pack & Ship</span>
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {(activeOrder.items || []).length} item{(activeOrder.items || []).length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                        {(activeOrder.items || []).map((i, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs py-0.5 border-b border-slate-100/60 last:border-0">
                            <span className="font-medium text-slate-900 truncate max-w-[260px]">{i.productName}</span>
                            <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.2 rounded border border-indigo-100 text-[11px]">
                              x{i.quantity}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Price & Payment Mode */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">💰</span>
                        <div>
                          <div className="text-[9px] text-slate-400 uppercase font-semibold">Order Total</div>
                          <span className="font-bold text-slate-900 font-mono text-sm sm:text-base">
                            ₹{Number(activeOrder.grandTotal || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[9px] text-slate-400 uppercase font-semibold">Payment Mode</div>
                        <span className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-bold font-mono ${
                          activeOrder.paymentMethod === 'PREPAID'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-100 text-amber-900 border border-amber-200'
                        }`}>
                          {activeOrder.paymentMethod || 'COD'}
                        </span>
                      </div>
                    </div>

                    {/* Delivery Address */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5 text-xs">
                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        <span>📍</span>
                        <span>Delivery Address</span>
                      </div>
                      <p className="text-slate-600 leading-snug pl-1 text-[11px] line-clamp-2">
                        {activeOrder.deliveryAddress?.street}
                        {activeOrder.deliveryAddress?.landmark ? `, Near ${activeOrder.deliveryAddress.landmark}` : ''}
                        {activeOrder.deliveryAddress?.city ? `, ${activeOrder.deliveryAddress.city}` : ''}
                        {activeOrder.deliveryAddress?.state ? `, ${activeOrder.deliveryAddress.state}` : ''}
                        {activeOrder.deliveryAddress?.pincode ? ` - ${activeOrder.deliveryAddress.pincode}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* ── RIGHT COLUMN: SCANNER INPUT & NEXT BUTTON ── */}
                  <div className="lg:col-span-6 p-3.5 sm:p-4 flex flex-col justify-between bg-slate-50/50 space-y-3">
                    <form onSubmit={handleSaveAndNext} className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Scan Barcode
                          </div>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                            ⚡ Scanner Active
                          </span>
                        </div>

                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs sm:text-sm font-bold text-slate-900">
                            Enter or Scan Tracking Number *
                          </label>
                          {/* Camera quick scan button */}
                          <button
                            type="button"
                            onClick={() => startCamera('DISPATCH')}
                            className="text-[11px] font-bold text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2 py-0.5 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>Camera Scan</span>
                          </button>
                        </div>

                        <div className="relative">
                          <input
                            ref={barcodeInputRef}
                            type="text"
                            required
                            placeholder="e.g. EK452095441IN"
                            value={barcodeInput}
                            onChange={(e) => {
                              setBarcodeInput(e.target.value.toUpperCase());
                              setInputError('');
                            }}
                            className={`w-full px-3.5 py-2.5 text-base sm:text-lg font-mono font-black tracking-wider text-slate-900 bg-white border-2 rounded-xl focus:outline-none transition-all shadow-xs ${
                              inputError
                                ? 'border-rose-500 focus:ring-2 focus:ring-rose-200'
                                : 'border-indigo-600 focus:border-indigo-700 focus:ring-3 focus:ring-indigo-100'
                            }`}
                          />
                        </div>

                        {inputError && (
                          <p className="text-xs font-bold text-rose-600 flex items-center gap-1 mt-1">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>{inputError}</span>
                          </p>
                        )}
                      </div>

                      {/* ── NEXT BUTTON ON RIGHT ── */}
                      <div className="space-y-2 pt-1 border-t border-slate-200">
                        <button
                          type="submit"
                          disabled={saveBarcodeMutation.isPending}
                          className="w-full py-3 px-4 rounded-xl bg-[#1c2854] hover:bg-[#152044] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                        >
                          <Check className="w-5 h-5 text-emerald-400 font-bold" />
                          <span className="text-sm font-black tracking-wide">
                            {saveBarcodeMutation.isPending ? 'Saving Barcode...' : '✔ Save & Next →'}
                          </span>
                        </button>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={handlePreviousOrder}
                            disabled={currentIndex === 0}
                            className="py-1.5 px-3 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40 shadow-2xs"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                            <span>Previous</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleSkipOrder}
                            className="py-1.5 px-3 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-all flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                          >
                            <span>Skip</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </form>

                    <div className="text-[10px] text-slate-400 flex items-center gap-1.5 pt-1.5 border-t border-slate-200/70">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Tracking ID will automatically attach to dispatch manifest</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────
            TAB 2: EXPORT MANIFEST (STEP 2 OF 2)
        ───────────────────────────────────────────────────────── */}
        {activeTab === 'EXPORT' && (
          <div className="max-w-7xl mx-auto space-y-5">
            {/* Step 2 Header Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-600 uppercase tracking-wider mb-1">
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Step 2 of 2 — Export to India Post</span>
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    Generate Dispatch Manifest & Booking Sheets
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Download Speed Post manifest formatted for India Post bulk booking, copy AWBs, or bulk dispatch.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={exportToIndiaPostExcel}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>India Post Excel (.xlsx)</span>
                  </button>

                  <button
                    type="button"
                    onClick={exportToCsv}
                    className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold text-xs shadow-2xs transition-all cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-slate-500" />
                    <span>CSV Manifest</span>
                  </button>

                  <button
                    type="button"
                    onClick={copyAllTrackingIds}
                    className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold text-xs shadow-2xs transition-all cursor-pointer"
                  >
                    <Copy className="w-4 h-4 text-slate-500" />
                    <span>Copy Barcodes</span>
                  </button>

                  <button
                    type="button"
                    disabled={scannedOrders.length === 0 || bulkDispatchMutation.isPending}
                    onClick={() => {
                      if (window.confirm(`Mark all ${scannedOrders.length} scanned orders as DISPATCHED in database?`)) {
                        bulkDispatchMutation.mutate(scannedOrders.map((o) => o._id));
                      }
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1b254b] hover:bg-slate-900 text-white font-bold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Truck className="w-4 h-4 text-amber-400" />
                    <span>{bulkDispatchMutation.isPending ? 'Dispatching...' : '🚀 Mark All Dispatched'}</span>
                  </button>
                </div>
              </div>

              {/* 4 Summary Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200">
                  <div className="text-[10px] uppercase font-bold text-indigo-700">Total Scanned</div>
                  <div className="text-2xl font-black font-mono text-indigo-950 mt-0.5">
                    {scannedOrders.length}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200">
                  <div className="text-[10px] uppercase font-bold text-emerald-700">Total COD Amount</div>
                  <div className="text-2xl font-black font-mono text-emerald-950 mt-0.5">
                    ₹{scannedOrders
                      .filter((o) => o.paymentMethod === 'COD' || o.paymentMethod === 'CASH_ON_DELIVERY')
                      .reduce((sum, o) => sum + (o.grandTotal || 0), 0)
                      .toLocaleString()}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200">
                  <div className="text-[10px] uppercase font-bold text-blue-700">Prepaid Value</div>
                  <div className="text-2xl font-black font-mono text-blue-950 mt-0.5">
                    ₹{scannedOrders
                      .filter((o) => o.paymentMethod !== 'COD' && o.paymentMethod !== 'CASH_ON_DELIVERY')
                      .reduce((sum, o) => sum + (o.grandTotal || 0), 0)
                      .toLocaleString()}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Est. Total Weight</div>
                  <div className="text-2xl font-black font-mono text-slate-900 mt-0.5">
                    {(scannedOrders.length * 0.45).toFixed(1)} kg
                  </div>
                </div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search customer, mobile, barcode, order..."
                  value={exportSearchQuery}
                  onChange={(e) => setExportSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-slate-500 font-semibold">Payment:</span>
                <select
                  value={exportPaymentFilter}
                  onChange={(e) => setExportPaymentFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                >
                  <option value="ALL">All Payment Types</option>
                  <option value="COD">COD Only</option>
                  <option value="PREPAID">Prepaid Only</option>
                </select>
              </div>
            </div>

            {/* Scanned Orders Full Details Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Scanned Orders Manifest Queue ({filteredExportOrders.length})
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">Ready for pickup & booking</span>
              </div>

              {filteredExportOrders.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-400 space-y-2">
                  <p>No orders matched the export criteria.</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('SCAN')}
                    className="text-indigo-600 font-bold hover:underline"
                  >
                    Go back to Scan Barcodes tab
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold text-[11px]">
                        <th className="p-3">#</th>
                        <th className="p-3">Order Ref</th>
                        <th className="p-3">Customer & Phone</th>
                        <th className="p-3">Destination</th>
                        <th className="p-3">Medicines & Quantities</th>
                        <th className="p-3">Barcode / AWB</th>
                        <th className="p-3">Amount & Mode</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredExportOrders.map((order, idx) => (
                        <tr key={order._id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="p-3">
                            <span className="font-bold font-mono text-slate-900 block">
                              #{order.orderNumber}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(order.createdAt).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-slate-900">
                              {order.patientDetails?.patientName || order.customerId?.name || 'Customer'}
                            </div>
                            <div className="font-mono text-slate-500 text-[11px]">
                              {order.patientDetails?.mobile || order.customerId?.phone}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="text-slate-800 font-medium">
                              {order.deliveryAddress?.city || order.deliveryAddress?.district}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              PIN: {order.deliveryAddress?.pincode}
                            </div>
                          </td>
                          <td className="p-3 max-w-xs">
                            <div className="text-slate-700 text-xs">
                              {(order.items || []).map((i, iIdx) => (
                                <span key={iIdx} className="inline-block mr-1.5 mb-1 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px] font-medium text-slate-800">
                                  {i.productName} <strong className="text-indigo-900 font-mono">x{i.quantity}</strong>
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-1 rounded-md font-mono font-bold text-xs bg-emerald-50 text-emerald-800 border border-emerald-200">
                                {order.trackingNumber}
                              </span>
                              <button
                                type="button"
                                title="Copy Barcode"
                                onClick={() => {
                                  navigator.clipboard.writeText(order.trackingNumber);
                                  showToast(`Copied ${order.trackingNumber}`);
                                }}
                                className="p-1 rounded text-slate-400 hover:text-slate-700"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="font-mono font-bold text-slate-900">
                              ₹{Number(order.grandTotal || 0).toLocaleString()}
                            </div>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              order.paymentMethod === 'COD' || order.paymentMethod === 'CASH_ON_DELIVERY'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {order.paymentMethod || 'COD'}
                            </span>
                          </td>
                          <td className="p-3">
                            <Badge variant={order.status === 'DISPATCHED' ? 'success' : 'primary'} size="sm">
                              {order.status}
                            </Badge>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                title="Edit Barcode"
                                onClick={() => {
                                  setEditBarcodeModal(order);
                                  setNewBarcodeVal(order.trackingNumber || '');
                                }}
                                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                title="Unscan / Remove Barcode"
                                onClick={() => {
                                  if (window.confirm(`Remove tracking barcode from Order #${order.orderNumber} and return to scan queue?`)) {
                                    removeBarcodeMutation.mutate(order._id);
                                  }
                                }}
                                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────
            TAB 3: RTO MANAGEMENT RETURN STATION
        ───────────────────────────────────────────────────────── */}
        {activeTab === 'RTO' && (
          <div className="max-w-7xl mx-auto space-y-5">
            {/* RTO Scan Input Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <RotateCcw className="w-5 h-5 text-blue-600" />
                    RTO Return Station (Reverse Logistics)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Scan returned parcel barcode or enter order number to log return, select reason, and restock inventory.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => startCamera('RTO')}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-2xs"
                  >
                    <Camera className="w-4 h-4 text-teal-200" />
                    <span>📷 Scan Return with Camera</span>
                  </button>
                  <button
                    type="button"
                    onClick={exportRtoExcel}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold text-xs shadow-2xs"
                  >
                    <Download className="w-4 h-4 text-slate-500" />
                    <span>Export RTO Sheet</span>
                  </button>
                </div>
              </div>

              {/* RTO Input Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  performRtoSearch();
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  required
                  placeholder="Scan returned India Post barcode (e.g. EK...) or type Order # / Mobile..."
                  value={rtoSearchInput}
                  onChange={(e) => setRtoSearchInput(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl bg-slate-50 border-2 border-blue-900 font-mono text-sm font-bold text-slate-900 focus:outline-none focus:bg-white"
                />
                <button
                  type="submit"
                  className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                  <span>Find Order</span>
                </button>
              </form>

              {/* Found Order Card for RTO Action */}
              {rtoFoundOrder && (
                <div className="p-5 rounded-2xl border-2 border-blue-500 bg-blue-50/40 space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">
                        Matched: #{rtoFoundOrder.orderNumber} — {rtoFoundOrder.patientDetails?.patientName}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Placed on {new Date(rtoFoundOrder.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="warning" size="sm">
                      Current: {rtoFoundOrder.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs bg-white p-3.5 rounded-xl border border-blue-200">
                    <div>
                      <span className="text-slate-400 font-bold block text-[10px]">CUSTOMER MOBILE</span>
                      <span className="font-mono font-bold text-slate-900">{rtoFoundOrder.patientDetails?.mobile}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block text-[10px]">ORIGINAL BARCODE</span>
                      <span className="font-mono font-bold text-blue-700">{rtoFoundOrder.trackingNumber || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block text-[10px]">ORDER AMOUNT</span>
                      <span className="font-mono font-bold text-slate-900">₹{rtoFoundOrder.grandTotal}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block text-[10px]">PAYMENT MODE</span>
                      <span className="font-bold text-slate-800">{rtoFoundOrder.paymentMethod}</span>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="bg-white p-3 rounded-xl border border-blue-200 text-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Medicines Inside Parcel
                    </span>
                    <div className="space-y-1">
                      {(rtoFoundOrder.items || []).map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-slate-700">
                          <span>{item.productName}</span>
                          <span className="font-mono font-bold text-slate-900">Qty: {item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Return Options Form */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Return Reason *</label>
                      <select
                        value={rtoReason}
                        onChange={(e) => setRtoReason(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none"
                      >
                        <option value="Customer Refused">Customer Refused at Doorstep</option>
                        <option value="Incomplete Address">Incomplete / Incorrect Address</option>
                        <option value="Door Locked / Shifted">Door Locked / House Shifted</option>
                        <option value="Customer Unreachable">Customer Unreachable on Phone</option>
                        <option value="Customer Cancelled">Customer Cancelled while in Transit</option>
                        <option value="Damaged in Transit">Damaged in Transit by Courier</option>
                        <option value="Fake / Not Ordered">Fake Order / Impersonation</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Stock Condition *</label>
                      <select
                        value={rtoCondition}
                        onChange={(e) => setRtoCondition(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none"
                      >
                        <option value="SALEABLE">Saleable (Restock to Active Inventory)</option>
                        <option value="DAMAGED">Damaged / Seal Broken (Move to Scrap)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">RTO Notes</label>
                    <input
                      type="text"
                      placeholder="e.g. Returned with stamp: 'Consignee not available after 3 attempts'"
                      value={rtoNotes}
                      onChange={(e) => setRtoNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        markRtoMutation.mutate({
                          orderId: rtoFoundOrder._id,
                          reason: rtoReason,
                          condition: rtoCondition,
                          notes: rtoNotes
                        })
                      }
                      disabled={markRtoMutation.isPending}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Check className="w-4 h-4 text-emerald-300" />
                      <span>{markRtoMutation.isPending ? 'Recording RTO...' : '✔ Confirm RTO & Restock Inventory'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRtoFoundOrder(null)}
                      className="px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* RTO Records Register Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-3 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Registered RTO Parcels ({rtoOrders.length})
                </h3>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search RTO register..."
                    value={rtoTableSearch}
                    onChange={(e) => setRtoTableSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
                  />
                </div>
              </div>

              {filteredRtoOrders.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No RTO return orders found for this branch.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold text-[11px]">
                        <th className="p-3">Order #</th>
                        <th className="p-3">Customer</th>
                        <th className="p-3">Mobile</th>
                        <th className="p-3">Original Barcode</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3">Items</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRtoOrders.map((order) => (
                        <tr key={order._id} className="hover:bg-slate-50/80">
                          <td className="p-3 font-bold font-mono text-slate-900">#{order.orderNumber}</td>
                          <td className="p-3 font-semibold text-slate-900">{order.patientDetails?.patientName}</td>
                          <td className="p-3 font-mono text-slate-600">{order.patientDetails?.mobile}</td>
                          <td className="p-3 font-mono text-xs text-blue-700 font-bold">{order.trackingNumber || 'N/A'}</td>
                          <td className="p-3 font-mono font-bold text-slate-900">₹{order.grandTotal}</td>
                          <td className="p-3 text-slate-600">
                            {(order.items || []).map((i) => `${i.productName} (${i.quantity})`).join(', ')}
                          </td>
                          <td className="p-3">
                            <Badge variant="danger" size="sm">{order.status}</Badge>
                          </td>
                          <td className="p-3 text-slate-500 text-[11px] max-w-xs truncate">{order.notes || 'RTO'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────
            TAB 4: DELIVERED VERIFICATION & RECONCILIATION
        ───────────────────────────────────────────────────────── */}
        {activeTab === 'DELIVERED' && (
          <div className="max-w-7xl mx-auto space-y-5">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    Delivered Packages & Cash Reconciliation
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Scan delivered barcode or order reference to confirm cash collection and mark payment settled.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-right">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 block">Total Verified COD Collected</span>
                  <span className="text-2xl font-black font-mono text-emerald-950">
                    ₹{totalDeliveredCod.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Quick Scan Input */}
              <form onSubmit={handleDeliveredScan} className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="Scan delivered AWB barcode or Order Number to verify delivery..."
                  value={deliveredSearchInput}
                  onChange={(e) => setDeliveredSearchInput(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs font-bold focus:outline-none focus:bg-white"
                />
                <button
                  type="submit"
                  disabled={markDeliveredMutation.isPending}
                  className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  Mark Delivered
                </button>
              </form>
            </div>

            {/* Delivered Orders Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Confirmed Delivered Packages ({deliveredOrders.length})
                </h3>
              </div>

              {deliveredOrders.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No orders marked as Delivered yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold text-[11px]">
                        <th className="p-3">Order #</th>
                        <th className="p-3">Customer</th>
                        <th className="p-3">Mobile</th>
                        <th className="p-3">Barcode AWB</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3">Payment Mode</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {deliveredOrders.map((order) => (
                        <tr key={order._id} className="hover:bg-slate-50/80">
                          <td className="p-3 font-bold font-mono text-slate-900">#{order.orderNumber}</td>
                          <td className="p-3 font-semibold text-slate-900">{order.patientDetails?.patientName}</td>
                          <td className="p-3 font-mono text-slate-600">{order.patientDetails?.mobile}</td>
                          <td className="p-3 font-mono text-xs text-emerald-800 font-bold">{order.trackingNumber || 'N/A'}</td>
                          <td className="p-3 font-mono font-bold text-slate-900">₹{order.grandTotal}</td>
                          <td className="p-3 font-semibold text-slate-700">{order.paymentMethod}</td>
                          <td className="p-3">
                            <Badge variant="success" size="sm">DELIVERED & PAID</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────
            TAB 5: RE-EXPORT HISTORICAL MANIFESTS
        ───────────────────────────────────────────────────────── */}
        {activeTab === 'RE_EXPORT' && (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-slate-700" />
                  Re-Export Historical Dispatch Manifests
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Download previous Speed Post manifests or booking sheets for any past date range.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <input
                  type="date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none"
                />
                <button
                  type="button"
                  onClick={exportToIndiaPostExcel}
                  className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download India Post Manifest (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={exportToCsv}
                  className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold text-xs shadow-2xs flex items-center gap-2 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-slate-500" />
                  <span>Download CSV</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ─────────────────────────────────────────────────────────────
          CAMERA VIEW FINDER MODAL
      ───────────────────────────────────────────────────────────── */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-700 space-y-4 p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-400" />
                Live Camera Barcode Scanner ({cameraTarget === 'RTO' ? 'Return Station' : 'Dispatch'})
              </h3>
              <button
                type="button"
                onClick={stopCamera}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {cameraError ? (
              <div className="p-4 bg-rose-950/60 border border-rose-800 rounded-2xl text-xs text-rose-300 space-y-2">
                <p>{cameraError}</p>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-3 py-1.5 rounded-lg bg-rose-900 text-white font-bold text-xs"
                >
                  Close Camera
                </button>
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-4/3 flex items-center justify-center">
                <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                <div className="absolute inset-0 border-2 border-emerald-500/50 m-8 rounded-xl flex items-center justify-center pointer-events-none">
                  <div className="w-full h-0.5 bg-emerald-400/80 shadow-lg shadow-emerald-500 animate-pulse" />
                </div>
                <div className="absolute bottom-2 inset-x-0 text-center text-[10px] text-white/80 bg-black/50 py-1">
                  Point camera at barcode label
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={stopCamera}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          EDIT BARCODE MODAL
      ───────────────────────────────────────────────────────────── */}
      {editBarcodeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-slate-200 animate-in fade-in">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">
                Edit Barcode: #{editBarcodeModal.orderNumber}
              </h3>
              <button
                type="button"
                onClick={() => setEditBarcodeModal(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">Tracking Number / AWB</label>
              <input
                type="text"
                required
                value={newBarcodeVal}
                onChange={(e) => setNewBarcodeVal(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditBarcodeModal(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  updateBarcodeMutation.mutate({
                    orderId: editBarcodeModal._id,
                    trackingNumber: newBarcodeVal.trim()
                  })
                }
                disabled={updateBarcodeMutation.isPending}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ScanTrackerPage;
