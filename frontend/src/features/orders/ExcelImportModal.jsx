import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Loader2,
  Trash2,
  Plus,
  Users,
  RefreshCw
} from 'lucide-react';
import { Modal } from '../../components/common/Modal.jsx';
import { Button } from '../../components/common/Button.jsx';
import apiClient from '../../api/apiClient.js';

export function ExcelImportModal({ isOpen, onClose, onImportSuccess, telecallers = [] }) {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'manual'
  const [file, setFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [columnMappings, setColumnMappings] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [importSummary, setImportSummary] = useState(null);
  const fileInputRef = useRef(null);

  // Manual entry rows state
  const [manualRows, setManualRows] = useState([
    {
      patientName: '',
      mobile: '',
      productName: 'Slim 369 Kit',
      quantity: 1,
      totalAmount: 2600,
      paymentMethod: 'COD',
      district: 'Hosur',
      street: '',
      pincode: '635109',
      assignedTo: ''
    }
  ]);

  if (!isOpen) return null;

  // Download sample template formatted specifically for AyurOne Mart / Shanthi Ayurvedas
  const handleDownloadSample = () => {
    const sampleData = [
      {
        'Patient Name': 'D.Sarmila',
        'Mobile Number': '7397519165',
        'Alternate Mobile': '9876543210',
        'Product / Kit': 'Slim 369 Kit x1, LIVAM LEGYUM x1',
        'Quantity': 1,
        'Total Amount': 2600,
        'Payment Mode': 'COD',
        'Street Address': '12/3/469, Ponnaiyapuram, Lakshmi Store back side',
        'City / Town': 'Hosur',
        'District': 'Krishnagiri',
        'State': 'Tamil Nadu',
        'Pincode': '635109',
        'Initial Status': 'NEW',
        'India Post Tracking': 'EK452095441IN',
        'Doctor Notes': 'Take 1 spoon after dinner daily'
      },
      {
        'Patient Name': 'K.Ramesh Kumar',
        'Mobile Number': '9842145678',
        'Alternate Mobile': '',
        'Product / Kit': 'Maha Bhringraj Taila 200ml',
        'Quantity': 2,
        'Total Amount': 1300,
        'Payment Mode': 'PREPAID',
        'Street Address': '45 Gandhi Road, Near Old Bus Stand',
        'City / Town': 'Salem',
        'District': 'Salem',
        'State': 'Tamil Nadu',
        'Pincode': '636001',
        'Initial Status': 'CONFIRMED',
        'India Post Tracking': '',
        'Doctor Notes': 'Apply gently on scalp'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Orders_Template');
    XLSX.writeFile(wb, 'ayurone_orders_template.xlsx');
  };

  // Process uploaded Excel / CSV file
  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    if (uploadedFile.size > 5 * 1024 * 1024) {
      setErrorMsg('File exceeds maximum size of 5MB.');
      return;
    }

    setFile(uploadedFile);
    setErrorMsg('');
    setImportSummary(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const firstSheetName = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheetName];
        const data = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (!data || data.length === 0) {
          setErrorMsg('Uploaded file contains no rows.');
          return;
        }

        // Map and validate rows
        const normalized = data.map((row, idx) => {
          const keys = Object.keys(row);
          const findVal = (pattern) => {
            const key = keys.find((k) => new RegExp(pattern, 'i').test(k));
            return key ? row[key] : '';
          };

          const patientName = findVal('name|patient|customer') || `Customer ${idx + 1}`;
          const mobile = String(findVal('mobile|phone|contact')).replace(/[^0-9]/g, '');
          const altMobile = String(findVal('alt|secondary')).replace(/[^0-9]/g, '');
          const productName = findVal('product|kit|item|disease') || 'Slim 369 Kit';
          const quantity = parseInt(findVal('qty|quantity') || 1, 10) || 1;
          const totalAmount = parseFloat(findVal('total|amount|price|cost') || 0);
          const paymentMethod = String(findVal('payment|mode|pay')).toUpperCase().includes('PREPAID') || String(findVal('payment|mode|pay')).toUpperCase().includes('ONLINE') ? 'ONLINE' : 'COD';
          const street = findVal('street|address|door|landmark') || 'Main Street';
          const city = findVal('city|town') || 'Hosur';
          const district = findVal('district') || city || 'Krishnagiri';
          const state = findVal('state') || 'Tamil Nadu';
          const pincode = String(findVal('pincode|pin|zip') || '635109').slice(0, 6);
          const status = String(findVal('status') || 'NEW').toUpperCase();
          const trackingNumber = findVal('track|article|indiapost|awb') || '';
          const notes = findVal('notes|instruction|remark') || '';

          const isValidMobile = mobile.length >= 10;
          const statusVal = isValidMobile ? 'VALID' : 'INVALID_PHONE';

          return {
            patientName,
            mobile,
            altMobile,
            productName,
            quantity,
            totalAmount,
            paymentMethod,
            street,
            city,
            district,
            state,
            pincode,
            status,
            trackingNumber,
            notes,
            validationStatus: statusVal
          };
        });

        setParsedRows(normalized);
      } catch (err) {
        setErrorMsg(`Failed to parse file: ${err.message}`);
      }
    };
    reader.readAsBinaryString(uploadedFile);
  };

  // Submit batch import to backend
  const handleExecuteImport = async () => {
    const rowsToImport = activeTab === 'upload' ? parsedRows : manualRows;
    const validRows = rowsToImport.filter((r) => r.mobile && r.mobile.length >= 10);

    if (validRows.length === 0) {
      setErrorMsg('No valid orders found to import. Check mobile numbers.');
      return;
    }

    setIsProcessing(true);
    setImportProgress(20);
    setErrorMsg('');

    try {
      setImportProgress(50);
      const res = await apiClient.post('/orders/import-excel', { orders: validRows });
      setImportProgress(100);

      setImportSummary({
        total: validRows.length,
        imported: res.data?.data?.imported || validRows.length,
        failed: res.data?.data?.failed || 0,
        errors: res.data?.data?.errors || []
      });

      if (onImportSuccess) {
        onImportSuccess();
      }
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'Failed to import orders. Please check data format.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Manual entry helpers
  const handleAddManualRow = () => {
    setManualRows([
      ...manualRows,
      {
        patientName: '',
        mobile: '',
        productName: 'Slim 369 Kit',
        quantity: 1,
        totalAmount: 2600,
        paymentMethod: 'COD',
        district: 'Hosur',
        street: '',
        pincode: '635109',
        assignedTo: ''
      }
    ]);
  };

  const handleRemoveManualRow = (index) => {
    setManualRows(manualRows.filter((_, i) => i !== index));
  };

  const handleManualRowChange = (index, field, value) => {
    const updated = [...manualRows];
    updated[index][field] = value;
    setManualRows(updated);
  };

  const handleRoundRobinAssign = () => {
    if (!telecallers || telecallers.length === 0) return;
    const updated = manualRows.map((row, idx) => ({
      ...row,
      assignedTo: telecallers[idx % telecallers.length]._id
    }));
    setManualRows(updated);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Import Orders & Leads — Excel / CSV"
      subtitle="Upload bulk spreadsheets or enter multiple orders with automated telecaller assignment"
      maxWidth="max-w-4xl"
    >
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'upload'
                  ? 'bg-ayur-700 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              📁 Upload Excel / CSV
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('manual')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'manual'
                  ? 'bg-ayur-700 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              ✍️ Manual Batch Entry ({manualRows.length})
            </button>
          </div>

          <button
            type="button"
            onClick={handleDownloadSample}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download Sample Template (.xlsx)
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Success / Summary Alert */}
        {importSummary && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1 text-xs text-emerald-800">
            <div className="flex items-center gap-2 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Import Completed! {importSummary.imported} of {importSummary.total} orders created successfully.
            </div>
            {importSummary.failed > 0 && (
              <div className="text-amber-700 font-medium">
                ⚠️ {importSummary.failed} rows failed or skipped. Check duplicates or invalid phone numbers.
              </div>
            )}
          </div>
        )}

        {/* TAB 1: UPLOAD FILE */}
        {activeTab === 'upload' && (
          <div className="space-y-4">
            {/* Drag and Drop Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-ayur-600 hover:bg-ayur-50/30 rounded-2xl p-6 text-center cursor-pointer transition-all"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                onChange={handleFileUpload}
              />
              <FileSpreadsheet className="w-10 h-10 text-ayur-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">
                {file ? file.name : 'Click to select or drag & drop Excel / CSV file'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Supports .xlsx, .xls, .csv up to 5MB · Auto-maps Patient Name, Mobile, Product, Address, Pincode
              </p>
            </div>

            {/* Parsed Rows Preview */}
            {parsedRows.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                  <span>
                    Previewing <strong>{parsedRows.length}</strong> detected rows (
                    <span className="text-emerald-600 font-bold">
                      {parsedRows.filter((r) => r.validationStatus === 'VALID').length} valid
                    </span>
                    )
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setParsedRows([]);
                      setFile(null);
                    }}
                    className="text-red-500 hover:underline"
                  >
                    Clear File
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider font-semibold sticky top-0">
                      <tr>
                        <th className="px-3 py-2">#</th>
                        <th className="px-3 py-2">Patient</th>
                        <th className="px-3 py-2">Mobile</th>
                        <th className="px-3 py-2">Product / Kit</th>
                        <th className="px-3 py-2">Amount</th>
                        <th className="px-3 py-2">City / District</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {parsedRows.slice(0, 50).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-3 py-1.5 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="px-3 py-1.5 font-bold text-slate-800">{row.patientName}</td>
                          <td className="px-3 py-1.5 font-mono">
                            {row.mobile}
                            {row.validationStatus !== 'VALID' && (
                              <span className="ml-1 text-[10px] text-red-500 font-bold">Invalid</span>
                            )}
                          </td>
                          <td className="px-3 py-1.5 text-slate-600 truncate max-w-[140px]">
                            {row.productName} (x{row.quantity})
                          </td>
                          <td className="px-3 py-1.5 font-bold text-slate-900">₹{row.totalAmount}</td>
                          <td className="px-3 py-1.5 text-slate-500">{row.district || row.city}</td>
                          <td className="px-3 py-1.5">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                row.validationStatus === 'VALID'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {row.validationStatus === 'VALID' ? 'Ready' : 'Check Phone'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MANUAL ENTRY */}
        {activeTab === 'manual' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" icon={Plus} onClick={handleAddManualRow}>
                  Add Row
                </Button>
                {telecallers.length > 0 && (
                  <button
                    type="button"
                    onClick={handleRoundRobinAssign}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100"
                  >
                    <RefreshCw className="w-3 h-3" /> Round-Robin Assign
                  </button>
                )}
              </div>
              <span className="text-xs text-slate-500">{manualRows.length} order(s) entered</span>
            </div>

            <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider font-semibold sticky top-0">
                  <tr>
                    <th className="px-2 py-2">Patient *</th>
                    <th className="px-2 py-2">Mobile *</th>
                    <th className="px-2 py-2">Product</th>
                    <th className="px-2 py-2">₹ Total</th>
                    <th className="px-2 py-2">Pay</th>
                    <th className="px-2 py-2">District</th>
                    <th className="px-2 py-2">Street</th>
                    <th className="px-2 py-2">Pincode</th>
                    <th className="px-2 py-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {manualRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-1">
                        <input
                          type="text"
                          placeholder="Name"
                          value={row.patientName}
                          onChange={(e) => handleManualRowChange(idx, 'patientName', e.target.value)}
                          className="w-24 px-1.5 py-1 text-xs border rounded outline-none focus:border-ayur-500"
                        />
                      </td>
                      <td className="p-1">
                        <input
                          type="text"
                          placeholder="10 Digits"
                          value={row.mobile}
                          onChange={(e) => handleManualRowChange(idx, 'mobile', e.target.value)}
                          className="w-24 px-1.5 py-1 text-xs border rounded outline-none focus:border-ayur-500 font-mono"
                        />
                      </td>
                      <td className="p-1">
                        <input
                          type="text"
                          value={row.productName}
                          onChange={(e) => handleManualRowChange(idx, 'productName', e.target.value)}
                          className="w-28 px-1.5 py-1 text-xs border rounded outline-none focus:border-ayur-500"
                        />
                      </td>
                      <td className="p-1">
                        <input
                          type="number"
                          value={row.totalAmount}
                          onChange={(e) => handleManualRowChange(idx, 'totalAmount', e.target.value)}
                          className="w-16 px-1.5 py-1 text-xs border rounded outline-none focus:border-ayur-500 font-bold"
                        />
                      </td>
                      <td className="p-1">
                        <select
                          value={row.paymentMethod}
                          onChange={(e) => handleManualRowChange(idx, 'paymentMethod', e.target.value)}
                          className="px-1.5 py-1 text-xs border rounded outline-none focus:border-ayur-500"
                        >
                          <option value="COD">COD</option>
                          <option value="ONLINE">Prepaid</option>
                        </select>
                      </td>
                      <td className="p-1">
                        <input
                          type="text"
                          value={row.district}
                          onChange={(e) => handleManualRowChange(idx, 'district', e.target.value)}
                          className="w-20 px-1.5 py-1 text-xs border rounded outline-none focus:border-ayur-500"
                        />
                      </td>
                      <td className="p-1">
                        <input
                          type="text"
                          placeholder="Street"
                          value={row.street}
                          onChange={(e) => handleManualRowChange(idx, 'street', e.target.value)}
                          className="w-28 px-1.5 py-1 text-xs border rounded outline-none focus:border-ayur-500"
                        />
                      </td>
                      <td className="p-1">
                        <input
                          type="text"
                          value={row.pincode}
                          onChange={(e) => handleManualRowChange(idx, 'pincode', e.target.value)}
                          className="w-16 px-1.5 py-1 text-xs border rounded outline-none focus:border-ayur-500 font-mono"
                        />
                      </td>
                      <td className="p-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveManualRow(idx)}
                          disabled={manualRows.length === 1}
                          className="text-slate-400 hover:text-red-600 disabled:opacity-30"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          <div className="text-xs text-slate-400 flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5" />
            Stock will be reserved and customers automatically registered.
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose} disabled={isProcessing}>
              Close
            </Button>
            <Button
              variant="primary"
              onClick={handleExecuteImport}
              isLoading={isProcessing}
              disabled={isProcessing || (activeTab === 'upload' && parsedRows.length === 0)}
              className="bg-ayur-700 hover:bg-ayur-800 text-white"
            >
              {isProcessing ? `Importing (${importProgress}%)` : 'Import Orders Now'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default ExcelImportModal;
