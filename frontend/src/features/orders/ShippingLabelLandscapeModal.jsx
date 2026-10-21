import React, { useState, useMemo, useRef } from 'react';
import { Printer, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { convertNumberToIndianWords } from '../../utils/numberToWords.js';

export function ShippingLabelLandscapeModal({
  isOpen,
  onClose,
  orders = [],
  title = 'Shipping Labels'
}) {
  // Fixed standard layout: 3 Labels per A4 Sheet (Portrait)
  const [currentPage, setCurrentPage] = useState(0);
  const [brandStyle, setBrandStyle] = useState('LOGO'); // Default: LOGO (Shanthi Logo) | SHANTHI (Shanthi Text)
  const iframeRef = useRef(null);

  const safeOrders = useMemo(() => {
    if (!orders) return [];
    return Array.isArray(orders) ? orders.filter(Boolean) : [orders];
  }, [orders]);

  const labelsPerSheet = 3;

  // Group orders into sheets of 3 labels each on standard A4 portrait sheet
  const sheets = useMemo(() => {
    if (safeOrders.length === 0) return [];
    const count = labelsPerSheet;
    const result = [];
    for (let i = 0; i < safeOrders.length; i += count) {
      result.push(safeOrders.slice(i, i + count));
    }
    return result;
  }, [safeOrders]);

  const totalSheets = sheets.length || 1;
  const currentSheetIndex = Math.min(currentPage, totalSheets - 1);
  const currentOrdersOnSheet = sheets[currentSheetIndex] || [];

  if (!isOpen || safeOrders.length === 0) return null;

  const printDateFormatted = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).replace(/ /g, '-');

  // Format order helper
  const getOrderData = (order) => {
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
    const advanceAmount = Number(order.advanceAmount || 0);
    const advanceUtr = order.advanceUtr || '';
    const payableAmount = Math.round(Number(
      isCOD
        ? (order.codAmount !== undefined && order.codAmount !== null && order.codAmount !== '' ? order.codAmount : Math.max(0, (order.grandTotal || 0) - advanceAmount))
        : order.grandTotal
    ) || 0);
    const amountWords = convertNumberToIndianWords(payableAmount);

    const speedPostText = isCOD
      ? `SPEED POST : Rs ${payableAmount} | ${amountWords} RUPEES ONLY`
      : `SPEED POST : PREPAID (Rs ${payableAmount}) | ${amountWords} RUPEES ONLY`;

    const tracking = order.trackingNumber || order.awbNumber || `EM${order.orderNumber?.replace(/[^0-9]/g, '').slice(-9) || Date.now().toString().slice(-9)}IN`;
    const billerId = order.branchId?.billerId || '1000058077';
    const isTPC = (order.courierName || '').toLowerCase().includes('professional');
    const bookingLocation = 'HOSUR BPC POST - 635110';
    const carrierSubheaderText = isTPC
      ? `TPC EXPRESS LOGISTICS NETWORK · BILLER ID : ${billerId} (BOOKED AT ${bookingLocation})`
      : `BILLER ID : ${billerId} (BOOKED AT ${bookingLocation})`;

    const totalPieces = order.items?.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0) || 1;
    const orderWeight = order.weight || order.items?.reduce((sum, item) => sum + (Number(item.weight || item.productId?.weight || 0) * (Number(item.quantity) || 1)), 0) || 0;
    const weightText = orderWeight >= 1000 ? `${(orderWeight / 1000).toFixed(2)} KG` : `${orderWeight || 250} G`;

    const telecallerName = (
      order.telecallerName ||
      order.telecallerId?.name ||
      order.createdBy?.name ||
      'CRM OWNER'
    ).toUpperCase();

    const rawTelecallerMobile =
      order.telecallerPhone ||
      order.telecallerMobile ||
      order.telecallerId?.phone ||
      order.telecallerId?.mobile ||
      order.createdBy?.phone ||
      order.createdBy?.mobile ||
      '';

    const telecallerMobile = rawTelecallerMobile ? rawTelecallerMobile.replace(/[^0-9]/g, '').slice(-10) : '9629985345';

    const products = (order.items && order.items.length > 0)
      ? order.items.map((it) => ({
          name: (it.productName || it.productId?.name || 'AYURVEDIC MEDICINE').toUpperCase(),
          qty: it.quantity || 1
        }))
      : [{ name: 'AYURVEDIC MEDICINE', qty: 1 }];

    return {
      order,
      customerName,
      mobile,
      altMobile,
      fatherName,
      formattedAddress,
      isCOD,
      payableAmount,
      speedPostText,
      tracking,
      carrierSubheaderText,
      totalPieces,
      weightText,
      telecallerName,
      telecallerMobile,
      advanceAmount,
      advanceUtr,
      products
    };
  };

  // Generate printable standalone HTML (A4 portrait with 3 labels stacked vertically)
  const generatePrintHtml = () => {
    const renderedSheets = sheets.map((sheetOrders, sIdx) => {
      const sheetNum = sIdx + 1;
      const labelsHtml = sheetOrders.map((ord, lIdx) => {
        const overallLabelNum = (sIdx * labelsPerSheet) + lIdx + 1;
        const d = getOrderData(ord);

        const brandHeaderHtml = brandStyle === 'SHANTHI'
          ? `<div style="font-size: 13px; font-weight: 900; letter-spacing: 0.5px; color: #fff; text-transform: uppercase;">SHANTHI AYURVEDAS</div>`
          : `<div style="background: #ffffff; border-radius: 3px; padding: 1.5px 6px; display: inline-flex; align-items: center; justify-content: center;"><img src="/shanthi_logo.png" style="height: 20px; width: auto; object-fit: contain;" /></div>`;

        // Compact product rows
        const visibleProducts = d.products.slice(0, 2);
        const remainingCount = d.products.length - visibleProducts.length;

        const productRowsHtml = visibleProducts.map((prod, idx) => `
          <tr style="border-bottom: ${(idx !== visibleProducts.length - 1 || remainingCount > 0) ? '1px solid #000' : 'none'};">
            <td style="padding: 1.5px 4px; border-right: 1px solid #000; width: 34%; background: #f9fafb; font-weight: 800; font-size: 7.5px;">PRODUCT</td>
            <td style="padding: 1.5px 4px; font-weight: 900; font-size: 8px; line-height: 1.15;">${prod.name} X${prod.qty}</td>
          </tr>
        `).join('') + (remainingCount > 0 ? `
          <tr>
            <td style="padding: 1px 4px; border-right: 1px solid #000; background: #f9fafb; font-weight: 800; font-size: 7px;">+ MORE</td>
            <td style="padding: 1px 4px; font-weight: 800; font-size: 7px; color: #4b5563;">+ ${remainingCount} MORE ITEM${remainingCount > 1 ? 'S' : ''}</td>
          </tr>
        ` : '');

        return `
          <div class="label-box">
            <!-- 1. Header Banner -->
            <div class="label-header">
              <div style="width: 40px;"></div>
              <div style="text-align: center;">
                ${brandHeaderHtml}
              </div>
              <div class="sheet-meta">
                <div style="font-weight: 800;">SHEET ${sheetNum} / ${totalSheets} | LABEL ${overallLabelNum}</div>
                <div>${printDateFormatted}</div>
              </div>
            </div>

            <!-- 2. SPEED POST row -->
            <div class="sub-row">
              ${d.speedPostText}
            </div>

            <!-- 3. BILLER ID row -->
            <div class="sub-row" style="font-size: 8px; padding: 1.5px 6px;">
              ${d.carrierSubheaderText}
            </div>

            <!-- 4. Kannada & English Help Banner -->
            <div class="help-banner">
              Help/ಸಹಾಯ (How to use & Problems/ಬಳಸುವ ವಿಧಾನ ಮತ್ತು ಸಮಸ್ಯೆ): ${d.telecallerName} - ${d.telecallerMobile}
            </div>

            <!-- 5. Two-Column Grid -->
            <div class="main-grid">
              <!-- Left Column: Recipient Details -->
              <div class="col-left">
                <div style="display: flex; flex-direction: column; height: 100%; justify-content: space-between;">
                  <div>
                    <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 4px; margin-bottom: 2px;">
                      <div class="cust-name">${d.customerName}</div>
                      <div class="cod-badge">
                        ${d.isCOD ? `COD ₹${d.payableAmount}` : `PREPAID`}
                      </div>
                    </div>
                    <div class="cust-phone">
                      <span style="font-size: 9.5px;">📞</span> ${d.mobile} ${d.altMobile ? `/ ${d.altMobile}` : ''}
                    </div>
                    ${d.fatherName ? `<div style="font-size: 8px; font-weight: 800; text-transform: uppercase; margin-bottom: 2px;">C/O ${d.fatherName}</div>` : ''}
                    <div class="cust-address">${d.formattedAddress}</div>
                  </div>
                </div>
              </div>

              <!-- Right Column: Tracking & Table -->
              <div class="col-right">
                <div class="article-box">
                  <div class="art-title">ARTICLE NUMBER</div>
                  <div class="art-code">${d.tracking}</div>
                </div>

                <table class="details-table">
                  <tbody>
                    <tr style="border-bottom: 1px solid #000;">
                      <td style="padding: 1.5px 4px; border-right: 1px solid #000; width: 34%; background: #f9fafb; font-weight: 800; font-size: 7.5px;">REFER BY</td>
                      <td style="padding: 1.5px 4px; font-weight: 900; font-size: 8px;">${d.telecallerName}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #000;">
                      <td style="padding: 1.5px 4px; border-right: 1px solid #000; background: #f9fafb; font-weight: 800; font-size: 7.5px;">WEIGHT</td>
                      <td style="padding: 1.5px 4px; font-weight: 900; font-size: 8px;">${d.weightText} ${d.totalPieces} PCS</td>
                    </tr>
                    ${d.advanceAmount > 0 ? `
                      <tr style="border-bottom: 1px solid #000; background: #f0fdf4;">
                        <td style="padding: 1.5px 4px; border-right: 1px solid #000; font-weight: 800; font-size: 7.5px; color: #166534;">ADVANCE</td>
                        <td style="padding: 1.5px 4px; font-weight: 900; font-size: 8px; color: #166534;">₹${d.advanceAmount} ${d.advanceUtr ? `· UTR: ${d.advanceUtr}` : ''}</td>
                      </tr>
                    ` : ''}
                    ${productRowsHtml}
                  </tbody>
                </table>
              </div>
            </div>

            <!-- 6. Sender Details -->
            <div class="footer-sender">
              <div>FROM : SHANTHI AYURVEDAS, SHANTHI AYURVEDAS NO15, JAYPEE GATEWAY, ANTHIVADI, HOSUR - 635110</div>
              <div>MOBILE : 8884747209 / 8884113629</div>
            </div>

            <!-- 7. Emergency Medicine Banner -->
            <div class="emergency-banner">
              EMERGENCY MEDICINE - HANDLE WITH CARE AND DELIVERY IMMEDIATELY
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="sheet-page">
          <div class="labels-grid-3">
            ${labelsHtml}
          </div>
        </div>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Shipping Labels (${safeOrders.length}) — Shanthi Ayurvedas</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          @page {
            size: A4 portrait;
            margin: 6mm 7mm;
          }
          html, body {
            background: #fff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #000;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .sheet-page {
            page-break-after: always;
            break-after: page;
            box-sizing: border-box;
            overflow: hidden;
            margin: 0 auto;
            width: 196mm;
            height: 284mm;
            max-height: 284mm;
          }
          .sheet-page:last-child {
            page-break-after: avoid;
            break-after: avoid;
          }

          /* 3 Labels Stacked Vertically on A4 Portrait */
          .labels-grid-3 {
            display: flex;
            flex-direction: column;
            gap: 3.5mm;
            align-items: center;
            width: 100%;
          }
          .label-box {
            width: 196mm;
            height: 90mm;
            max-height: 90mm;
            border: 1.5px solid #000;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            background: #fff;
            overflow: hidden;
            color: #000;
            line-height: 1.15;
          }
          .label-header {
            background-color: #362115 !important;
            color: #fff !important;
            padding: 2.5px 6px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .sheet-meta {
            text-align: right;
            font-family: monospace;
            font-size: 7.5px;
            line-height: 1.15;
            color: #f3f4f6;
          }
          .sub-row {
            border-bottom: 1px solid #000;
            padding: 2px 6px;
            font-size: 8.5px;
            font-weight: 800;
            text-transform: uppercase;
            line-height: 1.15;
            background: #fff;
          }
          .help-banner {
            background-color: #166534 !important;
            color: #ffffff !important;
            text-align: center;
            padding: 2px 5px;
            font-size: 8.5px;
            font-weight: 800;
            border-bottom: 1px solid #000;
            letter-spacing: 0.1px;
            line-height: 1.15;
          }
          .main-grid {
            display: grid;
            grid-template-columns: 1.18fr 0.82fr;
            border-bottom: 1px solid #000;
            flex: 1;
            min-height: 0;
            overflow: hidden;
          }
          .col-left {
            border-right: 1px solid #000;
            padding: 3px 6px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .cust-name {
            font-size: 11px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.2px;
            line-height: 1.1;
          }
          .cod-badge {
            border: 1.2px solid #dc2626;
            color: #dc2626;
            font-weight: 900;
            font-size: 9.5px;
            padding: 0.5px 4px;
            border-radius: 2px;
            white-space: nowrap;
          }
          .cust-phone {
            font-size: 9.5px;
            font-weight: 900;
            color: #000;
            margin: 1.5px 0;
            display: flex;
            align-items: center;
            gap: 2px;
          }
          .cust-address {
            font-size: 8px;
            font-weight: 800;
            text-transform: uppercase;
            line-height: 1.2;
            color: #111;
          }
          .col-right {
            padding: 2.5px 5px;
            display: flex;
            flex-direction: column;
            gap: 2.5px;
            justify-content: flex-start;
          }
          .article-box {
            border: 1px dashed #737373;
            padding: 2px 3px;
            text-align: center;
            background: #fafafa;
          }
          .art-title {
            font-size: 7px;
            font-weight: 800;
            text-transform: uppercase;
            color: #525252;
          }
          .art-code {
            font-family: monospace;
            font-size: 10px;
            font-weight: 900;
            letter-spacing: 0.8px;
            margin-top: 0.5px;
          }
          .details-table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #000;
            font-size: 7.5px;
            font-weight: 800;
            text-transform: uppercase;
          }
          .footer-sender {
            padding: 2px 6px;
            font-size: 7.5px;
            font-weight: 800;
            text-transform: uppercase;
            line-height: 1.15;
            background: #fff;
          }
          .emergency-banner {
            background-color: #dc2626 !important;
            color: #ffffff !important;
            text-align: center;
            padding: 1.5px 4px;
            font-size: 7px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.4px;
          }
        </style>
      </head>
      <body>
        ${renderedSheets}
      </body>
      </html>
    `;
  };

  const handlePrint = () => {
    const fullHtml = generatePrintHtml();
    const printWindow = window.open('', '_blank', 'width=1100,height=850');

    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(fullHtml);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 400);
    } else if (iframeRef.current) {
      // Fallback if popup blocker intercepted window.open
      const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow.document;
      doc.open();
      doc.write(fullHtml);
      doc.close();
      setTimeout(() => {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
      }, 500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[96vh]">
        {/* Top Purple Toolbar */}
        <div className="bg-[#4a154b] text-white px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-md border-b border-purple-800">
          {/* Sheet counter info */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs sm:text-sm tracking-wide text-purple-100">
              Sheet {currentSheetIndex + 1} of {totalSheets} ({safeOrders.length} {safeOrders.length === 1 ? 'label' : 'labels'})
            </span>
          </div>

          {/* Controls: Layout Indicator & Shanthi Brand Toggle & Navigation */}
          <div className="flex items-center flex-wrap gap-2 sm:gap-3 text-xs">
            {/* Per Page: Fixed 3 Labels / A4 Sheet */}
            <div className="flex items-center gap-1.5">
              <span className="text-purple-200 font-medium">Per Page:</span>
              <select
                value="3"
                onChange={() => {}}
                className="bg-purple-950/80 text-white font-bold text-xs px-2.5 py-1 rounded border border-purple-400/40 focus:outline-none cursor-pointer"
              >
                <option value="3">3 Labels (A4 Sheet)</option>
              </select>
            </div>

            {/* Header Brand Selector (Default: Shanthi Logo) */}
            <div className="flex items-center gap-1.5 hidden md:flex">
              <span className="text-purple-200 font-medium">Header:</span>
              <select
                value={brandStyle}
                onChange={(e) => setBrandStyle(e.target.value)}
                className="bg-purple-950/80 text-white font-bold text-xs px-2 py-1 rounded border border-purple-400/40 focus:outline-none cursor-pointer"
              >
                <option value="LOGO">Shanthi Logo</option>
                <option value="SHANTHI">Shanthi Text</option>
              </select>
            </div>

            {/* Sheet Pagination */}
            <div className="flex items-center gap-1 bg-purple-950/60 p-0.5 rounded border border-purple-400/30">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                disabled={currentSheetIndex === 0}
                className="px-2 py-0.5 rounded text-xs font-semibold text-purple-200 hover:text-white disabled:opacity-30 disabled:hover:text-purple-200 transition-colors cursor-pointer flex items-center gap-0.5"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <span className="px-1.5 text-[11px] text-purple-300 font-mono">
                {currentSheetIndex + 1}/{totalSheets}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalSheets - 1, p + 1))}
                disabled={currentSheetIndex >= totalSheets - 1}
                className="px-2 py-0.5 rounded text-xs font-semibold text-purple-200 hover:text-white disabled:opacity-30 disabled:hover:text-purple-200 transition-colors cursor-pointer flex items-center gap-0.5"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Action Buttons: Green Print All & Close */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs sm:text-sm font-bold px-4 py-1.5 rounded-lg shadow-md flex items-center gap-1.5 cursor-pointer transition-all transform active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Print All</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-purple-200 hover:text-white hover:bg-purple-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Gray Preview Canvas Area */}
        <div className="flex-1 bg-slate-300 p-3 sm:p-6 overflow-y-auto flex items-center justify-center min-h-[460px]">
          {/* White A4 Sheet Container (Standard Portrait 210 x 297) */}
          <div
            className="bg-white rounded-sm shadow-2xl border border-slate-400 w-full max-w-[680px] p-3 sm:p-4 text-black select-none"
            style={{
              aspectRatio: '210 / 297',
              minHeight: '640px'
            }}
          >
            {/* 3 Labels Stacked Vertically */}
            <div className="flex flex-col gap-2.5 sm:gap-3 h-full justify-between">
              {currentOrdersOnSheet.map((ord, idx) => {
                const labelNumber = currentSheetIndex * labelsPerSheet + idx + 1;
                const d = getOrderData(ord);
                const visibleProducts = d.products.slice(0, 2);
                const remainingCount = d.products.length - visibleProducts.length;

                return (
                  <div
                    key={ord._id || idx}
                    className="w-full border-[1.5px] border-black bg-white flex flex-col justify-between text-xs overflow-hidden shadow-xs flex-1 min-h-[160px]"
                  >
                    {/* 1. Header Banner */}
                    <div className="bg-[#362115] text-white px-2 py-1 flex items-center justify-between shrink-0">
                      <div className="w-8"></div>
                      <div className="text-center">
                        {brandStyle === 'SHANTHI' ? (
                          <div className="text-[11px] sm:text-xs font-black tracking-wider text-white uppercase">
                            SHANTHI AYURVEDAS
                          </div>
                        ) : (
                          <div className="bg-white rounded px-2 py-0.5 inline-flex items-center justify-center">
                            <img src="/shanthi_logo.png" alt="Shanthi Ayurvedas" className="h-4 sm:h-5 w-auto object-contain" />
                          </div>
                        )}
                      </div>
                      <div className="text-right text-[7px] sm:text-[7.5px] font-mono leading-tight text-stone-200">
                        <div className="font-bold">SHEET {currentSheetIndex + 1}/{totalSheets} | LABEL {labelNumber}</div>
                        <div>{printDateFormatted}</div>
                      </div>
                    </div>

                    {/* 2. SPEED POST row */}
                    <div className="border-b border-black px-2 py-0.5 font-extrabold text-[8px] sm:text-[9px] uppercase leading-tight bg-white shrink-0">
                      {d.speedPostText}
                    </div>

                    {/* 3. BILLER ID row */}
                    <div className="border-b border-black px-2 py-0.5 font-extrabold text-[7.5px] sm:text-[8px] uppercase leading-tight bg-white shrink-0">
                      {d.carrierSubheaderText}
                    </div>

                    {/* 4. Help Banner in Kannada & English */}
                    <div className="bg-[#166534] text-white text-center py-0.5 px-1 font-extrabold text-[8px] sm:text-[9px] border-b border-black leading-tight shrink-0">
                      Help/ಸಹಾಯ (How to use & Problems/ಬಳಸುವ ವಿಧಾನ ಮತ್ತು ಸಮಸ್ಯೆ): {d.telecallerName} - {d.telecallerMobile}
                    </div>

                    {/* 5. Middle Two-Column Grid */}
                    <div className="grid grid-cols-[1.18fr_0.82fr] divide-x divide-black border-b border-black flex-1 min-h-0 bg-white overflow-hidden">
                      {/* Left Column: Customer details */}
                      <div className="p-1.5 sm:p-2 flex flex-col justify-between overflow-hidden">
                        <div>
                          <div className="flex items-start justify-between gap-1 mb-0.5">
                            <div className="font-black text-[10.5px] sm:text-[11.5px] uppercase leading-tight text-black line-clamp-1">
                              {d.customerName}
                            </div>
                            <div className="border-[1.2px] border-red-600 text-red-600 font-black text-[8.5px] sm:text-[9.5px] px-1 py-0.2 rounded-xs shrink-0">
                              {d.isCOD ? `COD ₹${d.payableAmount}` : `PREPAID`}
                            </div>
                          </div>
                          <div className="font-black text-[9px] sm:text-[10px] text-black flex items-center gap-1 my-0.5">
                            <span className="text-purple-700">📞</span> {d.mobile} {d.altMobile ? `/ ${d.altMobile}` : ''}
                          </div>
                          {d.fatherName && (
                            <div className="font-extrabold text-[7.5px] sm:text-[8px] text-neutral-800 uppercase mb-0.5">
                              C/O {d.fatherName}
                            </div>
                          )}
                          <div className="font-bold text-[8px] sm:text-[8.5px] uppercase leading-tight text-neutral-900 line-clamp-3">
                            {d.formattedAddress}
                          </div>
                        </div>
                      </div>

                      {/* Right Column: Tracking Box & Table */}
                      <div className="p-1 sm:p-1.5 flex flex-col gap-1 overflow-hidden justify-start">
                        <div className="border border-dashed border-neutral-400 p-0.5 text-center bg-neutral-50 rounded-xs">
                          <div className="text-[6.5px] sm:text-[7px] font-bold text-neutral-500 uppercase tracking-wider">
                            ARTICLE NUMBER
                          </div>
                          <div className="font-mono text-[9.5px] sm:text-[11px] font-black tracking-wider text-black">
                            {d.tracking}
                          </div>
                        </div>

                        <table className="w-full border-collapse border border-black text-[7px] sm:text-[7.5px] font-extrabold uppercase">
                          <tbody>
                            <tr className="border-b border-black">
                              <td className="p-0.5 border-r border-black w-2/5 bg-gray-50 text-gray-700 font-bold">REFER BY</td>
                              <td className="p-0.5 font-black text-black">{d.telecallerName}</td>
                            </tr>
                            <tr className="border-b border-black">
                              <td className="p-0.5 border-r border-black bg-gray-50 text-gray-700 font-bold">WEIGHT</td>
                              <td className="p-0.5 font-black text-black">{d.weightText} {d.totalPieces} PCS</td>
                            </tr>
                            {d.advanceAmount > 0 && (
                              <tr className="border-b border-black bg-emerald-50/60">
                                <td className="p-0.5 border-r border-black font-bold text-emerald-800">ADVANCE</td>
                                <td className="p-0.5 font-black text-emerald-800">₹${d.advanceAmount} {d.advanceUtr ? `· ${d.advanceUtr}` : ''}</td>
                              </tr>
                            )}
                            {visibleProducts.map((prod, pIdx) => (
                              <tr key={pIdx} className={(pIdx !== visibleProducts.length - 1 || remainingCount > 0) ? 'border-b border-black' : ''}>
                                <td className="p-0.5 border-r border-black bg-gray-50 text-gray-700 font-bold">PRODUCT</td>
                                <td className="p-0.5 font-black text-black leading-tight">{prod.name} X{prod.qty}</td>
                              </tr>
                            ))}
                            {remainingCount > 0 && (
                              <tr>
                                <td className="p-0.5 border-r border-black bg-gray-50 text-gray-600 font-bold">+ MORE</td>
                                <td className="p-0.5 font-bold text-gray-600">+{remainingCount} MORE</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* 6. Sender Bottom Details */}
                    <div className="px-1.5 py-0.5 font-extrabold text-[7px] sm:text-[7.5px] uppercase leading-tight bg-white text-black shrink-0">
                      <div>FROM : SHANTHI AYURVEDAS, SHANTHI AYURVEDAS NO15, JAYPEE GATEWAY, ANTHIVADI, HOSUR - 635110</div>
                      <div>MOBILE : 8884747209 / 8884113629</div>
                    </div>

                    {/* 7. Bottom Emergency Medicine Banner */}
                    <div className="bg-[#dc2626] text-white py-0.5 px-1 text-center text-[7px] sm:text-[7.5px] font-black uppercase tracking-wider shrink-0">
                      EMERGENCY MEDICINE - HANDLE WITH CARE AND DELIVERY IMMEDIATELY
                    </div>
                  </div>
                );
              })}

              {/* Empty slot placeholders if fewer than 3 orders on this sheet */}
              {Array.from({ length: Math.max(0, 3 - currentOrdersOnSheet.length) }).map((_, emptyIdx) => {
                const slotNum = currentOrdersOnSheet.length + emptyIdx + 1;
                return (
                  <div
                    key={`empty-slot-${slotNum}`}
                    className="w-full flex-1 min-h-[140px] border-2 border-dashed border-slate-300 rounded bg-slate-50/60 flex flex-col items-center justify-center text-slate-400 text-xs font-semibold gap-1 select-none"
                  >
                    <span className="text-xl">🏷️</span>
                    <span>Empty Label Slot ({slotNum}/3)</span>
                    <span className="text-[10px] text-slate-400">Available for next label</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Hidden iframe fallback for print */}
        <iframe ref={iframeRef} title="print-frame" className="hidden" />
      </div>
    </div>
  );
}

export default ShippingLabelLandscapeModal;
