import React, { useEffect } from 'react';
import { Printer } from 'lucide-react';
import { Modal } from '../../components/common/Modal.jsx';
import { Button } from '../../components/common/Button.jsx';

export function PrintableShippingLabelModal({ isOpen, onClose, order }) {
  useEffect(() => {
    const clearPrintMode = () => document.body.classList.remove('printing-shipping-label');
    window.addEventListener('afterprint', clearPrintMode);
    return () => {
      window.removeEventListener('afterprint', clearPrintMode);
      clearPrintMode();
    };
  }, []);

  if (!order) return null;

  const handlePrint = () => {
    document.body.classList.add('printing-shipping-label');
    window.print();
  };

  const patientName = order.patientDetails?.patientName || order.customerId?.name || 'Valued Patient';
  const mobile = order.patientDetails?.mobile || order.customerId?.mobile || '—';
  const addr = order.deliveryAddress || {};
  const awbNumber = `EM${Date.now().toString().slice(-9)}IN`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Shipping Label (4x6) — ${order.orderNumber}`} maxWidth="max-w-md">
      <div className="space-y-4 text-slate-900 font-sans p-1">
        {/* Thermal 4x6 Label Format */}
        <div id="printable-shipping-label" className="border-2 border-slate-900 rounded-lg p-4 bg-white space-y-3 print:border-none print:p-0">
          {/* Top Bar with Speed Post */}
          <div className="flex justify-between items-center border-b-2 border-slate-900 pb-2">
            <div>
              <div className="text-xs font-black tracking-wider uppercase">INDIA POST / SPEED POST</div>
              <div className="text-[10px] text-slate-600 font-mono">Biller ID: 1000058077</div>
            </div>
            <div className="text-right">
              <span className="px-2 py-0.5 bg-slate-900 text-white font-black text-xs uppercase rounded">
                {order.paymentMethod === 'COD' ? 'C.O.D' : 'PREPAID'}
              </span>
            </div>
          </div>

          {/* Barcode Mock */}
          <div className="text-center py-2 border-b border-dashed border-slate-400">
            <div className="font-mono text-2xl tracking-[0.3em] font-black">{awbNumber}</div>
            <div className="text-[10px] font-mono text-slate-500 mt-0.5">Order Ref: {order.orderNumber}</div>
          </div>

          {/* COD Collect Box */}
          {order.paymentMethod === 'COD' && (
            <div className="p-2.5 bg-slate-100 border-2 border-slate-900 rounded text-center">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-700">COLLECT CASH ON DELIVERY</div>
              <div className="text-xl font-black text-slate-900 font-mono">₹{order.grandTotal?.toLocaleString()}</div>
            </div>
          )}

          {/* Ship To Destination */}
          <div className="text-xs space-y-1 border-b border-slate-900 pb-2">
            <div className="font-bold uppercase text-[10px] text-slate-500 tracking-wider">DELIVER TO:</div>
            <div className="font-black text-slate-900 text-sm">{patientName}</div>
            {order.patientDetails?.fatherName && (
              <div className="text-[11px] text-slate-700">C/O {order.patientDetails.fatherName}</div>
            )}
            <div className="text-slate-800 text-[11px]">
              {addr.street}, {addr.landmark ? addr.landmark + ', ' : ''}
              {addr.village ? addr.village + ', ' : ''}
              {addr.district || addr.city}, {addr.state}
            </div>
            <div className="font-mono font-black text-sm text-slate-900 pt-0.5">
              PINCODE: {addr.pincode}
            </div>
            <div className="font-mono text-xs font-bold text-slate-900">
              PHONE: {mobile} {order.patientDetails?.alternateMobile ? `/ ${order.patientDetails.alternateMobile}` : ''}
            </div>
          </div>

          {/* Sender Return Address */}
          <div className="text-[10px] text-slate-600 space-y-0.5">
            <div className="font-bold text-slate-800 uppercase text-[9px] tracking-wider">IF UNDELIVERED, RETURN TO:</div>
            <div className="font-semibold text-slate-900">Shanthi Ayurvedas Central Pharmacy</div>
            <div>Hosur Main Branch, Krishnagiri Dist, Tamil Nadu - 635109</div>
            <div>Helpline: 8884747209 / 9629985345</div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" icon={Printer} onClick={handlePrint}>
            Print Shipping Label
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default PrintableShippingLabelModal;
