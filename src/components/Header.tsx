import React, { useState, useEffect, useRef } from 'react';
import { 
  Video, 
  Calendar, 
  Clock, 
  Globe, 
  Bell, 
  BellRing, 
  CheckCircle2, 
  ShieldCheck, 
  Layers, 
  ExternalLink, 
  ChevronDown, 
  LogOut, 
  Cpu, 
  User, 
  Sparkles,
  Shield,
  Database,
  RefreshCw,
  Server,
  ShieldAlert,
  Sliders,
  Workflow
} from 'lucide-react';
import { M365CalendarState, M365User } from '../types';
import { requestPushPermission, playZoomNotificationSound } from '../utils/notifications';
import { AyalaFoundationLogo } from './AyalaFoundationLogo';

interface HeaderProps {
  currentView: 'dashboard' | 'booking' | 'bookings-list' | 'm365' | 'zoom-api' | 'security-logs';
  onViewChange: (view: 'dashboard' | 'booking' | 'bookings-list' | 'm365' | 'zoom-api' | 'security-logs') => void;
  m365State: M365CalendarState;
  authUser: M365User | null;
  onSignOut: () => void;
  selectedTimezone: string;
  onOpenTimezoneModal: () => void;
  bookingCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onViewChange,
  m365State,
  authUser,
  onSignOut,
  selectedTimezone,
  onOpenTimezoneModal,
  bookingCount
}) => {
  const [pushStatus, setPushStatus] = useState<string>('default');
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isIntegrationMenuOpen, setIsIntegrationMenuOpen] = useState(false);
  const [isMobileIntegrationOpen, setIsMobileIntegrationOpen] = useState(false);
  const integrationMenuRef = useRef<HTMLDivElement>(null);
  const [supabaseStatus, setSupabaseStatus] = useState<{
    connected: boolean;
    url?: string | null;
    latencyMs?: number;
    profilesCount?: number;
    authUsersCount?: number;
  } | null>(null);
  const [isCheckingSb, setIsCheckingSb] = useState(false);

  // Close integration dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (integrationMenuRef.current && !integrationMenuRef.current.contains(event.target as Node)) {
        setIsIntegrationMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const isAdmin = Boolean(
    authUser?.isAdmin || 
    authUser?.role?.toLowerCase().includes('admin') || 
    authUser?.email?.toLowerCase().includes('admin') || 
    authUser?.email === 'sarah.jenkins@zoompartner.com'
  );

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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

            {/* Navigation Tabs - Role Based Access Control */}
            <nav className="hidden md:flex items-center space-x-1 pl-4 border-l border-gray-200">
              {/* 0. Dashboard Tab (Office 365 Calendar - Visible to all) */}
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

              {/* 1. Schedule Tab (Visible to all users & admin) */}
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

              {/* 2. Meetings Tab (Visible to all users & admin) */}
              <button
                onClick={() => onViewChange('bookings-list')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 relative cursor-pointer ${
                  currentView === 'bookings-list'
                    ? 'bg-blue-50 text-[#0b5cff] font-semibold'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Meetings
                {bookingCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-[#0b5cff] text-white">
                    {bookingCount}
                  </span>
                )}
              </button>

              {/* Admin-Only Tabs: Integration Dropdown & Security Audits */}
              {isAdmin && (
                <>
                  {/* Single Integration Dropdown Menu */}
                  <div className="relative" ref={integrationMenuRef}>
                    <button
                      type="button"
                      onClick={() => setIsIntegrationMenuOpen(!isIntegrationMenuOpen)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                        currentView === 'zoom-api' || currentView === 'm365'
                          ? 'bg-blue-50 text-[#0b5cff] font-semibold'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <Workflow className="w-3.5 h-3.5 text-[#0b5cff]" />
                      <span>Integration</span>
                      <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${isIntegrationMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isIntegrationMenuOpen && (
                      <div className="absolute left-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-gray-200 py-1.5 z-50 animate-in fade-in zoom-in-95">
                        <div className="px-3 py-1.5 border-b border-gray-100">
                          <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">
                            API &amp; Calendar Integrations
                          </span>
                        </div>

                        {/* Zoom API Option */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsIntegrationMenuOpen(false);
                            onViewChange('zoom-api');
                          }}
                          className={`w-full px-3 py-2.5 text-left text-xs flex items-center gap-3 hover:bg-gray-50 transition-colors cursor-pointer ${
                            currentView === 'zoom-api' ? 'bg-blue-50 text-[#0b5cff] font-bold' : 'text-gray-700'
                          }`}
                        >
                          <div className="w-7 h-7 rounded-xl bg-blue-50 text-[#0b5cff] flex items-center justify-center shrink-0 border border-blue-100">
                            <Cpu className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-gray-900 flex items-center justify-between">
                              <span>Zoom API</span>
                              {currentView === 'zoom-api' && (
                                <span className="w-1.5 h-1.5 rounded-full bg-[#0b5cff]" />
                              )}
                            </div>
                            <div className="text-[11px] text-gray-600 font-normal truncate">
                              Server-to-Server OAuth &amp; tokens
                            </div>
                          </div>
                        </button>

                        {/* M365 Sync Option */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsIntegrationMenuOpen(false);
                            onViewChange('m365');
                          }}
                          className={`w-full px-3 py-2.5 text-left text-xs flex items-center gap-3 hover:bg-gray-50 transition-colors cursor-pointer ${
                            currentView === 'm365' ? 'bg-blue-50 text-[#0b5cff] font-bold' : 'text-gray-700'
                          }`}
                        >
                          <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                            <Calendar className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-gray-900 flex items-center justify-between">
                              <span className="flex items-center gap-1.5">
                                M365 Sync
                                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                              </span>
                              {currentView === 'm365' && (
                                <span className="w-1.5 h-1.5 rounded-full bg-[#0b5cff]" />
                              )}
                            </div>
                            <div className="text-[11px] text-gray-600 font-normal truncate">
                              Outlook calendar sync &amp; meetings
                            </div>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Security Log Audits */}
                  <button
                    onClick={() => onViewChange('security-logs')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                      currentView === 'security-logs'
                        ? 'bg-red-50 text-red-700 font-semibold'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                    Login Audits
                  </button>
                </>
              )}
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

                      {/* Admin Security Fast Link */}
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onViewChange('security-logs');
                          }}
                          className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 flex items-center justify-between transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-1.5">
                            <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                            <span>Failed Login Audits</span>
                          </div>
                          <span className="text-[10px] bg-red-200/70 text-red-800 px-1.5 py-0.2 rounded font-bold">
                            Live
                          </span>
                        </button>
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

        {/* Mobile Navigation Bar - Role Based Access Control */}
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
          <button
            onClick={() => onViewChange('bookings-list')}
            className={`py-1 px-2 rounded cursor-pointer ${currentView === 'bookings-list' ? 'text-[#0b5cff] font-bold' : 'text-gray-600'}`}
          >
            Meetings ({bookingCount})
          </button>
          {isAdmin && (
            <>
              {/* Mobile Integration Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsMobileIntegrationOpen(!isMobileIntegrationOpen)}
                  className={`py-1 px-2 rounded cursor-pointer flex items-center gap-1 ${
                    currentView === 'zoom-api' || currentView === 'm365' ? 'text-[#0b5cff] font-bold' : 'text-gray-600'
                  }`}
                >
                  <span>Integration</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${isMobileIntegrationOpen ? 'rotate-180' : ''}`} />
                </button>

                {isMobileIntegrationOpen && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-200 py-1.5 z-50 animate-in fade-in zoom-in-95">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileIntegrationOpen(false);
                        onViewChange('zoom-api');
                      }}
                      className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2.5 hover:bg-gray-50 transition-colors ${
                        currentView === 'zoom-api' ? 'text-[#0b5cff] font-bold bg-blue-50' : 'text-gray-700'
                      }`}
                    >
                      <Cpu className="w-3.5 h-3.5 text-[#0b5cff]" />
                      <span>Zoom API</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileIntegrationOpen(false);
                        onViewChange('m365');
                      }}
                      className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2.5 hover:bg-gray-50 transition-colors ${
                        currentView === 'm365' ? 'text-[#0b5cff] font-bold bg-blue-50' : 'text-gray-700'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="flex items-center gap-1.5">
                        M365 Sync
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      </span>
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => onViewChange('security-logs')}
                className={`py-1 px-2 rounded cursor-pointer ${currentView === 'security-logs' ? 'text-red-600 font-bold' : 'text-gray-600'}`}
              >
                Audits
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
