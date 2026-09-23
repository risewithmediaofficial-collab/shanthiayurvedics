import React, { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Truck, MapPin, CheckCircle2, Upload, FileSpreadsheet,
  FileText, X, AlertTriangle, ChevronDown, ChevronUp, RefreshCw,
  FileCheck, PackageCheck, Package, RotateCcw, AlertCircle, Clock
} from 'lucide-react';
import apiClient from '../../api/apiClient.js';
import { Table } from '../../components/common/Table.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Input } from '../../components/common/Input.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { Modal } from '../../components/common/Modal.jsx';
import { Pagination } from '../../components/common/Pagination.jsx';
import { DateRangeFilter } from '../../components/common/DateRangeFilter.jsx';
import { ExportButton } from '../../components/common/ExportButton.jsx';
import { exportToExcel, exportToCSV } from '../../utils/exportUtils.js';

// ── Status badge helper ──────────────────────────────────────────────────────

function getStatusBadge(status) {
  switch (status) {
    case 'DELIVERED':        return <Badge variant="emerald">Delivered</Badge>;
    case 'OUT_FOR_DELIVERY': return <Badge variant="warning">Out For Delivery</Badge>;
    case 'IN_TRANSIT':       return <Badge variant="info">In Transit</Badge>;
    case 'PICKED_UP':        return <Badge variant="info">Picked Up</Badge>;
    case 'DELIVERY_FAILED':  return <Badge variant="danger">Failed</Badge>;
    case 'RTO_INITIATED':    return <Badge variant="danger">RTO Return</Badge>;
    case 'RTO_IN_TRANSIT':   return <Badge variant="danger">RTO Transit</Badge>;
    case 'RTO_RECEIVED':     return <Badge variant="neutral">RTO Received</Badge>;
    default:                 return <Badge variant="neutral">{status}</Badge>;
  }
}

// ── Status summary card ──────────────────────────────────────────────────────

function SummaryCard({ icon: Icon, label, count, color }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border ${color} bg-white`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${color.replace('border-', 'bg-').replace('-200', '-100')}`}>
        <Icon className={`w-4 h-4 ${color.replace('border-', 'text-').replace('-200', '-600')}`} />
      </div>
      <div>
        <div className="text-xl font-bold text-slate-900 leading-none">{count}</div>
        <div className="text-[11px] text-slate-500 mt-0.5">{label}</div>
      </div>
    </div>
  );
}

// ── File drop zone ───────────────────────────────────────────────────────────

