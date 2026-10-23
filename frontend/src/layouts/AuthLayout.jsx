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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-ayur-50/20 to-slate-100/90 relative overflow-hidden flex flex-col justify-center py-6 sm:py-12 px-3 sm:px-6 lg:px-8">
      {/* Decorative ambient subtle background glows */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-ayur-200/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-gold-200/25 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md mx-auto text-center px-1 sm:px-2 mb-4 sm:mb-6">
        <img
          src="/shanthi_logo.png"
          alt="Shanthi Ayurvedas"
          className="h-20 sm:h-28 w-auto max-w-[220px] sm:max-w-[260px] object-contain mx-auto mb-2 sm:mb-3 drop-shadow-md"
        />
        <div className="flex justify-center">
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-ayur-100/90 border border-ayur-200 text-[11px] sm:text-xs font-bold text-ayur-900 tracking-wider uppercase shadow-2xs">
            Enterprise Business CRM
          </span>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto">
        <div className="bg-white/95 backdrop-blur-sm py-5 px-4 sm:py-8 sm:px-8 shadow-xl shadow-slate-200/60 rounded-2xl sm:rounded-3xl border border-slate-200/80">
          <Outlet />
        </div>

        <div className="mt-4 sm:mt-6 flex items-center justify-center">
          <div className="inline-flex items-center justify-center flex-wrap text-center gap-1.5 text-[10.5px] sm:text-xs text-slate-500 font-medium bg-white/80 backdrop-blur-xs border border-slate-200/80 px-3 py-1.5 rounded-full shadow-xs max-w-full">
            <VerifiedUserRounded sx={{ fontSize: 15 }} className="text-ayur-600 shrink-0" />
            <span>Role-Based Multi-Branch Isolation & 256-bit Security</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;
