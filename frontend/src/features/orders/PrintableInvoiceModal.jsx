import React from 'react';
import { Printer, X, Download } from 'lucide-react';
import { Modal } from '../../components/common/Modal.jsx';
import { Button } from '../../components/common/Button.jsx';

export function PrintableInvoiceModal({ isOpen, onClose, order }) {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const patientName = order.patientDetails?.patientName || order.customerId?.name || 'Valued Patient';
  const mobile = order.patientDetails?.mobile || order.customerId?.mobile || '—';
  const addr = order.deliveryAddress || {};

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Tax Invoice — ${order.orderNumber}`} maxWidth="max-w-2xl">
      <div className="space-y-6 text-slate-800 p-2 font-sans">
        {/* Printable Area */}
        <div id="printable-tax-invoice" className="border border-slate-300 rounded-xl p-6 bg-white space-y-4 print:border-none print:p-0">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🌿</span>
                <h1 className="text-lg font-black text-slate-900 tracking-tight">SHANTHI AYURVEDAS</h1>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Authentic Herbal Wellness & Telemedicine</p>
              <p className="text-[11px] text-slate-500">Hosur Main Clinic, Krishnagiri, Tamil Nadu - 635109</p>
              <p className="text-[11px] text-slate-500 font-mono">GSTIN: 33AAAAA0000A1Z5 | Biller ID: 1000058077</p>
            </div>
            <div className="text-right">
              <div className="text-sm font-black text-slate-900 uppercase font-mono">TAX INVOICE</div>
              <div className="text-xs font-mono font-bold text-slate-700 mt-0.5">{order.orderNumber}</div>
              <div className="text-[11px] text-slate-500 mt-1">Date: {new Date(order.createdAt).toLocaleDateString()}</div>
              <div className="text-[11px] font-semibold text-emerald-800 uppercase mt-0.5">Mode: {order.paymentMethod}</div>
            </div>
          </div>

          {/* Patient Details & Delivery */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <div className="font-bold text-slate-900 uppercase text-[10px] tracking-wider mb-1">Patient Details (Billed To):</div>
              <div className="font-semibold text-slate-800">{patientName}</div>
              {order.patientDetails?.fatherName && (
                <div className="text-slate-600">S/O, D/O: {order.patientDetails.fatherName}</div>
              )}
              <div className="text-slate-600 font-mono">📱 {mobile}</div>
            </div>
            <div>
              <div className="font-bold text-slate-900 uppercase text-[10px] tracking-wider mb-1">Delivery Destination:</div>
              <div className="text-slate-700">
                {addr.street}, {addr.landmark ? addr.landmark + ', ' : ''}
                {addr.village ? addr.village + ', ' : ''}
                {addr.taluk ? addr.taluk + ', ' : ''}
                {addr.district || addr.city}, {addr.state} - {addr.pincode}
              </div>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 font-bold border-y border-slate-200">
              <tr>
                <th className="py-2 px-2">#</th>
                <th className="py-2 px-2">Herbal Formulation</th>
                <th className="py-2 px-2">Batch</th>
                <th className="py-2 px-2 text-right">Qty</th>
                <th className="py-2 px-2 text-right">Rate</th>
                <th className="py-2 px-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(order.items || []).map((item, idx) => (
                <tr key={idx}>
                  <td className="py-2 px-2 text-slate-500">{idx + 1}</td>
                  <td className="py-2 px-2 font-semibold text-slate-900">{item.productName}</td>
                  <td className="py-2 px-2 font-mono text-[11px] text-slate-600">{item.sku}</td>
                  <td className="py-2 px-2 text-right font-bold">{item.quantity}</td>
                  <td className="py-2 px-2 text-right font-mono">₹{item.unitPrice}</td>
                  <td className="py-2 px-2 text-right font-mono font-bold">₹{item.total?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Calculations */}
          <div className="border-t border-slate-200 pt-3 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal (Prescription Formulations):</span>
              <span className="font-mono">₹{order.subtotal?.toLocaleString()}</span>
            </div>
            {order.discountTotal > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount / Offer Concession:</span>
                <span className="font-mono">-₹{order.discountTotal?.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Shipping & Tamper-Proof Packaging:</span>
              <span className="font-mono">₹{order.shippingCharge || 0}</span>
            </div>
            <div className="flex justify-between text-sm font-black text-slate-900 border-t border-slate-300 pt-2">
              <span>Total Amount Payable:</span>
              <span className="font-mono text-emerald-800">₹{order.grandTotal?.toLocaleString()}</span>
            </div>
          </div>

          <div className="pt-2 text-[10px] text-slate-400 text-center border-t border-slate-100">
            This is a computer-generated medical invoice for Dr Shanthi Ayurvedic consultation & authentic formulations.
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" icon={Printer} onClick={handlePrint}>
            Print Invoice
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default PrintableInvoiceModal;
