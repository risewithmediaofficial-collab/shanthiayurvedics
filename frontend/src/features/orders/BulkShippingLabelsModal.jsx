import React, { useRef } from 'react';
import { Printer, Download } from 'lucide-react';
import { Modal } from '../../components/common/Modal.jsx';
import { Button } from '../../components/common/Button.jsx';

export function BulkShippingLabelsModal({ isOpen, onClose, orders = [] }) {
  const printContainerRef = useRef(null);

  if (!isOpen || !orders || orders.length === 0) return null;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const labelsHtml = orders
      .map((order) => {
        const pat = order.patientDetails || {};
        const addr = order.deliveryAddress || {};
        const customerName = pat.patientName || order.customerId?.name || 'Valued Customer';
        const mobile = pat.mobile || order.customerId?.mobile || addr.phone || '—';
        const altMobile = pat.alternateMobile || '';
        const isCOD = (order.paymentMethod || 'COD') === 'COD';
        const tracking = order.trackingNumber || `SP${order.orderNumber.replace(/[^0-9]/g, '').slice(-9)}IN`;
        const items = order.items?.map((i) => `${i.quantity}x ${i.productName}`).join(', ') || 'Ayurvedic Medicine';

        return `
        <div class="label-box">
          <div class="header">
            <div class="logo">🌿 SHANTHI AYURVEDAS</div>
            <div class="type-badge ${isCOD ? 'cod' : 'prepaid'}">${isCOD ? 'C.O.D.' : 'PREPAID'}</div>
          </div>

          <div class="barcode-area">
            <div class="barcode-lines">||||| | |||| ||| |||||| | ||||| || ||||||| |||</div>
            <div class="awb font-mono">${tracking}</div>
            <div class="ord-ref">Order: #${order.orderNumber}</div>
          </div>

          <div class="address-section">
            <div class="to-title">DELIVER TO:</div>
            <div class="cust-name">${customerName}</div>
            <div class="addr-lines">
              ${addr.street || ''}<br>
              ${addr.landmark ? 'Landmark: ' + addr.landmark + '<br>' : ''}
              ${addr.city || 'Hosur'}, ${addr.district || 'Krishnagiri'}<br>
              ${addr.state || 'Tamil Nadu'} — <strong>${addr.pincode || '635109'}</strong>
            </div>
            <div class="phone">📞 Tel: ${mobile} ${altMobile ? '/ ' + altMobile : ''}</div>
          </div>

          <div class="items-summary">
            <strong>Contents:</strong> ${items}
          </div>

          <div class="footer-grid">
            <div class="cod-box">
              <div class="cod-label">COLLECT CASH:</div>
              <div class="cod-val">${isCOD ? '₹' + (order.grandTotal?.toLocaleString() || '0') : '₹0 (PAID)'}</div>
            </div>
            <div class="return-box">
              <strong>Return If Undelivered:</strong><br>
              Shanthi Ayurvedas Hosur<br>
              Main Branch, Hosur, Tamil Nadu - 635109<br>
              Helpline: +91 9629985345
            </div>
          </div>
        </div>
      `;
      })
      .join('');

    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Shipping Labels (${orders.length}) — Shanthi Ayurvedas</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #fff; }
          .label-box {
            width: 4in;
            height: 6in;
            border: 2px solid #000;
            padding: 14px;
            margin: 0 auto 20px;
            page-break-after: always;
            position: relative;
            background: #fff;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 8px; }
          .logo { font-size: 15px; font-weight: 900; letter-spacing: 0.5px; }
          .type-badge { font-size: 14px; font-weight: 900; padding: 3px 8px; border: 2px solid #000; }
          .type-badge.cod { background: #000; color: #fff; }
          .type-badge.prepaid { background: #fff; color: #000; }
          .barcode-area { text-align: center; padding: 10px 0 6px; border-bottom: 1px dashed #666; }
          .barcode-lines { font-family: monospace; font-size: 20px; letter-spacing: 2px; }
          .awb { font-size: 13px; font-weight: 800; letter-spacing: 1px; margin-top: 2px; }
          .ord-ref { font-size: 10px; color: #555; }
          .address-section { padding: 8px 0; border-bottom: 1px solid #000; flex: 1; }
          .to-title { font-size: 9px; font-weight: 800; color: #555; letter-spacing: 1px; }
          .cust-name { font-size: 16px; font-weight: 900; margin: 2px 0 4px; }
          .addr-lines { font-size: 12px; line-height: 1.35; }
          .phone { font-size: 13px; font-weight: 800; margin-top: 6px; }
          .items-summary { font-size: 10px; color: #444; padding: 6px 0; border-bottom: 1px dashed #888; }
          .footer-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding-top: 8px; align-items: center; }
          .cod-box { border: 2px solid #000; padding: 6px; text-align: center; }
          .cod-label { font-size: 9px; font-weight: 900; }
          .cod-val { font-size: 18px; font-weight: 900; }
          .return-box { font-size: 8.5px; line-height: 1.25; color: #333; }
          @media print {
            body { padding: 0; }
            .label-box { margin: 0; border: none; }
          }
        </style>
      </head>
      <body>
        ${labelsHtml}
      </body>
      </html>
    `;

    printWindow.document.write(fullHtml);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Print Shipping Labels (${orders.length})`}
      subtitle="4x6 Thermal printer ready shipping labels with India Post barcodes & COD blocks"
      maxWidth="max-w-md"
    >
      <div className="space-y-4 text-xs">
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <div className="flex justify-between font-bold text-slate-900">
            <span>Selected Orders:</span>
            <span>{orders.length}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Total COD Collection:</span>
            <span className="font-bold text-emerald-700">
              ₹
              {orders
                .reduce((s, o) => s + (o.paymentMethod === 'COD' ? o.grandTotal || 0 : 0), 0)
                .toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Label Dimensions:</span>
            <span>4 × 6 inches (Standard Logistics Thermal)</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={Printer}
            onClick={handlePrint}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
          >
            Print {orders.length} Labels Now
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default BulkShippingLabelsModal;
