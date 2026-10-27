import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Printer,
  MessageSquare,
  CheckCircle2,
  Share2,
  AlertCircle,
  Loader2,
  Send
} from 'lucide-react';
import apiClient from '../../api/apiClient.js';
import { Modal } from '../../components/common/Modal.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Badge } from '../../components/common/Badge.jsx';

export function PrintableInvoiceModal({
  isOpen,
  onClose,
  order,
  autoPrint = false,
  onWhatsAppSent = null
}) {
  const queryClient = useQueryClient();
  const [sendWhatsAppOnPrint, setSendWhatsAppOnPrint] = useState(true);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [whatsAppFeedback, setWhatsAppFeedback] = useState(null);

  useEffect(() => {
    const clearPrintMode = () => document.body.classList.remove('printing-invoice');
    window.addEventListener('afterprint', clearPrintMode);
    return () => {
      window.removeEventListener('afterprint', clearPrintMode);
      clearPrintMode();
    };
  }, []);

  const handleSendWhatsAppTemplate = async (isSilent = false) => {
    if (!order?._id || isSendingWhatsApp) return false;
    setIsSendingWhatsApp(true);
    if (!isSilent) setWhatsAppFeedback(null);

    try {
      const res = await apiClient.post(`/orders/${order._id}/send-whatsapp`);
      const msg = res.data?.message || 'Order confirmed bill sent to customer WhatsApp via MSG91 template!';
      setWhatsAppFeedback({ type: 'success', message: msg });
      queryClient.invalidateQueries({ queryKey: ['counterOrders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      if (onWhatsAppSent) onWhatsAppSent(order._id);
      return true;
    } catch (err) {
      const errMsg = err.response?.data?.message || err.response?.data?.error || 'Failed to send WhatsApp confirmation template via MSG91';
      setWhatsAppFeedback({ type: 'error', message: errMsg });
      return false;
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  const handlePrint = async () => {
    document.body.classList.add('printing-invoice');
    window.print();

    // Send WhatsApp in existing template if opted in
    if (sendWhatsAppOnPrint && order?._id) {
      await handleSendWhatsAppTemplate(false);
    }
  };

  useEffect(() => {
    if (isOpen && autoPrint && order) {
      const timer = setTimeout(() => {
        handlePrint();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoPrint, order?._id]);

  if (!order) return null;

  const patientName = order.patientDetails?.patientName || order.customerId?.name || 'Valued Patient';
  const mobile = order.patientDetails?.mobile || order.customerId?.mobile || '—';
  const addr = order.deliveryAddress || {};

  const handleOpenWhatsAppWeb = () => {
    const rawMobile = mobile || '';
    const digits = rawMobile.replace(/\D/g, '');
    const intlPhone = digits.length === 10 ? `91${digits}` : digits;
    const itemsList = (order.items || []).map((it) => `${it.quantity}x ${it.productName}`).join(', ');
    const isCOD = (order.paymentMethod || 'COD') === 'COD';
    const advanceAmount = Number(order.advanceAmount || 0);
    const balanceAmount = isCOD ? (order.codAmount ?? Math.max(0, (order.grandTotal || 0) - advanceAmount)) : 0;

    const text = `*SHANTHI AYURVEDAS — OFFICIAL ORDER BILL* 🌿
--------------------------------------------
📋 *Invoice No:* ${order.orderNumber}
📅 *Date:* ${new Date(order.createdAt).toLocaleDateString('en-GB')}
👤 *Patient:* ${patientName}
📱 *Mobile:* ${mobile}
📍 *Counter Desk:* Hosur Main Clinic Walk-In

💊 *Prescribed Formulations:*
${itemsList || 'Ayurvedic Formulations'}

💰 *Grand Total:* ₹${order.grandTotal?.toLocaleString()}
💳 *Payment Mode:* ${order.paymentMethod || 'CASH'} (${order.paymentStatus || 'PAID'})
${advanceAmount > 0 ? `💵 *Advance Paid:* ₹${advanceAmount.toLocaleString()}\n` : ''}${balanceAmount > 0 ? `📦 *Balance to Pay:* ₹${balanceAmount.toLocaleString()}\n` : ''}
Wishing you complete holistic wellness and vibrant health!
Dr. Shanthi Ayurvedas Medical Team`;

    const url = `https://api.whatsapp.com/send?phone=${intlPhone}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Tax Invoice Receipt — ${order.orderNumber}`}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4 text-slate-800 p-1 font-sans">
        {/* WhatsApp Notification Banner */}
        {whatsAppFeedback && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 shadow-xs transition-all ${
              whatsAppFeedback.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {whatsAppFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{whatsAppFeedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setWhatsAppFeedback(null)}
              className="text-xs opacity-60 hover:opacity-100 cursor-pointer"
            >
              ×
            </button>
          </div>
        )}

        {/* Printable Area */}
        <div id="printable-tax-invoice" className="border border-slate-300 rounded-xl p-5 sm:p-6 bg-white space-y-4 print:border-none print:p-0">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-3 border-b border-slate-200 pb-4">
            <div className="flex items-start gap-3 sm:gap-4">
              <img
                src="/shanthi_logo.png"
                alt="Shanthi Ayurvedas"
                className="h-12 sm:h-14 w-auto max-w-[140px] sm:max-w-[170px] object-contain shrink-0"
              />
              <div className="pt-0.5">
                <p className="text-xs font-bold text-slate-800">Authentic Herbal Wellness & Clinic Telemedicine</p>
                <p className="text-[11px] text-slate-500">Hosur Main Clinic, Krishnagiri, Tamil Nadu - 635109</p>
                <p className="text-[11px] text-slate-500 font-mono">GSTIN: 33AAAAA0000A1Z5 | Biller ID: 1000058077</p>
              </div>
            </div>
            <div className="text-left sm:text-right w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
              <div className="text-sm font-black text-slate-900 uppercase font-mono">TAX INVOICE</div>
              <div className="text-xs font-mono font-bold text-slate-700 mt-0.5">{order.orderNumber}</div>
              <div className="text-[11px] text-slate-500 mt-1">Date: {new Date(order.createdAt).toLocaleDateString('en-GB')}</div>
              <div className="text-[11px] font-bold text-emerald-800 uppercase mt-0.5 flex items-center gap-1 sm:justify-end">
                <span>Mode: {order.paymentMethod || 'CASH'}</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-bold">
                  {order.paymentStatus || 'PAID'}
                </span>
              </div>
            </div>
          </div>

          {/* Patient Details & Delivery */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <div className="font-bold text-slate-900 uppercase text-[10px] tracking-wider mb-1">
                Walk-In Patient (Billed To):
              </div>
              <div className="font-semibold text-slate-800 text-sm">{patientName}</div>
              {order.patientDetails?.fatherName && (
                <div className="text-slate-600">S/O, D/O: {order.patientDetails.fatherName}</div>
              )}
              <div className="text-slate-700 font-mono font-bold mt-0.5">📱 {mobile}</div>
              {order.whatsappConfirmationSentAt && (
                <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-700 font-semibold font-mono">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>WhatsApp Bill Confirmed ({new Date(order.whatsappConfirmationSentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</span>
                </div>
              )}
            </div>
            <div>
              <div className="font-bold text-slate-900 uppercase text-[10px] tracking-wider mb-1">
                Billing & Counter Desk:
              </div>
              <div className="text-slate-700">
                <span className="font-bold text-slate-900">Hosur Clinic — Direct Walk-In Desk</span>
                <div className="text-slate-500 text-[11px] mt-0.5">
                  Handed over in-person to patient • ₹0 Delivery
                </div>
                {order.notes && (
                  <div className="text-[11px] text-slate-600 mt-1 italic">
                    Note: {order.notes}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="crm-table-wrap w-full max-w-full overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[500px] text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold border-y border-slate-200">
                <tr>
                  <th className="py-2 px-2">#</th>
                  <th className="py-2 px-2">Herbal Formulation</th>
                  <th className="py-2 px-2">Batch / SKU</th>
                  <th className="py-2 px-2 text-right">Qty</th>
                  <th className="py-2 px-2 text-right">Rate</th>
                  <th className="py-2 px-2 text-right">Discount</th>
                  <th className="py-2 px-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(order.items || []).map((item, idx) => {
                  const hasDisc = (item.discount || 0) > 0 || (item.discountPercent || 0) > 0;
                  return (
                    <tr key={idx}>
                      <td className="py-2 px-2 text-slate-500">{idx + 1}</td>
                      <td className="py-2 px-2 font-semibold text-slate-900">{item.productName}</td>
                      <td className="py-2 px-2 font-mono text-[11px] text-slate-600">{item.sku || '—'}</td>
                      <td className="py-2 px-2 text-right font-bold">{item.quantity}</td>
                      <td className="py-2 px-2 text-right font-mono">₹{item.unitPrice}</td>
                      <td className="py-2 px-2 text-right font-mono text-emerald-700">
                        {hasDisc
                          ? item.discountPercent
                            ? `${item.discountPercent}% (-₹${item.discount * item.quantity})`
                            : `-₹${item.discount * item.quantity}`
                          : '—'}
                      </td>
                      <td className="py-2 px-2 text-right font-mono font-bold">₹{item.total?.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Calculations */}
          <div className="border-t border-slate-200 pt-3 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal (Prescription Formulations):</span>
              <span className="font-mono">₹{order.subtotal?.toLocaleString()}</span>
            </div>
            {order.discountTotal > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount / Concession:</span>
                <span className="font-mono">-₹{order.discountTotal?.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Shipping / Walk-In Delivery:</span>
              <span className="font-mono text-emerald-700 font-semibold">₹0 (Walk-In Direct Handover)</span>
            </div>
            <div className="flex justify-between text-base font-black text-slate-900 border-t-2 border-slate-300 pt-2">
              <span>Total Invoice Amount:</span>
              <span className="font-mono text-emerald-800 text-lg">₹{order.grandTotal?.toLocaleString()}</span>
            </div>
            {order.advanceAmount > 0 && (
              <>
                <div className="flex justify-between text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-1 rounded">
                  <span>Advance Amount Paid (Prepaid Online / UPI):</span>
                  <span className="font-mono">-₹{order.advanceAmount?.toLocaleString()}</span>
                </div>
                {order.advanceUtr && (
                  <div className="flex justify-between text-[11px] text-slate-500 px-2">
                    <span>Advance Payment UTR / Ref No:</span>
                    <span className="font-mono font-bold text-slate-800">{order.advanceUtr}</span>
                  </div>
                )}
                {order.paymentMethod === 'COD' && (
                  <div className="flex justify-between text-xs font-black text-amber-900 bg-amber-50 px-2 py-1.5 rounded border border-amber-200">
                    <span>Balance COD Collect at Doorstep:</span>
                    <span className="font-mono text-sm">
                      ₹{(order.codAmount ?? Math.max(0, order.grandTotal - order.advanceAmount))?.toLocaleString()}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="pt-2 text-[10px] text-slate-400 text-center border-t border-slate-100">
            This is an official computer-generated medical tax invoice from Shanthi Ayurvedas Hosur Clinic.
          </div>
        </div>

        {/* Action Controls & Options */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          {/* WhatsApp toggle option */}
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700 font-semibold">
            <input
              type="checkbox"
              checked={sendWhatsAppOnPrint}
              onChange={(e) => setSendWhatsAppOnPrint(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
            />
            <span className="flex items-center gap-1">
              <span>Send confirmed bill on WhatsApp when printing</span>
              <Badge variant="emerald" size="sm">Template</Badge>
            </span>
          </label>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              type="button"
              onClick={handleOpenWhatsAppWeb}
              className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer touch-manipulation min-h-[38px]"
              title="Share confirmed bill on WhatsApp Web directly"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>WhatsApp Web</span>
            </button>

            <Button
              variant="secondary"
              icon={isSendingWhatsApp ? Loader2 : MessageSquare}
              isLoading={isSendingWhatsApp}
              onClick={() => handleSendWhatsAppTemplate(false)}
              className="text-emerald-800 border-emerald-300 hover:bg-emerald-50 text-xs font-bold"
              title="Send WhatsApp confirmation in existing template via MSG91"
            >
              Send WhatsApp Bill
            </Button>

            <Button
              variant="secondary"
              onClick={onClose}
              className="text-xs"
            >
              Close
            </Button>

            <Button
              variant="primary"
              icon={Printer}
              onClick={handlePrint}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-sm"
            >
              Print Bill & Send WA
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default PrintableInvoiceModal;
