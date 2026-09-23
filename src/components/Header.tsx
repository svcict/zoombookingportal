import React, { useState, useEffect } from 'react';
import {
  Video,
  Calendar,
  Globe,
  Bell,
  BellRing,
  ChevronDown,
  LogOut,
  Database,
  RefreshCw,
  Server,
  ShieldCheck
} from 'lucide-react';
import { M365User } from '../types';
import { requestPushPermission, playZoomNotificationSound } from '../utils/notifications';
import { AyalaFoundationLogo } from './AyalaFoundationLogo';

interface HeaderProps {
  currentView: 'dashboard' | 'booking';
  onViewChange: (view: 'dashboard' | 'booking') => void;
  authUser: M365User | null;
  onSignOut: () => void;
  selectedTimezone: string;
  onOpenTimezoneModal: () => void;
}

// This header serves only the regular staff booking experience - admin
// tools (Zoom API, M365 sync, login audits, admin grants) live entirely on
// the separate /admin portal (see AdminPortal.tsx), not as tabs here, so
// the two audiences never share a page. An admin viewing this header still
// sees a link out to /admin, since they're staff too and may want to book
// a meeting themselves.
export const Header: React.FC<HeaderProps> = ({
  currentView,
  onViewChange,
  authUser,
  onSignOut,
  selectedTimezone,
  onOpenTimezoneModal
}) => {
  const [pushStatus, setPushStatus] = useState<string>('default');
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<{
    connected: boolean;
    url?: string | null;
    latencyMs?: number;
    profilesCount?: number;
    authUsersCount?: number;
  } | null>(null);
  const [isCheckingSb, setIsCheckingSb] = useState(false);

  const fetchSupabaseStatus = async () => {
    setIsCheckingSb(true);
    try {
      const res = await fetch('/api/auth/supabase/status');
      const data = await res.json();
      setSupabaseStatus(data);
    } catch (e) {
      console.warn('Failed to fetch Supabase status in header:', e);
    } finally {
      setIsCheckingSb(false);
    }
  };

  useEffect(() => {
    if (isUserMenuOpen) {
      fetchSupabaseStatus();
    }
  }, [isUserMenuOpen]);

  // Trusts only the server-verified flag issued at login - never a guess
  // from the email or role string. Used here only to show/hide the "Open
  // Admin Portal" link, never to render admin tools in this page.
  const isAdmin = Boolean(authUser?.isAdmin);

  useEffect(() => {
    if ('Notification' in window) {
      setPushStatus(Notification.permission);
    }

    const updateTime = () => {
      try {
        const time = new Intl.DateTimeFormat('en-US', {
          timeZone: selectedTimezone,
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        }).format(new Date());
        setCurrentTimeStr(time);
      } catch (e) {
        setCurrentTimeStr(new Date().toLocaleTimeString());
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [selectedTimezone]);

  const handleEnablePush = async () => {
    const res = await requestPushPermission();
    setPushStatus(res);
    if (res === 'granted') {
      playZoomNotificationSound('join');
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      {/* Top Navigation Bar */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo and Brand */}
          <div className="flex items-center gap-4 sm:gap-6">
            <button
              onClick={() => onViewChange('dashboard')}
              className="flex items-center gap-3 group focus:outline-none cursor-pointer"
            >
              <AyalaFoundationLogo height={32} width="auto" className="h-8" />
              <div className="flex items-center gap-2">
                <div className="h-5 w-[1px] bg-gray-300 mx-1 hidden sm:block" />
                <span className="font-semibold text-gray-700 hidden sm:inline text-sm">Zoom Booking Portal</span>
              </div>
            </button>

            {/* Navigation Tabs */}
            <nav className="hidden md:flex items-center space-x-1 pl-4 border-l border-gray-200">
              <button
                onClick={() => onViewChange('dashboard')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                  currentView === 'dashboard'
                    ? 'bg-blue-50 text-[#0b5cff] font-semibold'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                Dashboard
              </button>

              <button
                onClick={() => onViewChange('booking')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                  currentView === 'booking'
                    ? 'bg-blue-50 text-[#0b5cff] font-semibold'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                Schedule
              </button>
            </nav>
          </div>

          {/* Right Status Controls: Timezone, Push Notifs, Host Avatar */}
          <div className="flex items-center gap-3">

            {/* Live Timezone Indicator */}
            <button
              onClick={onOpenTimezoneModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-700 hover:bg-gray-100 hover:border-gray-300 transition-colors cursor-pointer"
              title="Click to switch time zone"
            >
              <Globe className="w-3.5 h-3.5 text-[#0b5cff]" />
              <span className="hidden sm:inline font-medium truncate max-w-[130px]">
                {selectedTimezone.split('/')[1]?.replace('_', ' ') || selectedTimezone}
              </span>
              <span className="text-gray-400 font-mono text-[11px]">({currentTimeStr || '--:--'})</span>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>


            {/* Push Notifications Toggle */}
            {pushStatus === 'granted' ? (
              <button
                onClick={() => playZoomNotificationSound('chime')}
                className="p-2 rounded-lg text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors relative cursor-pointer"
                title="Push Reminders Active - Click to test chime"
              >
                <BellRing className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500" />
              </button>
            ) : (
              <button
                onClick={handleEnablePush}
                className="p-2 rounded-lg text-gray-600 hover:text-gray-900 bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer"
                title="Enable Push Notifications for Meeting Reminders"
              >
                <Bell className="w-4 h-4" />
              </button>
            )}

            {/* Authenticated M365 User Profile Menu */}
            {authUser ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1 rounded-xl hover:bg-gray-100 transition-all cursor-pointer border border-transparent hover:border-gray-200"
                >
                  <img
                    src={authUser.avatar}
                    alt={authUser.name}
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-[#0b5cff]/30"
                  />
                  <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-gray-200 p-4 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                      <img
                        src={authUser.avatar}
                        alt={authUser.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div className="overflow-hidden">
                        <div className="font-bold text-sm text-gray-900 truncate">{authUser.name}</div>
                        <div className="text-xs text-gray-500 truncate">{authUser.email}</div>
                        <div className="text-[10px] text-green-700 font-semibold mt-0.5 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          {authUser.provider === 'supabase' ? 'Supabase Authenticated' : 'Authenticated User'}
                        </div>
                      </div>
                    </div>

                    <div className="py-2 space-y-2 text-xs text-gray-600">
                      <div className="p-2.5 bg-gray-50 rounded-xl text-[11px] space-y-1.5 border border-gray-100">
                        <div><strong>Role:</strong> {authUser.role} {isAdmin && <span className="text-purple-600 font-bold">(Administrator)</span>}</div>
                        <div><strong>Tenant:</strong> {authUser.tenantName}</div>
                      </div>

                      {/* Local & Supabase Connection Status Diagnostic */}
                      <div className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-100 text-[11px] space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="font-bold text-gray-900 flex items-center gap-1.5">
                            <Database className="w-3.5 h-3.5 text-[#0b5cff]" />
                            <span>Database & Local Status</span>
                          </div>
                          <button
                            type="button"
                            onClick={fetchSupabaseStatus}
                            disabled={isCheckingSb}
                            title="Re-verify connection"
                            className="p-1 hover:bg-blue-100 rounded-md text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
                          >
                            <RefreshCw className={`w-3 h-3 ${isCheckingSb ? 'animate-spin text-[#0b5cff]' : ''}`} />
                          </button>
                        </div>

                        {/* Supabase Status */}
                        <div className="flex items-center justify-between gap-1 text-[10.5px]">
                          <span className="text-gray-600">Supabase Cloud DB:</span>
                          {supabaseStatus?.connected ? (
                            <span className="font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Connected {supabaseStatus.latencyMs ? `(${supabaseStatus.latencyMs}ms)` : ''}
                            </span>
                          ) : isCheckingSb ? (
                            <span className="text-gray-500">Checking...</span>
                          ) : (
                            <span className="font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                              Rechecking...
                            </span>
                          )}
                        </div>

                        {/* Local Server Status */}
                        <div className="flex items-center justify-between gap-1 text-[10.5px]">
                          <span className="text-gray-600">Local API Service:</span>
                          <span className="font-bold text-blue-700 bg-blue-100/80 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Server className="w-2.5 h-2.5 text-blue-600" />
                            Active (Port 3000)
                          </span>
                        </div>
                      </div>

                      {/* Admins are also staff, so this links out to the
                          separate /admin portal rather than opening any
                          admin tool inside this page. */}
                      {isAdmin && (
                        <a
                          href="/admin"
                          className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 flex items-center justify-between transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                            <span>Open Admin Portal</span>
                          </div>
                          <span className="text-[10px] bg-purple-200/70 text-purple-800 px-1.5 py-0.2 rounded font-bold">
                            /admin
                          </span>
                        </a>
                      )}
                    </div>

                    <div className="pt-2 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onSignOut();
                        }}
                        className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-gray-100 text-xs font-medium">
          <button
            onClick={() => onViewChange('dashboard')}
            className={`py-1 px-2 rounded cursor-pointer ${currentView === 'dashboard' ? 'text-[#0b5cff] font-bold' : 'text-gray-600'}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => onViewChange('booking')}
            className={`py-1 px-2 rounded cursor-pointer ${currentView === 'booking' ? 'text-[#0b5cff] font-bold' : 'text-gray-600'}`}
          >
            Schedule
          </button>
          {isAdmin && (
            <a href="/admin" className="py-1 px-2 rounded cursor-pointer text-purple-600 font-bold">
              Admin Portal
            </a>
          )}
        </div>
      </div>
    </header>
  );
};
