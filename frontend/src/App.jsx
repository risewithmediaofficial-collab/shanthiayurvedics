import React, { lazy, Suspense, useState } from 'react';
import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import {
  ShieldAlert,
  HelpCircle,
  Compass,
  ArrowRight,
  RefreshCw,
  LogIn
} from 'lucide-react';
import { AuthLayout } from './layouts/AuthLayout.jsx';
import { DashboardLayout } from './layouts/DashboardLayout.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { Spinner } from './components/common/Spinner.jsx';
import { hasPermissionForUser } from './hooks/permissionPolicy.js';

// Feature Pages
const LoginPage = lazy(() => import('./features/auth/LoginPage.jsx'));
const ForgotPasswordPage = lazy(() => import('./features/auth/ForgotPasswordPage.jsx'));
const ResetPasswordPage = lazy(() => import('./features/auth/ResetPasswordPage.jsx'));
const DashboardHub = lazy(() => import('./features/dashboard/DashboardHub.jsx'));
const LeadListPage = lazy(() => import('./features/leads/LeadListPage.jsx'));
const CallHistoryPage = lazy(() => import('./features/leads/CallHistoryPage.jsx'));
const FollowUpListPage = lazy(() => import('./features/followups/FollowUpListPage.jsx'));
const CustomerListPage = lazy(() => import('./features/customers/CustomerListPage.jsx'));
const ProductCatalogPage = lazy(() => import('./features/products/ProductCatalogPage.jsx'));
const InventoryLedgerPage = lazy(() => import('./features/inventory/InventoryLedgerPage.jsx'));
const StockTransfersPage = lazy(() => import('./features/inventory/StockTransfersPage.jsx'));
const OrderListPage = lazy(() => import('./features/orders/OrderListPage.jsx'));
const OrderDetailPage = lazy(() => import('./features/orders/OrderDetailPage.jsx'));
const CounterSalePage = lazy(() => import('./features/orders/CounterSalePage.jsx'));
const StuckOrdersPage = lazy(() => import('./features/orders/StuckOrdersPage.jsx'));
const OperationsHubPage = lazy(() => import('./features/operations/OperationsHubPage.jsx'));
const PackingStationPage = lazy(() => import('./features/operations/PackingStationPage.jsx'));
const DispatchQueuePage = lazy(() => import('./features/operations/DispatchQueuePage.jsx'));
const ScanTrackerPage = lazy(() => import('./features/operations/ScanTrackerPage.jsx'));
const DeliveryTrackingPage = lazy(() => import('./features/shipping/DeliveryTrackingPage.jsx'));
const RTOManagementPage = lazy(() => import('./features/rto/RTOManagementPage.jsx'));
const ReportsHubPage = lazy(() => import('./features/reports/ReportsHubPage.jsx'));
const BranchManagementPage = lazy(() => import('./features/administration/BranchManagementPage.jsx'));
const UserManagementPage = lazy(() => import('./features/administration/UserManagementPage.jsx'));
const RolesManagementPage = lazy(() => import('./features/administration/RolesManagementPage.jsx'));
const IntegrationsPage = lazy(() => import('./features/administration/IntegrationsPage.jsx'));
const AuditLogViewerPage = lazy(() => import('./features/administration/AuditLogViewerPage.jsx'));

