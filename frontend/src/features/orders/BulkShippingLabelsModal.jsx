import React, { useRef } from 'react';
import { Printer, Download } from 'lucide-react';
import { Modal } from '../../components/common/Modal.jsx';
import { Button } from '../../components/common/Button.jsx';
import { convertNumberToIndianWords } from '../../utils/numberToWords.js';

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
        const customerName = (pat.patientName || order.customerId?.name || 'Valued Patient').toUpperCase();
        const mobile = pat.mobile || order.customerId?.mobile || addr.phone || '—';
        const altMobile = pat.alternateMobile || addr.alternatePhone || '';
        const fatherName = pat.fatherName ? pat.fatherName.toUpperCase() : '';

        const addressParts = [
          addr.street,
          addr.landmark ? `LANDMARK: ${addr.landmark}` : null,
          addr.village,
          addr.taluk,
          addr.district || addr.city,
          addr.state ? `${addr.state} - ${addr.pincode || ''}` : addr.pincode
        ].filter(Boolean);
        const formattedAddress = addressParts.join(', ').toUpperCase();

        const isCOD = (order.paymentMethod || 'COD') === 'COD';
        const payableAmount = Math.round(Number(
          isCOD
            ? (order.codAmount !== undefined && order.codAmount !== null && order.codAmount !== '' ? order.codAmount : order.grandTotal)
            : order.grandTotal
        ) || 0);
        const amountWords = convertNumberToIndianWords(payableAmount);

        const speedPostText = isCOD
          ? `SPEED POST : Rs ${payableAmount} | ${amountWords} RUPEES ONLY`
          : `SPEED POST : PREPAID (Rs ${payableAmount}) | ${amountWords} RUPEES ONLY`;

        const tracking = order.trackingNumber || `EM${order.orderNumber?.replace(/[^0-9]/g, '').slice(-9) || Date.now().toString().slice(-9)}IN`;
        const billerId = order.branchId?.billerId || '1000058077';

        const totalPieces = order.items?.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0) || 1;
        const orderWeight = order.weight || order.items?.reduce((sum, item) => sum + (Number(item.weight || item.productId?.weight || 0) * (Number(item.quantity) || 1)), 0) || 0;
        const weightText = orderWeight >= 1000 ? `${(orderWeight / 1000).toFixed(2)} KG` : `${orderWeight || 250} G`;

        const telecallerName = (
          order.telecallerName ||
          order.telecallerId?.name ||
          'SHANTHI AYURVEDAS'
        ).toUpperCase();

        const telecallerMobile =
          order.telecallerPhone ||
          order.telecallerId?.phone ||
          order.telecallerId?.mobile ||
          '';

        const senderPhoneText = telecallerMobile
          ? `${telecallerMobile} / 8884747209 / 8884113629`
          : `8884747209 / 8884113629`;

        const productRows = (order.items && order.items.length > 0)
          ? order.items.map((it, idx) => `
              <tr style="border-bottom: ${idx !== order.items.length - 1 ? '1px solid #000' : 'none'};">
                <td style="padding: 4px 6px; border-right: 1px solid #000; width: 40%; background: #f9fafb;">PRODUCT</td>
                <td style="padding: 4px 6px; font-weight: 900;">${it.productName?.toUpperCase()} X${it.quantity}</td>
              </tr>
            `).join('')
          : `
              <tr>
                <td style="padding: 4px 6px; border-right: 1px solid #000; width: 40%; background: #f9fafb;">PRODUCT</td>
                <td style="padding: 4px 6px; font-weight: 900;">AYURVEDIC MEDICINE X1</td>
              </tr>
            `;

        return `
        <div class="label-box">
          <!-- 1. Header Banner -->
          <div class="header-banner" style="display: flex; align-items: center; justify-content: center; padding: 4px;">
            <div style="background: #fff; border-radius: 4px; padding: 2px 10px; display: inline-flex; align-items: center; justify-content: center;">
              <img src="/shanthi_logo.png" style="height: 24px; width: auto; object-fit: contain;" />
            </div>
          </div>

          <!-- 2. SPEED POST row -->
          <div class="sub-row">
            ${speedPostText}
          </div>

          <!-- 3. BILLER ID row -->
          <div class="sub-row">
            BILLER ID : ${billerId} (BOOKED AT HOSUR BPC POST - 635110)
          </div>

          <!-- 4. Two-Column Grid -->
          <div class="main-grid">
            <!-- Left Column: TO -->
            <div class="col-left">
              <div>
                <div class="to-label">TO</div>
                <div class="cust-name">${customerName}</div>
                ${fatherName ? `<div class="co-name">C/O ${fatherName}</div>` : ''}
                <div class="addr-text">${formattedAddress}</div>
              </div>
              <div class="cust-mobile">MOBILE : ${mobile} ${altMobile ? `/ ${altMobile}` : ''}</div>
            </div>

            <!-- Right Column: ARTICLE NUMBER & Table -->
            <div class="col-right">
              <div class="article-box">
                <div class="art-title">ARTICLE NUMBER</div>
                <div class="art-code">${tracking}</div>
              </div>

              <table class="details-table">
                <tbody>
                  <tr style="border-bottom: 1px solid #000;">
                    <td style="padding: 4px 6px; border-right: 1px solid #000; width: 40%; background: #f9fafb;">REFER BY</td>
                    <td style="padding: 4px 6px; font-weight: 900;">${telecallerName}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #000;">
                    <td style="padding: 4px 6px; border-right: 1px solid #000; background: #f9fafb;">WEIGHT</td>
                    <td style="padding: 4px 6px; font-weight: 900;">${weightText} ${totalPieces} PCS</td>
                  </tr>
                  ${productRows}
                </tbody>
              </table>
            </div>
          </div>

          <!-- 5. Bottom Sender Section -->
          <div class="footer-sender">
            <div>FROM : SHANTHI AYURVEDAS, SHANTHI AYURVEDAS NO15, JAYPEE GATEWAY, ANTHIVADI, HOSUR</div>
            <div>MOBILE : ${senderPhoneText}</div>
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
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f1f5f9; padding: 20px; }
          .label-box {
            width: 4in;
            min-height: 5.8in;
            border: 2px solid #000;
            margin: 0 auto 30px;
            page-break-after: always;
            background: #fff;
            display: flex;
            flex-direction: column;
            color: #000;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .header-banner {
            background-color: #15803d !important;
            color: #ffffff !important;
            text-align: center;
            padding: 8px 4px;
          }
          .header-banner h1 {
            font-size: 19px;
            font-weight: 900;
            letter-spacing: 1px;
            text-transform: uppercase;
            margin: 0;
            line-height: 1.1;
          }
          .sub-row {
            border-bottom: 1px solid #000;
            padding: 5px 8px;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            line-height: 1.25;
          }
          .main-grid {
            display: grid;
            grid-template-columns: 1.15fr 0.85fr;
            border-bottom: 1px solid #000;
            flex: 1;
          }
          .col-left {
            border-right: 1px solid #000;
            padding: 10px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .to-label { font-size: 10px; font-weight: 800; text-transform: uppercase; }
          .cust-name { font-size: 14px; font-weight: 900; text-transform: uppercase; margin: 2px 0 3px; line-height: 1.2; }
          .co-name { font-size: 10.5px; font-weight: 700; text-transform: uppercase; margin-bottom: 3px; }
          .addr-text { font-size: 10.5px; font-weight: 700; text-transform: uppercase; line-height: 1.35; }
          .cust-mobile { font-size: 12px; font-weight: 900; text-transform: uppercase; margin-top: 10px; }
          .col-right {
            padding: 8px;
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .article-box {
            border: 1px dashed #666;
            padding: 6px;
            text-align: center;
            background: #fafafa;
          }
          .art-title { font-size: 8.5px; font-weight: 800; text-transform: uppercase; color: #555; }
          .art-code { font-family: monospace; font-size: 14px; font-weight: 900; letter-spacing: 1.5px; margin-top: 2px; }
          .details-table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #000;
            font-size: 9.5px;
            font-weight: 800;
            text-transform: uppercase;
          }
          .footer-sender {
            padding: 6px 8px;
            font-size: 9.5px;
            font-weight: 800;
            text-transform: uppercase;
            line-height: 1.3;
            background: #fff;
          }
          @media print {
            body { padding: 0; background: #fff; }
            .label-box { margin: 0; border: 2px solid #000; page-break-after: always; }
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
      title={`Batch Shipping Labels (${orders.length} Selected)`}
      subtitle="4x6 Thermal printer ready shipping labels"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 flex items-center justify-between">
          <span>
            Ready to print <strong>{orders.length}</strong> thermal shipping labels with <strong>SHANTHI AYURVEDAS</strong> header, postal amounts in words, and telecaller contacts.
          </span>
          <Button variant="primary" icon={Printer} onClick={handlePrint} size="sm">
            Print All ({orders.length})
          </Button>
        </div>

        {/* Scrollable Preview of First 3 */}
        <div className="max-h-[420px] overflow-y-auto space-y-4 p-2 bg-slate-100 rounded-xl border border-slate-200">
          {orders.slice(0, 3).map((ord) => {
            const pName = (ord.patientDetails?.patientName || ord.customerId?.name || 'Valued Patient').toUpperCase();
            const pMob = ord.patientDetails?.mobile || ord.customerId?.mobile || ord.deliveryAddress?.phone || '—';
            const tcName = (ord.telecallerName || ord.telecallerId?.name || 'SHANTHI AYURVEDAS').toUpperCase();
            const tcMob = ord.telecallerPhone || ord.telecallerId?.phone || ord.telecallerId?.mobile || '';
            const isCOD = (ord.paymentMethod || 'COD') === 'COD';
            const payVal = Math.round(Number(
              isCOD
                ? (ord.codAmount !== undefined && ord.codAmount !== null && ord.codAmount !== '' ? ord.codAmount : ord.grandTotal)
                : ord.grandTotal
            ) || 0);

            return (
              <div key={ord._id} className="bg-white border-2 border-black max-w-md mx-auto text-xs shadow-sm">
                <div className="bg-[#15803d] text-white py-1.5 px-2 text-center flex items-center justify-center">
                  <div className="bg-white rounded px-3 py-0.5 inline-flex items-center justify-center">
                    <img
                      src="/shanthi_logo.png"
                      alt="Shanthi Ayurvedas"
                      className="h-6 w-auto object-contain shrink-0"
                    />
                  </div>
                </div>
                <div className="border-b border-black px-2 py-1 font-extrabold text-[10px] uppercase">
                  SPEED POST : Rs {payVal} | {convertNumberToIndianWords(payVal)} RUPEES ONLY
                </div>
                <div className="border-b border-black px-2 py-1 font-extrabold text-[10px] uppercase">
                  BILLER ID : 1000058077 (BOOKED AT HOSUR BPC POST - 635110)
                </div>
                <div className="grid grid-cols-2 divide-x divide-black p-2 text-[10px] font-bold">
                  <div>
                    <div className="text-[9px] text-slate-500">TO</div>
                    <div className="font-black text-xs">{pName}</div>
                    <div className="text-[9px] text-slate-700">{ord.deliveryAddress?.city}, {ord.deliveryAddress?.state} - {ord.deliveryAddress?.pincode}</div>
                    <div className="font-black mt-1">MOBILE : {pMob}</div>
                  </div>
                  <div className="pl-2">
                    <div>REFER BY: <strong>{tcName}</strong></div>
                    <div>ITEMS: {ord.items?.length || 1} product(s)</div>
                  </div>
                </div>
                <div className="border-t border-black p-1.5 font-bold text-[9px] uppercase">
                  <div>FROM : SHANTHI AYURVEDAS, NO15, JAYPEE GATEWAY, ANTHIVADI, HOSUR</div>
                  <div>MOBILE : {tcMob ? `${tcMob} / ` : ''}8884747209 / 8884113629</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" icon={Printer} onClick={handlePrint}>
            Open Thermal Print Window ({orders.length})
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default BulkShippingLabelsModal;
