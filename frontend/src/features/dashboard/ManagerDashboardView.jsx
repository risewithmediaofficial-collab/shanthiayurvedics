import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import DashboardRounded from '@mui/icons-material/DashboardRounded';
import ShoppingBagRounded from '@mui/icons-material/ShoppingBagRounded';
import PeopleAltRounded from '@mui/icons-material/PeopleAltRounded';
import Inventory2Rounded from '@mui/icons-material/Inventory2Rounded';
import PaidRounded from '@mui/icons-material/PaidRounded';
import AddCircleOutlineRounded from '@mui/icons-material/AddCircleOutlineRounded';
import SendRounded from '@mui/icons-material/SendRounded';
import CreditCardRounded from '@mui/icons-material/CreditCardRounded';
import AccessTimeRounded from '@mui/icons-material/AccessTimeRounded';
import apiClient from '../../api/apiClient.js';
import { useBranch } from '../../context/BranchContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

// AyurOne Mart Module Components
import { ManagerOverviewTab } from './manager-modules/ManagerOverviewTab.jsx';
import { ManagerOrdersTab } from './manager-modules/ManagerOrdersTab.jsx';
import { ManagerLeadsTab } from './manager-modules/ManagerLeadsTab.jsx';
import { ManagerStockTab } from './manager-modules/ManagerStockTab.jsx';
import { ManagerTeamTab } from './manager-modules/ManagerTeamTab.jsx';
import { ManagerSalaryTab } from './manager-modules/ManagerSalaryTab.jsx';
import { ManagerOfficeSaleTab } from './manager-modules/ManagerOfficeSaleTab.jsx';
import { ManagerBranchOrdersTab } from './manager-modules/ManagerBranchOrdersTab.jsx';
import { ManagerWithdrawalTab } from './manager-modules/ManagerWithdrawalTab.jsx';
import { ManagerStuckTab } from './manager-modules/ManagerStuckTab.jsx';

export function ManagerDashboardView({ onSwitchToBossView, onSwitchToTelecaller }) {
  const { user } = useAuth();
  const { selectedBranchId } = useBranch();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active tab from URL param e.g. ?tab=overview — default: overview
  const rawTab = (searchParams.get('tab') || 'overview').toLowerCase();
  const activeTab = rawTab === 'consult' ? 'orders' : rawTab;

  const handleSelectTab = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  // Live badge counts for tab pills
  const { data: metricsData } = useQuery({
    queryKey: ['manager-tab-metrics', selectedBranchId],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/orders/metrics-summary');
        return res.data?.data || {};
      } catch {
        return {};
      }
    },
    enabled: Boolean(user),
    refetchInterval: 30000
  });

  const { data: teamUsers = [] } = useQuery({
    queryKey: ['manager-tab-team-count', selectedBranchId],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/users', { params: { role: 'TELECALLER' } });
        return res.data?.data || [];
      } catch {
        return [];
      }
    },
    enabled: Boolean(user)
  });

  const ordersCount   = metricsData?.totalOrders   || null;
  const lowStockCount = metricsData?.lowStockCount  || null;
  const leadsCount    = metricsData?.totalLeads     || null;
  const teamCount     = teamUsers.length            || null;

  const managerTabs = [
    { id: 'overview',      label: 'OVERVIEW',                    title: 'Manager Operations Overview',              icon: DashboardRounded                                                 },
    { id: 'orders',        label: 'ORDERS',                      title: 'Live Orders Management',                   icon: ShoppingBagRounded,   badge: ordersCount,   badgeCls: 'bg-emerald-600' },
    { id: 'leads',         label: 'LEADS',                       title: 'Customer Leads Pipeline',                  icon: PeopleAltRounded,     badge: leadsCount,    badgeCls: 'bg-blue-600'    },
    { id: 'stock',         label: 'STOCK',                       title: 'Inventory & Stock Ledger',                 icon: Inventory2Rounded,   badge: lowStockCount, badgeCls: 'bg-red-600'     },
    { id: 'team',          label: 'TEAM',                        title: 'Telecaller Team & Performance',            icon: PeopleAltRounded,     badge: teamCount,     badgeCls: 'bg-slate-600'   },
    { id: 'salary',        label: 'TC SALARY',                   title: 'Telecaller Sales & Salary Commissions',    icon: PaidRounded                                                      },
    { id: 'office_sale',   label: 'OFFICE SALE',                 title: 'Counter & Walk-in Office Billing',          icon: AddCircleOutlineRounded                                          },
    { id: 'branch_orders', label: 'BRANCH ORDERS',               title: 'Inter-Branch Stock Orders & Transfers',    icon: SendRounded                                                      },
    { id: 'withdrawal',    label: 'WITHDRAWALS',                 title: 'Till-Date & Cash Withdrawal Desk',         icon: CreditCardRounded                                                },
    { id: 'stuck',         label: 'STUCK & RTO',                 title: 'Stuck Shipped & Outstanding Orders',       icon: AccessTimeRounded,    badge: '!',           badgeCls: 'bg-red-600 animate-pulse' }
  ];

  return (
    <div className="space-y-4">

      {/* ── Top Header / View Switcher (Owner & Distributor) ── */}
      {onSwitchToBossView && (
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
              👔 Manager Operations Hub
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              Daily Branch Operations & Fulfillment
            </span>
          </div>
          <button
            id="btn-boss-view"
            type="button"
            onClick={onSwitchToBossView}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs hover:shadow transition-all cursor-pointer"
          >
            <span>👔</span>
            <span>Boss View</span>
            <span className="text-[10px] opacity-80">→</span>
          </button>
        </div>
      )}

      {/* ── Tab Navigation Bar ── */}
      <div className="bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-1 overflow-x-auto scrollbar-none">
        {managerTabs.map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              id={`tab-manager-${tab.id}`}
              type="button"
              title={tab.title || tab.label}
              onClick={() => handleSelectTab(tab.id)}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-semibold transition-all whitespace-nowrap cursor-pointer select-none shrink-0 ${
                isSelected
                  ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/90 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Icon
                sx={{ fontSize: 16 }}
                className={`shrink-0 ${isSelected ? 'text-emerald-700' : 'text-slate-400'}`}
              />
              <span>{tab.label}</span>
              {tab.badge != null && (
                <span
                  className={`px-1.5 rounded-full text-[10px] font-bold text-white ${
                    isSelected ? 'bg-slate-900' : (tab.badgeCls || 'bg-slate-400')
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Active Page — each tab is its own standalone view ── */}
      <div className="transition-all duration-200">
        {activeTab === 'overview'      && <ManagerOverviewTab onSelectTab={handleSelectTab} onSwitchToTelecaller={onSwitchToTelecaller} />}
        {activeTab === 'orders'        && <ManagerOrdersTab />}
        {activeTab === 'leads'         && <ManagerLeadsTab />}
        {activeTab === 'stock'         && <ManagerStockTab />}
        {activeTab === 'team'          && <ManagerTeamTab onSwitchToTelecaller={onSwitchToTelecaller} />}
        {activeTab === 'salary'        && <ManagerSalaryTab onSwitchToTelecaller={onSwitchToTelecaller} />}
        {activeTab === 'office_sale'   && <ManagerOfficeSaleTab />}
        {activeTab === 'branch_orders' && <ManagerBranchOrdersTab />}
        {activeTab === 'withdrawal'    && <ManagerWithdrawalTab />}
        {activeTab === 'stuck'         && <ManagerStuckTab />}
      </div>

    </div>
  );
}

export default ManagerDashboardView;
