import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();

  // Collapsible menu groups state
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
          label: 'Dashboard Overview',
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
          label: 'Office Counter Sale',
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
          label: 'Stock Ledger & Matrix',
          icon: Package,
          path: '/inventory',
          show: hasPermission('inventory.view')
        },
        {
          label: 'Branch Orders & Transfers',
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
          label: 'Analytics & Revenue Reports',
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
          label: 'Integrations & Courier',
          icon: Settings,
          path: '/admin/integrations',
          show: isOwner || hasPermission('integrations.manage')
        },
        {
          label: 'Security & Audit Logs',
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
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0 shadow-xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center gap-3 h-16 px-5 bg-slate-950/90 border-b border-slate-800/80">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-ayur-500 to-ayur-800 text-white font-black text-base flex items-center justify-center shadow-md">
            🌿
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide">Shanthi Ayurvedas</h1>
            <p className="text-[10px] text-ayur-400 font-medium tracking-wider uppercase">CRM Enterprise</p>
          </div>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
          {navSections.map((section, sIdx) => {
            const visibleItems = section.items.filter((i) => i.show);
            if (visibleItems.length === 0) return null;

            const isGroup = !!section.groupKey;
            const isGroupOpen = isGroup ? openGroups[section.groupKey] : true;

            return (
              <div key={section.title || sIdx} className="space-y-1">
                {isGroup ? (
                  <button
                    type="button"
                    onClick={() => toggleGroup(section.groupKey)}
                    className="w-full flex items-center justify-between px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider hover:text-slate-200 transition-colors"
                  >
                    <span>{section.title}</span>
                    {isGroupOpen ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </button>
                ) : (
                  <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    {section.title}
                  </div>
                )}

                {isGroupOpen && (
                  <div className="space-y-0.5 mt-1">
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
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                            isActive
                              ? 'bg-ayur-700 text-white font-semibold shadow-sm'
                              : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                          <span>{item.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-950/70 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
          <span className="font-semibold capitalize">{role?.toLowerCase()} Mode</span>
          <span className="text-slate-500 font-mono">v1.0.0</span>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
