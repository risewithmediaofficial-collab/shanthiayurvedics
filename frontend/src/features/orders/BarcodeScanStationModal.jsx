import React, { useState, useEffect, useRef } from 'react';
import {
  Scan,
  Camera,
  Barcode,
  Search,
  CheckCircle2,
  Package,
  Truck,
  RotateCcw,
  Printer,
  Volume2,
  VolumeX,
  AlertCircle,
  Clock,
  User,
  MapPin,
  Loader2
} from 'lucide-react';
import { Modal } from '../../components/common/Modal.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import apiClient from '../../api/apiClient.js';

export function BarcodeScanStationModal({ isOpen, onClose, onOrderUpdated }) {
  const [activeTab, setActiveTab] = useState('scan'); // 'scan' | 'export' | 'rto' | 'delivered'
  const [inputVal, setInputVal] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [matchedOrder, setMatchedOrder] = useState(null);
  const [recentScans, setRecentScans] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const inputRef = useRef(null);

  // Auto-focus input when modal is opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 200);
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  // Synthesize pleasant scanner beep with Web Audio API
  const playBeep = (type = 'success') => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else {
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch (e) {
      // Audio context might be restricted before interaction
    }
  };

  // Perform search / lookup
  const handleLookup = async (codeToSearch) => {
    const term = (codeToSearch || inputVal).trim();
    if (!term) return;

    setIsLoading(true);
    setFeedbackMsg('');

    try {
      const res = await apiClient.get('/orders', { params: { search: term, limit: 1 } });
      const orders = res.data?.data || [];

      if (orders.length === 0) {
        playBeep('error');
        setFeedbackMsg(`⚠️ No order found matching "${term}"`);
        setMatchedOrder(null);
      } else {
        const order = orders[0];
        setMatchedOrder(order);
        playBeep('success');
        setFeedbackMsg(`✓ Found Order #${order.orderNumber}`);

        // Add to recent scans history
        setRecentScans((prev) => [
          {
            orderId: order._id,
            orderNumber: order.orderNumber,
            customerName: order.patientDetails?.patientName || order.customerId?.name || 'Customer',
            status: order.status,
            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          },
          ...prev.filter((p) => p.orderId !== order._id).slice(0, 9)
        ]);
      }
    } catch (err) {
      playBeep('error');
      setFeedbackMsg(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
      setInputVal('');
      inputRef.current?.focus();
    }
  };

  // Handle Enter key for USB barcode guns
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleLookup();
    }
  };

  // Transition order status directly from scan station
  const handleQuickTransition = async (targetStatus, notes) => {
    if (!matchedOrder) return;
    setIsLoading(true);

    try {
      await apiClient.patch(`/orders/${matchedOrder._id}/transition`, {
        status: targetStatus,
        notes: notes || `Updated via Scan Station (${activeTab.toUpperCase()})`
      });

      playBeep('success');
      setFeedbackMsg(`✓ Order #${matchedOrder.orderNumber} updated to ${targetStatus}`);

      setMatchedOrder((prev) => ({ ...prev, status: targetStatus }));
      setRecentScans((prev) =>
        prev.map((s) => (s.orderId === matchedOrder._id ? { ...s, status: targetStatus } : s))
      );

      if (onOrderUpdated) {
        onOrderUpdated();
      }
    } catch (err) {
      playBeep('error');
      setFeedbackMsg(`Failed to transition: ${err?.response?.data?.message || err.message}`);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Barcode & Tracking Scanner Station"
      subtitle="Scan India Post article barcodes, enter tracking IDs, or lookup orders instantly"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4 text-xs">
        {/* Top Controls & Sound Toggle */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('scan')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'scan' ? 'bg-ayur-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              📦 Scan Barcodes
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('export')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'export' ? 'bg-ayur-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              📮 Export / Dispatch
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('delivered')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'delivered' ? 'bg-ayur-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              ✅ Delivered
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('rto')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'rto' ? 'bg-ayur-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              ↩️ RTO Return
            </button>
          </div>

          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 ${
              soundEnabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-400'
            }`}
            title="Toggle Scan Beep Sound"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline font-semibold">{soundEnabled ? 'Sound On' : 'Muted'}</span>
          </button>
        </div>

        {/* Barcode Scanner Input Bar */}
        <div className="bg-slate-900 p-3.5 rounded-2xl shadow-inner text-white space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5 font-bold tracking-wider uppercase text-emerald-400">
              <Scan className="w-3.5 h-3.5" /> Scanner Input Ready
            </span>
            <span>USB Barcode gun or Manual typing (Press Enter)</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Scan tracking barcode or type Order # (e.g. EK452095441IN or ORD-...)"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-white rounded-xl text-sm font-mono outline-none tracking-wide"
              />
              <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            <Button
              variant="primary"
              onClick={() => handleLookup()}
              isLoading={isLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 px-4"
            >
              Lookup
            </Button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedbackMsg && (
          <div
            className={`p-2.5 rounded-xl font-semibold flex items-center gap-2 text-xs ${
              feedbackMsg.startsWith('✓')
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}
          >
            {feedbackMsg.startsWith('✓') ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            )}
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Matched Order Card with Quick Action Triggers */}
        {matchedOrder ? (
          <div className="p-4 bg-white border-2 border-ayur-600/30 rounded-2xl shadow-sm space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-slate-900">
                    #{matchedOrder.orderNumber}
                  </span>
                  <Badge variant="primary" size="sm">
                    {matchedOrder.status}
                  </Badge>
                  {matchedOrder.trackingNumber && (
                    <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-[10px] text-slate-700 border">
                      📮 {matchedOrder.trackingNumber}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-slate-500 text-[11px] mt-1">
                  <span className="flex items-center gap-1 font-semibold text-slate-800">
                    <User className="w-3 h-3 text-slate-400" />
                    {matchedOrder.patientDetails?.patientName || matchedOrder.customerId?.name}
                  </span>
                  <span>📞 {matchedOrder.patientDetails?.mobile || matchedOrder.customerId?.mobile}</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    {matchedOrder.deliveryAddress?.city || matchedOrder.deliveryAddress?.district}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-sm font-black text-slate-900">
                  ₹{matchedOrder.grandTotal?.toLocaleString()}
                </span>
                <span className="block text-[10px] text-slate-400 uppercase font-bold">
                  {matchedOrder.paymentMethod}
                </span>
              </div>
            </div>

            {/* Quick Action Buttons Depending on Active Tab */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Quick Actions:</span>

              <button
                type="button"
                onClick={() => handleQuickTransition('PACKED', 'Marked packed from barcode scan')}
                className="px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold flex items-center gap-1 border border-purple-200"
              >
                <Package className="w-3.5 h-3.5" /> Mark Packed
              </button>

              <button
                type="button"
                onClick={() => handleQuickTransition('DISPATCHED', 'Dispatched from barcode scan')}
                className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold flex items-center gap-1 border border-blue-200"
              >
                <Truck className="w-3.5 h-3.5" /> Mark Dispatched
              </button>

              <button
                type="button"
                onClick={() => handleQuickTransition('DELIVERED', 'Delivered from scan confirmation')}
                className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold flex items-center gap-1 border border-emerald-200"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Mark Delivered
              </button>

              <button
                type="button"
                onClick={() => handleQuickTransition('RTO', 'RTO returned package')}
                className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 font-bold flex items-center gap-1 border border-red-200"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Mark RTO
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center border border-dashed border-slate-200 rounded-2xl text-slate-400">
            <Barcode className="w-8 h-8 mx-auto mb-1 text-slate-300" />
            <p className="font-semibold text-slate-600">Waiting for Barcode Scan...</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Point your physical barcode gun at the India Post shipping label or enter an order number.
            </p>
          </div>
        )}

        {/* Recent Scans Session Log */}
        {recentScans.length > 0 && (
          <div className="space-y-1.5">
            <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
              Session Scans Log ({recentScans.length})
            </span>
            <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
              {recentScans.map((scan, idx) => (
                <div key={idx} className="px-3 py-1.5 flex items-center justify-between text-[11px] hover:bg-slate-50">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-800">#{scan.orderNumber}</span>
                    <span className="text-slate-600 truncate max-w-[150px]">{scan.customerName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-semibold text-[10px]">
                      {scan.status}
                    </span>
                    <span className="text-slate-400 font-mono text-[10px]">{scan.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end pt-2 border-t border-slate-200">
          <Button variant="secondary" onClick={onClose}>
            Close Station
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default BarcodeScanStationModal;
