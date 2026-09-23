import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import VerifiedUserRounded from '@mui/icons-material/VerifiedUserRounded';

export function AuthLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isAuthenticated && !isLoading) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-ayur-50/20 to-slate-100/90 relative overflow-hidden flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      {/* Decorative ambient subtle background glows */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-ayur-200/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-gold-200/25 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md mx-auto text-center px-2 mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-ayur-700 via-ayur-600 to-ayur-500 text-white font-black text-2xl shadow-lg shadow-ayur-700/20 ring-4 ring-white mb-3">
          🌿
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Shanthi Ayurvedas</h2>
        <div className="mt-1.5 flex justify-center">
          <span className="inline-flex items-center px-3 py-0.5 rounded-full bg-ayur-100/80 border border-ayur-200/80 text-[11px] font-bold text-ayur-800 tracking-wider uppercase">
            Enterprise Business CRM
          </span>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto">
        <div className="bg-white/95 backdrop-blur-sm py-7 px-5 sm:py-8 sm:px-8 shadow-xl shadow-slate-200/60 rounded-3xl border border-slate-200/80">
          <Outlet />
        </div>

        <div className="mt-6 flex items-center justify-center">
          <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-white/80 backdrop-blur-xs border border-slate-200/80 px-3.5 py-1.5 rounded-full shadow-xs">
            <VerifiedUserRounded sx={{ fontSize: 16 }} className="text-ayur-600 shrink-0" />
            <span>Role-Based Multi-Branch Isolation & 256-bit Security</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;
