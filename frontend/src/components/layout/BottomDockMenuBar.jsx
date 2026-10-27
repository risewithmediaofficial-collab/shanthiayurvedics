import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ShoppingBag,
  FileSpreadsheet,
  Truck,
  Scan,
  Plus,
  BarChart3,
  Shield,
  Package,
  PhoneCall,
  CalendarClock,
  Clock,
  Users
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../api/apiClient.js';
import { usePermissions } from '../../hooks/usePermissions.js';
import { useAuth } from '../../context/AuthContext.jsx';

export function BottomDockMenuBar({ onOpenAddOrder }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isOwner, isManager, isDistributor, isTelecaller, hasPermission } = usePermissions();
  const { user } = useAuth();

  const currentPath = location.pathname;

  // Live orders count for the badge
  const { data: metricsData } = useQuery({
    queryKey: ['bottom-dock-metrics'],
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

  const ordersCount = metricsData?.totalOrders ?? null;

  // Dedicated Telecaller Bottom Dock (Focused on Telecalling Workflows)
  if (isTelecaller) {
    const telecallerItems = [
      {
        id: 'leads',
        label: 'Leads',
        icon: Users,
        color: 'text-teal-600',
        isActive: currentPath === '/dashboard' || currentPath === '/leads',
        onClick: () => navigate('/dashboard')
      },
      {
        id: 'orders',
        label: 'Orders',
        icon: ShoppingBag,
        color: 'text-indigo-600',
        badge: ordersCount,
        isActive: currentPath === '/orders' || currentPath.startsWith('/orders/'),
        onClick: () => navigate('/orders')
      },
      {
        id: 'add',
        isCenterAction: true,
        show: true,
        onClick: () => onOpenAddOrder && onOpenAddOrder()
      },
      {
        id: 'followups',
        label: 'Follow-ups',
        icon: CalendarClock,
        color: 'text-amber-600',
        isActive: currentPath === '/followups',
        onClick: () => navigate('/followups')
      },
      {
        id: 'calls',
        label: 'Calls',
        icon: PhoneCall,
        color: 'text-blue-600',
        isActive: currentPath === '/calls' || currentPath.includes('tab=calls'),
        onClick: () => navigate('/calls')
      }
    ];

    return (
      <nav
        aria-label="Telecaller Quick Actions Dock"
        className="shrink-0 z-30 bg-white/98 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] select-none relative w-full safe-bottom"
      >
        <div className="max-w-md mx-auto grid grid-cols-5 items-center h-16 sm:h-[4.25rem] px-2 relative">
          {telecallerItems.map((item) => {
            if (item.isCenterAction) {
              return (
                <div key="center-action" className="flex items-center justify-center relative">
                  <button
                    type="button"
                    onClick={item.onClick}
                    title="Quick Prescription / Order Booking"
                    className="w-12 h-12 -mt-5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white flex items-center justify-center shadow-lg shadow-emerald-700/30 hover:scale-105 active:scale-95 transition-all cursor-pointer ring-4 ring-white"
                  >
                    <Plus className="w-6 h-6 stroke-[2.5]" />
                  </button>
                </div>
              );
            }

            const Icon = item.icon;
            const isActive = item.isActive;
            return (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer relative group w-full min-h-[44px] touch-manipulation ${
                  isActive ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-900 font-medium'
                }`}
              >
                <div className="relative flex items-center justify-center">
                  <Icon
                    className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                      isActive ? item.color || 'text-emerald-700' : 'text-slate-500'
                    }`}
                  />
                  {item.badge !== undefined && item.badge !== null && item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 px-1 min-w-[15px] h-[15px] rounded-full bg-rose-500 text-white text-[9px] font-mono font-black flex items-center justify-center ring-2 ring-white">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] mt-0.5 tracking-tight ${isActive ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>
                  {item.label}
                </span>
                {isActive && (
                  <span className="w-1 h-1 rounded-full bg-emerald-600 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    );
  }

  // Dedicated Distributor Bottom Dock (Strictly the 4 allowed domains)
  if (isDistributor) {
    const distributorItems = [
      {
        id: 'stock',
        label: 'Stocks',
        icon: Package,
        color: 'text-emerald-600',
        isActive: currentPath === '/inventory',
        onClick: () => navigate('/inventory')
      },
      {
        id: 'sales',
        label: 'Total Sales',
        icon: ShoppingBag,
        color: 'text-indigo-600',
        badge: ordersCount,
        isActive: currentPath === '/orders' || currentPath.startsWith('/orders/'),
        onClick: () => navigate('/orders')
      },
      {
        id: 'tc-sales',
        label: 'TC Sales',
        icon: BarChart3,
        color: 'text-amber-600',
        isActive: currentPath === '/reports/tc-sales',
        onClick: () => navigate('/reports/tc-sales')
      },
      {
        id: 'telecaller',
        label: 'Telecaller',
        icon: PhoneCall,
        color: 'text-teal-600',
        isActive: currentPath.includes('view=telecaller') || currentPath === '/dashboard?view=telecaller',
        onClick: () => navigate('/dashboard?view=telecaller')
      }
    ];

    return (
      <nav
        aria-label="Distributor Quick Actions Dock"
        className="shrink-0 z-30 bg-white/98 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] select-none relative w-full safe-bottom"
      >
        <div className="max-w-md mx-auto grid grid-cols-4 items-center h-16 sm:h-[4.25rem] px-2 relative">
          {distributorItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.isActive;
            return (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer relative group w-full min-h-[44px] touch-manipulation ${
                  isActive ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-900 font-medium'
                }`}
              >
                <div className="relative flex items-center justify-center">
                  <Icon
                    className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                      isActive ? item.color || 'text-emerald-700' : 'text-slate-500'
                    }`}
                  />
                  {item.badge !== undefined && item.badge !== null && item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 px-1 min-w-[15px] h-[15px] rounded-full bg-rose-500 text-white text-[9px] font-mono font-black flex items-center justify-center ring-2 ring-white">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] mt-0.5 tracking-tight ${isActive ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>
                  {item.label}
                </span>
                {isActive && (
                  <span className="w-1 h-1 rounded-full bg-emerald-600 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    );
  }

  // 5 items on mobile (Orders, Velocity, Add, Scan, Stats), 7 items on tablet/desktop (+ Export, Admin)
  const items = [
    {
      id: 'orders',
      label: 'Orders',
      icon: ShoppingBag,
      color: 'text-indigo-600',
      badge: ordersCount,
      isActive: currentPath === '/orders' || currentPath.startsWith('/orders/'),
      onClick: () => navigate('/orders')
    },
    {
      id: 'export',
      label: 'Export',
      icon: FileSpreadsheet,
      color: 'text-rose-600',
      hiddenOnMobile: true,
      isActive: currentPath === '/reports/settlement' || currentPath === '/orders/stuck',
      onClick: () => navigate('/orders?orderView=full')
    },
    {
      id: 'velocity',
      label: 'Velocity',
      icon: Truck,
      color: 'text-amber-500',
      isActive: currentPath.startsWith('/shipping') || currentPath === '/operations/dispatch',
      onClick: () => navigate('/shipping/tracking')
    },
    {
      id: 'add',
      isCenterAction: true,
      show: hasPermission('orders.create'),
      onClick: () => onOpenAddOrder && onOpenAddOrder()
    },
    {
      id: 'scan',
      label: 'Scan',
      icon: Scan,
      color: 'text-sky-600',
      isActive: currentPath === '/scan-tracker' || currentPath === '/operations/packing',
      onClick: () => navigate('/scan-tracker')
    },
    {
      id: 'stats',
      label: 'Stats',
      icon: BarChart3,
      color: 'text-emerald-600',
      isActive: currentPath === '/reports' || currentPath.startsWith('/reports/'),
      onClick: () => navigate('/reports')
    },
    {
      id: 'admin',
      label: 'Admin',
      icon: Shield,
      color: 'text-purple-600',
      hiddenOnMobile: true,
      isActive: currentPath.startsWith('/admin'),
      onClick: () => navigate('/admin/users')
    }
  ];

  return (
    <nav
      aria-label="Bottom Quick Actions Dock"
      className="shrink-0 z-30 bg-white/98 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] select-none relative w-full safe-bottom"
    >
      <div className="max-w-2xl mx-auto grid grid-cols-5 sm:grid-cols-7 items-center h-16 sm:h-[4.25rem] px-1 sm:px-2 relative">
        {items.map((item) => {
          if (item.isCenterAction) {
            if (item.show === false) {
              return <div key={item.id} className="h-full" />;
            }
            return (
              <div key={item.id} className="flex items-center justify-center relative h-full">
                <button
                  type="button"
                  onClick={item.onClick}
                  title="Create New Prescription Order"
                  id="btn-bottom-dock-add"
                  className="w-11 h-11 sm:w-13 sm:h-13 -top-3.5 sm:-top-5 rounded-full bg-gradient-to-tr from-emerald-600 via-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer ring-3 sm:ring-4 ring-white absolute"
                >
                  <Plus className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
                </button>
              </div>
            );
          }

          const Icon = item.icon;
          const isActive = item.isActive;

          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              className={`${item.hiddenOnMobile ? 'hidden sm:flex' : 'flex'} flex-col items-center justify-center py-1 px-0.5 sm:px-1 rounded-xl transition-all cursor-pointer relative group w-full min-h-[44px] touch-manipulation ${
                isActive ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-900 font-medium'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon
                  className={`w-[18px] h-[18px] sm:w-5 sm:h-5 transition-transform group-hover:scale-110 ${
                    isActive ? item.color || 'text-emerald-700' : 'text-slate-500'
                  }`}
                />
                {item.badge !== undefined && item.badge !== null && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 px-1 min-w-[14px] h-[14px] rounded-full bg-rose-500 text-white text-[8.5px] sm:text-[9px] font-mono font-black flex items-center justify-center ring-2 ring-white">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[9px] sm:text-[10px] mt-0.5 tracking-tight truncate max-w-full text-center ${isActive ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>
                {item.label}
              </span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-emerald-600 mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default BottomDockMenuBar;
