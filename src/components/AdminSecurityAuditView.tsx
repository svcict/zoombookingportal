import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  RefreshCw, 
  Ban, 
  Clock, 
  Trash2, 
  CheckCircle2, 
  Search, 
  AlertTriangle,
  Lock,
  Unlock,
  ShieldCheck,
  UserX,
  Server
} from 'lucide-react';
import { LoginSecurityAudit, FailedLoginRecord, SecurityRateLimitInfo } from '../types';

interface AdminSecurityAuditViewProps {
  onBackToSchedule?: () => void;
  adminEmail?: string;
}

export const AdminSecurityAuditView: React.FC<AdminSecurityAuditViewProps> = ({ onBackToSchedule, adminEmail }) => {
  const [auditData, setAuditData] = useState<LoginSecurityAudit>({
    totalFailedAttempts: 0,
    activeLockoutsCount: 0,
    permanentlyBlockedIpsCount: 0,
    failedLogs: [],
    rateLimits: []
  });

  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [unblockingIp, setUnblockingIp] = useState<string | null>(null);

  const fetchAuditData = async () => {
    if (!adminEmail) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/failed-logins', {
        headers: { 'X-User-Email': adminEmail }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setAuditData(json.data);
        }
      }
    } catch (err) {
      console.warn('Failed to load security audit data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditData();
    const interval = setInterval(fetchAuditData, 8000);
    return () => clearInterval(interval);
  }, [adminEmail]);

  const handleUnblockIp = async (ip: string) => {
    if (!adminEmail) return;
    setUnblockingIp(ip);
    setActionNotice(null);
    try {
      const res = await fetch('/api/admin/unblock-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Email': adminEmail },
        body: JSON.stringify({ ip })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionNotice({ type: 'success', message: data.message || `IP ${ip} has been unblocked.` });
        fetchAuditData();
      } else {
        setActionNotice({ type: 'error', message: data.message || 'Failed to unblock IP.' });
      }
    } catch (e: any) {
      setActionNotice({ type: 'error', message: e?.message || 'Error unblocking IP.' });
    } finally {
      setUnblockingIp(null);
    }
  };

  const handleClearLogs = async () => {
    if (!adminEmail) return;
    if (!window.confirm('Are you sure you want to clear all historical failed login logs?')) return;

    try {
      const res = await fetch('/api/admin/clear-failed-logs', {
        method: 'POST',
        headers: { 'X-User-Email': adminEmail }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionNotice({ type: 'success', message: 'Failed login security logs have been cleared.' });
        fetchAuditData();
      }
    } catch (e: any) {
      setActionNotice({ type: 'error', message: 'Failed to clear logs.' });
    }
  };

  const filteredLogs = auditData.failedLogs.filter((log) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.emailAttempted?.toLowerCase().includes(q) ||
      log.ip?.toLowerCase().includes(q) ||
      log.reason?.toLowerCase().includes(q)
    );
  });

  const activeRateLimits = auditData.rateLimits.filter(
    (r) => r.isPermanentlyBlocked || r.remainingSeconds > 0 || r.consecutiveFails > 0
  );

  return (
    <div className="space-y-6">
      
      {/* Header & Controls */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
              Security &amp; Intrusion Defense
            </span>
            <span className="text-xs text-gray-500 font-medium">
              Admin Exclusive Access
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Failed Login Audits &amp; IP Protection
          </h1>
          
          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
            Monitor real-time authentication failures, progressive 1-minute and 3-minute lockouts, and permanently blocked IPs. Administrators can unblock IPs or clear audit logs below.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={fetchAuditData}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#0b5cff]' : ''}`} />
            <span>Refresh Audits</span>
          </button>

          {auditData.failedLogs.length > 0 && (
            <button
              type="button"
              onClick={handleClearLogs}
              className="px-4 py-2.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-xs font-bold text-red-700 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </div>

      {/* Action Notice */}
      {actionNotice && (
        <div className={`p-4 rounded-xl text-xs flex items-center justify-between gap-3 border ${
          actionNotice.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center gap-2 font-medium">
            {actionNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{actionNotice.message}</span>
          </div>
          <button 
            type="button"
            onClick={() => setActionNotice(null)}
            className="text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Total Failed Attempts */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 font-extrabold text-lg">
            <UserX className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900">{auditData.totalFailedAttempts}</div>
            <div className="text-xs font-semibold text-gray-500">Failed Login Attempts</div>
          </div>
        </div>

        {/* Active Lockouts */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-amber-900">{auditData.activeLockoutsCount}</div>
            <div className="text-xs font-semibold text-gray-500">Active Rate Lockouts (1m/3m)</div>
          </div>
        </div>

        {/* Permanently Blocked IPs */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Ban className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-purple-900">{auditData.permanentlyBlockedIpsCount}</div>
            <div className="text-xs font-semibold text-gray-500">Permanently Blocked IPs</div>
          </div>
        </div>

      </div>

      {/* SECTION 1: Active IP Restrictions & Lockout Status */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Current IP Restrictions &amp; Rate Limits</h2>
              <p className="text-xs text-gray-500">Active client sessions with failed attempts or lockouts</p>
            </div>
          </div>

          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
            {activeRateLimits.length} Tracked IPs
          </span>
        </div>

        {activeRateLimits.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto" />
            <div className="text-sm font-bold text-gray-800">No active lockouts or blocked IPs</div>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              All clients and sessions are currently in good standing with zero active lockout blocks.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAFAFA] text-gray-600 font-semibold border-b border-gray-100">
                <tr>
                  <th className="py-3 px-4">Client IP Address</th>
                  <th className="py-3 px-4">Consecutive Fails</th>
                  <th className="py-3 px-4">Lockout Cycle</th>
                  <th className="py-3 px-4">Status &amp; Time Left</th>
                  <th className="py-3 px-4">Last Attempt</th>
                  <th className="py-3 px-4 text-right">Admin Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activeRateLimits.map((limit, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                      {limit.ip}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                        limit.consecutiveFails >= 3 ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {limit.consecutiveFails} / 3
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-600">
                      {limit.isPermanentlyBlocked ? (
                        <span className="font-bold text-red-700">Exceeded 3 Repeats</span>
                      ) : limit.lockoutCycle === 1 ? (
                        <span className="text-amber-700 font-semibold">1st Lockout (1 Min)</span>
                      ) : limit.lockoutCycle > 1 ? (
                        <span className="text-purple-700 font-semibold">Repeat Cycle {limit.lockoutCycle - 1} (3 Min)</span>
                      ) : (
                        <span className="text-gray-500">None</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {limit.isPermanentlyBlocked ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-200">
                          <Ban className="w-3 h-3 text-red-600" />
                          Permanently Blocked
                        </span>
                      ) : limit.remainingSeconds > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600 animate-spin" />
                          Locked ({limit.remainingSeconds}s remaining)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          Cleared (Ready)
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-gray-500">
                      {limit.lastAttemptAt ? new Date(limit.lastAttemptAt).toLocaleTimeString() : 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleUnblockIp(limit.ip)}
                        disabled={unblockingIp === limit.ip}
                        className="px-3 py-1 rounded-lg border border-gray-300 hover:border-emerald-500 hover:bg-emerald-50 text-gray-700 hover:text-emerald-700 font-bold text-[11px] transition-all flex items-center gap-1.5 ml-auto cursor-pointer"
                      >
                        <Unlock className="w-3 h-3" />
                        <span>{unblockingIp === limit.ip ? 'Resetting...' : 'Unblock & Reset'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 2: Detailed Failed Login Logs Audit Trail */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Failed Login Attempt History</h2>
            <p className="text-xs text-gray-500">Chronological ledger of rejected authentication attempts</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by email, IP..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#0b5cff]"
            />
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-10 text-center text-gray-500 text-xs">
            {searchQuery ? 'No failed login events match your search query.' : 'No failed login attempts recorded yet.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAFAFA] text-gray-600 font-semibold border-b border-gray-100">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Attempted Email / User</th>
                  <th className="py-3 px-4">Client IP</th>
                  <th className="py-3 px-4">Failure Reason</th>
                  <th className="py-3 px-4">User Agent / Client</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-gray-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-gray-900">
                      {log.emailAttempted}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-gray-600">
                      {log.ip}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-red-700 font-medium bg-red-50 px-2 py-0.5 rounded border border-red-100 text-[11px]">
                        {log.reason}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-500 text-[11px] truncate max-w-[220px]" title={log.userAgent}>
                      {log.userAgent || 'Unknown'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
