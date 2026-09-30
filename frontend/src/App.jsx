import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
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

// Protected Route Guard
function ProtectedRoute({ children }) {
  const { user, isLoading, authError, checkAuth } = useAuth();
  const location = useLocation();
  if (authError) return <div role="alert" className="mx-auto my-20 max-w-md rounded-xl border bg-white p-8 text-center"><h1 className="text-xl font-semibold">Connection interrupted</h1><p className="mt-3 text-slate-600">{authError}</p><button className="mt-5 rounded-lg bg-emerald-700 px-4 py-2 text-white" onClick={checkAuth}>Try again</button></div>;

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

const routePermissions = {
  '/leads': 'leads.view', '/leads/calls': 'leads.view', '/call-history': 'leads.view', '/followups': 'followups.view', '/customers': 'customers.view',
  '/products': 'products.view', '/inventory': 'inventory.view', '/inventory/transfers': 'inventory.transfer', '/orders': 'orders.view', '/orders/counter-sale': 'orders.create', '/orders/stuck': 'orders.view', '/orders/:id': 'orders.view',
  '/operations': 'operations.view', '/operations/packing': 'orders.pack', '/operations/dispatch': 'orders.dispatch', '/shipping': 'shipping.view', '/shipping/tracking': 'shipping.view', '/rto': 'rto.view', '/reports': 'reports.view', '/reports/tc-sales': 'reports.view', '/reports/settlement': 'reports.view',
  '/admin/branches': 'branches.manage', '/admin/users': 'users.view', '/admin/roles': 'roles.manage', '/admin/integrations': 'integrations.manage', '/admin/audit': 'audit.view'
};
function Allowed({ permission, children }) {
  const { user } = useAuth();
  if (hasPermissionForUser(user, permission)) return children;
  return <div role="alert" className="rounded-xl border border-slate-200 bg-white p-8 text-center"><h1 className="text-xl font-semibold">Access restricted</h1><p className="mt-2 text-slate-600">Your account does not have access to this module. Contact your administrator.</p><Link className="mt-4 inline-block font-semibold text-emerald-700" to="/dashboard">Return to dashboard</Link></div>;
}

export function App() {
  return (
    <Suspense fallback={<Spinner size="lg" text="Loading workspace?" className="py-24" />}><Routes>
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
      <Route path="*" element={<div className="max-w-lg mx-auto p-10 text-center"><h1 className="text-2xl font-semibold">Page not found</h1><p className="my-4 text-slate-600">The page may have moved or the link may be incorrect.</p><Link to="/dashboard" className="font-semibold text-emerald-700">Return to dashboard</Link></div>} />
    </Routes></Suspense>
  );
}

export default App;
