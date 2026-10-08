import React from 'react';
import MenuRounded from '@mui/icons-material/MenuRounded';
import { BranchSelector } from './BranchSelector.jsx';
import { NotificationBell } from './NotificationBell.jsx';
import { UserMenu } from './UserMenu.jsx';
import { AccountSwitcherPill } from './AccountSwitcher.jsx';
import { ViewPanelMenu } from './ViewPanelMenu.jsx';

import { useAuth } from '../../context/AuthContext.jsx';

export function Navbar({ onMenuToggle }) {
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER';
  const isSwitched = typeof window !== 'undefined' && localStorage.getItem('switched_from_owner') === 'true';
  const showSwitcher = isOwner || isSwitched;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between min-h-[5.25rem] sm:min-h-[5.65rem] px-4 sm:px-6 bg-white border-b border-slate-200 shadow-xs">
      {/* Left: Hamburger + Brand (mobile only) */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuToggle}
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl lg:hidden focus:outline-none transition-colors cursor-pointer"
          aria-label="Toggle sidebar"
        >
          <MenuRounded sx={{ fontSize: 24 }} />
        </button>

        <div className="flex items-center gap-2 lg:hidden">
          <img
            src="/shanthi_logo.png"
            alt="Shanthi Ayurvedas"
            className="h-9 w-auto max-w-[140px] object-contain shrink-0"
          />
          <span className="text-[10px] text-emerald-700 font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100">
            {isOwner ? 'OWNER' : (user?.role || 'CRM')}
          </span>
        </div>

        {/* Branch Selector (desktop) */}
        <div className="hidden sm:block">
          <BranchSelector />
        </div>
      </div>

      {/* Right: Account Switcher (Boss only) + Branch (mobile) + View Panel + Notifications + User */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {showSwitcher && (
          <div className="hidden sm:block">
            <AccountSwitcherPill variant="light" />
          </div>
        )}

        {/* Universal View Panel switcher for Owner, Manager, and Distributor */}
        <ViewPanelMenu />

        <div className="sm:hidden">
          <BranchSelector />
        </div>

        <NotificationBell />
        <div className="w-px h-5 bg-slate-200" />
        <UserMenu />
      </div>
    </header>
  );
}

export default Navbar;
