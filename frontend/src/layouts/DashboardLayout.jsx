import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar.jsx';
import { Navbar } from '../components/layout/Navbar.jsx';
import { Breadcrumbs } from '../components/layout/Breadcrumbs.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { Spinner } from '../components/common/Spinner.jsx';

export function DashboardLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const mainScrollRef = useRef(null);

  // Automatically scroll main content view to top whenever route or search parameters change
  useEffect(() => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname, location.search]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Spinner size="lg" text="Authenticating session..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} sidebarOpen={sidebarOpen} />
        
        <main
          ref={mainScrollRef}
          className="flex-1 overflow-y-auto overflow-x-hidden p-2.5 sm:p-4 md:p-6"
        >
          <div className="max-w-7xl mx-auto space-y-3.5 sm:space-y-4">
            {/* Top Navigation Trail / Breadcrumbs for easy access */}
            <Breadcrumbs />

            {/* Page View */}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
