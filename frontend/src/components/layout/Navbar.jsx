import React from 'react';
import MenuRounded from '@mui/icons-material/MenuRounded';
import { BranchSelector } from './BranchSelector.jsx';
import { NotificationBell } from './NotificationBell.jsx';
import { UserMenu } from './UserMenu.jsx';
import { AccountSwitcherPill } from './AccountSwitcher.jsx';

import { useAuth } from '../../context/AuthContext.jsx';

export function Navbar({ onMenuToggle }) {
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER';

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 sm:px-6 bg-white border-b border-slate-200 shadow-sm">
      {/* Left: Hamburger + Brand (mobile only) */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuToggle}
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg lg:hidden focus:outline-none transition-colors"
          aria-label="Toggle sidebar"
        >
          <MenuRounded sx={{ fontSize: 22 }} />
        </button>

        <div className="flex items-center gap-2 lg:hidden">
          <div className="w-7 h-7 rounded-lg bg-ayur-700 text-white font-black text-xs flex items-center justify-center">
            🌿
          </div>
          <span className="text-sm font-bold text-slate-800">Shanthi Ayurvedas</span>
        </div>

        {/* Branch Selector (desktop) */}
        <div className="hidden sm:block">
          <BranchSelector />
        </div>
      </div>

      {/* Right: Account Switcher (Boss only) + Branch (mobile) + Notifications + User */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {isOwner && (
          <div className="hidden sm:block">
            <AccountSwitcherPill variant="light" />
          </div>
        )}

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
