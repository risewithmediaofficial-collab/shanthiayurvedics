import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthLayout } from './layouts/AuthLayout.jsx';
import { DashboardLayout } from './layouts/DashboardLayout.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { Spinner } from './components/common/Spinner.jsx';

// Feature Pages
import LoginPage from './features/auth/LoginPage.jsx';
import ForgotPasswordPage from './features/auth/ForgotPasswordPage.jsx';
import ResetPasswordPage from './features/auth/ResetPasswordPage.jsx';
import DashboardHub from './features/dashboard/DashboardHub.jsx';
import LeadListPage from './features/leads/LeadListPage.jsx';
import CallHistoryPage from './features/leads/CallHistoryPage.jsx';
import FollowUpListPage from './features/followups/FollowUpListPage.jsx';
import CustomerListPage from './features/customers/CustomerListPage.jsx';
import ProductCatalogPage from './features/products/ProductCatalogPage.jsx';
import InventoryLedgerPage from './features/inventory/InventoryLedgerPage.jsx';
import StockTransfersPage from './features/inventory/StockTransfersPage.jsx';
import OrderListPage from './features/orders/OrderListPage.jsx';
import OrderDetailPage from './features/orders/OrderDetailPage.jsx';
import CounterSalePage from './features/orders/CounterSalePage.jsx';
import StuckOrdersPage from './features/orders/StuckOrdersPage.jsx';
import OperationsHubPage from './features/operations/OperationsHubPage.jsx';
import PackingStationPage from './features/operations/PackingStationPage.jsx';
import DispatchQueuePage from './features/operations/DispatchQueuePage.jsx';
import ScanTrackerPage from './features/operations/ScanTrackerPage.jsx';
import DeliveryTrackingPage from './features/shipping/DeliveryTrackingPage.jsx';
import RTOManagementPage from './features/rto/RTOManagementPage.jsx';
import ReportsHubPage from './features/reports/ReportsHubPage.jsx';
import BranchManagementPage from './features/administration/BranchManagementPage.jsx';
import UserManagementPage from './features/administration/UserManagementPage.jsx';
import RolesManagementPage from './features/administration/RolesManagementPage.jsx';
import IntegrationsPage from './features/administration/IntegrationsPage.jsx';
import AuditLogViewerPage from './features/administration/AuditLogViewerPage.jsx';

// Protected Route Guard
function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <Spinner size="lg" text="Authenticating secure CRM session..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export function App() {
  return (
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
        <Route path="/leads" element={<LeadListPage />} />
        <Route path="/leads/calls" element={<CallHistoryPage />} />
        <Route path="/call-history" element={<CallHistoryPage />} />
        <Route path="/followups" element={<FollowUpListPage />} />
        <Route path="/customers" element={<CustomerListPage />} />

        {/* Phase 4 — Products & Inventory */}
        <Route path="/products" element={<ProductCatalogPage />} />
        <Route path="/inventory" element={<InventoryLedgerPage />} />
        <Route path="/inventory/transfers" element={<StockTransfersPage />} />

        {/* Phase 5 — Orders & AyurOne Mart Modules */}
        <Route path="/orders" element={<OrderListPage />} />
        <Route path="/orders/counter-sale" element={<CounterSalePage />} />
        <Route path="/orders/stuck" element={<StuckOrdersPage />} />
        <Route path="/orders/:id" element={<OrderDetailPage />} />
        {/* Phase 6 — Operations */}
        <Route path="/operations" element={<OperationsHubPage />} />
        <Route path="/operations/packing" element={<PackingStationPage />} />
        <Route path="/operations/dispatch" element={<DispatchQueuePage />} />

        {/* Phase 7 & 8 — Shipping & RTO */}
        <Route path="/shipping" element={<DeliveryTrackingPage />} />
        <Route path="/shipping/tracking" element={<DeliveryTrackingPage />} />
        <Route path="/rto" element={<RTOManagementPage />} />

        {/* Phase 9 — Reports & Finance */}
        <Route path="/reports" element={<ReportsHubPage />} />
        <Route path="/reports/tc-sales" element={<ReportsHubPage />} />
        <Route path="/reports/settlement" element={<ReportsHubPage />} />

        {/* Phase 2 & 10 — Administration */}
        <Route path="/admin/branches" element={<BranchManagementPage />} />
        <Route path="/admin/users" element={<UserManagementPage />} />
        <Route path="/admin/roles" element={<RolesManagementPage />} />
        <Route path="/admin/integrations" element={<IntegrationsPage />} />
        <Route path="/admin/audit" element={<AuditLogViewerPage />} />
      </Route>
      {/* Dedicated Standalone Scan Tracker View (Full-Screen AyurOne Mart Logistics Mode) */}
      <Route
        path="/scan-tracker"
        element={
          <ProtectedRoute>
            <ScanTrackerPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/orders/scan-tracker"
        element={
          <ProtectedRoute>
            <ScanTrackerPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/operations/scan-tracker"
        element={
          <ProtectedRoute>
            <ScanTrackerPage />
          </ProtectedRoute>
        }
      />

      {/* Catch-all 404 */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