function FileDropZone({ onFileSelect, selectedFile, onClear }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFileSelect(file);
  }, [onFileSelect]);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragging(false), []);

  const ext = selectedFile?.name?.split('.').pop()?.toLowerCase();
  const isPdf = ext === 'pdf';

  if (selectedFile) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl border border-ayur-300 bg-ayur-50">
        {isPdf
          ? <FileText className="w-8 h-8 text-red-500 shrink-0" />
          : <FileSpreadsheet className="w-8 h-8 text-emerald-600 shrink-0" />
        }
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-slate-900 truncate">{selectedFile.name}</div>
          <div className="text-[11px] text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB</div>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="p-1 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-500 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDrag}
      onDragLeave={handleDragLeave}
      onClick={() => inputRef.current?.click()}
      className={`
        cursor-pointer border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-2 text-center
        transition-colors duration-150
        ${dragging
          ? 'border-ayur-400 bg-ayur-50'
          : 'border-slate-200 bg-slate-50 hover:border-ayur-300 hover:bg-ayur-50'
        }
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv,.pdf"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])}
      />
      <Upload className="w-8 h-8 text-slate-400" />
      <div>
        <p className="text-sm font-semibold text-slate-700">Drop file here or click to browse</p>
        <p className="text-[11px] text-slate-400 mt-0.5">Supports Excel (.xlsx / .xls / .csv) and PDF — max 10 MB</p>
      </div>
    </div>
  );
}

// ── Import Result Display ────────────────────────────────────────────────────

function ImportResult({ summary, onClose, onImportAgain }) {
  const [showUnmatched, setShowUnmatched] = useState(false);
  const [showUpdated, setShowUpdated] = useState(false);

  const statusCards = [
    {
      icon: PackageCheck,
      label: 'Delivered',
      count: summary.byStatus?.DELIVERED ?? 0,
      color: 'border-emerald-200',
    },
    {
      icon: Truck,
      label: 'Out for Delivery',
      count: summary.byStatus?.OUT_FOR_DELIVERY ?? 0,
      color: 'border-amber-200',
    },
    {
      icon: Package,
      label: 'In Transit',
      count: summary.byStatus?.IN_TRANSIT ?? 0,
      color: 'border-blue-200',
    },
    {
      icon: RotateCcw,
      label: 'RTO / Return',
      count: (summary.byStatus?.RTO_INITIATED ?? 0) + (summary.byStatus?.RTO_IN_TRANSIT ?? 0),
      color: 'border-red-200',
    },
    {
      icon: AlertCircle,
      label: 'Delivery Failed',
      count: summary.byStatus?.DELIVERY_FAILED ?? 0,
      color: 'border-red-200',
    },
    {
      icon: AlertTriangle,
      label: 'Unmatched AWBs',
      count: summary.unmatched ?? 0,
      color: 'border-slate-200',
    },
  ];

  return (
    <div className="space-y-5">
      {/* Top stats row */}
      <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
        <div>
          <div className="text-xl font-bold text-slate-900">{summary.totalRowsInFile}</div>
          <div className="text-[11px] text-slate-500">Rows in File</div>
        </div>
        <div>
          <div className="text-xl font-bold text-ayur-700">{summary.updated}</div>
          <div className="text-[11px] text-slate-500">Shipments Updated</div>
        </div>
        <div>
          <div className="text-xl font-bold text-slate-500">{summary.alreadyUpToDate}</div>
          <div className="text-[11px] text-slate-500">Already Up-to-date</div>
        </div>
      </div>

      {/* Status breakdown grid */}
      <div className="grid grid-cols-2 gap-2">
        {statusCards.map((card) => (
          <SummaryCard key={card.label} {...card} />
        ))}
      </div>

      {/* Updated shipments expandable */}
      {summary.updatedShipments?.length > 0 && (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowUpdated(!showUpdated)}
            className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors text-sm font-semibold text-slate-700"
          >
            <span className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-ayur-600" />
              Updated Shipments ({summary.updatedShipments.length})
            </span>
            {showUpdated ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showUpdated && (
            <div className="max-h-44 overflow-y-auto divide-y divide-slate-100">
              {summary.updatedShipments.map((s) => (
                <div key={s.awbNumber} className="flex items-center justify-between px-3 py-2 text-xs">
                  <span className="font-mono font-semibold text-slate-800">{s.awbNumber}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 line-through">{s.previousStatus}</span>
                    <span className="text-slate-300">→</span>
                    {getStatusBadge(s.newStatus)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Unmatched AWBs expandable */}
      {summary.unmatchedAwbs?.length > 0 && (
        <div className="rounded-xl border border-amber-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowUnmatched(!showUnmatched)}
            className="w-full flex items-center justify-between p-3 bg-amber-50 hover:bg-amber-100 transition-colors text-sm font-semibold text-amber-800"
          >
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              {summary.unmatchedAwbs.length} AWB(s) Not Found in System
            </span>
            {showUnmatched ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showUnmatched && (
            <div className="max-h-36 overflow-y-auto divide-y divide-amber-100 bg-white">
              {summary.unmatchedAwbs.map((awb) => (
                <div key={awb} className="px-3 py-2 text-xs font-mono text-slate-700">{awb}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 pt-1">
        <Button variant="secondary" onClick={onImportAgain} className="flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5" /> Import Another File
        </Button>
        <Button variant="primary" onClick={onClose}>Done</Button>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export function DeliveryTrackingPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchAwb, setSearchAwb] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [selectedShipmentAwb, setSelectedShipmentAwb] = useState(null);

  // Import modal state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [courier, setCourier] = useState('AUTO');
  const [importResult, setImportResult] = useState(null);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: shipmentsResponse, isLoading } = useQuery({
    queryKey: ['shipments', page, searchAwb, startDate, endDate],
    queryFn: async () => {
      const res = await apiClient.get('/shipping', {
        params: {
          page,
          limit: 15,
          search: searchAwb,
          startDate,
          endDate
        }
      });
      return res.data;
    }
  });

  const handleExportShipments = async (format) => {
    try {
      setIsExporting(true);
      const res = await apiClient.get('/shipping', {
        params: {
          search: searchAwb,
          startDate,
          endDate,
          export: true
        }
      });
      const exportList = res.data?.data || shipments;
      if (!exportList.length) return;

      const rows = exportList.map((s) => ({
        'AWB Number': s.awbNumber || '',
        'Courier Partner': s.courierName || '',
        'Tracking Status': s.trackingStatus || '',
        'Order Number': s.orderId?.orderNumber || '',
        'Customer Name': s.orderId?.customerId?.name || 'Customer',
        'Customer Mobile': s.orderId?.customerId?.mobile || '',
        'Delivery City': s.orderId?.deliveryAddress?.city || '',
        'State': s.orderId?.deliveryAddress?.state || '',
        'Amount (₹)': s.orderId?.grandTotal || 0,
        'Branch': s.branchId?.name || '',
        'Dispatched Date': s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-IN') : '',
        'Delivered Date': s.deliveredAt ? new Date(s.deliveredAt).toLocaleDateString('en-IN') : ''
      }));

      const fileName = `Shanthi_Ayurvedas_Shipments_${new Date().toISOString().split('T')[0]}`;
      if (format === 'csv') exportToCSV(rows, fileName);
      else exportToExcel(rows, fileName, 'Shipments');
    } catch (err) {
      console.error('Shipments export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const { data: trackingDetails, isLoading: isTrackingLoading } = useQuery({
    queryKey: ['tracking', selectedShipmentAwb],
    queryFn: async () => {
      const res = await apiClient.get(`/shipping/track/${selectedShipmentAwb}`);
      return res.data?.data;
    },
    enabled: Boolean(selectedShipmentAwb)
  });

  // ── Import mutation ────────────────────────────────────────────────────────

  const importMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('courier', courier);
      const res = await apiClient.post('/shipping/import-status', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data?.data;
    },
    onSuccess: (data) => {
      setImportResult(data);
      // Refresh the shipments table to reflect updated statuses
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
    },
  });

  function handleOpenImport() {
    setSelectedFile(null);
    setImportResult(null);
    setCourier('AUTO');
    setImportModalOpen(true);
  }

  function handleCloseImport() {
    setImportModalOpen(false);
    setImportResult(null);
    setSelectedFile(null);
  }

  function handleImportAgain() {
    setImportResult(null);
    setSelectedFile(null);
    importMutation.reset();
  }

  // ── Table config ───────────────────────────────────────────────────────────

  const shipments = shipmentsResponse?.data || [];
  // API returns 'pagination' (from ApiResponse.paginated), not 'meta'
  const meta = shipmentsResponse?.pagination || shipmentsResponse?.meta || { page: 1, totalPages: 1, total: 0 };

  const columns = [
    {
      header: 'AWB Barcode & Carrier',
      cell: (row) => (
        <div>
          <div className="font-bold text-slate-900 font-mono text-xs flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-ayur-600" />
            {row.awbNumber}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">{row.courierName}</div>
        </div>
      )
    },
    {
      header: 'Order Reference',
      cell: (row) => (
        <span className="font-mono text-xs font-semibold text-slate-800">
          {row.orderId?.orderNumber}
        </span>
      )
    },
    {
      header: 'Destination',
      cell: (row) => (
        <div className="text-xs text-slate-600">
          {row.orderId?.deliveryAddress?.city}, {row.orderId?.deliveryAddress?.pincode}
        </div>
      )
    },
    {
      header: 'Tracking Status',
      cell: (row) => getStatusBadge(row.trackingStatus)
    },
    {
      header: 'Actions',
      align: 'right',
      cell: (row) => (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setSelectedShipmentAwb(row.awbNumber)}
        >
          Track Timeline
        </Button>
      )
    }
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Shipments &amp; Live Courier Tracking</h2>
          <p className="text-xs text-slate-500">Real-time parcel milestone sync across postal and commercial carriers</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ExportButton
            onExport={handleExportShipments}
            isLoading={isExporting}
            disabled={shipments.length === 0}
          />
          <Button
            variant="primary"
            onClick={handleOpenImport}
            className="flex items-center gap-2 shrink-0"
          >
            <Upload className="w-4 h-4" />
            Import Courier Status
          </Button>
        </div>
      </div>

      {/* Quick AWB Lookup and Date Filter */}
      <div className="bento-card p-4 space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
          <div className="lg:col-span-5 flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Direct AWB lookup or carrier..."
                icon={Search}
                value={searchAwb}
                onChange={(e) => setSearchAwb(e.target.value)}
              />
            </div>
            <Button
              variant="secondary"
              onClick={() => searchAwb.trim() && setSelectedShipmentAwb(searchAwb.trim())}
            >
              Track
            </Button>
          </div>
          <div className="lg:col-span-7">
            <DateRangeFilter
              startDate={startDate}
              endDate={endDate}
              onChange={({ startDate: s, endDate: e }) => {
                setStartDate(s);
                setEndDate(e);
                setPage(1);
              }}
            />
          </div>
        </div>
      </div>

      <Table
        columns={columns}
        data={shipments}
        isLoading={isLoading}
        emptyMessage="No shipments recorded."
      />

      <Pagination
        currentPage={page}
        totalPages={meta.totalPages}
        totalItems={meta.total}
        itemsPerPage={15}
        onPageChange={setPage}
      />

      {/* ── Tracking Timeline Modal ─────────────────────────────────────── */}
      {selectedShipmentAwb && (
        <Modal
          isOpen={Boolean(selectedShipmentAwb)}
          onClose={() => setSelectedShipmentAwb(null)}
          title={`Live Tracking — ${selectedShipmentAwb}`}
          subtitle={`Carrier: ${trackingDetails?.shipment?.courierName || 'Logistics Partner'}`}
          maxWidth="max-w-md"
          icon="🚚"
          footer={
            <Button variant="secondary" onClick={() => setSelectedShipmentAwb(null)}>
              Close
            </Button>
          }
        >
          {isTrackingLoading ? (
            <div className="py-8 text-center text-xs text-slate-500">Connecting to carrier network...</div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Current Status:</span>
                  {getStatusBadge(trackingDetails?.shipment?.trackingStatus)}
                </div>
              </div>

              <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {(trackingDetails?.events || []).map((ev, idx) => (
                  <div key={idx} className="flex items-start gap-3 relative pl-1 text-xs">
                    <div className="w-5 h-5 rounded-full bg-ayur-100 text-ayur-800 flex items-center justify-center shrink-0 z-10">
                      <CheckCircle2 className="w-3 h-3" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{ev.activity}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400" /> {ev.location}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(ev.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* ── Courier Status Import Modal ─────────────────────────────────── */}
      <Modal
        isOpen={importModalOpen}
        onClose={handleCloseImport}
        title="Import Courier Status File"
        subtitle="Upload a bulk tracking report from India Post or Professional Courier portal"
        maxWidth="max-w-lg"
        icon="📦"
        footer={
          !importResult ? (
            <div className="flex gap-3 w-full">
              <Button variant="secondary" onClick={handleCloseImport} className="flex-1">
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => importMutation.mutate()}
                disabled={!selectedFile || importMutation.isPending}
                className="flex-1 flex items-center justify-center gap-2"
              >
                {importMutation.isPending ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Processing…
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    Import &amp; Update Status
                  </>
                )}
              </Button>
            </div>
          ) : null
        }
      >
        {importResult ? (
          <ImportResult
            summary={importResult}
            onClose={handleCloseImport}
            onImportAgain={handleImportAgain}
          />
        ) : (
          <div className="space-y-4">
            {/* Courier selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Courier / Carrier
              </label>
              <select
                value={courier}
                onChange={(e) => setCourier(e.target.value)}
                className="w-full text-sm rounded-xl border border-slate-200 bg-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-ayur-400 focus:border-transparent"
              >
                <option value="AUTO">Auto Detect (recommended)</option>
                <option value="INDIA_POST">India Post / Speed Post</option>
                <option value="PROFESSIONAL_COURIER">Professional Courier (TPC)</option>
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                Selecting the correct courier improves status mapping accuracy.
              </p>
            </div>

            {/* File upload zone */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tracking Report File
              </label>
              <FileDropZone
                onFileSelect={setSelectedFile}
                selectedFile={selectedFile}
                onClear={() => setSelectedFile(null)}
              />
            </div>

            {/* How it works note */}
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-700 space-y-1">
              <p className="font-semibold">How this works:</p>
              <ol className="list-decimal list-inside space-y-0.5 text-blue-600">
                <li>Download the tracking report from the courier portal (Excel or PDF).</li>
                <li>Upload it here — we read the AWB numbers and statuses automatically.</li>
                <li>All matched shipments are updated instantly. Orders marked as <strong>Delivered</strong> update too.</li>
              </ol>
            </div>

            {/* Error display */}
            {importMutation.isError && (
              <div className="p-3 bg-red-50 rounded-xl border border-red-200 flex items-start gap-2 text-xs text-red-700">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  {importMutation.error?.response?.data?.message
                    || importMutation.error?.message
                    || 'Import failed. Please check the file format and try again.'}
                </span>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

export default DeliveryTrackingPage;
