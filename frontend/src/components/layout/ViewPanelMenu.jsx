import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import DashboardRounded from '@mui/icons-material/DashboardRounded';
import KeyboardArrowDownRounded from '@mui/icons-material/KeyboardArrowDownRounded';
import CheckRounded from '@mui/icons-material/CheckRounded';
import { useAuth } from '../../context/AuthContext.jsx';

export function ViewPanelMenu() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
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

  const role = user?.role;
  // Only Owner, Manager, and Distributor have multi-panel viewing privileges
  if (role !== 'OWNER' && role !== 'MANAGER' && role !== 'DISTRIBUTOR') {
    return null;
  }

  // Determine current active panel
  const isDashboardPath = location.pathname === '/dashboard' || location.pathname === '/manager';
  const currentViewParam = searchParams.get('view')?.toLowerCase();

  let currentActiveId = 'default';
  if (isDashboardPath && currentViewParam === 'telecaller') {
    currentActiveId = 'telecaller';
  } else if (isDashboardPath && currentViewParam === 'distributor') {
    currentActiveId = 'distributor';
  } else if (isDashboardPath && currentViewParam === 'manager') {
    currentActiveId = 'manager';
  } else if (isDashboardPath && currentViewParam === 'owner') {
    currentActiveId = 'owner';
  } else if (isDashboardPath) {
    if (role === 'OWNER') currentActiveId = 'owner';
    else if (role === 'DISTRIBUTOR') currentActiveId = 'distributor';
    else currentActiveId = 'manager';
  }

  // Define panels by role
  const allPanels = [
    {
      id: 'owner',
      title: 'Boss / Owner Panel',
      subtitle: 'Multi-branch executive hub & master controls',
      icon: '👑',
      path: '/dashboard?view=owner',
      roles: ['OWNER']
    },
    {
      id: 'manager',
      title: 'Manager Operations Hub',
      subtitle: 'Branch fulfillment, stock ledger & team operations',
      icon: '👔',
      path: '/dashboard?view=manager',
      roles: ['OWNER', 'MANAGER']
    },
    {
      id: 'distributor',
      title: 'Distributor Stock Portal',
      subtitle: 'Warehouse ledger, stock allocations & transfers',
      icon: '📦',
      path: '/dashboard?view=distributor',
      roles: ['OWNER', 'DISTRIBUTOR']
    },
    {
      id: 'telecaller',
      title: 'Telecaller Dashboard',
      subtitle: 'Patient consults, calling desk, leads & orders',
      icon: '🎧',
      path: '/dashboard?view=telecaller',
      roles: ['OWNER', 'MANAGER', 'DISTRIBUTOR']
    }
  ];

  const availablePanels = allPanels.filter((p) => p.roles.includes(role));

  const currentPanel = availablePanels.find((p) => p.id === currentActiveId) || availablePanels[0];

  const handleSelectPanel = (panel) => {
    setIsOpen(false);
    navigate(panel.path);
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      {/* View Panel Trigger Button */}
      <button
        id="btn-view-panel-menu"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200/90 text-slate-800 rounded-xl border border-slate-200/90 text-xs font-bold transition-all shadow-2xs hover:shadow-xs cursor-pointer select-none"
        title="View different role panels"
      >
        <span className="text-emerald-700 flex items-center">
          <DashboardRounded sx={{ fontSize: 16 }} />
        </span>
        <span className="hidden sm:inline font-extrabold text-slate-700">View Panel:</span>
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white border border-slate-200 text-[11px] font-bold text-slate-900 shadow-2xs">
          <span>{currentPanel?.icon}</span>
          <span className="truncate max-w-[85px] sm:max-w-[110px]">{currentPanel?.title.split(' ')[0]}</span>
        </span>
        <KeyboardArrowDownRounded
          sx={{ fontSize: 16 }}
          className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-slate-200/90 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-4 py-3 bg-gradient-to-r from-emerald-50 via-slate-50 to-white border-b border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span>🖥️</span> Select View Panel
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                {role}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Switch real-time perspective to inspect workspace desks
            </p>
          </div>

          <div className="p-1.5 space-y-1 max-h-[360px] overflow-y-auto">
            {availablePanels.map((panel) => {
              const isActive = currentActiveId === panel.id;

              return (
                <button
                  key={panel.id}
                  id={`btn-panel-${panel.id}`}
                  type="button"
                  onClick={() => handleSelectPanel(panel)}
                  className={`w-full p-2.5 rounded-xl text-left flex items-start gap-3 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-50/80 border border-emerald-200/80 text-emerald-950 font-semibold shadow-2xs'
                      : 'hover:bg-slate-50 border border-transparent text-slate-700'
                  }`}
                >
                  <span className="text-xl p-1.5 bg-white rounded-lg border border-slate-100 shadow-2xs flex-shrink-0">
                    {panel.icon}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-xs font-bold leading-tight ${isActive ? 'text-emerald-900' : 'text-slate-900'}`}>
                        {panel.title}
                      </span>
                      {isActive && (
                        <span className="flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded-md">
                          <CheckRounded sx={{ fontSize: 12 }} />
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                      {panel.subtitle}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="px-3.5 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Logged in as <strong>{user?.name || role}</strong></span>
            <span className="text-[10px] text-emerald-700 font-bold">Quick View Mode</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default ViewPanelMenu;
