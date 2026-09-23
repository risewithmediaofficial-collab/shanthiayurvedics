import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import DashboardRounded from '@mui/icons-material/DashboardRounded';
import ShoppingBagRounded from '@mui/icons-material/ShoppingBagRounded';
import PeopleAltRounded from '@mui/icons-material/PeopleAltRounded';
import Inventory2Rounded from '@mui/icons-material/Inventory2Rounded';
import PaidRounded from '@mui/icons-material/PaidRounded';
import AddCircleOutlineRounded from '@mui/icons-material/AddCircleOutlineRounded';
import SendRounded from '@mui/icons-material/SendRounded';
import CreditCardRounded from '@mui/icons-material/CreditCardRounded';
import AccessTimeRounded from '@mui/icons-material/AccessTimeRounded';
import LayersRounded from '@mui/icons-material/LayersRounded';
import AllInboxRounded from '@mui/icons-material/AllInboxRounded';
import LocalShippingRounded from '@mui/icons-material/LocalShippingRounded';
import AssignmentReturnRounded from '@mui/icons-material/AssignmentReturnRounded';
import DomainRounded from '@mui/icons-material/DomainRounded';
import VpnKeyRounded from '@mui/icons-material/VpnKeyRounded';
import SecurityRounded from '@mui/icons-material/SecurityRounded';
import KeyboardArrowDownRounded from '@mui/icons-material/KeyboardArrowDownRounded';
import KeyboardArrowRightRounded from '@mui/icons-material/KeyboardArrowRightRounded';
import PhoneInTalkRounded from '@mui/icons-material/PhoneInTalkRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import { useQuery } from '@tanstack/react-query';

import apiClient from '../../api/apiClient.js';
import { usePermissions } from '../../hooks/usePermissions.js';

