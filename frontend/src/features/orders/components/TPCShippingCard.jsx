import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Truck,
  Package,
  Barcode,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  Printer,
  ExternalLink,
  MapPin,
  Clock,
  Layers,
  ShieldCheck,
  Send
} from 'lucide-react';
import apiClient from '../../../api/apiClient.js';
import { Card } from '../../../components/common/Card.jsx';
import { Button } from '../../../components/common/Button.jsx';
import { Badge } from '../../../components/common/Badge.jsx';
import { Input } from '../../../components/common/Input.jsx';
import { Modal } from '../../../components/common/Modal.jsx';
import { Spinner } from '../../../components/common/Spinner.jsx';
import { TPCLabelModal } from './TPCLabelModal.jsx';

export function TPCShippingCard({ order }) {
  const queryClient = useQueryClient();
  const orderId = order?._id || order?.id;
  const destinationPin = order?.deliveryAddress?.pincode || '';

  // Serviceability state
  const [testPincode, setTestPincode] = useState(destinationPin);
  const [serviceabilityResult, setServiceabilityResult] = useState(null);
  const [serviceabilityLoading, setServiceabilityLoading] = useState(false);

  // Booking Modal state
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [weightKg, setWeightKg] = useState('0.5');
  const [pieces, setPieces] = useState('1');
  const [lengthCm, setLengthCm] = useState('15');
  const [widthCm, setWidthCm] = useState('12');
  const [heightCm, setHeightCm] = useState('10');
  const [bookingError, setBookingError] = useState('');

  // Cancellation Modal state
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Order cancelled / Address modified');

  // Label Modal state
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [labelData, setLabelData] = useState(null);
  const [labelLoading, setLabelLoading] = useState(false);

  // Copy AWB state
  const [copiedAwb, setCopiedAwb] = useState(false);

  // 1. Fetch TPC courier configuration
  const { data: configData } = useQuery({
    queryKey: ['courierConfig'],
    queryFn: async () => {
      const res = await apiClient.get('/shipping/config');
      return res.data;
    },
    staleTime: 60000
  });
  const tpcConfig = configData?.data || { isMock: true, mode: 'mock' };

  // 2. Fetch C-Note stock
  const { data: stockData, refetch: refetchStock } = useQuery({
    queryKey: ['courierStock'],
    queryFn: async () => {
      const res = await apiClient.get('/shipping/stock', {
        params: { carrierCode: 'PROFESSIONAL_COURIER' }
      });
      return res.data;
    },
    staleTime: 30000
  });
  const availableCnotes = stockData?.data?.availableCnotes;

  // 3. Fetch Shipment for this Order
  const {
    data: shipmentResp,
    isLoading: isShipmentLoading,
    refetch: refetchShipment
  } = useQuery({
    queryKey: ['orderShipment', orderId],
    queryFn: async () => {
      const res = await apiClient.get(`/shipping/orders/${orderId}/shipment`);
      return res.data;
    },
    enabled: Boolean(orderId)
  });

  const shipment = shipmentResp?.data?.shipment;
  const trackingEvents = shipmentResp?.data?.events || [];

  // Check PIN Serviceability
  const handleCheckServiceability = async () => {
    if (!testPincode) return;
    setServiceabilityLoading(true);
    setServiceabilityResult(null);
    try {
      const res = await apiClient.get('/shipping/serviceability', {
        params: { pincode: testPincode, carrierCode: 'PROFESSIONAL_COURIER' }
      });
      setServiceabilityResult(res.data?.data);
    } catch (err) {
      setServiceabilityResult({
        serviceable: false,
        message: err.response?.data?.message || err.message || 'Serviceability check failed'
      });
    } finally {
      setServiceabilityLoading(false);
    }
  };

  // Book TPC Shipment Mutation
  const bookShipmentMutation = useMutation({
    mutationFn: async () => {
      setBookingError('');
      const payload = {
        carrierCode: 'PROFESSIONAL_COURIER',
        weight: parseFloat(weightKg) || 0.5,
        pieces: parseInt(pieces, 10) || 1,
        length: parseFloat(lengthCm) || 15,
        width: parseFloat(widthCm) || 12,
        height: parseFloat(heightCm) || 10
      };
      const res = await apiClient.post(`/shipping/orders/${orderId}/shipment`, payload);
      return res.data;
    },
    onSuccess: () => {
      setIsBookModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['orderShipment', orderId] });
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['courierStock'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (err) => {
      setBookingError(err.response?.data?.message || err.message || 'Shipment booking failed');
    }
  });

  // Sync Tracking Mutation
  const syncTrackingMutation = useMutation({
    mutationFn: async () => {
      if (!shipment?._id) return;
      const res = await apiClient.post(`/shipping/shipments/${shipment._id}/sync-tracking`);
      return res.data;
    },
    onSuccess: () => {
      refetchShipment();
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
    }
  });

  // Cancel Shipment Mutation
  const cancelShipmentMutation = useMutation({
    mutationFn: async () => {
      if (!shipment?._id) return;
      const res = await apiClient.post(`/shipping/shipments/${shipment._id}/cancel`, {
        reason: cancelReason
      });
      return res.data;
    },
    onSuccess: () => {
      setIsCancelModalOpen(false);
      refetchShipment();
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
    }
  });

  // Fetch Label
  const handleOpenLabel = async () => {
    if (!shipment?._id) return;
    setLabelLoading(true);
    try {
      const res = await apiClient.get(`/shipping/shipments/${shipment._id}/label`);
      setLabelData(res.data?.data);
      setIsLabelModalOpen(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to fetch shipping label');
    } finally {
      setLabelLoading(false);
    }
  };

  const handleCopyAwb = () => {
    if (!shipment?.awbNumber) return;
    navigator.clipboard.writeText(shipment.awbNumber);
    setCopiedAwb(true);
    setTimeout(() => setCopiedAwb(false), 2000);
  };

  const isTPCProvider =
    (order.courierName || '').toLowerCase().includes('professional') ||
    shipment?.courierName?.toLowerCase().includes('professional') ||
    shipment?.carrierCode === 'PROFESSIONAL_COURIER';

  const isCancelled = shipment?.trackingStatus === 'CANCELLED' || shipment?.cancellation?.isCancelled;
  const isDelivered = shipment?.trackingStatus === 'DELIVERED';

  if (isShipmentLoading) {
    return (
      <Card title="The Professional Couriers (TPC) Integration">
        <div className="py-6 flex justify-center">
          <Spinner size="sm" text="Checking shipment status..." />
        </div>
      </Card>
    );
  }

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-indigo-600" />
          <span>The Professional Couriers (TPC) Logistics</span>
        </div>
      }
      subtitle="Commercial express delivery partner integration"
      headerAction={
        <div className="flex items-center gap-2">
          {tpcConfig.isMock ? (
            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              DEMO / MOCK MODE
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              LIVE TPC API
            </span>
          )}

          {availableCnotes !== undefined && (
            <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-mono hidden sm:inline-block">
              Stock: <strong>{availableCnotes} C-Notes</strong>
            </span>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {/* CASE 1: Shipment ALREADY BOOKED */}
        {shipment ? (
          <div className="space-y-4">
            {/* AWB & Status Banner */}
            <div className="p-3.5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-indigo-300">
                  Allocated Consignment Note (AWB)
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-xl font-black tracking-wider text-emerald-300">
                    {shipment.awbNumber}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyAwb}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    title="Copy AWB Number"
                  >
                    {copiedAwb ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  {shipment.isMock && (
                    <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-400/30 px-1.5 py-0.5 rounded uppercase font-semibold">
                      Mock AWB
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    isCancelled
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : isDelivered
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-indigo-500/20 text-indigo-200 border border-indigo-400/30'
                  }`}
                >
                  {shipment.trackingStatus?.replace(/_/g, ' ')}
                </span>
              </div>
            </div>

            {/* Shipment Specifications */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Weight & Pieces</div>
                <div className="font-bold text-slate-800 mt-0.5">
                  {shipment.packageDetails?.weight || 0.5} kg ({shipment.packageDetails?.pieces || 1} Pcs)
                </div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Dimensions (cm)</div>
                <div className="font-bold text-slate-800 mt-0.5">
                  {shipment.packageDetails?.length || 15} × {shipment.packageDetails?.width || 12} ×{' '}
                  {shipment.packageDetails?.height || 10}
                </div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Booking Date</div>
                <div className="font-bold text-slate-800 mt-0.5">
                  {new Date(shipment.bookingDate || shipment.createdAt).toLocaleDateString('en-IN')}
                </div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Mode & Service</div>
                <div className="font-bold text-slate-800 mt-0.5">
                  ST (Surface) · STD
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  icon={Printer}
                  onClick={handleOpenLabel}
                  isLoading={labelLoading}
                >
                  View TPC Label
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  icon={RefreshCw}
                  onClick={() => syncTrackingMutation.mutate()}
                  isLoading={syncTrackingMutation.isPending}
                >
                  Sync Tracking
                </Button>
              </div>

              {!isCancelled && !isDelivered && (
                <Button
                  variant="danger"
                  size="sm"
                  icon={XCircle}
                  onClick={() => setIsCancelModalOpen(true)}
                >
                  Cancel Booking
                </Button>
              )}
            </div>

            {/* Real-Time Tracking Timeline */}
            <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" /> Real-time Tracking Events
                </div>
                <span className="text-[10px] text-slate-500">
                  {trackingEvents.length} event(s) logged
                </span>
              </div>

              {trackingEvents.length > 0 ? (
                <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-indigo-100 pl-1">
                  {trackingEvents.map((evt, idx) => (
                    <div key={idx} className="flex items-start gap-3 relative pl-1">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 z-10 text-[10px] font-bold ${
                          idx === 0
                            ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-200'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {idx === 0 ? '•' : idx + 1}
                      </div>
                      <div className="flex-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">{evt.activity}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(evt.timestamp).toLocaleString('en-IN', {
                              dateStyle: 'short',
                              timeStyle: 'short'
                            })}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{evt.location || 'Transit Hub'}</span>
                          <span className="text-slate-300">•</span>
                          <span className="font-mono text-slate-600">{evt.status}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-slate-50 rounded-lg text-center text-xs text-slate-500">
                  No tracking events recorded yet. Click <strong>Sync Tracking</strong> to query TPC web services.
                </div>
              )}
            </div>
          </div>
        ) : (
          /* CASE 2: Shipment NOT YET BOOKED */
          <div className="space-y-4">
            {/* PIN Code Serviceability Checker */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-indigo-600" /> PIN Code Serviceability Check
                </span>
                <span className="text-[10px] text-slate-500">TPC Direct Delivery Network</span>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  value={testPincode}
                  onChange={(e) => setTestPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit PIN code"
                  className="font-mono text-sm max-w-[200px]"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCheckServiceability}
                  isLoading={serviceabilityLoading}
                >
                  Check Serviceability
                </Button>
              </div>

              {serviceabilityResult && (
                <div
                  className={`p-2.5 rounded-lg text-xs flex items-start gap-2 border ${
                    serviceabilityResult.serviceable
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  {serviceabilityResult.serviceable ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-bold">
                      {serviceabilityResult.serviceable
                        ? `Serviceable (${serviceabilityResult.city || 'TPC Hub'}) — Est. ${
                            serviceabilityResult.estimatedDays || 2
                          } Day(s)`
                        : 'Unserviceable PIN Code'}
                    </div>
                    <div className="text-[11px] opacity-90 mt-0.5">{serviceabilityResult.message}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Payment & Booking Notice */}
            {(() => {
              const isPackReady = order.status === 'PACKED' || order.status === 'READY_FOR_DISPATCH';
              const isCodOrder = order.paymentMethod === 'COD';

              return (
                <>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700">Order Lifecycle Stage:</span>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        isPackReady
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        {order.status}
                      </span>
                    </div>

                    {!isPackReady && (
                      <div className="flex items-start gap-2 text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <strong>Fulfillment Notice:</strong> Consignment notes & AWB generation are unlocked once the order is packed and sealed at the packing station (status: <strong>PACKED</strong>).
                        </div>
                      </div>
                    )}

                    {isCodOrder && (
                      <div className="flex items-start gap-2 text-rose-800 bg-rose-50 p-2 rounded-lg border border-rose-200">
                        <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <strong>COD Restricted:</strong> The Professional Courier requires <strong>Pre-Payment (UPI/Online)</strong>. For COD orders, please assign India Post Speed Post.
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Book Shipment Action Button */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div className="text-xs text-slate-500">
                      Destination: <strong className="text-slate-800">{order.deliveryAddress?.city} ({order.deliveryAddress?.pincode})</strong>
                    </div>

                    <Button
                      variant="primary"
                      icon={Barcode}
                      onClick={() => setIsBookModalOpen(true)}
                      disabled={!isPackReady || isCodOrder}
                      title={
                        !isPackReady
                          ? 'Order must be PACKED before booking consignment note'
                          : isCodOrder
                          ? 'COD is not supported for TPC'
                          : ''
                      }
                    >
                      Book TPC Shipment & Generate AWB
                    </Button>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* Booking Modal */}
      <Modal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        title="Book TPC Consignment Note"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-900">
            <div>Order: <strong>#{order.orderNumber}</strong></div>
            <div>Recipient: <strong>{order.patientDetails?.patientName || order.customerId?.name}</strong></div>
            <div>Address: {order.deliveryAddress?.city} - {order.deliveryAddress?.pincode}</div>
            <div className="mt-1 font-semibold text-indigo-700">
              Payment: {order.paymentMethod} (₹{order.grandTotal?.toLocaleString()})
            </div>
          </div>

          {bookingError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
              {bookingError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Weight (kg) *</label>
              <Input
                type="number"
                step="0.05"
                min="0.05"
                max="50"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Pieces Count *</label>
              <Input
                type="number"
                min="1"
                max="20"
                value={pieces}
                onChange={(e) => setPieces(e.target.value)}
              />
            </div>
          </div>

          <div className="text-xs">
            <label className="block font-bold text-slate-700 mb-1">Package Dimensions (cm)</label>
            <div className="grid grid-cols-3 gap-2">
              <Input
                placeholder="L"
                value={lengthCm}
                onChange={(e) => setLengthCm(e.target.value)}
              />
              <Input
                placeholder="W"
                value={widthCm}
                onChange={(e) => setWidthCm(e.target.value)}
              />
              <Input
                placeholder="H"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setIsBookModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              icon={Send}
              onClick={() => bookShipmentMutation.mutate()}
              isLoading={bookShipmentMutation.isPending}
            >
              Confirm & Book AWB
            </Button>
          </div>
        </div>
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Cancel TPC Consignment"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600">
            Are you sure you want to cancel consignment note{' '}
            <strong className="font-mono text-slate-900">{shipment?.awbNumber}</strong>?
            This will void the booking in TPC web services.
          </p>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Cancellation Reason *</label>
            <Input
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Customer cancelled order / Address updated"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setIsCancelModalOpen(false)}>
              Back
            </Button>
            <Button
              variant="danger"
              onClick={() => cancelShipmentMutation.mutate()}
              isLoading={cancelShipmentMutation.isPending}
            >
              Confirm Cancellation
            </Button>
          </div>
        </div>
      </Modal>

      {/* Printable / View Label Modal */}
      <TPCLabelModal
        isOpen={isLabelModalOpen}
        onClose={() => setIsLabelModalOpen(false)}
        labelData={labelData}
        awbNumber={shipment?.awbNumber}
      />
    </Card>
  );
}

export default TPCShippingCard;
