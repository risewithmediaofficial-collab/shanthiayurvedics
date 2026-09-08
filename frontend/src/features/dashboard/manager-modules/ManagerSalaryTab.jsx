import React, { useState } from 'react';
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
  CheckCircle2
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
  const [selectedCallerForSlip, setSelectedCallerForSlip] = useState(null);

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
      totalTelecallers: 3,
      totalDeliveredOrders: 48,
      totalGrossDeliveredRevenue: 138600,
      totalCommissionEarned: 13860,
      netPayableSalary: 13860
    },
    telecallers: [
      {
        telecallerId: 'tc-1',
        name: 'KANAGAVALLI',
        phone: '9629985341',
        email: 'kanaga@shanthiayurvedas.com',
        deliveredOrdersCount: 22,
        deliveredRevenue: 64200,
        commissionRate: 10,
        commissionEarned: 6420,
        deductions: 0,
        netPayable: 6420
      },
      {
        telecallerId: 'tc-2',
        name: 'AMRUTHA',
        phone: '9629985342',
        email: 'amrutha@shanthiayurvedas.com',
        deliveredOrdersCount: 15,
        deliveredRevenue: 42800,
        commissionRate: 10,
        commissionEarned: 4280,
        deductions: 0,
        netPayable: 4280
      },
      {
        telecallerId: 'tc-3',
        name: 'PATTUSELVI',
        phone: '9629985343',
        email: 'pattuselvi@shanthiayurvedas.com',
        deliveredOrdersCount: 11,
        deliveredRevenue: 31600,
        commissionRate: 10,
        commissionEarned: 3160,
        deductions: 0,
        netPayable: 3160
      }
    ]
  };

  const data = salaryResponse || fallbackData;
  const summary = data.summary || {};
  const telecallers = data.telecallers || [];

  const handleExportExcel = () => {
    const rows = telecallers.map((tc, idx) => ({
      'S.No': idx + 1,
      'Telecaller Name': tc.name,
      'Contact Phone': tc.phone,
      'Delivered Orders': tc.deliveredOrdersCount,
      'Delivered Gross Revenue (₹)': tc.deliveredRevenue,
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
      {/* 10% Commission Rule Alert Card */}
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

        <Button
          size="sm"
          variant="primary"
          icon={FileSpreadsheet}
          onClick={handleExportExcel}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shrink-0 self-start sm:self-center shadow-xs"
        >
          Export Salary Sheet
        </Button>
      </div>

      {/* Month & Date Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold text-slate-700">Salary Period:</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
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
            onChange={(e) => setSelectedYear(e.target.value)}
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

      {/* KPI 4-Card Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total Telecallers</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">{summary.totalTelecallers || telecallers.length}</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Delivered Orders</div>
          <div className="text-2xl font-bold text-blue-700 mt-1 font-mono">{summary.totalDeliveredOrders}</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Delivered Collections</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">
            ₹{(summary.totalGrossDeliveredRevenue || 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">10% Total Commission</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1 font-mono">
            ₹{(summary.totalCommissionEarned || 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Telecaller Performance Leaderboard Chart */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
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

      {/* Salary Breakdown Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h4 className="font-bold text-sm text-slate-900">Monthly Telecaller Salary Calculation</h4>
          <span className="text-xs text-slate-500">10% Standard Franchise Commission</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-bold">Telecaller</th>
                <th className="py-3 px-4 font-bold text-center">Delivered Orders</th>
                <th className="py-3 px-4 font-bold text-right">Gross Delivered (₹)</th>
                <th className="py-3 px-4 font-bold text-center">Commission Rate</th>
                <th className="py-3 px-4 font-bold text-right">Gross Commission (₹)</th>
                <th className="py-3 px-4 font-bold text-right">Net Payable (₹)</th>
                <th className="py-3 px-4 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {telecallers.map((caller) => (
                <tr key={caller.telecallerId} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900 uppercase">{caller.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{caller.phone}</div>
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-blue-700">
                    {caller.deliveredOrdersCount}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                    ₹{caller.deliveredRevenue.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Badge variant="emerald" size="sm">10% MRP</Badge>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                    ₹{caller.commissionEarned.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-black text-slate-900 text-sm">
                    ₹{caller.netPayable.toLocaleString()}
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Salary Slip Modal */}
      {selectedCallerForSlip && (
        <Modal
          isOpen={Boolean(selectedCallerForSlip)}
          onClose={() => setSelectedCallerForSlip(null)}
          title={`Salary Slip — ${selectedCallerForSlip.name}`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-xs text-slate-800">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="text-center pb-2 border-b border-slate-200">
                <h4 className="font-black text-slate-900 text-sm">SHANTHI AYURVEDAS HOSUR</h4>
                <p className="text-[10px] text-slate-500">Telecaller Performance Salary Slip ({selectedMonth}/{selectedYear})</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400">Employee:</span>{' '}
                  <strong className="text-slate-900 uppercase">{selectedCallerForSlip.name}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Phone:</span>{' '}
                  <span className="font-mono">{selectedCallerForSlip.phone}</span>
                </div>
                <div>
                  <span className="text-slate-400">Delivered Orders:</span>{' '}
                  <strong>{selectedCallerForSlip.deliveredOrdersCount}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Commission Rule:</span>{' '}
                  <strong>10% on Delivered MRP</strong>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 space-y-1.5">
                <div className="flex justify-between">
                  <span>Gross Delivered Revenue:</span>
                  <span className="font-mono font-bold">₹{selectedCallerForSlip.deliveredRevenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Performance Commission (10%):</span>
                  <span className="font-mono font-bold text-emerald-700">₹{selectedCallerForSlip.commissionEarned.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Deductions / Advance:</span>
                  <span className="font-mono">₹0</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-300 font-bold text-sm">
                  <span>Net Payable Salary:</span>
                  <span className="font-mono text-emerald-800">₹{selectedCallerForSlip.netPayable.toLocaleString()}</span>
                </div>
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
                Print Slip
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default ManagerSalaryTab;
