import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Shield, Check, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

export const QUICK_ACCOUNTS = [
  {
    role: 'OWNER',
    label: 'Boss',
    fullTitle: 'Boss (Owner)',
    email: 'owner@shanthiayurvedas.com',
    icon: '👑',
    activeBg: 'bg-amber-500 text-slate-950 font-black shadow-xs',
    badge: 'bg-amber-100 text-amber-900 border-amber-300'
  },
  {
    role: 'MANAGER',
    label: 'Manager',
    fullTitle: 'Manager (Hosur Hub)',
    email: 'manager.hosur@shanthiayurvedas.com',
    icon: '👔',
    activeBg: 'bg-blue-600 text-white font-black shadow-xs',
    badge: 'bg-blue-100 text-blue-900 border-blue-300'
  },
  {
    role: 'DISTRIBUTOR',
    label: 'Distributor',
    fullTitle: 'Distributor (Ramesh)',
    email: 'distributor@shanthiayurvedas.com',
    icon: '💼',
    activeBg: 'bg-purple-600 text-white font-black shadow-xs',
    badge: 'bg-purple-100 text-purple-900 border-purple-300'
  },
  {
    role: 'TELECALLER',
    label: 'Telecaller',
    fullTitle: 'Telecaller (Sathish)',
    email: 'sathish@shanthiayurvedas.com',
    icon: '🎧',
    activeBg: 'bg-emerald-600 text-white font-black shadow-xs',
    badge: 'bg-emerald-100 text-emerald-900 border-emerald-300'
  }
];

export function AccountSwitcherPill({ variant = 'light' }) {
  const { user, login } = useAuth();
  const queryClient = useQueryClient();
  const [switchingTo, setSwitchingTo] = useState(null);

  if (user?.role !== 'OWNER') return null;

  const handleSwitch = async (acc) => {
    if (user?.email?.toLowerCase() === acc.email.toLowerCase() || switchingTo) return;
    try {
      setSwitchingTo(acc.email);
      await login({
        email: acc.email,
        password: 'Password@12345'
      });
      // Clear query cache to reload freshly with new user scope
      queryClient.clear();
      window.location.reload();
    } catch (err) {
      console.error('Account switch failed:', err);
      alert(`Could not switch account to ${acc.fullTitle}: ` + (err.message || 'Error'));
    } finally {
      setSwitchingTo(null);
    }
  };

  const isDark = variant === 'dark';

  return (
    <div
      className={`inline-flex items-center gap-1 p-1 rounded-xl border text-xs select-none ${
        isDark ? 'bg-white/10 border-white/15' : 'bg-slate-100 border-slate-200'
      }`}
    >
      <span
        className={`text-[10px] font-bold px-1.5 uppercase tracking-wider hidden xl:inline ${
          isDark ? 'text-slate-300' : 'text-slate-500'
        }`}
      >
        Switch:
      </span>

      {QUICK_ACCOUNTS.slice(0, 2).map((acc) => {
        const isCurrent = user?.role === acc.role;
        const isPending = switchingTo === acc.email;

        return (
          <button
            key={acc.role}
            type="button"
            onClick={() => handleSwitch(acc)}
            disabled={Boolean(switchingTo)}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
              isCurrent
                ? acc.activeBg
                : isDark
                ? 'text-slate-200 hover:text-white hover:bg-white/15'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            } ${switchingTo && !isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={`Switch to ${acc.fullTitle} (${acc.email})`}
          >
            {isPending ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <span>{acc.icon}</span>
            )}
            <span>{acc.label}</span>
            {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />}
          </button>
        );
      })}
    </div>
  );
}

export function AccountSwitcherMenu() {
  const { user, login } = useAuth();
  const queryClient = useQueryClient();
  const [switchingTo, setSwitchingTo] = useState(null);

  if (user?.role !== 'OWNER') return null;

  const handleSwitch = async (acc) => {
    if (user?.email?.toLowerCase() === acc.email.toLowerCase() || switchingTo) return;
    try {
      setSwitchingTo(acc.email);
      await login({
        email: acc.email,
        password: 'Password@12345'
      });
      queryClient.clear();
      window.location.reload();
    } catch (err) {
      console.error('Account switch failed:', err);
      alert(`Could not switch account to ${acc.fullTitle}: ` + (err.message || 'Error'));
    } finally {
      setSwitchingTo(null);
    }
  };

  return (
    <div className="py-1.5 px-2 border-b border-slate-100">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1 flex items-center gap-1">
        <span>⚡</span>
        <span>Quick Switch Account</span>
      </div>

      <div className="space-y-1 mt-1">
        {QUICK_ACCOUNTS.map((acc) => {
          const isCurrent = user?.email?.toLowerCase() === acc.email.toLowerCase();
          const isPending = switchingTo === acc.email;

          return (
            <button
              key={acc.role}
              type="button"
              onClick={() => handleSwitch(acc)}
              disabled={isCurrent || Boolean(switchingTo)}
              className={`w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                isCurrent
                  ? 'bg-slate-100 text-slate-900 cursor-default'
                  : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">{acc.icon}</span>
                <div>
                  <div className="leading-tight font-bold">{acc.fullTitle}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{acc.email}</div>
                </div>
              </div>

              {isPending ? (
                <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
              ) : isCurrent ? (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Active
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default AccountSwitcherPill;
