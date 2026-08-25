import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ShieldCheck, Sparkles } from 'lucide-react';

export function AuthLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isAuthenticated && !isLoading) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center sm:py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4 mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-ayur-600 to-ayur-400 text-white font-black text-2xl shadow-lg shadow-ayur-900/50 mb-3">
          🌿
        </div>
        <h2 className="text-2xl font-black text-white tracking-tight">Shanthi Ayurvedas</h2>
        <p className="text-xs text-ayur-400 font-medium tracking-wider uppercase mt-1">
          Enterprise Business CRM
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-2xl rounded-2xl border border-slate-100">
          <Outlet />
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-ayur-500" />
          <span>Role-Based Multi-Branch Isolation & 256-bit Security</span>
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;
