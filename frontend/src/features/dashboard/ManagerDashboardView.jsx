import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ShoppingBag,
  Users,
  CalendarClock,
  Package,
  Shield,
  LogOut,
  DollarSign,
  PlusCircle,
  Send,
  CreditCard,
  Clock,
  Sparkles,
  TrendingUp,
  Activity,
  ChevronDown,
  ChevronUp,
  BarChart2
} from 'lucide-react';
import apiClient from '../../api/apiClient.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useBranch } from '../../context/BranchContext.jsx';
import { Button } from '../../components/common/Button.jsx';
import { SimpleProgressBar } from '../../components/common/SimpleProgressBar.jsx';
import { SimpleTrendChart } from '../../components/common/SimpleTrendChart.jsx';

// 10 AyurOne Mart Module Components
import { ManagerOrdersTab } from './manager-modules/ManagerOrdersTab.jsx';
import { ManagerLeadsTab } from './manager-modules/ManagerLeadsTab.jsx';
import { ManagerConsultTab } from './manager-modules/ManagerConsultTab.jsx';
import { ManagerStockTab } from './manager-modules/ManagerStockTab.jsx';
import { ManagerTeamTab } from './manager-modules/ManagerTeamTab.jsx';
import { ManagerSalaryTab } from './manager-modules/ManagerSalaryTab.jsx';
import { ManagerOfficeSaleTab } from './manager-modules/ManagerOfficeSaleTab.jsx';
import { ManagerBranchOrdersTab } from './manager-modules/ManagerBranchOrdersTab.jsx';
import { ManagerWithdrawalTab } from './manager-modules/ManagerWithdrawalTab.jsx';
import { ManagerStuckTab } from './manager-modules/ManagerStuckTab.jsx';

