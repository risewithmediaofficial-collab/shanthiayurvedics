import React from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import HomeRounded from '@mui/icons-material/HomeRounded';
import KeyboardArrowRightRounded from '@mui/icons-material/KeyboardArrowRightRounded';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';

const ROUTE_CONFIG = {
  '/dashboard': {
    category: 'Enterprise Desk',
    title: 'Executive Overview',
    getMeta: (searchParams) => {
      const view = searchParams.get('view')?.toLowerCase();
      const tab = searchParams.get('tab')?.toLowerCase();
      const caller = searchParams.get('caller');

      if (view === 'telecaller') {
        return {
          category: 'Calling Desk',
          title: caller ? `${caller} (Console)` : 'Telecaller Console'
        };
      }
      if (view === 'distributor') {
        return { category: 'Branch Desk', title: 'Stock & Inventory Desk' };
      }
      if (view === 'manager') {
        return { category: 'Branch Desk', title: 'Manager Operations Desk' };
      }
      if (tab === 'team') {
        return { category: 'Enterprise Desk', title: 'Team Callers & Staff' };
      }
      if (tab === 'salary') {
        return { category: 'Sales & Billing', title: 'TC Sales & Salaries' };
      }
      if (tab === 'withdrawal') {
        return { category: 'Sales & Billing', title: 'Till-Date & Withdrawals' };
      }
      return { category: 'Enterprise Desk', title: 'Executive Overview' };
    }
  },
  '/orders': {
    category: 'Enterprise Executive Desk',
    title: 'Order Management'
  },
  '/orders/counter-sale': {
    category: 'Sales & Billing',
    title: 'Direct Office & Counter Sale (POS)',
    parent: '/orders'
  },
  '/orders/stuck': {
    category: 'Sales & Billing',
    title: 'Stuck Shipped & Delayed Orders',
    parent: '/orders'
  },
  '/leads': {
    category: 'Enterprise Executive Desk',
    title: 'Leads & Enquiries'
  },
  '/leads/calls': {
    category: 'Calling Desk',
    title: 'Calling History & Logs',
    parent: '/leads'
  },
  '/call-history': {
    category: 'Calling Desk',
    title: 'Calling History & Logs'
  },
  '/followups': {
    category: 'Calling Desk',
    title: 'Follow-Up Schedule'
  },
  '/customers': {
    category: 'Enterprise Executive Desk',
    title: 'Customer Directory'
  },
  '/inventory': {
    category: 'Enterprise Executive Desk',
    title: 'Warehouse & Stock Ledger'
  },
  '/inventory/transfers': {
    category: 'Sales & Billing',
    title: 'Branch Orders & Stock Transfers',
    parent: '/inventory'
  },
  '/products': {
    category: 'Enterprise Executive Desk',
    title: 'Product Catalog & Pricing'
  },
  '/admin/users': {
    category: 'Enterprise Executive Desk',
    title: 'Team Staff & Caller Accounts'
  },
  '/reports': {
    category: 'Sales & Billing',
    title: 'Reports & Analytics'
  },
  '/reports/tc-sales': {
    category: 'Sales & Billing',
    title: 'TC Sales & Telecaller Performance',
    parent: '/reports'
  },
  '/reports/settlement': {
    category: 'Sales & Billing',
    title: 'Till-Date Collections & Franchise Settlement',
    parent: '/reports'
  },
  '/operations': {
    category: 'Operations & Tracking',
    title: 'Operations Hub'
  },
  '/operations/packing': {
    category: 'Operations & Tracking',
    title: 'Packing Station',
    parent: '/operations'
  },
  '/operations/dispatch': {
    category: 'Operations & Tracking',
    title: 'Dispatch Queue',
    parent: '/operations'
  },
  '/scan-tracker': {
    category: 'Operations & Tracking',
    title: 'Industrial Barcode Scan Tracker'
  },
  '/shipping': {
    category: 'Operations & Tracking',
    title: 'Logistics & Shipping'
  },
  '/shipping/tracking': {
    category: 'Operations & Tracking',
    title: 'Delivery & AWB Tracking'
  },
  '/rto': {
    category: 'Operations & Tracking',
    title: 'RTO & Return Management'
  },
  '/admin/branches': {
    category: 'Administration',
    title: 'Franchise Branches & Hubs'
  },
  '/admin/roles': {
    category: 'Administration',
    title: 'Roles & RBAC Access Matrix'
  },
  '/admin/integrations': {
    category: 'Administration',
    title: 'Integrations & API Settings'
  },
  '/admin/audit': {
    category: 'Administration',
    title: 'Audit Logs & Security Trail'
  }
};

