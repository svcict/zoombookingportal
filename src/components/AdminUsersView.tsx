import React, { useState, useEffect } from 'react';
import { ShieldCheck, UserPlus, UserMinus, RefreshCw, CheckCircle2, AlertTriangle, Server, Lock } from 'lucide-react';

interface AdminUsersViewProps {
  adminEmail?: string;
  authHeaders?: Record<string, string>;
}

interface AdminUsersData {
  grantedAdmins: string[];
  bootstrapAdmins: string[];
  supabaseConfigured: boolean;
}

export const AdminUsersView: React.FC<AdminUsersViewProps> = ({ adminEmail, authHeaders = {} }) => {
  const [data, setData] = useState<AdminUsersData>({ grantedAdmins: [], bootstrapAdmins: [], supabaseConfigured: false });
  const [isLoading, setIsLoading] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [revokingEmail, setRevokingEmail] = useState<string | null>(null);

  const fetchUsers = async () => {
    if (!adminEmail) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/users', { headers: authHeaders });
      const json = await res.json();
      if (res.ok && json.success) {
        setData(json.data);
      }
    } catch (err) {
      console.warn('Failed to load admin users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [adminEmail]);

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setIsSubmitting(true);
    setNotice(null);
    try {
      const res = await fetch('/api/admin/users/grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ email: newEmail.trim() })
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setNotice({ type: 'success', message: json.message });
        setNewEmail('');
        fetchUsers();
      } else {
        setNotice({ type: 'error', message: json.message || 'Failed to grant admin access.' });
      }
    } catch (err: any) {
      setNotice({ type: 'error', message: err?.message || 'Failed to grant admin access.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async (email: string) => {
    if (!window.confirm(`Remove admin access for ${email}?`)) return;
    setRevokingEmail(email);
    setNotice(null);
    try {
      const res = await fetch('/api/admin/users/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ email })
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setNotice({ type: 'success', message: json.message });
        fetchUsers();
      } else {
        setNotice({ type: 'error', message: json.message || 'Failed to revoke admin access.' });
      }
    } catch (err: any) {
      setNotice({ type: 'error', message: err?.message || 'Failed to revoke admin access.' });
    } finally {
      setRevokingEmail(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
              Admin Users
            </span>
            <span className="text-xs text-gray-500 font-medium">Admin Exclusive Access</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Grant or Revoke Admin Access
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
            Admin access is decided here, by exact email - it works for both Microsoft 365 SSO sign-ins and
            Supabase accounts. Anyone granted here becomes an admin the next time they sign in.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchUsers}
          disabled={isLoading}
          className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 flex items-center gap-2 shadow-2xs transition-colors cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#0b5cff]' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {!data.supabaseConfigured && (
        <div className="p-4 rounded-xl text-xs flex items-center gap-3 border bg-amber-50 border-amber-200 text-amber-800">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Supabase isn't configured, so grants made here can't be saved. Only the{' '}
            <code className="font-mono">ADMIN_BOOTSTRAP_EMAILS</code> server setting controls admin access right now.
          </span>
        </div>
      )}

      {notice && (
        <div className={`p-4 rounded-xl text-xs flex items-center justify-between gap-3 border ${
          notice.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center gap-2 font-medium">
            {notice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{notice.message}</span>
          </div>
          <button type="button" onClick={() => setNotice(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            &times;
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 sm:p-6">
        <h2 className="text-sm font-bold text-gray-900 mb-1">Grant Admin Access</h2>
        <p className="text-xs text-gray-500 mb-4">
          Enter the exact email the person signs in with (their Microsoft 365 work email, or Supabase account email).
        </p>
        <form onSubmit={handleGrant} className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="name@ayalafoundation.org"
            required
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b5cff]"
          />
          <button
            type="submit"
            disabled={isSubmitting || !newEmail.trim()}
            className="px-4 py-2.5 rounded-xl bg-[#0b5cff] hover:bg-[#0a4fd9] text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Granting...' : 'Grant Admin'}</span>
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Current Admins</h2>
            <p className="text-xs text-gray-500">Anyone listed here signs in with full admin access</p>
          </div>
          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
            {data.grantedAdmins.length + data.bootstrapAdmins.length} Admins
          </span>
        </div>

        {data.bootstrapAdmins.length === 0 && data.grantedAdmins.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-500">No admins configured yet.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {data.bootstrapAdmins.map((email) => (
              <div key={`bootstrap-${email}`} className="flex items-center justify-between px-5 sm:px-6 py-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center">
                    <Server className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900">{email}</div>
                    <div className="text-[11px] text-gray-500 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Set via ADMIN_BOOTSTRAP_EMAILS (server config)
                    </div>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                  Managed on server
                </span>
              </div>
            ))}
            {data.grantedAdmins
              .filter((email) => !data.bootstrapAdmins.includes(email))
              .map((email) => (
                <div key={email} className="flex items-center justify-between px-5 sm:px-6 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="text-sm font-bold text-gray-900">{email}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRevoke(email)}
                    disabled={revokingEmail === email || email === adminEmail}
                    title={email === adminEmail ? 'You cannot revoke your own admin access' : undefined}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 hover:border-red-500 hover:bg-red-50 text-gray-700 hover:text-red-700 font-bold text-[11px] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <UserMinus className="w-3 h-3" />
                    <span>{revokingEmail === email ? 'Revoking...' : 'Revoke'}</span>
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};
