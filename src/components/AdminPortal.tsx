import React, { useState, useEffect } from 'react';
import { Cpu, Calendar, ShieldAlert, ShieldCheck, LogOut, ArrowLeft, UserX } from 'lucide-react';
import { M365AuthGate } from './M365AuthGate';
import { ZoomApiIntegrationView } from './ZoomApiIntegrationView';
import { M365SyncView } from './M365SyncView';
import { AdminSecurityAuditView } from './AdminSecurityAuditView';
import { AdminUsersView } from './AdminUsersView';
import { AyalaFoundationLogo } from './AyalaFoundationLogo';
import { M365User, M365CalendarState } from '../types';
import { INITIAL_M365_STATE } from '../data/initialData';
import { buildAuthHeaders } from '../utils/auth';

type AdminView = 'admin-users' | 'zoom-api' | 'm365' | 'security-logs';

// The dedicated /admin portal - a completely separate page from the regular
// staff booking app (App.tsx), not a tab bolted onto it. Sign-in reuses the
// same login mechanism (Supabase, local test accounts, Microsoft 365 SSO)
// since it's still the same identity system, but this page renders nothing
// beyond the login form unless the signed-in account is a real, server-
// verified admin - a non-admin signing in here sees a clear refusal, never
// any admin content.
export default function AdminPortal() {
  const [authUser, setAuthUser] = useState<M365User | null>(() => {
    try {
      const cached = localStorage.getItem('m365_auth_user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [currentView, setCurrentView] = useState<AdminView>('admin-users');
  const [m365State, setM365State] = useState<M365CalendarState>(INITIAL_M365_STATE);

  const isAdmin = Boolean(authUser?.isAdmin);
  const authHeaders = buildAuthHeaders(authUser);

  useEffect(() => {
    if (!isAdmin) return;
    fetch('/api/m365/status')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.success && data.data) setM365State(data.data);
      })
      .catch(() => {});
  }, [isAdmin]);

  const handleToggleM365Sync = async () => {
    const res = await fetch('/api/m365/sync-toggle', { method: 'POST' });
    const data = await res.json();
    if (data.success) setM365State(data.data);
  };

  const handleCheckM365Now = async (date: string) => {
    const res = await fetch(`/api/m365/check-now?date=${encodeURIComponent(date)}`);
    const data = await res.json();
    setM365State((prev) => ({ ...prev, lastCheckedAt: new Date().toISOString() }));
    return data;
  };

  const handleSignOut = () => {
    localStorage.removeItem('m365_auth_user');
    setAuthUser(null);
  };

  // No session at all yet - show the login form.
  if (!authUser) {
    return <M365AuthGate variant="admin" onAuthenticated={(user) => setAuthUser(user)} />;
  }

  // Signed in, but not an admin - never render admin content for them. Their
  // session is left alone (it's a perfectly valid session for the regular
  // booking portal), they just aren't shown anything here.
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#F0F2F5] flex flex-col justify-center items-center p-6 font-sans">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 shadow-xl p-7 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <UserX className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-gray-900">Admins Only</h1>
            <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
              <strong>{authUser.email}</strong> is signed in, but doesn't have admin access on this portal.
            </p>
          </div>
          <div className="flex flex-col gap-2 pt-1">
            <a
              href="/"
              className="w-full py-2.5 px-4 rounded-xl bg-[#0b5cff] hover:bg-[#0049d1] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Go to Booking Portal
            </a>
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full py-2.5 px-4 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 font-semibold text-xs transition-all cursor-pointer"
            >
              Try a different account
            </button>
          </div>
        </div>
      </div>
    );
  }

  const navItems: Array<{ id: AdminView; label: string; icon: React.ReactNode }> = [
    { id: 'admin-users', label: 'Admin Users', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
    { id: 'zoom-api', label: 'Zoom API', icon: <Cpu className="w-3.5 h-3.5" /> },
    { id: 'm365', label: 'M365 Sync', icon: <Calendar className="w-3.5 h-3.5" /> },
    { id: 'security-logs', label: 'Login Audits', icon: <ShieldAlert className="w-3.5 h-3.5" /> }
  ];

  return (
    <div className="min-h-screen bg-[#F7F9FA] text-[#2D2E33] font-sans flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <AyalaFoundationLogo height={28} width="auto" className="h-7" />
              <div className="h-5 w-[1px] bg-gray-300 mx-1 hidden sm:block" />
              <span className="font-semibold text-gray-700 hidden sm:inline text-sm">Admin Portal</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                Admins Only
              </span>
            </div>

            <nav className="hidden md:flex items-center gap-1 pl-4 border-l border-gray-200">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                    currentView === item.id
                      ? 'bg-purple-50 text-purple-700 font-semibold'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/"
              className="text-xs font-semibold text-gray-500 hover:text-gray-800 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Booking Portal</span>
            </a>
            <div className="flex items-center gap-2">
              <img src={authUser.avatar} alt={authUser.name} className="w-8 h-8 rounded-full object-cover ring-2 ring-purple-500/30" />
              <button
                type="button"
                onClick={handleSignOut}
                title="Sign out"
                className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-gray-100 text-xs font-medium">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`py-1 px-2 rounded cursor-pointer ${currentView === item.id ? 'text-purple-700 font-bold' : 'text-gray-600'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'admin-users' && <AdminUsersView adminEmail={authUser.email} authHeaders={authHeaders} />}
        {currentView === 'zoom-api' && <ZoomApiIntegrationView adminEmail={authUser.email} authHeaders={authHeaders} />}
        {currentView === 'm365' && (
          <M365SyncView
            m365State={m365State}
            onToggleSync={handleToggleM365Sync}
            onCheckNow={handleCheckM365Now}
            adminEmail={authUser.email}
            authHeaders={authHeaders}
          />
        )}
        {currentView === 'security-logs' && <AdminSecurityAuditView adminEmail={authUser.email} authHeaders={authHeaders} />}
      </main>
    </div>
  );
}