export function Breadcrumbs() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);

  const pathname = location.pathname;

  // Resolve matching route config
  let config = ROUTE_CONFIG[pathname];
  let dynamicTitle = null;

  if (!config) {
    // Check if it is a dynamic route like /orders/:id
    if (pathname.startsWith('/orders/') && pathname !== '/orders/counter-sale' && pathname !== '/orders/stuck') {
      const orderId = pathname.replace('/orders/', '');
      config = {
        category: 'Enterprise Executive Desk',
        title: `Order Details #${orderId.slice(-6).toUpperCase()}`,
        parent: '/orders'
      };
    } else {
      // Fallback
      const segments = pathname.split('/').filter(Boolean);
      const lastSeg = segments[segments.length - 1] || 'Dashboard';
      const formattedTitle = lastSeg
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
      config = {
        category: 'Workspace',
        title: formattedTitle
      };
    }
  }

  if (config.getMeta) {
    const meta = config.getMeta(searchParams);
    config = { ...config, ...meta };
  }

  const showBackButton = pathname !== '/' && pathname !== '/dashboard';

  return (
    <nav
      aria-label="Breadcrumb navigation"
      className="flex items-center justify-between flex-wrap gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-white border border-slate-200/80 rounded-xl shadow-xs"
    >
      <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-slate-500 overflow-hidden">
        {/* Quick Back Button (for subpages) */}
        {showBackButton && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-1 -ml-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex items-center justify-center shrink-0"
            title="Go back"
            aria-label="Go back to previous page"
          >
            <ArrowBackRounded sx={{ fontSize: 16 }} />
          </button>
        )}

        {/* Home Link */}
        <Link
          to="/dashboard"
          className="flex items-center gap-1 text-slate-500 hover:text-emerald-700 font-medium transition-colors shrink-0"
          title="Return to Dashboard Overview"
        >
          <HomeRounded sx={{ fontSize: 17 }} className="text-slate-400 hover:text-emerald-700" />
          <span className="hidden md:inline font-semibold">Home</span>
        </Link>

        {/* Separator */}
        <KeyboardArrowRightRounded sx={{ fontSize: 16 }} className="text-slate-300 shrink-0" />

        {/* Category Pill */}
        {config.category && (
          <>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold text-[11px] tracking-tight shrink-0">
              {config.category}
            </span>
            <KeyboardArrowRightRounded sx={{ fontSize: 16 }} className="text-slate-300 shrink-0" />
          </>
        )}

        {/* Parent Link if present */}
        {config.parent && ROUTE_CONFIG[config.parent] && (
          <>
            <Link
              to={config.parent}
              className="text-slate-500 hover:text-emerald-700 font-medium truncate max-w-[120px] sm:max-w-none transition-colors"
            >
              {ROUTE_CONFIG[config.parent].title}
            </Link>
            <KeyboardArrowRightRounded sx={{ fontSize: 16 }} className="text-slate-300 shrink-0" />
          </>
        )}

        {/* Current Active Page */}
        <span
          className="font-bold text-slate-900 truncate max-w-[180px] sm:max-w-[320px] md:max-w-none"
          aria-current="page"
        >
          {dynamicTitle || config.title}
        </span>
      </div>

      {/* Quick Access Tag */}
      <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span className="font-semibold text-slate-600">AyurOne</span>
        <span className="text-slate-300">•</span>
        <span>Real-Time</span>
      </div>
    </nav>
  );
}

export default Breadcrumbs;