// Auth Connection Error View
function AuthErrorScreen({ authError, onRetry }) {
  const [showDetails, setShowDetails] = useState(false);
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div role="alert" className="max-w-xl w-full rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl text-slate-800">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 uppercase tracking-wide">
              Authentication Error
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
              Connection or Session Interrupted
            </h1>
            <p className="mt-2 text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
              {typeof authError === 'string' ? authError : 'Could not establish a secure connection to the authentication server.'}
            </p>
          </div>
        </div>

        {/* How to Solve */}
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm mb-2">
            <HelpCircle className="w-4 h-4 text-amber-700" />
            <span>How to Solve This:</span>
          </div>
          <ol className="space-y-1.5 text-xs sm:text-sm text-amber-950">
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
              <span>Check your network connection or Wi-Fi to confirm active internet access.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
              <span>Click "Try Again" below to re-verify your secure credentials with the server.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
              <span>If your session has expired, click "Go to Login Page" to sign in again.</span>
            </li>
          </ol>
        </div>

        {/* Page Routing Links */}
        <div className="mt-5">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Page Routing Links
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onRetry}
              className="flex items-center justify-between p-3 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-semibold text-xs transition-colors"
            >
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-emerald-700" /> Try Again Now
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <Link
              to="/login"
              className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors"
            >
              <span className="flex items-center gap-2">
                <LogIn className="w-4 h-4 text-slate-500" /> Go to Login Page
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Technical Details */}
        <div className="mt-4 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1"
          >
            {showDetails ? 'Hide Technical Details' : 'Show Technical Details'}
          </button>
          {showDetails && (
            <pre className="mt-2 p-3 bg-slate-900 text-emerald-400 rounded-xl text-[11px] font-mono overflow-x-auto">
              {typeof authError === 'object' ? JSON.stringify(authError, null, 2) : String(authError)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

// Protected Route Guard
function ProtectedRoute({ children }) {
  const { user, isLoading, authError, checkAuth } = useAuth();
  const location = useLocation();

  if (authError) {
    return <AuthErrorScreen authError={authError} onRetry={checkAuth} />;
  }

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <Spinner size="lg" text="Authenticating secure CRM session..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

// Route Permission Mapping
const routePermissions = {
  '/leads': 'leads.view', '/leads/calls': 'leads.view', '/call-history': 'leads.view', '/followups': 'followups.view', '/customers': 'customers.view',
  '/products': 'products.view', '/inventory': 'inventory.view', '/inventory/transfers': 'inventory.transfer', '/orders': 'orders.view', '/orders/counter-sale': 'orders.create', '/orders/stuck': 'orders.view', '/orders/:id': 'orders.view',
  '/operations': 'operations.view', '/operations/packing': 'orders.pack', '/operations/dispatch': 'orders.dispatch', '/shipping': 'shipping.view', '/shipping/tracking': 'shipping.view', '/rto': 'rto.view', '/reports': 'reports.view', '/reports/tc-sales': 'reports.view', '/reports/settlement': 'reports.view',
  '/admin/branches': 'branches.manage', '/admin/users': 'users.view', '/admin/roles': 'roles.manage', '/admin/integrations': 'integrations.manage', '/admin/audit': 'audit.view'
};

// Access Restricted Screen (403)
function AccessRestrictedScreen({ permission, user }) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="mx-auto my-12 max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm text-slate-800">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 uppercase tracking-wide">
              Access Restricted (403)
            </span>
            <span className="text-xs text-slate-500 font-medium">Shanthi Ayurvedas Security</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            Permission Required for This Module
          </h1>
          <p className="mt-2 text-sm text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200 leading-relaxed">
            Your current account role <strong className="text-slate-800">({user?.role || 'User'})</strong> does not have permission to view or execute actions on this page.
          </p>
        </div>
      </div>

      {/* How to Solve */}
      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
        <div className="flex items-center gap-2 text-amber-900 font-bold text-sm mb-2">
          <HelpCircle className="w-4 h-4 text-amber-700" />
          <span>How to Solve This:</span>
        </div>
        <ol className="space-y-1.5 text-xs sm:text-sm text-amber-950">
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
            <span>If you switched branches or role desks, switch back to your designated branch using the top header.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
            <span>Contact your Branch Manager or Administrator to request permission: <code className="px-1.5 py-0.5 rounded bg-amber-200 font-mono text-xs text-amber-900">{permission}</code>.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
            <span>Navigate back to an authorized workspace using one of the routing links below.</span>
          </li>
        </ol>
      </div>

      {/* Page Routing Links */}
      <div className="mt-5">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
          Page Routing Links
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Link
            to="/dashboard?tab=overview"
            className="flex items-center justify-between p-3 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-semibold text-xs transition-colors"
          >
            <span>Overview Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            to="/orders"
            className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors"
          >
            <span>Orders Management</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            to="/leads"
            className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors"
          >
            <span>Leads Workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Technical Details Accordion */}
      <div className="mt-4 border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1"
        >
          {showDetails ? 'Hide Access Details' : 'Show Access Details'}
        </button>
        {showDetails && (
          <div className="mt-2 p-3 bg-slate-50 rounded-xl text-xs font-mono text-slate-700 border border-slate-200 space-y-1">
            <div>User: {user?.name || user?.email || 'N/A'}</div>
            <div>Role: {user?.role || 'N/A'}</div>
            <div>Required Permission: {permission}</div>
            <div>Active Branch: {sessionStorage.getItem('active_branch_id') || 'Global / Default'}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function Allowed({ permission, children }) {
  const { user } = useAuth();
  if (hasPermissionForUser(user, permission)) return children;
  return <AccessRestrictedScreen permission={permission} user={user} />;
}

// 404 Not Found Screen
function NotFoundScreen() {
  const location = useLocation();
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="mx-auto my-16 max-w-xl rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 text-slate-800 shadow-sm text-center">
      <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4">
        <Compass className="w-7 h-7" />
      </div>
      <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 uppercase">
        HTTP 404
      </span>
      <h1 className="text-2xl font-bold text-slate-900 mt-2">Page Not Found</h1>
      <p className="mt-2 text-sm text-slate-600">
        The page you navigated to does not exist or may have been relocated.
      </p>

      {/* How to Solve */}
      <div className="mt-6 text-left rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
        <div className="flex items-center gap-2 text-amber-900 font-bold text-sm mb-2">
          <HelpCircle className="w-4 h-4 text-amber-700" />
          <span>How to Solve This:</span>
        </div>
        <ol className="space-y-1.5 text-xs text-amber-950">
          <li className="flex items-start gap-2">
            <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-900 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
            <span>Check the browser URL address for typos or outdated links.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-900 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
            <span>The section may have been renamed or relocated in a recent update.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-900 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
            <span>Click any of the direct page routing links below to jump to an active module.</span>
          </li>
        </ol>
      </div>

      {/* Page Routing Links */}
      <div className="mt-6 text-left">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
          Page Routing Links
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Link
            to="/dashboard?tab=overview"
            className="flex items-center justify-between p-3 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-semibold text-xs transition-colors"
          >
            <span>Return to Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            to="/orders"
            className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors"
          >
            <span>Go to Orders</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            to="/leads"
            className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors"
          >
            <span>Go to Leads</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors"
          >
            <span>Go Back</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Path Details */}
      <div className="mt-4 pt-3 text-left">
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-slate-400 hover:text-slate-600 font-medium"
        >
          {showDetails ? 'Hide Path Details' : 'Show Path Details'}
        </button>
        {showDetails && (
          <p className="mt-1 text-xs text-slate-500 font-mono bg-slate-50 p-2 rounded-lg border border-slate-200">
            Requested Path: {location.pathname}
          </p>
        )}
      </div>
    </div>
  );
}

export function App() {
  return (
    <Suspense fallback={<Spinner size="lg" text="Loading workspace..." className="py-24" />}>
      <Routes>
        {/* Public Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        {/* Protected App Routes */}
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Navigate to="/dashboard?tab=overview" replace />} />
          <Route path="/dashboard" element={<DashboardHub />} />
          <Route path="/manager" element={<DashboardHub />} />
          <Route path="/consult" element={<Navigate to="/dashboard?tab=overview" replace />} />
          <Route path="/consultations" element={<Navigate to="/dashboard?tab=overview" replace />} />
          <Route path="/doctor-slots" element={<Navigate to="/dashboard?tab=overview" replace />} />

          {/* Phase 3 — Leads, Followups & Customers */}
          <Route path="/leads" element={<Allowed permission={routePermissions['/leads']}><LeadListPage /></Allowed>} />
          <Route path="/leads/calls" element={<Allowed permission={routePermissions['/leads/calls']}><CallHistoryPage /></Allowed>} />
          <Route path="/call-history" element={<Allowed permission={routePermissions['/call-history']}><CallHistoryPage /></Allowed>} />
          <Route path="/followups" element={<Allowed permission={routePermissions['/followups']}><FollowUpListPage /></Allowed>} />
          <Route path="/customers" element={<Allowed permission={routePermissions['/customers']}><CustomerListPage /></Allowed>} />

          {/* Phase 4 — Products & Inventory */}
          <Route path="/products" element={<Allowed permission={routePermissions['/products']}><ProductCatalogPage /></Allowed>} />
          <Route path="/inventory" element={<Allowed permission={routePermissions['/inventory']}><InventoryLedgerPage /></Allowed>} />
          <Route path="/inventory/transfers" element={<Allowed permission={routePermissions['/inventory/transfers']}><StockTransfersPage /></Allowed>} />

          {/* Phase 5 — Orders & Shanthi Ayurvedas Modules */}
          <Route path="/orders" element={<Allowed permission={routePermissions['/orders']}><OrderListPage /></Allowed>} />
          <Route path="/orders/counter-sale" element={<Allowed permission={routePermissions['/orders/counter-sale']}><CounterSalePage /></Allowed>} />
          <Route path="/orders/stuck" element={<Allowed permission={routePermissions['/orders/stuck']}><StuckOrdersPage /></Allowed>} />
          <Route path="/orders/:id" element={<Allowed permission={routePermissions['/orders/:id']}><OrderDetailPage /></Allowed>} />
          {/* Phase 6 — Operations */}
          <Route path="/operations" element={<Allowed permission={routePermissions['/operations']}><OperationsHubPage /></Allowed>} />
          <Route path="/operations/packing" element={<Allowed permission={routePermissions['/operations/packing']}><PackingStationPage /></Allowed>} />
          <Route path="/operations/dispatch" element={<Allowed permission={routePermissions['/operations/dispatch']}><DispatchQueuePage /></Allowed>} />

          {/* Phase 7 & 8 — Shipping & RTO */}
          <Route path="/shipping" element={<Allowed permission={routePermissions['/shipping']}><DeliveryTrackingPage /></Allowed>} />
          <Route path="/shipping/tracking" element={<Allowed permission={routePermissions['/shipping/tracking']}><DeliveryTrackingPage /></Allowed>} />
          <Route path="/rto" element={<Allowed permission={routePermissions['/rto']}><RTOManagementPage /></Allowed>} />

          {/* Phase 9 — Reports & Finance */}
          <Route path="/reports" element={<Allowed permission={routePermissions['/reports']}><ReportsHubPage /></Allowed>} />
          <Route path="/reports/tc-sales" element={<Allowed permission={routePermissions['/reports/tc-sales']}><ReportsHubPage /></Allowed>} />
          <Route path="/reports/settlement" element={<Allowed permission={routePermissions['/reports/settlement']}><ReportsHubPage /></Allowed>} />

          {/* Phase 2 & 10 — Administration */}
          <Route path="/admin/branches" element={<Allowed permission={routePermissions['/admin/branches']}><BranchManagementPage /></Allowed>} />
          <Route path="/admin/users" element={<Allowed permission={routePermissions['/admin/users']}><UserManagementPage /></Allowed>} />
          <Route path="/admin/roles" element={<Allowed permission={routePermissions['/admin/roles']}><RolesManagementPage /></Allowed>} />
          <Route path="/admin/integrations" element={<Allowed permission={routePermissions['/admin/integrations']}><IntegrationsPage /></Allowed>} />
          <Route path="/admin/notifications-test" element={<Navigate to="/dashboard" replace />} />
          <Route path="/notifications-test" element={<Navigate to="/dashboard" replace />} />
          <Route path="/admin/audit" element={<Allowed permission={routePermissions['/admin/audit']}><AuditLogViewerPage /></Allowed>} />
        </Route>

        {/* Dedicated Standalone Scan Tracker View (Full-Screen Shanthi Ayurvedas Logistics Mode) */}
        <Route
          path="/scan-tracker"
          element={
            <ProtectedRoute>
              <Allowed permission="operations.view"><ScanTrackerPage /></Allowed>
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders/scan-tracker"
          element={
            <ProtectedRoute>
              <Allowed permission="operations.view"><ScanTrackerPage /></Allowed>
            </ProtectedRoute>
          }
        />
        <Route
          path="/operations/scan-tracker"
          element={
            <ProtectedRoute>
              <Allowed permission="operations.view"><ScanTrackerPage /></Allowed>
            </ProtectedRoute>
          }
        />

        {/* Catch-all 404 */}
        <Route path="*" element={<NotFoundScreen />} />
      </Routes>
    </Suspense>
  );
}

export default App;