export function Sidebar({ isOpen, onClose }) {

  const { hasPermission, isOwner, isDistributor, isManager, isTelecaller, role, user } = usePermissions();
  const location = useLocation();

  const [openGroups, setOpenGroups] = useState({
    leads: true,
    sales: true,
    inventory: true,
    operations: false,
    finance: false,
    admin: false
  });

  const toggleGroup = (groupKey) => {
    setOpenGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  // Fetch live badge counters
  const { data: metricsData } = useQuery({
    queryKey: ['sidebar-metrics'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/orders/metrics-summary');
        return res.data?.data || {};
      } catch (e) {
        return {};
      }
    },
    enabled: Boolean(user),
    refetchInterval: 30000
  });

  // Fetch team members
  const { data: teamUsers = [] } = useQuery({
    queryKey: ['sidebar-telecallers'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/users', { params: { role: 'TELECALLER' } });
        return res.data?.data || [];
      } catch (e) {
        return [];
      }
    },
    enabled: Boolean(user)
  });

  const ordersCount = metricsData?.totalOrders ?? 0;
  const lowStockCount = metricsData?.lowStockCount ?? 0;
  const leadsCount = metricsData?.totalLeads ?? 0;

  const displayCallers = teamUsers.length > 0 ? teamUsers.slice(0, 5) : [];

  let navSections = [];

  if (isTelecaller) {
    navSections = [
      {
        title: 'Telecaller Calling Desk',
        items: [
          {
            label: 'MY CALL CONSOLE',
            icon: DashboardRounded,
            path: '/dashboard?view=telecaller',
            show: true
          },
          {
            label: 'MY ASSIGNED LEADS',
            icon: PeopleAltRounded,
            path: '/leads',
            badge: leadsCount,
            badgeVariant: 'neutral',
            show: true
          },
          {
            label: 'FOLLOW-UPS',
            icon: AccessTimeRounded,
            path: '/followups',
            show: true
          },
          {
            label: 'CALL HISTORY',
            icon: PhoneInTalkRounded,
            path: '/call-history',
            show: true
          },
          {
            label: 'CREATE ORDER',
            icon: AddCircleOutlineRounded,
            path: '/orders/counter-sale',
            show: true
          }
        ]
      }
    ];
  } else if (isDistributor) {
    navSections = [
      {
        title: 'Branch Stock Desk',
        items: [
          {
            label: 'STOCK OVERVIEW',
            icon: DashboardRounded,
            path: '/dashboard',
            show: true
          },
          {
            label: 'WAREHOUSE LEDGER',
            icon: Inventory2Rounded,
            path: '/inventory',
            badge: lowStockCount,
            badgeVariant: 'danger',
            show: true
          },
          {
            label: 'STOCK TRANSFERS',
            icon: SendRounded,
            path: '/inventory/transfers',
            show: true
          },
          {
            label: 'PRODUCT CATALOG',
            icon: LayersRounded,
            path: '/products',
            show: true
          }
        ]
      },
      {
        title: 'Branch Sales & Logistics',
        items: [
          {
            label: 'BRANCH ORDERS',
            icon: ShoppingBagRounded,
            path: '/orders',
            badge: ordersCount,
            badgeVariant: 'primary',
            show: true
          },
          {
            label: 'COUNTER SALE',
            icon: AddCircleOutlineRounded,
            path: '/orders/counter-sale',
            show: true
          },
          {
            label: 'DELIVERY TRACKING',
            icon: LocalShippingRounded,
            path: '/shipping/tracking',
            show: true
          },
          {
            label: 'RTO MANAGEMENT',
            icon: AssignmentReturnRounded,
            path: '/rto',
            show: true
          }
        ]
      }
    ];
  } else {
    // Manager and Owner
    navSections = [
      {
        title: isOwner ? 'Enterprise Executive Desk' : 'Manager Desk',
        items: [
          {
            label: 'OVERVIEW',
            icon: DashboardRounded,
            path: '/dashboard?tab=overview',
            show: true
          },
          {
            label: 'ORDERS',
            icon: ShoppingBagRounded,
            path: '/dashboard?tab=orders',
            badge: ordersCount,
            badgeVariant: 'primary',
            show: hasPermission('orders.view')
          },
          {
            label: 'LEADS',
            icon: PeopleAltRounded,
            path: '/dashboard?tab=leads',
            badge: leadsCount,
            badgeVariant: 'neutral',
            show: hasPermission('leads.view')
          },
          {
            label: 'STOCK',
            icon: Inventory2Rounded,
            path: '/dashboard?tab=stock',
            badge: lowStockCount,
            badgeVariant: 'danger',
            show: hasPermission('inventory.view')
          },
          {
            label: 'TEAM',
            icon: PeopleAltRounded,
            path: '/dashboard?tab=team',
            badge: teamUsers.length,
            badgeVariant: 'neutral',
            show: isOwner || hasPermission('users.view')
          }
        ]
      },
      {
        title: 'Sales & Billing',
        items: [
          {
            label: 'TC SALES / SALARY',
            icon: PaidRounded,
            path: '/dashboard?tab=salary',
            show: hasPermission('reports.view') || isOwner
          },
          {
            label: 'OFFICE SALE',
            icon: AddCircleOutlineRounded,
            path: '/dashboard?tab=office_sale',
            show: hasPermission('orders.create') || isOwner
          },
          {
            label: 'BRANCH ORDERS',
            icon: SendRounded,
            path: '/dashboard?tab=branch_orders',
            show: hasPermission('inventory.transfer') || isOwner
          },
          {
            label: 'TILL-DATE & WITHDRAWAL',
            icon: CreditCardRounded,
            path: '/dashboard?tab=withdrawal',
            show: isOwner || hasPermission('reports.view')
          },
          {
            label: 'STUCK SHIPPED / OUTSTANDING',
            icon: AccessTimeRounded,
            path: '/dashboard?tab=stuck',
            badge: '!',
            badgeVariant: 'danger',
            show: hasPermission('orders.view')
          }
        ]
      },
      {
        title: 'Operations & Tracking',
        groupKey: 'operations',
        items: [
          {
            label: 'Operations Hub',
            icon: LayersRounded,
            path: '/operations',
            show: hasPermission('operations.view') || isOwner
          },
          {
            label: 'Scan Tracker',
            icon: AllInboxRounded,
            path: '/scan-tracker',
            badge: 'Live',
            badgeVariant: 'primary',
            show: hasPermission('orders.process') || isOwner
          },
          {
            label: 'Packing Station',
            icon: AllInboxRounded,
            path: '/operations/packing',
            show: hasPermission('orders.pack') || isOwner
          },
          {
            label: 'Delivery Tracking',
            icon: LocalShippingRounded,
            path: '/shipping/tracking',
            show: hasPermission('delivery.view')
          },
          {
            label: 'RTO Management',
            icon: AssignmentReturnRounded,
            path: '/rto',
            show: hasPermission('rto.view')
          }
        ]
      },
      {
        title: 'Administration',
        groupKey: 'admin',
        items: [
          {
            label: 'Franchise Branches',
            icon: DomainRounded,
            path: '/admin/branches',
            show: isOwner || hasPermission('branches.manage')
          },
          {
            label: 'Roles & RBAC',
            icon: VpnKeyRounded,
            path: '/admin/roles',
            show: isOwner || hasPermission('roles.manage')
          },
          {
            label: 'Audit Log Viewer',
            icon: SecurityRounded,
            path: '/admin/audit',
            show: isOwner || hasPermission('audit.view')
          }
        ]
      }
    ];
  }

  const roleTitle = isOwner
    ? 'OWNER EXECUTIVE'
    : isDistributor
    ? 'BRANCH DISTRIBUTOR'
    : isManager
    ? 'BRANCH MANAGER'
    : 'TELECALLER DESK';

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0 shadow-sm ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold text-sm flex items-center justify-center shadow-xs flex-shrink-0">
              🌿
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-800 leading-tight">AyurOne Mart</h1>
              <p className="text-[10px] text-emerald-700 font-semibold tracking-widest uppercase">{roleTitle}</p>
            </div>
          </div>
          {/* Mobile close button */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg lg:hidden transition-colors"
            aria-label="Close sidebar"
          >
            <CloseRounded sx={{ fontSize: 20 }} />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-3">
          {navSections.map((section, sIdx) => {
            const visibleItems = section.items.filter((i) => i.show);
            if (visibleItems.length === 0) return null;

            const isGroup = !!section.groupKey;
            const isGroupOpen = isGroup ? openGroups[section.groupKey] : true;

            return (
              <div key={section.title || sIdx} className="space-y-0.5">
                {isGroup ? (
                  <button
                    type="button"
                    onClick={() => toggleGroup(section.groupKey)}
                    className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors rounded"
                  >
                    <span>{section.title}</span>
                    {isGroupOpen ? (
                      <KeyboardArrowDownRounded sx={{ fontSize: 16 }} />
                    ) : (
                      <KeyboardArrowRightRounded sx={{ fontSize: 16 }} />
                    )}
                  </button>
                ) : (
                  <div className="px-2 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {section.title}
                  </div>
                )}

                {isGroupOpen && (
                  <div className="space-y-0.5">
                    {visibleItems.map((item) => {
                      const Icon = item.icon;
                      const currentTab = new URLSearchParams(location.search).get('tab') || 'orders';
                      const hasTabInItem = item.path.includes('?tab=');
                      const itemTab = hasTabInItem ? item.path.split('?tab=')[1] : null;

                      const isActive = itemTab
                        ? location.pathname === '/dashboard' && currentTab === itemTab
                        : location.pathname === item.path ||
                          (item.path !== '/dashboard' &&
                            !item.path.includes('?') &&
                            location.pathname.startsWith(item.path + '/'));


                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          onClick={() => onClose && onClose()}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                            isActive
                              ? 'bg-emerald-700 text-white font-semibold shadow-xs'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                          }`}
                        >
                          <Icon
                            sx={{ fontSize: 18 }}
                            className={`flex-shrink-0 ${
                              isActive ? 'text-white' : 'text-slate-500'
                            }`}
                          />
                          <span className="truncate flex-1 tracking-tight">{item.label}</span>
                          {item.badge !== undefined && (
                            <span
                              className={`ml-auto px-1.5 py-0.5 rounded-md text-[10px] font-black font-mono ${
                                item.badgeVariant === 'danger'
                                    ? 'bg-rose-500 text-white'
                                    : isActive
                                    ? 'bg-white/20 text-white'
                                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Active Telecallers Section (Only visible for Manager & Owner) */}
          {(isOwner || isManager) && (
            <div className="pt-3 mt-3 border-t border-slate-100 space-y-1">
              <NavLink
                to="/dashboard?tab=team"
                onClick={() => onClose && onClose()}
                className="px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-emerald-700 uppercase tracking-widest flex items-center justify-between group cursor-pointer transition-colors"
                title="Open Team Management Desk"
              >
                <span className="group-hover:text-emerald-700">TEAM CALLERS</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </NavLink>
            {displayCallers.map((tc, idx) => (
              <div
                key={tc._id || idx}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <NavLink
                  to={`/dashboard?view=telecaller&caller=${encodeURIComponent(tc.name)}&from=manager`}
                  onClick={() => onClose && onClose()}
                  className="flex items-center gap-2 truncate cursor-pointer hover:text-emerald-700 flex-1 min-w-0 group/caller"
                  title={`Open ${tc.name}'s Telecaller Console`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="truncate font-semibold text-[11px] text-slate-700 group-hover/caller:text-emerald-800 uppercase">{tc.name}</span>
                  <span className="text-[10px] text-slate-300 group-hover/caller:text-emerald-600 font-bold ml-1">→</span>
                </NavLink>
                <a
                  href={`tel:${tc.phone || '9629985345'}`}
                  title={`Call ${tc.name}`}
                  className="text-slate-400 hover:text-emerald-700 p-0.5 shrink-0"
                >
                  <PhoneInTalkRounded sx={{ fontSize: 15 }} />
                </a>
              </div>
            ))}
          </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-medium capitalize">
            {role?.toLowerCase()} mode
          </span>
          <span className="text-[10px] text-slate-300 font-mono">v1.0.0</span>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
