import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useLocation } from 'react-router-dom';
import { Download, FileText, TrendingUp, Users, Truck, RotateCcw } from 'lucide-react';
import apiClient from '../../api/apiClient.js';
import { useBranch } from '../../context/BranchContext.jsx';
import { Card } from '../../components/common/Card.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Input } from '../../components/common/Input.jsx';
import { Table } from '../../components/common/Table.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { DateRangeFilter } from '../../components/common/DateRangeFilter.jsx';
import { ExportButton } from '../../components/common/ExportButton.jsx';
import { exportToExcel, exportToCSV } from '../../utils/exportUtils.js';

export function ReportsHubPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { selectedBranchId } = useBranch();
  
  const getInitialTab = () => {
    if (location.pathname.includes('/tc-sales') || searchParams.get('tab') === 'team') return 'LEADS';
    if (location.pathname.includes('/delivery') || searchParams.get('tab') === 'delivery') return 'DELIVERY';
    return 'SALES';
  };

  const [activeReport, setActiveReport] = useState(getInitialTab);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (location.pathname.includes('/tc-sales') || searchParams.get('tab') === 'team') {
      setActiveReport('LEADS');
    } else if (location.pathname.includes('/delivery') || searchParams.get('tab') === 'delivery') {
      setActiveReport('DELIVERY');
    } else {
      setActiveReport('SALES');
    }
  }, [location.pathname, searchParams]);

  const { data: salesReportData, isLoading: isSalesLoading } = useQuery({
    queryKey: ['reportSales', activeReport, selectedBranchId, startDate, endDate],
    queryFn: async () => {
      const res = await apiClient.get('/reports/sales', { params: { startDate, endDate } });
      return res.data;
    },
    enabled: activeReport === 'SALES'
  });

  const { data: leadReportData, isLoading: isLeadLoading } = useQuery({
    queryKey: ['reportLeads', activeReport, selectedBranchId, startDate, endDate],
    queryFn: async () => {
      const res = await apiClient.get('/reports/leads', { params: { startDate, endDate } });
      return res.data?.data;
    },
    enabled: activeReport === 'LEADS'
  });

  const { data: deliveryReportData, isLoading: isDeliveryLoading } = useQuery({
    queryKey: ['reportDelivery', activeReport, selectedBranchId],
    queryFn: async () => {
      const res = await apiClient.get('/reports/delivery');
      return res.data?.data;
    },
    enabled: activeReport === 'DELIVERY'
  });

  const salesOrders = salesReportData?.data || [];
  const salesSummary = salesReportData?.meta?.summary || {};

  const handleExportReport = (format) => {
    const dateStamp = new Date().toISOString().split('T')[0];
    if (activeReport === 'SALES') {
      if (!salesOrders.length) return;
      const rows = salesOrders.map((o) => ({
        'Order Reference': o.orderNumber || '',
        'Customer Name': o.customerId?.name || 'Customer',
        'Amount (₹)': o.grandTotal || 0,
        'Order Status': o.status || '',
        'Branch': o.branchId?.name || 'Hosur',
        'Date': o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN') : ''
      }));
      const fileName = `Shanthi_Ayurvedas_Sales_Report_${dateStamp}`;
      if (format === 'csv') exportToCSV(rows, fileName);
      else exportToExcel(rows, fileName, 'Sales Report');
    } else if (activeReport === 'LEADS') {
      const sources = (leadReportData?.bySource || []).map((s) => ({
        'Metric': 'Source Channel',
        'Category / Channel': s._id || 'DIRECT',
        'Lead Count': s.count || 0
      }));
      const statuses = (leadReportData?.byStatus || []).map((st) => ({
        'Metric': 'Pipeline Status',
        'Category / Channel': st._id || 'NEW',
        'Lead Count': st.count || 0
      }));
      const rows = [...sources, ...statuses];
      if (!rows.length) return;
      const fileName = `Shanthi_Ayurvedas_Leads_Report_${dateStamp}`;
      if (format === 'csv') exportToCSV(rows, fileName);
      else exportToExcel(rows, fileName, 'Leads Funnel');
    } else if (activeReport === 'DELIVERY') {
      const rows = [
        {
          'Total Dispatched Shipments': deliveryReportData?.totalShipments || 0,
          'Successfully Delivered': deliveryReportData?.deliveredCount || 0,
          'Delivery Success Rate (%)': deliveryReportData?.deliverySuccessRate || 0,
          'RTO Return Rate (%)': deliveryReportData?.rtoRate || 0
        }
      ];
      const fileName = `Shanthi_Ayurvedas_Logistics_Report_${dateStamp}`;
      if (format === 'csv') exportToCSV(rows, fileName);
      else exportToExcel(rows, fileName, 'Logistics Report');
    }
  };

  const salesColumns = [
    {
      header: 'Order Reference',
      cell: (row) => (
        <span className="font-mono text-xs font-bold text-slate-900">{row.orderNumber}</span>
      )
    },
    {
      header: 'Customer',
      cell: (row) => <span className="text-xs text-slate-700">{row.customerId?.name}</span>
    },
    {
      header: 'Amount',
      cell: (row) => (
        <span className="text-xs font-bold text-slate-900">₹{row.grandTotal?.toLocaleString()}</span>
      )
    },
    {
      header: 'Status',
      cell: (row) => <Badge variant="primary" size="sm">{row.status}</Badge>
    },
    {
      header: 'Branch',
      cell: (row) => <span className="text-xs text-slate-600">{row.branchId?.name}</span>
    },
    {
      header: 'Date',
      align: 'right',
      cell: (row) => (
        <span className="text-xs text-slate-500">{new Date(row.createdAt).toLocaleDateString()}</span>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Executive Reports & Analytics</h2>
          <p className="text-xs text-slate-500">Comprehensive sales volume, lead funnel, and delivery success analysis</p>
        </div>
        <ExportButton
          onExport={handleExportReport}
          label="Export Report"
          disabled={
            (activeReport === 'SALES' && salesOrders.length === 0) ||
            (activeReport === 'LEADS' && !leadReportData) ||
            (activeReport === 'DELIVERY' && !deliveryReportData)
          }
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveReport('SALES')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeReport === 'SALES' ? 'bg-ayur-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          💰 Sales & Revenue Ledger
        </button>
        <button
          onClick={() => setActiveReport('LEADS')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeReport === 'LEADS' ? 'bg-ayur-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          📊 Lead Funnel & Channels
        </button>
        <button
          onClick={() => setActiveReport('DELIVERY')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeReport === 'DELIVERY' ? 'bg-ayur-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          🚚 Logistics & RTO Analytics
        </button>
      </div>

      {/* Date Filter Bar */}
      {activeReport !== 'DELIVERY' && (
        <div className="bento-card p-3">
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onChange={({ startDate: s, endDate: e }) => {
              setStartDate(s);
              setEndDate(e);
            }}
          />
        </div>
      )}

      {/* Sales Report View */}
      {activeReport === 'SALES' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="text-xs text-slate-500 font-semibold uppercase">Total Filtered Revenue</div>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                ₹{(salesSummary.totalRevenue || 0).toLocaleString()}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-slate-500 font-semibold uppercase">Total Filtered Orders</div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {salesReportData?.meta?.total || 0}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-slate-500 font-semibold uppercase">Average Order Value (AOV)</div>
              <div className="text-2xl font-black text-ayur-800 mt-1">
                ₹{Math.round(salesSummary.avgOrderValue || 0).toLocaleString()}
              </div>
            </Card>
          </div>

          <Table
            columns={salesColumns}
            data={salesOrders}
            isLoading={isSalesLoading}
            emptyMessage="No sales recorded for this date range."
          />
        </div>
      )}

      {/* Lead Report View */}
      {activeReport === 'LEADS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card title="Leads by Source Channel">
            <div className="space-y-2 text-xs">
              {(leadReportData?.bySource || []).map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg">
                  <span className="font-semibold text-slate-800">{item._id || 'DIRECT'}</span>
                  <span className="font-bold text-ayur-800">{item.count} leads</span>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Leads by Status Pipeline">
            <div className="space-y-2 text-xs">
              {(leadReportData?.byStatus || []).map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg">
                  <span className="font-semibold text-slate-800">{item._id}</span>
                  <span className="font-bold text-slate-900">{item.count} leads</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Delivery Report View */}
      {activeReport === 'DELIVERY' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-xs text-slate-500 font-semibold uppercase">Total Dispatched</div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {deliveryReportData?.totalShipments || 0}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-slate-500 font-semibold uppercase">Successfully Delivered</div>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                {deliveryReportData?.deliveredCount || 0}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-slate-500 font-semibold uppercase">Delivery Success Rate</div>
              <div className="text-2xl font-black text-ayur-800 mt-1">
                {deliveryReportData?.deliverySuccessRate || 0}%
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-slate-500 font-semibold uppercase">RTO Return Rate</div>
              <div className="text-2xl font-black text-rose-700 mt-1">
                {deliveryReportData?.rtoRate || 0}%
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReportsHubPage;
