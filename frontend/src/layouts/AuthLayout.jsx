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
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-6 sm:py-12 px-3 sm:px-6 lg:px-8">
      <div className="w-full max-w-md mx-auto text-center px-2 mb-5 sm:mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-ayur-600 to-ayur-400 text-white font-black text-xl sm:text-2xl shadow-lg shadow-ayur-900/50 mb-2.5 sm:mb-3">
          🌿
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Shanthi Ayurvedas</h2>
        <p className="text-[11px] sm:text-xs text-ayur-400 font-semibold tracking-wider uppercase mt-1">
          Enterprise Business CRM
        </p>
      </div>

      <div className="w-full max-w-md mx-auto">
        <div className="bg-white py-6 px-4 sm:py-8 sm:px-10 shadow-2xl rounded-2xl border border-slate-100">
          <Outlet />
        </div>

        <div className="mt-5 sm:mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-400 text-center px-2">
          <VerifiedUserRounded sx={{ fontSize: 16 }} className="text-ayur-500 shrink-0" />
          <span>Role-Based Multi-Branch Isolation & 256-bit Security</span>
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;
