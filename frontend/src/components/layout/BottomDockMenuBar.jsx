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
  PhoneCall
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../api/apiClient.js';
import { usePermissions } from '../../hooks/usePermissions.js';

export function BottomDockMenuBar({ onOpenAddOrder }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isOwner, isManager, isDistributor, hasPermission } = usePermissions();

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
    refetchInterval: 30000
  });

  const ordersCount = metricsData?.totalOrders ?? null;

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
        className="shrink-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] select-none relative w-full"
      >
        <div className="max-w-md mx-auto grid grid-cols-4 items-center h-14 sm:h-15 px-2 relative">
          {distributorItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.isActive;
            return (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer relative group w-full ${
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

  // 3 items on left, center Add button, 3 items on right (3 + 1 + 3 = 7 items)
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
      isActive: currentPath === '/reports/settlement' || currentPath === '/orders/stuck',
      onClick: () => navigate('/orders?view=full')
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
      isActive: currentPath.startsWith('/admin'),
      onClick: () => navigate('/admin/users')
    }
  ];

  return (
    <nav
      aria-label="Bottom Quick Actions Dock"
      className="shrink-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] select-none relative w-full"
    >
      <div className="max-w-2xl mx-auto grid grid-cols-7 items-center h-14 sm:h-15 px-1 sm:px-2 relative">
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
                  className="w-11 h-11 sm:w-13 sm:h-13 -top-4 sm:-top-5 rounded-full bg-gradient-to-tr from-emerald-600 via-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer ring-3 sm:ring-4 ring-white absolute"
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
              className={`flex flex-col items-center justify-center py-1 px-0.5 sm:px-1 rounded-xl transition-all cursor-pointer relative group w-full ${
                isActive ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-900 font-medium'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon
                  className={`w-4.5 h-4.5 sm:w-5 sm:h-5 transition-transform group-hover:scale-110 ${
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
