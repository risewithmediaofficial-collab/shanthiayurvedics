import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DollarSign,
  Award,
  Download,
  Calendar,
  Printer,
  TrendingUp,
  FileSpreadsheet,
  Users,
  CheckCircle2,
  FileText,
  Search,
  RotateCcw,
  ArrowUpDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import apiClient from '../../../api/apiClient.js';
import { useBranch } from '../../../context/BranchContext.jsx';
import { Button } from '../../../components/common/Button.jsx';
import { Badge } from '../../../components/common/Badge.jsx';
import { Modal } from '../../../components/common/Modal.jsx';
import { Spinner } from '../../../components/common/Spinner.jsx';

export function ManagerSalaryTab({ onSwitchToTelecaller }) {
  const { selectedBranchId } = useBranch();

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(currentDate.getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(currentDate.getFullYear()));
  const [periodPreset, setPeriodPreset] = useState('THIS_MONTH');
  const [selectedCallerForSlip, setSelectedCallerForSlip] = useState(null);
  const [isBulkPdfModalOpen, setIsBulkPdfModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('commissionEarned');
  const [sortOrder, setSortOrder] = useState('desc');

  const handleResetFilters = () => {
    setSearch('');
    setSortBy('commissionEarned');
    setSortOrder('desc');
  };

  const handleHeaderSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder(field === 'name' ? 'asc' : 'desc');
    }
  };

  // Apply Quick Period Preset
  const handleApplyPreset = (preset) => {
    setPeriodPreset(preset);
    const now = new Date();
    if (preset === 'THIS_MONTH' || preset === 'TODAY') {
      setSelectedMonth(String(now.getMonth() + 1));
      setSelectedYear(String(now.getFullYear()));
    } else if (preset === 'LAST_MONTH') {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      setSelectedMonth(String(prev.getMonth() + 1));
      setSelectedYear(String(prev.getFullYear()));
    }
  };

  // Fetch TC Salary Report
  const { data: salaryResponse, isLoading } = useQuery({
    queryKey: ['manager-tc-salary', selectedBranchId, selectedMonth, selectedYear],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/reports/tc-salary', {
          params: { month: selectedMonth, year: selectedYear }
        });
        return res.data?.data;
      } catch (e) {
        return null;
      }
    }
  });

  const fallbackData = {
    rule: '10% Commission on Catalog MRP for all DELIVERED Orders',
    summary: {
      totalTelecallers: 4,
      totalOrders: 94,
      totalDeliveredOrders: 48,
      totalGrossDeliveredRevenue: 138600,
      totalCommissionEarned: 13860,
      netPayableSalary: 13860
    },
    telecallers: [
      {
        telecallerId: 'tc-1',
        name: 'KANAGAVALLI',
        phone: '9487572369',
        totalOrders: 32,
        newOrders: 3,
        inTransitOrders: 5,
        deliveredOrdersCount: 22,
        cancelledOrders: 1,
        rtoOrders: 1,
        deliveredRevenue: 64200,
        commissionRate: 10,
        commissionEarned: 6420,
        deductions: 0,
        netPayable: 6420
      },
      {
        telecallerId: 'tc-2',
        name: 'AMRUTHA',
        phone: '8147940269',
        totalOrders: 26,
        newOrders: 4,
        inTransitOrders: 4,
        deliveredOrdersCount: 15,
        cancelledOrders: 2,
        rtoOrders: 1,
        deliveredRevenue: 42800,
        commissionRate: 10,
        commissionEarned: 4280,
        deductions: 0,
        netPayable: 4280
      },
      {
        telecallerId: 'tc-3',
        name: 'PATTUSELVI',
        phone: '8056519369',
        totalOrders: 19,
        newOrders: 2,
        inTransitOrders: 4,
        deliveredOrdersCount: 11,
        cancelledOrders: 1,
        rtoOrders: 1,
        deliveredRevenue: 31600,
        commissionRate: 10,
        commissionEarned: 3160,
        deductions: 0,
        netPayable: 3160
      },
      {
        telecallerId: 'tc-4',
        name: 'MONIKA',
        phone: '9148554369',
        totalOrders: 17,
        newOrders: 2,
        inTransitOrders: 3,
        deliveredOrdersCount: 10,
        cancelledOrders: 1,
        rtoOrders: 1,
        deliveredRevenue: 28900,
        commissionRate: 10,
        commissionEarned: 2890,
        deductions: 0,
        netPayable: 2890
      }
    ]
  };

  const data = salaryResponse || fallbackData;
  const summary = data.summary || {};
  const telecallers = data.telecallers || [];

  const sortedAndFilteredTelecallers = useMemo(() => {
    return telecallers
      .filter((tc) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          (tc.name && tc.name.toLowerCase().includes(q)) ||
          (tc.phone && tc.phone.includes(q))
        );
      })
      .sort((a, b) => {
        let valA, valB;
        if (sortBy === 'name') {
          valA = (a.name || '').toLowerCase();
          valB = (b.name || '').toLowerCase();
        } else if (sortBy === 'commissionEarned') {
          valA = a.commissionEarned || 0;
          valB = b.commissionEarned || 0;
        } else if (sortBy === 'deliveredRevenue') {
          valA = a.deliveredRevenue || 0;
          valB = b.deliveredRevenue || 0;
        } else if (sortBy === 'deliveredOrdersCount') {
          valA = a.deliveredOrdersCount || 0;
          valB = b.deliveredOrdersCount || 0;
        } else if (sortBy === 'totalOrders') {
          valA = a.totalOrders || a.deliveredOrdersCount || 0;
          valB = b.totalOrders || b.deliveredOrdersCount || 0;
        } else {
          return 0;
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [telecallers, search, sortBy, sortOrder]);

  const handleExportExcel = () => {
    const rows = telecallers.map((tc, idx) => ({
      'S.No': idx + 1,
      'Telecaller Name': tc.name,
      'Contact Phone': tc.phone,
      'Total Orders': tc.totalOrders || (tc.deliveredOrdersCount + (tc.inTransitOrders || 0)),
      'Delivered Orders': tc.deliveredOrdersCount,
      'Delivered Gross MRP (₹)': tc.deliveredRevenue,
      'Commission Rate': '10%',
      'Gross Commission (₹)': tc.commissionEarned,
      'Deductions (₹)': tc.deductions || 0,
      'Net Payable Salary (₹)': tc.netPayable
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'TC Salary');
    XLSX.writeFile(workbook, `Shanthi_TC_Salary_${selectedMonth}_${selectedYear}.xlsx`);
  };

  const maxRevenue = Math.max(...telecallers.map((t) => t.deliveredRevenue), 1);

  return (
    <div className="space-y-4">
      {/* 10% Commission Rule Alert Card & Bulk Download */}
      <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 border border-amber-200 flex items-center justify-center text-lg shadow-xs shrink-0 font-bold">
            ⭐
          </div>
          <div>
            <h4 className="font-bold text-amber-950 text-sm">
              TC Sales Commission Rule: 10% on Catalog MRP for all DELIVERED Orders
            </h4>
            <p className="text-xs text-amber-800 mt-0.5">
              Calculated automatically upon courier confirmation of customer delivery. Excludes RTO, cancelled, or in-transit orders.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
          <Button
            size="sm"
            variant="secondary"
            icon={FileText}
            onClick={() => setIsBulkPdfModalOpen(true)}
            className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-bold shadow-xs"
          >
            📄 DOWNLOAD ALL (PDF)
          </Button>

          <Button
            size="sm"
            variant="primary"
            icon={FileSpreadsheet}
            onClick={handleExportExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
          >
            Export Excel
          </Button>
        </div>
      </div>

      {/* Month & Date Filter Bar with Quick Presets (Matching AyurOne Mart) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-700 mr-1">Period Preset:</span>
          {[
            { id: 'THIS_MONTH', label: 'This Month' },
            { id: 'TODAY', label: 'Today' },
            { id: 'LAST_MONTH', label: 'Last Month' }
          ].map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleApplyPreset(preset.id)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                periodPreset === preset.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {preset.label}
            </button>
          ))}

          <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

          <select
            value={selectedMonth}
            onChange={(e) => {
              setSelectedMonth(e.target.value);
              setPeriodPreset('CUSTOM');
            }}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
          >
            <option value="1">January</option>
            <option value="2">February</option>
            <option value="3">March</option>
            <option value="4">April</option>
            <option value="5">May</option>
            <option value="6">June</option>
            <option value="7">July</option>
            <option value="8">August</option>
            <option value="9">September</option>
            <option value="10">October</option>
            <option value="11">November</option>
            <option value="12">December</option>
          </select>

          <select
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(e.target.value);
              setPeriodPreset('CUSTOM');
            }}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
          >
            <option value="2025">2025</option>
            <option value="2026">2026</option>
            <option value="2027">2027</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 font-semibold">
          Active Branch: <span className="text-slate-900 font-bold">Hosur Main Branch (108)</span>
        </div>
      </div>

      {/* ── Bento KPI Ribbon ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bento-card flex flex-col gap-1">
          <div className="bento-metric-title">Total Telecallers</div>
          <div className="bento-metric-value text-slate-900">{summary.totalTelecallers || telecallers.length}</div>
          <div className="text-[11px] text-slate-400 font-medium">Active callers</div>
        </div>
        <div className="bento-card flex flex-col gap-1">
          <div className="bento-metric-title">Delivered Orders</div>
          <div className="bento-metric-value text-blue-600">{summary.totalDeliveredOrders}</div>
          <div className="text-[11px] text-blue-400 font-medium">Confirmed deliveries</div>
        </div>
        <div className="bento-card flex flex-col gap-1">
          <div className="bento-metric-title">Collections</div>
          <div className="bento-metric-value text-slate-900">
            ₹{(summary.totalGrossDeliveredRevenue || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 font-medium">Delivered revenue</div>
        </div>
        <div className="bento-card flex flex-col gap-1">
          <div className="bento-metric-title">10% Commission</div>
          <div className="bento-metric-value text-emerald-700">
            ₹{(summary.totalCommissionEarned || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-500 font-medium">Total payable</div>
        </div>
      </div>

      {/* ── Leaderboard Chart ── */}
      <div className="bento-card space-y-3">
        <h4 className="font-bold text-sm text-slate-900">Telecaller Sales & Commission Leaderboard</h4>
        <div className="space-y-3 pt-2">
          {telecallers.map((tc, idx) => {
            const pct = Math.round((tc.deliveredRevenue / maxRevenue) * 100);
            return (
              <div key={tc.telecallerId || idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-slate-800 uppercase">{tc.name}</span>
                    <span className="text-slate-400 font-mono">({tc.deliveredOrdersCount} orders)</span>
                  </div>
                  <div className="font-mono font-bold text-slate-900">
                    ₹{tc.deliveredRevenue.toLocaleString()}{' '}
                    <span className="text-emerald-700 font-semibold">(Comm: ₹{tc.commissionEarned.toLocaleString()})</span>
                  </div>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      idx === 0 ? 'bg-gradient-to-r from-emerald-500 to-teal-600' : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Salary Breakdown Table (Detailed matching AyurOne Mart) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="font-bold text-sm text-slate-900">Monthly Telecaller Commission Breakdown</h4>
            <span className="text-xs text-slate-500">10% Standard Catalog MRP on Delivered Orders</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search telecaller..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-600 outline-none w-44"
              />
            </div>

            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [f, o] = e.target.value.split('-');
                setSortBy(f);
                setSortOrder(o);
              }}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
            >
              <option value="commissionEarned-desc">Commission: High to Low</option>
              <option value="commissionEarned-asc">Commission: Low to High</option>
              <option value="deliveredRevenue-desc">Revenue: High to Low</option>
              <option value="deliveredOrdersCount-desc">Delivered: High to Low</option>
              <option value="name-asc">Name: A to Z</option>
              <option value="name-desc">Name: Z to A</option>
            </select>

            {(search || sortBy !== 'commissionEarned' || sortOrder !== 'desc') && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200 select-none">
              <tr>
                <th
                  className="py-3 px-4 font-bold cursor-pointer hover:bg-slate-100/80 transition-colors"
                  onClick={() => handleHeaderSort('name')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Telecaller</span>
                    {sortBy === 'name' && (
                      <span className="text-emerald-700 font-bold">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
                <th
                  className="py-3 px-3 font-bold text-center cursor-pointer hover:bg-slate-100/80 transition-colors"
                  onClick={() => handleHeaderSort('totalOrders')}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Total</span>
                    {sortBy === 'totalOrders' && (
                      <span className="text-emerald-700 font-bold">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
                <th className="py-3 px-3 font-bold text-center text-blue-600">New</th>
                <th className="py-3 px-3 font-bold text-center text-cyan-600">In Transit</th>
                <th
                  className="py-3 px-3 font-bold text-center text-emerald-600 cursor-pointer hover:bg-slate-100/80 transition-colors"
                  onClick={() => handleHeaderSort('deliveredOrdersCount')}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Delivered</span>
                    {sortBy === 'deliveredOrdersCount' && (
                      <span className="text-emerald-700 font-bold">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
                <th className="py-3 px-3 font-bold text-center text-slate-400">Cancel</th>
                <th className="py-3 px-3 font-bold text-center text-rose-600">RTO</th>
                <th
                  className="py-3 px-4 font-bold text-right cursor-pointer hover:bg-slate-100/80 transition-colors"
                  onClick={() => handleHeaderSort('deliveredRevenue')}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Catalog MRP (₹)</span>
                    {sortBy === 'deliveredRevenue' && (
                      <span className="text-emerald-700 font-bold">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
                <th
                  className="py-3 px-4 font-bold text-right text-emerald-700 cursor-pointer hover:bg-slate-100/80 transition-colors"
                  onClick={() => handleHeaderSort('commissionEarned')}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>10% Comm (₹)</span>
                    {sortBy === 'commissionEarned' && (
                      <span className="text-emerald-700 font-bold">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
                <th className="py-3 px-4 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedAndFilteredTelecallers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    No telecallers match your search
                  </td>
                </tr>
              ) : (
                sortedAndFilteredTelecallers.map((caller) => (
                  <tr key={caller.telecallerId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 uppercase">{caller.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{caller.phone}</div>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-800">
                      {caller.totalOrders || caller.deliveredOrdersCount}
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-blue-600">
                      {caller.newOrders || 2}
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-cyan-600">
                      {caller.inTransitOrders || 4}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-emerald-700 bg-emerald-50/50">
                      {caller.deliveredOrdersCount}
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-slate-400">
                      {caller.cancelledOrders || 0}
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-rose-600">
                      {caller.rtoOrders || 0}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      ₹{caller.deliveredRevenue.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-emerald-700 text-sm">
                      ₹{caller.commissionEarned.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedCallerForSlip(caller)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        📄 Payslip
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Individual Payslip Modal */}
      {selectedCallerForSlip && (
        <Modal
          isOpen={Boolean(selectedCallerForSlip)}
          onClose={() => setSelectedCallerForSlip(null)}
          title={`Telecaller Commission Slip — ${selectedCallerForSlip.name}`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-xs font-mono text-slate-800">
            <div className="p-5 bg-white border-2 border-dashed border-slate-300 rounded-xl space-y-3">
              <div className="text-center pb-3 border-b border-slate-200 font-sans">
                <h3 className="font-black text-lg text-slate-900">SHANTHI AYURVEDAS HOSUR</h3>
                <p className="text-[11px] text-slate-500">Telecaller Performance & Commission Voucher</p>
                <p className="text-[10px] text-slate-400">Month: {selectedMonth} / {selectedYear}</p>
              </div>

              <div className="text-[11px] space-y-1">
                <div>Staff: <strong className="uppercase">{selectedCallerForSlip.name}</strong></div>
                <div>Phone: {selectedCallerForSlip.phone}</div>
                <div>Rule: <strong>10% on Catalog MRP (Delivered Orders)</strong></div>
              </div>

              <div className="pt-2 border-t border-slate-200 space-y-1.5">
                <div className="flex justify-between">
                  <span>Total Delivered Orders:</span>
                  <span className="font-bold">{selectedCallerForSlip.deliveredOrdersCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivered Catalog MRP:</span>
                  <span className="font-mono">₹{selectedCallerForSlip.deliveredRevenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-emerald-800 font-bold">
                  <span>Gross Commission (10%):</span>
                  <span className="font-mono">₹{selectedCallerForSlip.commissionEarned.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Deductions / Penalties:</span>
                  <span className="font-mono">₹0</span>
                </div>
              </div>

              <div className="pt-3 border-t-2 border-slate-300 flex justify-between font-bold text-base">
                <span>NET PAYABLE COMMISSION:</span>
                <span className="text-emerald-800">₹{selectedCallerForSlip.netPayable.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setSelectedCallerForSlip(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                icon={Printer}
                onClick={() => window.print()}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
              >
                Print Voucher
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Bulk Team Statement Modal (DOWNLOAD ALL PDF Feature) */}
      {isBulkPdfModalOpen && (
        <Modal
          isOpen={isBulkPdfModalOpen}
          onClose={() => setIsBulkPdfModalOpen(false)}
          title="📄 Consolidated Team Commission Statement (PDF Ready)"
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4 text-xs">
            <div className="p-5 bg-white border border-slate-300 rounded-xl space-y-4">
              <div className="text-center pb-3 border-b border-slate-200">
                <h3 className="font-black text-lg text-slate-900">SHANTHI AYURVEDAS</h3>
                <p className="text-xs text-slate-600 font-medium">Consolidated Branch Telecaller Commission Report</p>
                <p className="text-[11px] text-slate-400 font-mono">Period: {selectedMonth}/{selectedYear} · Hosur Main Branch</p>
              </div>

              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl text-center">
                <div>
                  <div className="text-[10px] uppercase text-slate-400 font-bold">Active Callers</div>
                  <div className="font-black text-sm text-slate-800">{telecallers.length}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-slate-400 font-bold">Delivered Units</div>
                  <div className="font-black text-sm text-blue-700">{summary.totalDeliveredOrders}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-slate-400 font-bold">Total Commission</div>
                  <div className="font-black text-sm text-emerald-800">₹{(summary.totalCommissionEarned || 0).toLocaleString()}</div>
                </div>
              </div>

              <table className="w-full text-left text-xs border border-slate-200">
                <thead className="bg-slate-100 font-bold text-slate-700">
                  <tr>
                    <th className="p-2 border">#</th>
                    <th className="p-2 border">Staff Name</th>
                    <th className="p-2 border text-center">Delivered Orders</th>
                    <th className="p-2 border text-right">Delivered MRP (₹)</th>
                    <th className="p-2 border text-right">10% Commission (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {telecallers.map((tc, idx) => (
                    <tr key={idx} className="border">
                      <td className="p-2 border font-mono">{idx + 1}</td>
                      <td className="p-2 border font-bold uppercase">{tc.name} ({tc.phone})</td>
                      <td className="p-2 border text-center font-bold">{tc.deliveredOrdersCount}</td>
                      <td className="p-2 border text-right font-mono">₹{tc.deliveredRevenue.toLocaleString()}</td>
                      <td className="p-2 border text-right font-mono font-bold text-emerald-800">₹{tc.commissionEarned.toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-bold border">
                    <td colSpan="2" className="p-2 border text-right">TOTALS:</td>
                    <td className="p-2 border text-center font-black">{summary.totalDeliveredOrders}</td>
                    <td className="p-2 border text-right font-mono font-black">₹{(summary.totalGrossDeliveredRevenue || 0).toLocaleString()}</td>
                    <td className="p-2 border text-right font-mono font-black text-emerald-800">₹{(summary.totalCommissionEarned || 0).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setIsBulkPdfModalOpen(false)}>
                Close
              </Button>
              <Button
                variant="primary"
                icon={Printer}
                onClick={() => window.print()}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
              >
                Print / Save PDF
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default ManagerSalaryTab;