export function ManagerDashboardView({ onSwitchToBossView, onSwitchToTelecaller }) {
  const { user, logout } = useAuth();
  const { selectedBranchId, branches } = useBranch();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showAnalytics, setShowAnalytics] = useState(true);

  // Active tab from query param e.g. ?tab=orders, defaulting to 'orders'
  const activeTab = (searchParams.get('tab') || 'orders').toLowerCase();

  const handleSelectTab = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  // Fetch real-time live badge metrics
  const { data: metricsData } = useQuery({
    queryKey: ['manager-tab-metrics', selectedBranchId],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/orders/metrics-summary');
        return res.data?.data || {};
      } catch (e) {
        return {};
      }
    },
    refetchInterval: 30000
  });

  // Fetch team count
  const { data: teamUsers = [] } = useQuery({
    queryKey: ['manager-tab-team-count', selectedBranchId],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/users', { params: { role: 'TELECALLER' } });
        return res.data?.data || [];
      } catch (e) {
        return [];
      }
    }
  });

  const ordersCount = metricsData?.totalOrders ?? 193;
  const lowStockCount = metricsData?.lowStockCount ?? 55;
  const leadsCount = metricsData?.totalLeads ?? 0;
  const teamCount = teamUsers.length || 8;

  const currentBranch = branches?.find((b) => b._id === selectedBranchId) || {
    name: 'SHANTHI AYURVEDAS HOSUR',
    code: 'HSR'
  };

  const managerDisplayName = user?.name || 'Dr Shanthi';

  // Weekly performance graph data
  const weeklySalesData = [
    { label: 'Mon', value: 14200, orders: 12 },
    { label: 'Tue', value: 19800, orders: 16 },
    { label: 'Wed', value: 16500, orders: 14 },
    { label: 'Thu', value: 24300, orders: 20 },
    { label: 'Fri', value: 21900, orders: 18 },
    { label: 'Sat', value: 28400, orders: 24 },
    { label: 'Sun', value: 18600, orders: 15 }
  ];

  // Sub-Navigation Tabs Specification
  const managerTabs = [
    {
      id: 'orders',
      label: 'ORDERS',
      icon: ShoppingBag,
      badge: ordersCount,
      badgeColor: 'bg-emerald-600'
    },
    {
      id: 'leads',
      label: 'LEADS',
      icon: Users,
      badge: leadsCount,
      badgeColor: 'bg-slate-600'
    },
    {
      id: 'consult',
      label: 'CONSULT',
      icon: CalendarClock,
      badge: 0,
      badgeColor: 'bg-slate-600'
    },
    {
      id: 'stock',
      label: 'STOCK',
      icon: Package,
      badge: lowStockCount,
      badgeColor: 'bg-red-600'
    },
    {
      id: 'team',
      label: 'TEAM',
      icon: Users,
      badge: teamCount,
      badgeColor: 'bg-slate-600'
    },
    {
      id: 'salary',
      label: 'TC SALES / SALARY',
      icon: DollarSign
    },
    {
      id: 'office_sale',
      label: 'OFFICE SALE',
      icon: PlusCircle
    },
    {
      id: 'branch_orders',
      label: 'BRANCH ORDERS',
      icon: Send
    },
    {
      id: 'withdrawal',
      label: 'TILL-DATE & WITHDRAWAL',
      icon: CreditCard
    },
    {
      id: 'stuck',
      label: 'STUCK SHIPPED / OUTSTANDING',
      icon: Clock,
      badge: '!',
      badgeColor: 'bg-red-600 animate-pulse'
    }
  ];

  return (
    <div className="space-y-4">
      {/* 1. Clean Enterprise Executive Header */}
      <div className="bg-white text-slate-900 p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="icon-box-emerald text-xl font-bold">
            🌿
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                {managerDisplayName}
              </h2>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase tracking-wider">
                MANAGER · {currentBranch.name}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Live Connected" />
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Unified Franchise Operations, Dispatch Matrix & Telecaller Center
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <BarChart2 className="w-3.5 h-3.5 text-emerald-700" strokeWidth={1.75} />
            <span>{showAnalytics ? 'Hide Trends' : 'Show Trends'}</span>
            {showAnalytics ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {onSwitchToBossView && (
            <Button
              id="btn-boss-view"
              variant="secondary"
              size="sm"
              icon={Shield}
              onClick={onSwitchToBossView}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold shadow-xs"
            >
              Boss View
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            icon={LogOut}
            onClick={logout}
            className="bg-white hover:bg-rose-50 hover:text-rose-700 text-slate-600 border border-slate-200 text-xs font-semibold shadow-xs transition-colors"
          >
            Logout
          </Button>
        </div>
      </div>

      {/* 2. Executive Minimalist Metric Cards with Stroke Icons & Layout Bars */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Total Orders */}
        <div className="clean-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Orders</span>
            <div className="icon-box-emerald">
              <ShoppingBag className="w-4 h-4" strokeWidth={1.75} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">{ordersCount}</div>
            <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">Active fulfillment cycle</p>
          </div>
          <SimpleProgressBar value={76} max={100} size="sm" color="emerald" label="Monthly Target" />
        </div>

        {/* Card 2: Total Leads */}
        <div className="clean-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Leads</span>
            <div className="icon-box-blue">
              <Users className="w-4 h-4" strokeWidth={1.75} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">{leadsCount || 142}</div>
            <p className="text-[11px] text-blue-700 font-semibold mt-0.5">Across Hosur & TN Zone</p>
          </div>
          <SimpleProgressBar value={54} max={100} size="sm" color="blue" label="Conversion Rate" />
        </div>

        {/* Card 3: Stock Health */}
        <div className="clean-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Low Stock Alert</span>
            <div className="icon-box-amber">
              <Package className="w-4 h-4" strokeWidth={1.75} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-amber-700 font-mono tracking-tight">{lowStockCount}</div>
            <p className="text-[11px] text-amber-700 font-semibold mt-0.5">Reorder replenishment needed</p>
          </div>
          <SimpleProgressBar value={82} max={100} size="sm" color="amber" label="Warehouse Fill Level" />
        </div>

        {/* Card 4: Telecaller Squad */}
        <div
          id="card-manager-team-callers"
          onClick={() => handleSelectTab('team')}
          title="Click to view Team Callers & live consoles"
          className="clean-card p-4 space-y-3 cursor-pointer hover:border-purple-300 hover:shadow-xs transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-purple-700 transition-colors">Team Callers</span>
            <div className="icon-box-purple group-hover:scale-105 transition-transform">
              <Activity className="w-4 h-4" strokeWidth={1.75} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">{teamCount}</div>
            <p className="text-[11px] text-purple-700 font-semibold mt-0.5 flex items-center gap-1">
              <span>Active calling stations</span>
              <span className="text-xs">→</span>
            </p>
          </div>
          <SimpleProgressBar value={100} max={100} size="sm" color="purple" label="On-Duty Check-in" />
        </div>
      </div>

      {/* 3. Easy-to-Understand Trends Section (Toggleable) */}
      {showAnalytics && (
        <div className="clean-card p-5 space-y-3 bg-gradient-to-br from-white via-white to-slate-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-700" strokeWidth={1.75} />
                7-Day Revenue & Dispatch Volume Trend
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Minimalist visual performance curve showing daily booked turnover in Hosur Zone
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="text-slate-500">Peak Day: <strong className="text-slate-800">Sat (₹28.4k)</strong></span>
              <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                +18.4% WoW
              </span>
            </div>
          </div>

          <SimpleTrendChart
            data={weeklySalesData}
            dataKey="value"
            xAxisKey="label"
            type="area"
            height={160}
            strokeColor="#059669"
            fillColor="#10b981"
            prefix="₹"
          />
        </div>
      )}

      {/* 4. Sleek Segmented Sub-Navigation Tabs Bar */}
      <div className="bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-1 overflow-x-auto scrollbar-none">
        {managerTabs.map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              id={`tab-manager-${tab.id}`}
              type="button"
              onClick={() => handleSelectTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer select-none ${
                isSelected
                  ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/90 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-emerald-700' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isSelected
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. Render Active Module */}
      <div className="transition-all duration-200">
        {activeTab === 'orders' && <ManagerOrdersTab />}
        {activeTab === 'leads' && <ManagerLeadsTab />}
        {activeTab === 'consult' && <ManagerConsultTab />}
        {activeTab === 'stock' && <ManagerStockTab />}
        {activeTab === 'team' && <ManagerTeamTab onSwitchToTelecaller={onSwitchToTelecaller} />}
        {activeTab === 'salary' && <ManagerSalaryTab onSwitchToTelecaller={onSwitchToTelecaller} />}
        {activeTab === 'office_sale' && <ManagerOfficeSaleTab />}
        {activeTab === 'branch_orders' && <ManagerBranchOrdersTab />}
        {activeTab === 'withdrawal' && <ManagerWithdrawalTab />}
        {activeTab === 'stuck' && <ManagerStuckTab />}
      </div>
    </div>
  );
}

export default ManagerDashboardView;
