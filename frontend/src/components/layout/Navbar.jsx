import React from 'react';
import { Menu, Search } from 'lucide-react';
import { BranchSelector } from './BranchSelector.jsx';
import { NotificationBell } from './NotificationBell.jsx';
import { UserMenu } from './UserMenu.jsx';

export function Navbar({ onMenuToggle, sidebarOpen }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-subtle">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuToggle}
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg lg:hidden focus:outline-none"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Brand logo in header for mobile */}
        <div className="flex items-center gap-2 lg:hidden">
          <div className="w-8 h-8 rounded-lg bg-ayur-800 text-white font-black text-sm flex items-center justify-center shadow-xs">
            🌿
          </div>
          <span className="text-sm font-bold text-slate-800 tracking-tight">Shanthi Ayurvedas</span>
        </div>

        {/* Global Branch Filter */}
        <div className="hidden sm:block">
          <BranchSelector />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <div className="sm:hidden">
          <BranchSelector />
        </div>

        <NotificationBell />
        <div className="w-px h-6 bg-slate-200 mx-0.5" />
        <UserMenu />
      </div>
    </header>
  );
}

export default Navbar;
