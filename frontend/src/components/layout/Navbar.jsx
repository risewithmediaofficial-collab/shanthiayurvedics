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
    <header className="sticky top-0 z-30 flex items-center justify-between min-h-[3.5rem] sm:min-h-[4.75rem] px-1.5 xs:px-2.5 sm:px-6 bg-white border-b border-slate-200 shadow-xs select-none">
      {/* Left: Hamburger + Brand */}
      <div className="flex items-center gap-1 sm:gap-3 min-w-0 shrink-0">
        <button
          type="button"
          onClick={onMenuToggle}
          className="p-1 sm:p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg sm:rounded-xl lg:hidden focus:outline-none transition-colors cursor-pointer shrink-0 touch-target flex items-center justify-center"
          aria-label="Toggle sidebar"
        >
          <MenuRounded sx={{ fontSize: 22 }} />
        </button>

        <div className="flex items-center gap-1 sm:gap-1.5 lg:hidden min-w-0">
          <img
            src="/shanthi_logo.png"
            alt="Shanthi Ayurvedas"
            className="h-6 sm:h-8 w-auto max-w-[60px] xs:max-w-[85px] sm:max-w-[130px] object-contain shrink-0"
          />
          {/* Hide text role badge on mobile to eliminate overlap with navbar buttons */}
          <span className="hidden md:inline-flex text-[10px] text-emerald-700 font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 shrink-0">
            {isOwner ? 'OWNER' : (user?.role || 'CRM')}
          </span>
        </div>

        {/* Branch Selector (desktop) */}
        <div className="hidden sm:block">
          <BranchSelector align="left" />
        </div>
      </div>

      {/* Right: Account Switcher (Boss only) + View Panel + Branch (mobile) + Notifications + User */}
      <div className="flex items-center gap-0.5 xs:gap-1 sm:gap-2 shrink-0">
        {showSwitcher && (
          <div className="hidden sm:block">
            <AccountSwitcherPill variant="light" />
          </div>
        )}

        {/* Universal View Panel switcher for Owner, Manager, and Distributor */}
        <ViewPanelMenu />

        {/* Branch Selector (mobile) */}
        <div className="sm:hidden">
          <BranchSelector align="right" />
        </div>

        <NotificationBell />
        <div className="hidden sm:block w-px h-5 bg-slate-200" />
        <UserMenu />
      </div>
    </header>
  );
}

export default Navbar;
