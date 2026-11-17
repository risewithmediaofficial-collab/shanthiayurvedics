import React, { useState } from 'react';
import * as XLSX from 'xlsx-js-style';
import {
  Download,
  FileSpreadsheet,
  FileText,
  CheckSquare,
  Square,
  Calendar,
  Layers,
  Filter
} from 'lucide-react';
import { Modal } from '../../components/common/Modal.jsx';
import { Button } from '../../components/common/Button.jsx';
import { getEffectiveCodAmount } from '../../utils/orderUtils.js';

export function ExcelExportModal({
  isOpen,
  onClose,
  orders = [],
  selectedOrders = [],
  filterStatus = '',
  filterDistrict = ''
}) {
  const safeSelectedOrders = Array.isArray(selectedOrders) ? selectedOrders : [];
  const safeOrders = Array.isArray(orders) ? orders : [];
  const [exportScope, setExportScope] = useState(safeSelectedOrders.length > 0 ? 'selected' : 'filtered'); // 'selected' | 'filtered'
  const [exportFormat, setExportFormat] = useState('excel'); // 'excel' | 'csv' | 'indiapost'

  if (!isOpen) return null;

  const targetOrders = exportScope === 'selected' && safeSelectedOrders.length > 0 ? safeSelectedOrders : safeOrders;

  const handleExecuteExport = () => {
    if (!targetOrders || targetOrders.length === 0) return;

    const dateStamp = new Date().toISOString().slice(0, 10);

    if (exportFormat === 'indiapost') {
      // Custom Post Manifest Format with Yellow Highlight Headers (Matching Image 1)
      const headers = [
        'SL.NO',
        'BARCODE',
        'PIN CODE',
        'RECIVER NAME',
        'RECIVER ADDRESS',
        'CONTACT',
        'COD AMOUNT',
        'WEIGHT',
        'MRP',
        'REFER BY',
        'COURIER BY'
      ];

      const aoaData = [headers];

      targetOrders.forEach((ord, idx) => {
        const pat = ord.patientDetails || {};
        const addr = ord.deliveryAddress || {};
        const isCOD = (ord.paymentMethod || 'COD') === 'COD' || ord.paymentMethod === 'CASH_ON_DELIVERY';

        const fullAddress = [
          addr.street,
          addr.landmark ? `Near ${addr.landmark}` : '',
          addr.city || addr.district,
          addr.state,
          addr.pincode ? `PIN: ${addr.pincode}` : ''
        ].filter(Boolean).join(', ') || 'Address on file';

        const bookedByName =
          ord.telecallerId?.name ||
          ord.telecallerName ||
          ord.bookedBy?.name ||
          ord.bookedByName ||
          ord.createdByName ||
          ord.createdBy?.name ||
          'Shanthi Ayurvedas';

        const cleanMobile = String(pat.mobile || ord.customerId?.phone || addr.phone || '').replace(/[^0-9]/g, '');
        const cleanPincode = String(addr.pincode || '').trim();
        const tracking = String(ord.trackingNumber || `SP${ord.orderNumber.replace(/[^0-9]/g, '').slice(-9)}IN`).trim();

        const totalWeight = Number(ord.weight) || (ord.items || []).reduce((sum, item) => {
          return sum + (Number(item.weight || item.productId?.weight || 0) * (Number(item.quantity) || 1));
        }, 0) || 350;

        aoaData.push([
          idx + 1,
          tracking,
          cleanPincode,
          pat.patientName || ord.customerId?.name || 'Customer',
          fullAddress,
          cleanMobile,
          isCOD ? getEffectiveCodAmount(ord) : 0,
          totalWeight,
          Number(ord.grandTotal || 0),
          bookedByName,
          ord.courierPartner || ord.courierName || 'Speed Post'
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(aoaData);

      // Yellow Header Style matching Image 1
      const headerStyle = {
        fill: { fgColor: { rgb: 'FFFF00' } },
        font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: '000000' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      };

      const colLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];

      colLetters.forEach((col) => {
        const cellRef = col + '1';
        if (ws[cellRef]) ws[cellRef].s = headerStyle;
      });

      for (let r = 2; r <= aoaData.length; r++) {
        colLetters.forEach((col) => {
          const cellRef = col + r;
          if (!ws[cellRef]) return;
          if (col === 'B' || col === 'C' || col === 'F') ws[cellRef].t = 's';

          const isCenter = ['A', 'B', 'C', 'F', 'K'].includes(col);
          const isRight = ['G', 'H', 'I'].includes(col);

          ws[cellRef].s = {
            font: { name: 'Calibri', sz: 10, bold: isRight },
            alignment: { vertical: 'center', horizontal: isCenter ? 'center' : isRight ? 'right' : 'left' },
            border: {
              top: { style: 'thin', color: { rgb: 'D1D5DB' } },
              bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
              left: { style: 'thin', color: { rgb: 'D1D5DB' } },
              right: { style: 'thin', color: { rgb: 'D1D5DB' } }
            }
          };
        });
      }

      ws['!cols'] = [
        { wch: 8 },  // SL.NO
        { wch: 18 }, // BARCODE
        { wch: 12 }, // PIN CODE
        { wch: 22 }, // RECIVER NAME
        { wch: 36 }, // RECIVER ADDRESS
        { wch: 15 }, // CONTACT
        { wch: 14 }, // COD AMOUNT
        { wch: 11 }, // WEIGHT
        { wch: 12 }, // MRP
        { wch: 20 }, // REFER BY
        { wch: 14 }  // COURIER BY
      ];

      ws['!rows'] = [{ hpt: 26 }];

      const wb = XLSX.utils.book_new();
      const monthName = new Date().toLocaleString('en-US', { month: 'long' }).toUpperCase();
      XLSX.utils.book_append_sheet(wb, ws, `${monthName}_POST`);
      XLSX.writeFile(wb, `${monthName}_POST_MANIFEST_${dateStamp}.xlsx`);
    } else {
      // Standard Excel / CSV Order Export
      const exportData = targetOrders.map((ord, idx) => {
        const pat = ord.patientDetails || {};
        const addr = ord.deliveryAddress || {};
        const customerName = pat.patientName || ord.customerId?.name || 'Customer';
        const mobile = pat.mobile || ord.customerId?.mobile || addr.phone || '';
        const altMobile = pat.alternateMobile || '';
        const itemsStr = ord.items?.map((i) => `${i.productName} (x${i.quantity})`).join(', ') || 'Ayurvedic Medicine';

        const isCOD = (ord.paymentMethod || 'COD') === 'COD' || ord.paymentMethod === 'CASH_ON_DELIVERY';

        return {
          'S.No': idx + 1,
          'Order Number': ord.orderNumber,
          'Order Date': new Date(ord.createdAt).toLocaleDateString('en-GB'),
          'Customer Name': customerName,
          'Primary Mobile': mobile,
          'Alt Mobile': altMobile,
          'Products Summary': itemsStr,
          'Subtotal': ord.subtotal || 0,
          'Shipping': ord.shippingCharge || 0,
          'Total MRP (₹)': ord.grandTotal || 0,
          'Advance Paid (₹)': ord.advanceAmount || 0,
          'COD Collect (₹)': isCOD ? getEffectiveCodAmount(ord) : 0,
          'Payment Method': ord.paymentMethod || 'COD',
          'Payment Status': ord.paymentStatus || 'PENDING',
          'Order Status': ord.status,
          'Street Address': addr.street || '',
          'Landmark': addr.landmark || '',
          'City': addr.city || 'Hosur',
          'District': addr.district || 'Krishnagiri',
          'State': addr.state || 'Tamil Nadu',
          'Pincode': addr.pincode || '',
          'India Post Tracking': ord.trackingNumber || '',
          'Branch': ord.branchId?.name || 'Hosur Branch',
          'Telecaller': ord.telecallerId?.name || '—',
          'Doctor Notes': ord.notes || ''
        };
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Orders');

      if (exportFormat === 'csv') {
        XLSX.writeFile(wb, `Shanthi_Ayurvedas_Orders_${dateStamp}.csv`, { bookType: 'csv' });
      } else {
        XLSX.writeFile(wb, `Shanthi_Ayurvedas_Orders_${dateStamp}.xlsx`);
      }
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Export Orders & Dispatch Manifest"
      subtitle="Export order records to Excel (.xlsx), CSV, or India Post booking format"
      maxWidth="max-w-lg"
    >
      <div className="space-y-4 text-xs">
        {/* Export Scope Selection */}
        <div>
          <label className="font-bold text-slate-700 uppercase tracking-wider block mb-2">
            1. Select Orders to Export
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setExportScope('filtered')}
              className={`p-3 rounded-xl border text-left transition-all ${
                exportScope === 'filtered'
                  ? 'border-ayur-600 bg-ayur-50 text-ayur-900 font-semibold ring-1 ring-ayur-600'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold mb-1">
                <Layers className="w-4 h-4 text-ayur-600" />
                Current Filtered ({orders.length})
              </div>
              <p className="text-[11px] text-slate-500 font-normal">
                Includes all orders matching search, status ({filterStatus || 'All'}), and district
              </p>
            </button>

            <button
              type="button"
              disabled={selectedOrders.length === 0}
              onClick={() => setExportScope('selected')}
              className={`p-3 rounded-xl border text-left transition-all ${
                selectedOrders.length === 0 ? 'opacity-40 cursor-not-allowed bg-slate-50' : ''
              } ${
                exportScope === 'selected'
                  ? 'border-ayur-600 bg-ayur-50 text-ayur-900 font-semibold ring-1 ring-ayur-600'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold mb-1">
                <CheckSquare className="w-4 h-4 text-ayur-600" />
                Selected Orders ({selectedOrders.length})
              </div>
              <p className="text-[11px] text-slate-500 font-normal">
                Only the {selectedOrders.length} specific orders checked in the list
              </p>
            </button>
          </div>
        </div>

        {/* Export Format Selection */}
        <div>
          <label className="font-bold text-slate-700 uppercase tracking-wider block mb-2">
            2. Choose File Format
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setExportFormat('excel')}
              className={`p-3 rounded-xl border text-center transition-all ${
                exportFormat === 'excel'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold ring-1 ring-emerald-600'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
              }`}
            >
              <FileSpreadsheet className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
              <span>Excel (.xlsx)</span>
              <p className="text-[10px] text-slate-400 font-normal mt-0.5">All details & totals</p>
            </button>

            <button
              type="button"
              onClick={() => setExportFormat('csv')}
              className={`p-3 rounded-xl border text-center transition-all ${
                exportFormat === 'csv'
                  ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold ring-1 ring-blue-600'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
              }`}
            >
              <FileText className="w-6 h-6 text-blue-600 mx-auto mb-1" />
              <span>CSV File</span>
              <p className="text-[10px] text-slate-400 font-normal mt-0.5">Lightweight table</p>
            </button>

            <button
              type="button"
              onClick={() => setExportFormat('indiapost')}
              className={`p-3 rounded-xl border text-center transition-all ${
                exportFormat === 'indiapost'
                  ? 'border-amber-600 bg-amber-50 text-amber-900 font-bold ring-1 ring-amber-600'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div className="w-6 h-6 rounded-full bg-red-600 text-white font-bold text-xs flex items-center justify-center mx-auto mb-1">
                📮
              </div>
              <span>India Post Manifest</span>
              <p className="text-[10px] text-slate-400 font-normal mt-0.5">Post office format</p>
            </button>
          </div>
        </div>

        {/* Summary Info */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex justify-between items-center text-slate-600 font-medium">
            <span>Orders ready to download:</span>
            <span className="font-bold text-slate-900 text-sm">{targetOrders.length}</span>
          </div>
          <div className="flex justify-between items-center text-slate-600 font-medium mt-1">
            <span>Total Value:</span>
            <span className="font-bold text-emerald-700 text-sm">
              ₹{targetOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={Download}
            disabled={targetOrders.length === 0}
            onClick={handleExecuteExport}
            className="bg-ayur-700 hover:bg-ayur-800 text-white"
          >
            Export {targetOrders.length} Orders
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default ExcelExportModal;
