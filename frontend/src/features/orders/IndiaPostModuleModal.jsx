import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Download,
  Printer,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Package,
  Truck,
  Building,
  Calendar
} from 'lucide-react';
import { Modal } from '../../components/common/Modal.jsx';
import { Button } from '../../components/common/Button.jsx';

export function IndiaPostModuleModal({ isOpen, onClose, orders = [] }) {
  const [selectedOnly, setSelectedOnly] = useState(false);

  if (!isOpen) return null;

  // Filter orders that are ready for dispatch (or packed)
  const dispatchableOrders = orders.filter(
    (o) => o.status === 'READY_FOR_DISPATCH' || o.status === 'PACKED' || o.status === 'DISPATCHED'
  );

  const targetOrders = dispatchableOrders.length > 0 ? dispatchableOrders : orders;
  const missingTrackingCount = targetOrders.filter((o) => !o.trackingNumber).length;

  // Export India Post Manifest
  const handleExportManifest = () => {
    const dateStamp = new Date().toISOString().slice(0, 10);
    const manifestRows = targetOrders.map((ord, idx) => {
      const pat = ord.patientDetails || {};
      const addr = ord.deliveryAddress || {};
      const isCOD = (ord.paymentMethod || 'COD') === 'COD';

      return {
        'SL NO': idx + 1,
        'ARTICLE NUMBER': ord.trackingNumber || `SP${ord.orderNumber.replace(/[^0-9]/g, '').slice(-9)}IN`,
        'ADDRESSEE NAME': pat.patientName || ord.customerId?.name || 'Customer',
        'ADDRESS': `${addr.street || ''} ${addr.landmark || ''}`.trim(),
        'CITY': addr.city || 'Hosur',
        'PINCODE': addr.pincode || '635109',
        'STATE': addr.state || 'Tamil Nadu',
        'MOBILE': pat.mobile || ord.customerId?.mobile || addr.phone || '',
        'WEIGHT (GMS)': 350,
        'COD AMOUNT': isCOD ? (ord.grandTotal || 0) : 0,
        'INSURANCE VALUE': isCOD ? (ord.grandTotal || 0) : 0,
        'REFERENCE NO': ord.orderNumber
      };
    });

    const ws = XLSX.utils.json_to_sheet(manifestRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'India_Post_Manifest');
    XLSX.writeFile(wb, `IndiaPost_Booking_Manifest_${dateStamp}.xlsx`);
  };

  // Print Pickup Manifest Summary
  const handlePrintManifest = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rowsHtml = targetOrders
      .map((ord, idx) => {
        const pat = ord.patientDetails || {};
        const addr = ord.deliveryAddress || {};
        const isCOD = (ord.paymentMethod || 'COD') === 'COD';
        const articleNo = ord.trackingNumber || `SP${ord.orderNumber.replace(/[^0-9]/g, '').slice(-9)}IN`;

        return `
        <tr>
          <td style="border: 1px solid #ccc; padding: 6px; text-align: center;">${idx + 1}</td>
          <td style="border: 1px solid #ccc; padding: 6px; font-family: monospace; font-weight: bold;">${articleNo}</td>
          <td style="border: 1px solid #ccc; padding: 6px;">${pat.patientName || ord.customerId?.name || 'Customer'}<br><small style="color: #666;">${pat.mobile || ''}</small></td>
          <td style="border: 1px solid #ccc; padding: 6px;">${addr.city || 'Hosur'} (${addr.pincode || ''})</td>
          <td style="border: 1px solid #ccc; padding: 6px; text-align: right; font-weight: bold;">₹${isCOD ? ord.grandTotal?.toLocaleString() : '0 (PREPAID)'}</td>
          <td style="border: 1px solid #ccc; padding: 6px; font-family: monospace;">${ord.orderNumber}</td>
        </tr>
      `;
      })
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>India Post Daily Booking Manifest — Shanthi Ayurvedas Hosur</title>
        <style>
          body { font-family: sans-serif; padding: 20px; color: #111; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 15px; }
          h2 { margin: 0; font-size: 18px; }
          p { margin: 2px 0; font-size: 12px; color: #555; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; }
          th { background: #f0f0f0; border: 1px solid #ccc; padding: 6px; text-align: left; }
          .footer { margin-top: 30px; display: flex; justify-content: space-between; font-size: 12px; padding-top: 15px; }
          .sig-box { border-top: 1px dashed #666; width: 200px; text-align: center; padding-top: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h2>DEPARTMENT OF POSTS — INDIA POST DAILY MANIFEST</h2>
            <p><strong>Booking Centre:</strong> Hosur Head Post Office (HSR-HO)</p>
            <p><strong>Merchant:</strong> Shanthi Ayurvedas Hosur (Manager: Dr Shanthi) · Tel: 9629985345</p>
          </div>
          <div style="text-align: right;">
            <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-GB')}</p>
            <p><strong>Total Articles:</strong> ${targetOrders.length}</p>
            <p><strong>Total COD Value:</strong> ₹${targetOrders.reduce((s, o) => s + ((o.paymentMethod === 'COD') ? (o.grandTotal || 0) : 0), 0).toLocaleString()}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">#</th>
              <th>Article Number / Barcode</th>
              <th>Addressee / Customer</th>
              <th>Destination City & PIN</th>
              <th style="text-align: right;">COD Amount</th>
              <th>Order ID</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer">
          <div class="sig-box">Merchant Signature<br><small>(Shanthi Ayurvedas)</small></div>
          <div class="sig-box">India Post Postal Official Signature<br><small>& Date Stamp</small></div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
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
      title="India Post Booking & Consignment Manifest"
      subtitle="Generate post office manifest sheets, Speed Post / COD booking files, and dispatch handover slips"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4 text-xs">
        {/* Warning if tracking numbers are missing */}
        {missingTrackingCount > 0 && (
          <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">
                ⚠️ {missingTrackingCount} order(s) do not have an assigned India Post tracking barcode!
              </p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Use the <strong>Scan Station</strong> to scan article stickers from India Post before handover, or export now with auto-generated reference barcodes.
              </p>
            </div>
          </div>
        )}

        {/* Manifest Overview Card */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-[11px] text-slate-500 block">Articles for Dispatch</span>
            <span className="text-lg font-black text-slate-900">{targetOrders.length}</span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-[11px] text-slate-500 block">Total COD Collections</span>
            <span className="text-lg font-black text-emerald-700">
              ₹
              {targetOrders
                .reduce((s, o) => s + (o.paymentMethod === 'COD' ? o.grandTotal || 0 : 0), 0)
                .toLocaleString()}
            </span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-[11px] text-slate-500 block">Branch Centre</span>
            <span className="text-xs font-bold text-slate-800 block truncate">Shanthi Ayurvedas Hosur</span>
            <span className="text-[10px] text-slate-400">PIN: 635109</span>
          </div>
        </div>

        {/* Order Previews */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-100 px-3 py-2 text-[11px] font-bold text-slate-700 uppercase tracking-wider flex justify-between">
            <span>Manifest Preview ({targetOrders.length} articles)</span>
            <span>Speed Post / COD</span>
          </div>

          <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 bg-white">
            {targetOrders.map((ord, idx) => (
              <div key={idx} className="p-2.5 flex items-center justify-between hover:bg-slate-50 text-[11px]">
                <div>
                  <span className="font-mono font-bold text-slate-900">
                    {ord.trackingNumber || `SP${ord.orderNumber.replace(/[^0-9]/g, '').slice(-9)}IN`}
                  </span>
                  <span className="text-slate-600 ml-2">
                    {ord.patientDetails?.patientName || ord.customerId?.name || 'Customer'}
                  </span>
                  <span className="text-slate-400 ml-1">
                    ({ord.deliveryAddress?.city || 'Hosur'} - {ord.deliveryAddress?.pincode || '635109'})
                  </span>
                </div>
                <div className="text-right font-bold text-slate-900">
                  ₹{ord.grandTotal?.toLocaleString()}
                  <span className="text-[10px] text-slate-400 block font-normal">{ord.paymentMethod}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              icon={Printer}
              onClick={handlePrintManifest}
              className="border-slate-300 text-slate-700"
            >
              Print Manifest Sheet
            </Button>

            <Button
              variant="primary"
              icon={Download}
              onClick={handleExportManifest}
              className="bg-red-700 hover:bg-red-800 text-white font-bold"
            >
              Export India Post Excel
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default IndiaPostModuleModal;
