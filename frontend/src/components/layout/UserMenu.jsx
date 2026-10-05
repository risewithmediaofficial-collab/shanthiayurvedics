import React, { useState, useRef, useEffect } from 'react';
import PersonRounded from '@mui/icons-material/PersonRounded';
import LogoutRounded from '@mui/icons-material/LogoutRounded';
import SecurityRounded from '@mui/icons-material/SecurityRounded';
import KeyboardArrowDownRounded from '@mui/icons-material/KeyboardArrowDownRounded';
import EditRounded from '@mui/icons-material/EditRounded';
import SaveRounded from '@mui/icons-material/SaveRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import LockResetRounded from '@mui/icons-material/LockResetRounded';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext.jsx';
import { AccountSwitcherMenu } from './AccountSwitcher.jsx';
import apiClient from '../../api/apiClient.js';

export function UserMenu() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState('menu'); // 'menu' | 'profile' | 'password'
  const menuRef = useRef(null);

  // Profile edit state
  const [profileData, setProfileData] = useState({ name: '', phone: '' });
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
        setView('menu');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openProfile = () => {
    setProfileData({ name: user?.name || '', phone: user?.phone || '' });
    setSuccessMsg('');
    setErrorMsg('');
    setView('profile');
  };

  const openPassword = () => {
    setPasswordData({ currentPassword: '', newPassword: '', confirm: '' });
    setSuccessMsg('');
    setErrorMsg('');
    setView('password');
  };

  const showMsg = (msg, isError = false) => {
    if (isError) setErrorMsg(msg);
    else setSuccessMsg(msg);
    setTimeout(() => { setSuccessMsg(''); setErrorMsg(''); }, 4000);
  };

  // Update own profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: data => apiClient.patch(`/users/${user?.id || user?._id}`, data),
    onSuccess: () => {
      showMsg('Profile updated! Changes take effect on next login.');
      setTimeout(() => setView('menu'), 2000);
    },
    onError: err => showMsg(err.response?.data?.message || 'Update failed', true)
  });

  // Change own password mutation
  const changePasswordMutation = useMutation({
    mutationFn: data => apiClient.post('/auth/change-password', data),
    onSuccess: () => {
      showMsg('Password changed successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirm: '' });
      setTimeout(() => setView('menu'), 2000);
    },
    onError: err => showMsg(err.response?.data?.message || 'Password change failed', true)
  });

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'OWNER': return 'bg-violet-100 text-violet-800 border-violet-200';
      case 'DISTRIBUTOR': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'MANAGER': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'TELECALLER': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const initials = user?.name ? user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : 'SA';

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => { setIsOpen(!isOpen); setView('menu'); }}
        className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer"
        title="Profile & Account"
      >
        <div className="w-8 h-8 rounded-lg bg-ayur-700 text-white flex items-center justify-center font-bold text-xs shadow-xs">
          {initials}
        </div>
        <div className="hidden md:block text-left">
          <div className="text-xs font-semibold text-slate-800 leading-tight">{user?.name || 'Ayurvedas User'}</div>
          <div className="text-[10px] text-slate-500 capitalize">{user?.role?.toLowerCase() || 'Authenticated'}</div>
        </div>
        <KeyboardArrowDownRounded sx={{ fontSize: 16 }} className="text-slate-400 hidden md:block" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden z-50 animate-fade-in">

          {/* ── MAIN MENU VIEW ── */}
          {view === 'menu' && (
            <>
              {/* Profile Header */}
              <div className="px-4 py-3.5 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-ayur-700 text-white flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate">{user?.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
                    <span className={`mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${getRoleBadgeColor(user?.role)}`}>
                      <SecurityRounded sx={{ fontSize: 11 }} />
                      {user?.role}
                    </span>
                  </div>
                </div>
              </div>

              {/* Account Switcher (OWNER or switched from OWNER) */}
              {(user?.role === 'OWNER' || (typeof window !== 'undefined' && localStorage.getItem('switched_from_owner') === 'true')) && <AccountSwitcherMenu />}

              {/* Actions */}
              <div className="py-1.5">
                <button
                  type="button"
                  onClick={openProfile}
                  className="w-full px-4 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer group"
                >
                  <span className="w-7 h-7 rounded-lg bg-amber-50 group-hover:bg-amber-100 border border-amber-100 flex items-center justify-center transition-colors flex-shrink-0">
                    <EditRounded sx={{ fontSize: 15 }} className="text-amber-600" />
                  </span>
                  <div>
                    <div className="font-semibold text-slate-800">Edit My Profile</div>
                    <div className="text-[10px] text-slate-400 font-normal">Update name, phone number</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={openPassword}
                  className="w-full px-4 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer group"
                >
                  <span className="w-7 h-7 rounded-lg bg-blue-50 group-hover:bg-blue-100 border border-blue-100 flex items-center justify-center transition-colors flex-shrink-0">
                    <LockResetRounded sx={{ fontSize: 15 }} className="text-blue-600" />
                  </span>
                  <div>
                    <div className="font-semibold text-slate-800">Change Password</div>
                    <div className="text-[10px] text-slate-400 font-normal">Update your login password</div>
                  </div>
                </button>
              </div>

              <div className="border-t border-slate-100 py-1">
                <button
                  type="button"
                  onClick={() => { setIsOpen(false); logout(); }}
                  className="w-full px-4 py-2.5 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer group"
                >
                  <span className="w-7 h-7 rounded-lg bg-rose-50 group-hover:bg-rose-100 border border-rose-100 flex items-center justify-center transition-colors flex-shrink-0">
                    <LogoutRounded sx={{ fontSize: 15 }} className="text-rose-600" />
                  </span>
                  <div>
                    <div>Sign Out</div>
                    <div className="text-[10px] text-rose-400 font-normal">End your session</div>
                  </div>
                </button>
              </div>
            </>
          )}

          {/* ── PROFILE EDIT VIEW ── */}
          {view === 'profile' && (
            <div className="p-4 space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800">Edit My Profile</h3>
                <button type="button" onClick={() => setView('menu')} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                  <CloseRounded sx={{ fontSize: 18 }} />
                </button>
              </div>

              {/* Messages */}
              {successMsg && <div className="text-[11px] bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-3 py-2 font-semibold">{successMsg}</div>}
              {errorMsg && <div className="text-[11px] bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-3 py-2 font-semibold">{errorMsg}</div>}

              <form
                onSubmit={e => {
                  e.preventDefault();
                  updateProfileMutation.mutate({ name: profileData.name, phone: profileData.phone });
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={profileData.name}
                    onChange={e => setProfileData({ ...profileData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-ayur-500 focus:border-ayur-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={e => setProfileData({ ...profileData, phone: e.target.value })}
                    placeholder="e.g. 9629985341"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:ring-2 focus:ring-ayur-500 focus:border-ayur-500 outline-none transition-all"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setView('menu')} className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                    className="flex-1 py-2 text-xs font-bold text-white bg-ayur-700 hover:bg-ayur-800 disabled:opacity-60 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <SaveRounded sx={{ fontSize: 14 }} />
                    {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── CHANGE PASSWORD VIEW ── */}
          {view === 'password' && (
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800">Change Password</h3>
                <button type="button" onClick={() => setView('menu')} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                  <CloseRounded sx={{ fontSize: 18 }} />
                </button>
              </div>

              {successMsg && <div className="text-[11px] bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-3 py-2 font-semibold">{successMsg}</div>}
              {errorMsg && <div className="text-[11px] bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-3 py-2 font-semibold">{errorMsg}</div>}

              <form
                onSubmit={e => {
                  e.preventDefault();
                  if (passwordData.newPassword !== passwordData.confirm) {
                    showMsg('New passwords do not match', true);
                    return;
                  }
                  if (passwordData.newPassword.length < 10) {
                    showMsg('New password must be at least 10 characters', true);
                    return;
                  }
                  changePasswordMutation.mutate({
                    currentPassword: passwordData.currentPassword,
                    newPassword: passwordData.newPassword
                  });
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Current Password</label>
                  <input
                    type="password"
                    required
                    value={passwordData.currentPassword}
                    onChange={e => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-ayur-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    minLength={10}
                    value={passwordData.newPassword}
                    onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    placeholder="Min 10 characters"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-ayur-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={passwordData.confirm}
                    onChange={e => setPasswordData({ ...passwordData, confirm: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-ayur-500 outline-none transition-all"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setView('menu')} className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={changePasswordMutation.isPending}
                    className="flex-1 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <LockResetRounded sx={{ fontSize: 14 }} />
                    {changePasswordMutation.isPending ? 'Saving...' : 'Change Password'}
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

export default UserMenu;
