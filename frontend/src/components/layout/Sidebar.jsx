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
  Stethoscope,
  PlusCircle,
  Clock,
  DollarSign,
  CreditCard
} from 'lucide-react';
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

  const navSections = [
    {
      title: 'Core',
      items: [
        {
          label: 'Dashboard',
          icon: LayoutDashboard,
          path: '/dashboard',
          show: true
        },
        {
          label: 'Doctor Slots & Consult',
          icon: Stethoscope,
          path: '/doctor-slots',
          show: true
        }
      ]
    },
    {
      title: 'Lead Management',
      groupKey: 'leads',
      items: [
        {
          label: 'Leads Desk',
          icon: Users,
          path: '/leads',
          show: hasPermission('leads.view')
        },
        {
          label: 'Scheduled Follow-ups',
          icon: CalendarClock,
          path: '/followups',
          show: hasPermission('followups.view')
        },
        {
          label: 'Call History',
          icon: PhoneCall,
          path: '/call-history',
          show: hasPermission('leads.view')
        },
        {
          label: 'Customer Directory',
          icon: UserCheck,
          path: '/customers',
          show: hasPermission('customers.view')
        }
      ]
    },
    {
      title: 'Sales & Orders',
      groupKey: 'sales',
      items: [
        {
          label: 'All Orders',
          icon: ShoppingBag,
          path: '/orders',
          show: hasPermission('orders.view')
        },
        {
          label: 'Counter Sale',
          icon: PlusCircle,
          path: '/orders/counter-sale',
          show: hasPermission('orders.create') || isOwner
        },
        {
          label: 'Stuck & Outstanding',
          icon: Clock,
          path: '/orders/stuck',
          show: hasPermission('orders.view')
        }
      ]
    },
    {
      title: 'Inventory & Stocks',
      groupKey: 'inventory',
      items: [
        {
          label: 'Products Catalog',
          icon: Boxes,
          path: '/products',
          show: hasPermission('products.view')
        },
        {
          label: 'Stock Ledger',
          icon: Package,
          path: '/inventory',
          show: hasPermission('inventory.view')
        },
        {
          label: 'Branch Transfers',
          icon: Send,
          path: '/inventory/transfers',
          show: hasPermission('inventory.transfer') || isOwner
        }
      ]
    },
    {
      title: 'Operations & Logistics',
      groupKey: 'operations',
      items: [
        {
          label: 'Operations Hub',
          icon: Layers,
          path: '/operations',
          show: hasPermission('operations.view') || hasPermission('orders.verify') || isOwner
        },
        {
          label: 'Packing Station',
          icon: BoxesIcon,
          path: '/operations/packing',
          show: hasPermission('orders.pack') || isOwner
        },
        {
          label: 'Dispatch Queue',
          icon: Send,
          path: '/operations/dispatch',
          show: hasPermission('orders.dispatch') || isOwner
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
      title: 'Finance & Reports',
      groupKey: 'finance',
      items: [
        {
          label: 'Revenue Reports',
          icon: BarChart3,
          path: '/reports',
          show: hasPermission('reports.view') || isOwner
        },
        {
          label: 'TC Sales & Incentives',
          icon: DollarSign,
          path: '/reports/tc-sales',
          show: hasPermission('reports.view') || isOwner
        },
        {
          label: 'Till-Date & Settlement',
          icon: CreditCard,
          path: '/reports/settlement',
          show: isOwner || hasPermission('reports.view')
        }
      ]
    },
    {
      title: 'Administration',
      groupKey: 'admin',
      items: [
        {
          label: 'Franchise & Branches',
          icon: Building,
          path: '/admin/branches',
          show: isOwner || hasPermission('branches.manage')
        },
        {
          label: 'Users & Staff',
          icon: Users,
          path: '/admin/users',
          show: isOwner || hasPermission('users.view')
        },
        {
          label: 'Roles & Permissions',
          icon: KeyRound,
          path: '/admin/roles',
          show: isOwner || hasPermission('roles.manage')
        },
        {
          label: 'Integrations',
          icon: Settings,
          path: '/admin/integrations',
          show: isOwner || hasPermission('integrations.manage')
        },
        {
          label: 'Audit Logs',
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
          <div className="w-8 h-8 rounded-xl bg-ayur-700 text-white font-black text-sm flex items-center justify-center shadow-sm flex-shrink-0">
            🌿
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-800 leading-tight">Shanthi Ayurvedas</h1>
            <p className="text-[10px] text-ayur-600 font-semibold tracking-widest uppercase">CRM Enterprise</p>
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
                      const isActive =
                        location.pathname === item.path ||
                        (item.path !== '/dashboard' &&
                          !item.path.includes('?') &&
                          location.pathname.startsWith(item.path + '/'));

                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          onClick={() => onClose && onClose()}
                          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                            isActive
                              ? 'bg-ayur-50 text-ayur-800 font-semibold border border-ayur-100'
                              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                          }`}
                        >
                          <Icon
                            className={`w-3.5 h-3.5 flex-shrink-0 ${
                              isActive ? 'text-ayur-700' : 'text-slate-400'
                            }`}
                          />
                          <span className="truncate">{item.label}</span>
                          {isActive && (
                            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-ayur-600 flex-shrink-0" />
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
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
