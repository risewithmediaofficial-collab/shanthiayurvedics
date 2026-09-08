import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  PhoneCall,
  CalendarClock,
  UserCheck,
  ShoppingBag,
  Package,
  Layers,
  Truck,
  RotateCcw,
  BarChart3,
  Settings,
  Shield,
  Building,
  KeyRound,
  ChevronDown,
  ChevronRight,
  Boxes,
  Send,
  BoxesIcon,
  PlusCircle,
  Clock,
  DollarSign,
  CreditCard
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import apiClient from '../../api/apiClient.js';
import { usePermissions } from '../../hooks/usePermissions.js';

export function Sidebar({ isOpen, onClose }) {

  const { hasPermission, isOwner, role } = usePermissions();
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
    }
  });

  const ordersCount = metricsData?.totalOrders ?? 193;
  const lowStockCount = metricsData?.lowStockCount ?? 55;
  const leadsCount = metricsData?.totalLeads ?? 0;

  const defaultTelecallers = [
    { name: 'KANAGAVALLI', phone: '9629985341', status: 'active' },
    { name: 'AMRUTHA', phone: '9629985342', status: 'active' },
    { name: 'PATTUSELVI', phone: '9629985343', status: 'active' }
  ];

  const displayCallers = teamUsers.length > 0 ? teamUsers.slice(0, 5) : defaultTelecallers;

  const navSections = [
    {
      title: 'Manager Desk',
      items: [
        {
          label: 'ORDERS',
          icon: ShoppingBag,
          path: '/dashboard?tab=orders',
          badge: ordersCount,
          badgeVariant: 'primary',
          show: hasPermission('orders.view')
        },
        {
          label: 'LEADS',
          icon: Users,
          path: '/dashboard?tab=leads',
          badge: leadsCount,
          badgeVariant: 'neutral',
          show: hasPermission('leads.view')
        },
        {
          label: 'CONSULT',
          icon: CalendarClock,
          path: '/dashboard?tab=consult',
          badge: 0,
          badgeVariant: 'neutral',
          show: true
        },
        {
          label: 'STOCK',
          icon: Package,
          path: '/dashboard?tab=stock',
          badge: lowStockCount,
          badgeVariant: 'danger',
          show: hasPermission('inventory.view')
        },
        {
          label: 'TEAM',
          icon: Users,
          path: '/dashboard?tab=team',
          badge: teamUsers.length || 8,
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
          icon: DollarSign,
          path: '/dashboard?tab=salary',
          show: hasPermission('reports.view') || isOwner
        },
        {
          label: 'OFFICE SALE',
          icon: PlusCircle,
          path: '/dashboard?tab=office_sale',
          show: hasPermission('orders.create') || isOwner
        },
        {
          label: 'BRANCH ORDERS',
          icon: Send,
          path: '/dashboard?tab=branch_orders',
          show: hasPermission('inventory.transfer') || isOwner
        },
        {
          label: 'TILL-DATE & WITHDRAWAL',
          icon: CreditCard,
          path: '/dashboard?tab=withdrawal',
          show: isOwner || hasPermission('reports.view')
        },
        {
          label: 'STUCK SHIPPED / OUTSTANDING',
          icon: Clock,
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
          icon: Layers,
          path: '/operations',
          show: hasPermission('operations.view') || isOwner
        },
        {
          label: 'Packing Station',
          icon: BoxesIcon,
          path: '/operations/packing',
          show: hasPermission('orders.pack') || isOwner
        },
        {
          label: 'Delivery Tracking',
          icon: Truck,
          path: '/shipping/tracking',
          show: hasPermission('delivery.view')
        },
        {
          label: 'RTO Management',
          icon: RotateCcw,
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
          icon: Building,
          path: '/admin/branches',
          show: isOwner || hasPermission('branches.manage')
        },
        {
          label: 'Roles & RBAC',
          icon: KeyRound,
          path: '/admin/roles',
          show: isOwner || hasPermission('roles.manage')
        },
        {
          label: 'Audit Log Viewer',
          icon: Shield,
          path: '/admin/audit',
          show: isOwner || hasPermission('audit.view')
        }
      ]
    }
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0 shadow-sm ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center gap-2.5 h-16 px-4 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold text-sm flex items-center justify-center shadow-xs flex-shrink-0">
            🌿
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-800 leading-tight">AyurOne Mart</h1>
            <p className="text-[10px] text-emerald-700 font-semibold tracking-widest uppercase">MANAGER PANEL</p>
          </div>
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
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
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
                            strokeWidth={1.75}
                            className={`w-4 h-4 flex-shrink-0 ${
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

          {/* Active Telecallers Section */}
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
                  <PhoneCall className="w-3 h-3" />
                </a>
              </div>
            ))}
          </div>
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
