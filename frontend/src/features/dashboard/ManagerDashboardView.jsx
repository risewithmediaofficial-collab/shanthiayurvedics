import React from 'react';
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
  Sparkles
} from 'lucide-react';
import apiClient from '../../api/apiClient.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useBranch } from '../../context/BranchContext.jsx';
import { Button } from '../../components/common/Button.jsx';

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
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center text-xl shadow-xs shrink-0 font-bold">
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

      {/* 2. Sleek Segmented Sub-Navigation Tabs Bar */}
      <div className="bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-1 overflow-x-auto scrollbar-none">
        {managerTabs.map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;

          return (
            <button
              key={tab.id}
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
