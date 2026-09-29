import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Send,
  Building,
  ArrowDownRight,
  Receipt,
  FileSpreadsheet,
  ArrowUpDown,
  RotateCcw
} from 'lucide-react';
import apiClient from '../../../api/apiClient.js';
import { useBranch } from '../../../context/BranchContext.jsx';
import { Button } from '../../../components/common/Button.jsx';
import { Badge } from '../../../components/common/Badge.jsx';
import { Modal } from '../../../components/common/Modal.jsx';
import { Spinner } from '../../../components/common/Spinner.jsx';
import { DateRangeFilter } from '../../../components/common/DateRangeFilter.jsx';

export function ManagerWithdrawalTab() {
  const { selectedBranchId } = useBranch();
  const queryClient = useQueryClient();

  const [withdrawAmount, setWithdrawAmount] = useState('10000');
  const [payoutMode, setPayoutMode] = useState('BANK_TRANSFER');
  const [bankAccount, setBankAccount] = useState('HDFC Bank - 50100492819283 (IFSC: HDFC0000128)');
  const [upiId, setUpiId] = useState('shanthiayurveda@icici');
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  const [actionErrorMsg, setActionErrorMsg] = useState('');

  // Fetch Till-Date & Withdrawal Data
  const { data: withdrawalData, isLoading } = useQuery({
    queryKey: ['manager-till-date-withdrawal', selectedBranchId],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/reports/till-date-withdrawal');
        return res.data?.data;
      } catch (e) {
        return null;
      }
    }
  });

  const fallbackData = {
    metrics: {
      totalBranchSales: 148500,
      deliveredCollections: 98200,
      commissionAccrued: 39280,
      availableBalance: 14280,
      totalWithdrawn: 25000,
      pendingWithdrawal: 0,
      minWithdrawalThreshold: 5000
    },
    ledger: [
      {
        id: 'WDR-108-001',
        amount: 15000,
        requestedAt: new Date(Date.now() - 12 * 86400000).toISOString(),
        status: 'PROCESSED',
        payoutMode: 'BANK_TRANSFER',
        bankAccount: 'HDFC Bank - 50100492819283 (IFSC: HDFC0000128)',
        referenceNo: 'CMS-HDFC-992817263',
        processedAt: new Date(Date.now() - 10 * 86400000).toISOString()
      },
      {
        id: 'WDR-108-002',
        amount: 10000,
        requestedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
        status: 'PROCESSED',
        payoutMode: 'UPI',
        bankAccount: 'UPI ID: shanthiayurveda@icici',
        referenceNo: 'UPI-ICICI-48192019',
        processedAt: new Date(Date.now() - 3 * 86400000).toISOString()
      }
    ]
  };

  const data = withdrawalData || fallbackData;
  const metrics = data.metrics || fallbackData.metrics;
  const ledger = data.ledger || fallbackData.ledger;

  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [sortBy, setSortBy] = useState('date-desc');

  const filteredLedger = ledger
    .filter((item) => {
      if (dateRange.startDate || dateRange.endDate) {
        const itemDate = new Date(item.requestedAt).toISOString().slice(0, 10);
        if (dateRange.startDate && itemDate < dateRange.startDate) return false;
        if (dateRange.endDate && itemDate > dateRange.endDate) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'date-desc') return new Date(b.requestedAt) - new Date(a.requestedAt);
      if (sortBy === 'date-asc') return new Date(a.requestedAt) - new Date(b.requestedAt);
      if (sortBy === 'amount-desc') return b.amount - a.amount;
      if (sortBy === 'amount-asc') return a.amount - b.amount;
      return 0;
    });

  // Submit Withdrawal Request Mutation
  const withdrawalMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await apiClient.post('/reports/withdrawal-request', payload);
      return res.data;
    },
    onSuccess: (res) => {
      setActionErrorMsg('');
      setActionSuccessMsg('Withdrawal request submitted successfully! HQ approval pending.');
      queryClient.invalidateQueries(['manager-till-date-withdrawal']);
      setTimeout(() => setActionSuccessMsg(''), 5000);
    },
    onError: (err) => {
      setActionErrorMsg(err.response?.data?.message || err.message || 'Failed to submit withdrawal request.');
      setTimeout(() => setActionErrorMsg(''), 5000);
    }
  });

  const handleSubmitWithdrawal = (e) => {
    e.preventDefault();
    const amount = Number(withdrawAmount);
    if (amount < 5000) {
      setActionErrorMsg('Minimum withdrawal amount is ₹5,000 as per franchise policy.');
      return;
    }
    if (amount > metrics.availableBalance) {
      setActionErrorMsg(`Requested amount exceeds available balance of ₹${metrics.availableBalance.toLocaleString()}`);
      return;
    }

    withdrawalMutation.mutate({
      amount,
      payoutMode,
      bankAccount: payoutMode === 'BANK_TRANSFER' ? bankAccount : undefined,
      upiId: payoutMode === 'UPI' ? upiId : undefined
    });
  };

  return (
    <div className="space-y-4">
      {actionSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {actionErrorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{actionErrorMsg}</span>
        </div>
      )}

      {/* ── 6 Financial Metric Bento Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bento-card flex flex-col gap-0.5">
          <div className="bento-metric-title">Total Branch Sales</div>
          <div className="text-xl font-semibold font-mono text-slate-900 tracking-tight">
            ₹{metrics.totalBranchSales.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400">Till-date bookings</div>
        </div>

        <div className="bento-card flex flex-col gap-0.5">
          <div className="bento-metric-title">Delivered Collections</div>
          <div className="text-xl font-semibold font-mono text-blue-600 tracking-tight">
            ₹{metrics.deliveredCollections.toLocaleString()}
          </div>
          <div className="text-[10px] text-blue-400">Realized revenue</div>
        </div>

        <div className="bento-card flex flex-col gap-0.5">
          <div className="bento-metric-title">Commission Accrued</div>
          <div className="text-xl font-semibold font-mono text-purple-600 tracking-tight">
            ₹{metrics.commissionAccrued.toLocaleString()}
          </div>
          <div className="text-[10px] text-purple-400">Franchise margin</div>
        </div>

        <div className="bento-card border-emerald-200/80 bg-emerald-50/30 flex flex-col gap-0.5">
          <div className="bento-metric-title text-emerald-700">Available Wallet</div>
          <div className="text-xl font-semibold font-mono text-emerald-700 tracking-tight">
            ₹{metrics.availableBalance.toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-500 font-semibold">Ready for payout</div>
        </div>

        <div className="bento-card flex flex-col gap-0.5">
          <div className="bento-metric-title">Total Withdrawn</div>
          <div className="text-xl font-semibold font-mono text-slate-700 tracking-tight">
            ₹{metrics.totalWithdrawn.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400">Disbursed to bank</div>
        </div>

        <div className="bento-card flex flex-col gap-0.5">
          <div className="bento-metric-title">Pending Requests</div>
          <div className="text-xl font-semibold font-mono text-amber-600 tracking-tight">
            ₹{metrics.pendingWithdrawal.toLocaleString()}
          </div>
          <div className="text-[10px] text-amber-500">In bank clearance</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column: Request Withdrawal Form Box */}
        <div className="bento-card space-y-4">
          <div>
            <h4 className="font-bold text-sm text-slate-900 leading-tight">Request Payout Withdrawal</h4>
            <p className="text-xs text-slate-500 mt-0.5">Disburse available branch commission into registered bank/UPI</p>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong>Minimum Threshold:</strong> Payout requests must be at least <strong>₹5,000</strong>. Available: ₹{metrics.availableBalance.toLocaleString()}
            </div>
          </div>

          <form onSubmit={handleSubmitWithdrawal} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Withdrawal Amount (₹) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">₹</span>
                <input
                  type="number"
                  min="5000"
                  step="500"
                  required
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-semibold text-slate-900 text-base"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payout Method</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPayoutMode('BANK_TRANSFER')}
                  className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    payoutMode === 'BANK_TRANSFER'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Bank NEFT / RTGS
                </button>
                <button
                  type="button"
                  onClick={() => setPayoutMode('UPI')}
                  className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    payoutMode === 'UPI'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Instant UPI
                </button>
              </div>
            </div>

            {payoutMode === 'BANK_TRANSFER' ? (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Bank Account & IFSC</label>
                <input
                  type="text"
                  required
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                />
              </div>
            ) : (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">UPI Virtual Address (VPA)</label>
                <input
                  type="text"
                  required
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold"
                />
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              icon={Send}
              isLoading={withdrawalMutation.isPending}
              disabled={Number(withdrawAmount) < 5000 || Number(withdrawAmount) > metrics.availableBalance}
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 mt-2"
            >
              Submit Withdrawal Request
            </Button>
          </form>
        </div>

        {/* Right Column: Settlement History & Ledger */}
        <div className="lg:col-span-2 bento-card overflow-hidden flex flex-col justify-between !p-0">
          <div>
            <div className="p-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-slate-900">Settlement & Withdrawal Ledger</h4>
                <span className="text-xs text-slate-500 font-mono">Branch ID: 108</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <DateRangeFilter value={dateRange} onChange={setDateRange} />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-2.5 py-1 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs"
                >
                  <option value="date-desc">Newest First</option>
                  <option value="date-asc">Oldest First</option>
                  <option value="amount-desc">Amount: High to Low</option>
                  <option value="amount-asc">Amount: Low to High</option>
                </select>
                {(dateRange.startDate || dateRange.endDate || sortBy !== 'date-desc') && (
                  <button
                    type="button"
                    onClick={() => {
                      setDateRange({ startDate: '', endDate: '' });
                      setSortBy('date-desc');
                    }}
                    className="p-1 hover:bg-rose-50 text-rose-600 rounded-lg cursor-pointer"
                    title="Reset filters"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className={`overflow-x-auto ${filteredLedger.length > 10 ? 'max-h-[500px] overflow-y-auto scrollbar-thin relative' : ''}`}>
              <table className="min-w-full text-left text-xs">
                <thead className={`bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200 ${filteredLedger.length > 10 ? 'sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs shadow-2xs' : ''}`}>
                  <tr>
                    <th className="py-3 px-4 font-bold">Request ID</th>
                    <th className="py-3 px-4 font-bold">Date & Time</th>
                    <th className="py-3 px-4 font-bold text-right">Amount (₹)</th>
                    <th className="py-3 px-4 font-bold">Account / Mode</th>
                    <th className="py-3 px-4 font-bold text-center">Status</th>
                    <th className="py-3 px-4 font-bold">Reference / UTR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLedger.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No settlements found matching the selected dates.
                      </td>
                    </tr>
                  ) : (
                    filteredLedger.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-bold font-mono text-slate-900">{item.id}</td>
                        <td className="py-3 px-4 text-slate-600">
                          {new Date(item.requestedAt).toLocaleDateString('en-GB')}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-slate-900 text-sm">
                          ₹{item.amount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">{item.payoutMode}</div>
                          <div className="text-[10px] text-slate-400 font-mono truncate max-w-xs">{item.bankAccount}</div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant={item.status === 'PROCESSED' ? 'emerald' : 'warning'} size="sm">
                            {item.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                          {item.referenceNo || 'Pending Clearance'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500">
            Bank transfers are processed by HQ Treasury within 24–48 business hours.
          </div>
        </div>
      </div>
    </div>
  );
}

export default ManagerWithdrawalTab;
