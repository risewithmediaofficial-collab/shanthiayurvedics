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
  }
];

export function AccountSwitcherPill({ variant = 'light' }) {
  const { user, login, switchAccount } = useAuth();
  const queryClient = useQueryClient();
  const [switchingTo, setSwitchingTo] = useState(null);

  const isSwitched = typeof window !== 'undefined' && localStorage.getItem('switched_from_owner') === 'true';
  if (user?.role !== 'OWNER' && !isSwitched) return null;

  const handleSwitch = async (acc) => {
    if (user?.email?.toLowerCase() === acc.email.toLowerCase() || switchingTo) return;
    try {
      setSwitchingTo(acc.email);
      if (acc.role === 'OWNER') {
        localStorage.removeItem('switched_from_owner');
      } else {
        localStorage.setItem('switched_from_owner', 'true');
      }

      if (typeof switchAccount === 'function') {
        await switchAccount({ email: acc.email, role: acc.role });
      } else {
        await login({
          email: acc.email,
          password: 'Password@12345'
        });
      }
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

  // Ensure Boss and the current role are always accessible in the pill
  const pillAccounts = QUICK_ACCOUNTS.filter(
    (acc) => acc.role === 'OWNER' || acc.role === user?.role || acc.role === 'MANAGER'
  ).slice(0, 2);

  return (
    <div
      className={`inline-flex items-center gap-1 p-1 rounded-xl border text-xs select-none ${
        isDark ? 'bg-white/10 border-white/15' : 'bg-slate-100 border-slate-200'
      }`}
    >
      <span
        className={`text-[10px] font-bold px-1.5 uppercase tracking-wider hidden xl:inline ${
          isSwitched ? 'text-amber-500 font-extrabold' : isDark ? 'text-slate-300' : 'text-slate-500'
        }`}
      >
        {isSwitched ? '⚡ View:' : 'Switch:'}
      </span>

      {pillAccounts.map((acc) => {
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
  const { user, login, switchAccount } = useAuth();
  const queryClient = useQueryClient();
  const [switchingTo, setSwitchingTo] = useState(null);

  const isSwitched = typeof window !== 'undefined' && localStorage.getItem('switched_from_owner') === 'true';
  if (user?.role !== 'OWNER' && !isSwitched) return null;

  const handleSwitch = async (acc) => {
    if (user?.email?.toLowerCase() === acc.email.toLowerCase() || switchingTo) return;
    try {
      setSwitchingTo(acc.email);
      if (acc.role === 'OWNER') {
        localStorage.removeItem('switched_from_owner');
      } else {
        localStorage.setItem('switched_from_owner', 'true');
      }

      if (typeof switchAccount === 'function') {
        await switchAccount({ email: acc.email, role: acc.role });
      } else {
        await login({
          email: acc.email,
          password: 'Password@12345'
        });
      }
      queryClient.clear();
      window.location.reload();
    } catch (err) {
      console.error('Account switch failed:', err);
      alert(`Could not switch account to ${acc.fullTitle}: ` + (err.message || 'Error'));
    } finally {
      setSwitchingTo(null);
    }
  };

  const targetAcc = isSwitched
    ? QUICK_ACCOUNTS.find((a) => a.role === 'OWNER')
    : QUICK_ACCOUNTS.find((a) => a.role === 'MANAGER');

  if (!targetAcc) return null;

  const isPending = switchingTo === targetAcc.email;

  return (
    <div className="py-1.5 px-2 border-b border-slate-100">
      <button
        type="button"
        onClick={() => handleSwitch(targetAcc)}
        disabled={isPending}
        className={`w-full px-2.5 py-2 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
          isSwitched
            ? 'bg-amber-50/80 hover:bg-amber-100/80 border border-amber-200 text-amber-950'
            : 'bg-blue-50/60 hover:bg-blue-100/70 border border-blue-100 text-slate-800'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-base">{targetAcc.icon}</span>
          <div className="min-w-0">
            <div className="leading-tight font-bold text-slate-900 truncate">{targetAcc.fullTitle}</div>
            <div className="text-[10px] text-slate-400 font-mono truncate">{targetAcc.email}</div>
          </div>
        </div>

        {isPending ? (
          <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin flex-shrink-0" />
        ) : (
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex-shrink-0 border ${
              isSwitched
                ? 'bg-amber-200 text-amber-900 border-amber-300'
                : 'bg-blue-100 text-blue-800 border-blue-200'
            }`}
          >
            {isSwitched ? 'Return to Owner' : 'Switch'}
          </span>
        )}
      </button>
    </div>
  );
}

export default AccountSwitcherPill;
