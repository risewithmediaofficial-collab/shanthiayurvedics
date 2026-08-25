import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, Shield, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

export function UserMenu() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'OWNER':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'DISTRIBUTOR':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'MANAGER':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'TELECALLER':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-100 transition-colors focus:outline-none"
      >
        <div className="w-8 h-8 rounded-lg bg-ayur-700 text-white flex items-center justify-center font-bold text-xs shadow-xs">
          {user?.name ? user.name.slice(0, 2).toUpperCase() : 'SA'}
        </div>
        <div className="hidden md:block text-left">
          <div className="text-xs font-semibold text-slate-800 leading-tight">
            {user?.name || 'Ayurvedas User'}
          </div>
          <div className="text-[10px] text-slate-500 capitalize">
            {user?.role?.toLowerCase() || 'Authenticated'}
          </div>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:block" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-modal border border-slate-200/80 py-1.5 z-50 animate-fade-in">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-900">{user?.name}</p>
            <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
            <div className="mt-2">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${getRoleBadgeColor(user?.role)}`}>
                <Shield className="w-2.5 h-2.5" />
                {user?.role}
              </span>
            </div>
          </div>

          <div className="py-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="w-full px-4 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserMenu;
