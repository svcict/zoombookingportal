import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  RefreshCw,
  ShieldBan,
  Timer,
  Trash2,
  CheckCircle2,
  Search,
  AlertTriangle,
  Lock,
  Unlock,
  ShieldCheck,
  UserRoundX,
  UserRoundCheck,
  Activity,
  CalendarX,
  CalendarCheck2,
  Download
} from 'lucide-react';
import { LoginSecurityAudit } from '../types';
import { exportToCsv } from '../utils/csvExport';

type AuditDetailCard = 'logins' | 'systemLogs' | 'canceled' | 'created' | null;

interface AdminSecurityAuditViewProps {
  adminEmail?: string;
  authHeaders?: Record<string, string>;
}

export const AdminSecurityAuditView: React.FC<AdminSecurityAuditViewProps> = ({ adminEmail, authHeaders = {} }) => {
  const [auditData, setAuditData] = useState<LoginSecurityAudit>({
    totalFailedAttempts: 0,
    activeLockoutsCount: 0,
    permanentlyBlockedIpsCount: 0,
    failedLogs: [],
    rateLimits: [],
    successfulLoginsCount: 0,
    systemLogsCount: 0,
    createdMeetingsCount: 0,
    cancelledMeetingsCount: 0,
    successfulLogins: [],
    systemLogs: [],
    createdMeetings: [],
    cancelledMeetings: []
  });

  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [unblockingIp, setUnblockingIp] = useState<string | null>(null);
  const [expandedAuditCard, setExpandedAuditCard] = useState<AuditDetailCard>(null);
  const [createdMeetingsSearch, setCreatedMeetingsSearch] = useState('');
  const [createdMeetingsStatusFilter, setCreatedMeetingsStatusFilter] = useState<'all' | 'confirmed' | 'cancelled'>('all');
  const [loginsSearch, setLoginsSearch] = useState('');
  const [loginsProviderFilter, setLoginsProviderFilter] = useState<'all' | 'm365' | 'local'>('all');
  const [systemLogsSearch, setSystemLogsSearch] = useState('');
  const [systemLogsCategoryFilter, setSystemLogsCategoryFilter] = useState<'all' | 'zoom' | 'admin' | 'booking' | 'meeting-type' | 'm365' | 'push'>('all');
  const [canceledMeetingsSearch, setCanceledMeetingsSearch] = useState('');

  const fetchAuditData = async () => {
    if (!adminEmail) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/failed-logins', { headers: authHeaders });
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
        headers: { 'Content-Type': 'application/json', ...authHeaders },
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
        headers: authHeaders
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

  const filteredCreatedMeetings = auditData.createdMeetings.filter((m) => {
    if (createdMeetingsStatusFilter !== 'all' && m.status !== createdMeetingsStatusFilter) return false;
    if (!createdMeetingsSearch.trim()) return true;
    const q = createdMeetingsSearch.toLowerCase();
    return (
      m.meetingTitle?.toLowerCase().includes(q) ||
      m.participantName?.toLowerCase().includes(q) ||
      m.participantEmail?.toLowerCase().includes(q) ||
      m.hostName?.toLowerCase().includes(q)
    );
  });

  const filteredLogins = auditData.successfulLogins.filter((log) => {
    if (loginsProviderFilter !== 'all' && log.provider !== loginsProviderFilter) return false;
    if (!loginsSearch.trim()) return true;
    const q = loginsSearch.toLowerCase();
    return (
      log.email?.toLowerCase().includes(q) ||
      log.ip?.toLowerCase().includes(q) ||
      log.userAgent?.toLowerCase().includes(q)
    );
  });

  const filteredSystemLogs = auditData.systemLogs.filter((log) => {
    if (systemLogsCategoryFilter !== 'all' && log.category !== systemLogsCategoryFilter) return false;
    if (!systemLogsSearch.trim()) return true;
    const q = systemLogsSearch.toLowerCase();
    return (
      log.action?.toLowerCase().includes(q) ||
      log.actor?.toLowerCase().includes(q) ||
      log.details?.toLowerCase().includes(q)
    );
  });

  const filteredCanceledMeetings = auditData.cancelledMeetings.filter((m) => {
    if (!canceledMeetingsSearch.trim()) return true;
    const q = canceledMeetingsSearch.toLowerCase();
    return (
      m.meetingTitle?.toLowerCase().includes(q) ||
      m.participantName?.toLowerCase().includes(q) ||
      m.participantEmail?.toLowerCase().includes(q) ||
      m.hostName?.toLowerCase().includes(q)
    );
  });

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
            className="text-gray-500 hover:text-gray-600 cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Total Failed Attempts */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-50 to-red-100 text-red-600 ring-1 ring-red-100 flex items-center justify-center shrink-0">
            <UserRoundX className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900">{auditData.totalFailedAttempts}</div>
            <div className="text-xs font-semibold text-gray-500">Failed Login Attempts</div>
          </div>
        </div>

        {/* Active Lockouts */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 text-amber-600 ring-1 ring-amber-100 flex items-center justify-center shrink-0">
            <Timer className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-amber-900">{auditData.activeLockoutsCount}</div>
            <div className="text-xs font-semibold text-gray-500">Active Rate Lockouts (1m/3m)</div>
          </div>
        </div>

        {/* Permanently Blocked IPs */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-50 to-red-100 text-red-600 ring-1 ring-red-100 flex items-center justify-center shrink-0">
            <ShieldBan className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-red-900">{auditData.permanentlyBlockedIpsCount}</div>
            <div className="text-xs font-semibold text-gray-500">Permanently Blocked IPs</div>
          </div>
        </div>

      </div>

      {/* Audit Summary Cards: Logins, System Logs, Canceled, Created Meetings -
          each is clickable, toggling a detail table + CSV export below. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* # of Logins - only counts successful sign-ins recorded since this
            metric shipped; there's no retroactive history before it. */}
        <button
          type="button"
          onClick={() => setExpandedAuditCard((v) => (v === 'logins' ? null : 'logins'))}
          className={`bg-white p-5 rounded-2xl border shadow-xs flex items-center gap-4 text-left transition-colors cursor-pointer ${
            expandedAuditCard === 'logins' ? 'border-emerald-300 ring-2 ring-emerald-100' : 'border-gray-200 hover:border-emerald-200'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-600 ring-1 ring-emerald-100 flex items-center justify-center shrink-0">
            <UserRoundCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900">{auditData.successfulLoginsCount}</div>
            <div className="text-xs font-semibold text-gray-500"># of Logins</div>
          </div>
        </button>

        {/* System Logs - the Zoom API call ledger (account pings, meeting
            create/cancel calls, webhook events). */}
        <button
          type="button"
          onClick={() => setExpandedAuditCard((v) => (v === 'systemLogs' ? null : 'systemLogs'))}
          className={`bg-white p-5 rounded-2xl border shadow-xs flex items-center gap-4 text-left transition-colors cursor-pointer ${
            expandedAuditCard === 'systemLogs' ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-gray-200 hover:border-indigo-200'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-600 ring-1 ring-indigo-100 flex items-center justify-center shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900">{auditData.systemLogsCount}</div>
            <div className="text-xs font-semibold text-gray-500">System Logs</div>
          </div>
        </button>

        {/* Canceled meetings */}
        <button
          type="button"
          onClick={() => setExpandedAuditCard((v) => (v === 'canceled' ? null : 'canceled'))}
          className={`bg-white p-5 rounded-2xl border shadow-xs flex items-center gap-4 text-left transition-colors cursor-pointer ${
            expandedAuditCard === 'canceled' ? 'border-orange-300 ring-2 ring-orange-100' : 'border-gray-200 hover:border-orange-200'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 text-orange-600 ring-1 ring-orange-100 flex items-center justify-center shrink-0">
            <CalendarX className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900">{auditData.cancelledMeetingsCount}</div>
            <div className="text-xs font-semibold text-gray-500">Canceled Meetings</div>
          </div>
        </button>

        {/* # of created meetings */}
        <button
          type="button"
          onClick={() => setExpandedAuditCard((v) => (v === 'created' ? null : 'created'))}
          className={`bg-white p-5 rounded-2xl border shadow-xs flex items-center gap-4 text-left transition-colors cursor-pointer ${
            expandedAuditCard === 'created' ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-200 hover:border-blue-200'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 text-[#0b5cff] ring-1 ring-blue-100 flex items-center justify-center shrink-0">
            <CalendarCheck2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900">{auditData.createdMeetingsCount}</div>
            <div className="text-xs font-semibold text-gray-500"># of Created Meetings</div>
          </div>
        </button>

      </div>

      {/* Detail table + CSV export for whichever audit summary card is expanded */}
      {expandedAuditCard === 'logins' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Successful Login History</h2>
              <p className="text-xs text-gray-500">Every successful sign-in recorded since this tracking shipped</p>
            </div>
            <button
              type="button"
              onClick={() => exportToCsv('logins.csv', filteredLogins)}
              disabled={filteredLogins.length === 0}
              className="px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-gray-700 flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>

          <div className="p-4 sm:px-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={loginsSearch}
                onChange={(e) => setLoginsSearch(e.target.value)}
                placeholder="Search email, IP, user agent..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#0b5cff]"
              />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {([
                ['all', 'All'],
                ['m365', 'Microsoft 365 SSO'],
                ['local', 'Local / Demo'],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setLoginsProviderFilter(value)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                    loginsProviderFilter === value ? 'bg-[#0b5cff] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-gray-500 font-medium sm:ml-auto">
              {filteredLogins.length} of {auditData.successfulLogins.length}
            </span>
          </div>

          {filteredLogins.length === 0 ? (
            <div className="p-10 text-center text-gray-500 text-xs">
              {auditData.successfulLogins.length === 0 ? 'No successful logins recorded yet.' : 'No logins match your search or filter.'}
            </div>
          ) : (
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAFAFA] text-gray-600 font-semibold border-b border-gray-100 sticky top-0">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Provider</th>
                    <th className="py-3 px-4">Client IP</th>
                    <th className="py-3 px-4">User Agent / Client</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredLogins.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-gray-500 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="py-3.5 px-4 font-bold text-gray-900">{log.email}</td>
                      <td className="py-3.5 px-4 text-gray-600">{log.provider === 'm365' ? 'Microsoft 365 SSO' : 'Local / Demo'}</td>
                      <td className="py-3.5 px-4 font-mono text-gray-600">{log.ip}</td>
                      <td className="py-3.5 px-4 text-gray-500 text-[11px] truncate max-w-[220px]" title={log.userAgent}>{log.userAgent || 'Unknown'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {expandedAuditCard === 'systemLogs' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-gray-900">System Logs</h2>
              <p className="text-xs text-gray-500">Every tracked system action: Zoom API calls, admin config changes, booking lifecycle, meeting type edits, M365 sync, push subscriptions</p>
            </div>
            <button
              type="button"
              onClick={() => exportToCsv('system-logs.csv', filteredSystemLogs)}
              disabled={filteredSystemLogs.length === 0}
              className="px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-gray-700 flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>

          <div className="p-4 sm:px-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={systemLogsSearch}
                onChange={(e) => setSystemLogsSearch(e.target.value)}
                placeholder="Search action, actor, details..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#0b5cff]"
              />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {([
                ['all', 'All'],
                ['zoom', 'Zoom'],
                ['admin', 'Admin'],
                ['booking', 'Booking'],
                ['meeting-type', 'Meeting Type'],
                ['m365', 'M365'],
                ['push', 'Push'],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSystemLogsCategoryFilter(value)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                    systemLogsCategoryFilter === value ? 'bg-[#0b5cff] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-gray-500 font-medium sm:ml-auto">
              {filteredSystemLogs.length} of {auditData.systemLogs.length}
            </span>
          </div>

          {filteredSystemLogs.length === 0 ? (
            <div className="p-10 text-center text-gray-500 text-xs">
              {auditData.systemLogs.length === 0 ? 'No system logs recorded yet.' : 'No logs match your search or filter.'}
            </div>
          ) : (
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAFAFA] text-gray-600 font-semibold border-b border-gray-100 sticky top-0">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredSystemLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-gray-500 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full font-bold text-[11px] bg-gray-100 text-gray-700 capitalize">
                          {log.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-gray-900">{log.action}</td>
                      <td className="py-3.5 px-4 text-gray-600">{log.actor || '—'}</td>
                      <td className="py-3.5 px-4 text-gray-500 text-[11px] truncate max-w-[320px]" title={log.details}>{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {expandedAuditCard === 'canceled' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Canceled Meetings</h2>
              <p className="text-xs text-gray-500">All bookings currently marked as canceled</p>
            </div>
            <button
              type="button"
              onClick={() => exportToCsv('canceled-meetings.csv', filteredCanceledMeetings)}
              disabled={filteredCanceledMeetings.length === 0}
              className="px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-gray-700 flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>

          <div className="p-4 sm:px-6 border-b border-gray-100 flex items-center gap-3">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={canceledMeetingsSearch}
                onChange={(e) => setCanceledMeetingsSearch(e.target.value)}
                placeholder="Search meeting, creator, host..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#0b5cff]"
              />
            </div>
            <span className="text-[11px] text-gray-500 font-medium ml-auto">
              {filteredCanceledMeetings.length} of {auditData.cancelledMeetings.length}
            </span>
          </div>

          {filteredCanceledMeetings.length === 0 ? (
            <div className="p-10 text-center text-gray-500 text-xs">
              {auditData.cancelledMeetings.length === 0 ? 'No canceled meetings.' : 'No meetings match your search.'}
            </div>
          ) : (
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAFAFA] text-gray-600 font-semibold border-b border-gray-100 sticky top-0">
                  <tr>
                    <th className="py-3 px-4">Meeting</th>
                    <th className="py-3 px-4">Created By</th>
                    <th className="py-3 px-4">Host</th>
                    <th className="py-3 px-4">Date / Time</th>
                    <th className="py-3 px-4">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCanceledMeetings.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-gray-900">{m.meetingTitle}</td>
                      <td className="py-3.5 px-4 text-gray-600">
                        <div>{m.participantName}</div>
                        <div className="text-[11px] text-gray-500">{m.participantEmail}</div>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600">{m.hostName}</td>
                      <td className="py-3.5 px-4 text-gray-500 whitespace-nowrap">{m.date} &middot; {m.timeSlot}</td>
                      <td className="py-3.5 px-4 font-mono text-gray-500 whitespace-nowrap">{new Date(m.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {expandedAuditCard === 'created' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-gray-900">All Created Meetings</h2>
              <p className="text-xs text-gray-500">Every booking ever created, regardless of current status</p>
            </div>
            <button
              type="button"
              onClick={() => exportToCsv('created-meetings.csv', filteredCreatedMeetings)}
              disabled={filteredCreatedMeetings.length === 0}
              className="px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-gray-700 flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>

          <div className="p-4 sm:px-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={createdMeetingsSearch}
                onChange={(e) => setCreatedMeetingsSearch(e.target.value)}
                placeholder="Search meeting, creator, host..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#0b5cff]"
              />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {([
                ['all', 'All'],
                ['confirmed', 'Confirmed'],
                ['cancelled', 'Canceled'],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCreatedMeetingsStatusFilter(value)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                    createdMeetingsStatusFilter === value
                      ? 'bg-[#0b5cff] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-gray-500 font-medium sm:ml-auto">
              {filteredCreatedMeetings.length} of {auditData.createdMeetings.length}
            </span>
          </div>

          {filteredCreatedMeetings.length === 0 ? (
            <div className="p-10 text-center text-gray-500 text-xs">
              {auditData.createdMeetings.length === 0
                ? 'No meetings created yet.'
                : 'No meetings match your search or filter.'}
            </div>
          ) : (
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAFAFA] text-gray-600 font-semibold border-b border-gray-100 sticky top-0">
                  <tr>
                    <th className="py-3 px-4">Meeting</th>
                    <th className="py-3 px-4">Created By</th>
                    <th className="py-3 px-4">Host</th>
                    <th className="py-3 px-4">Date / Time</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCreatedMeetings.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-gray-900">{m.meetingTitle}</td>
                      <td className="py-3.5 px-4 text-gray-600">
                        <div>{m.participantName}</div>
                        <div className="text-[11px] text-gray-500">{m.participantEmail}</div>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600">{m.hostName}</td>
                      <td className="py-3.5 px-4 text-gray-500 whitespace-nowrap">{m.date} &middot; {m.timeSlot}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                          m.status === 'cancelled' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {m.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-gray-500 whitespace-nowrap">{new Date(m.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

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
                        <span className="text-[#0b5cff] font-semibold">Repeat Cycle {limit.lockoutCycle - 1} (3 Min)</span>
                      ) : (
                        <span className="text-gray-500">None</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {limit.isPermanentlyBlocked ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-200">
                          <ShieldBan className="w-3 h-3 text-red-600" />
                          Permanently Blocked
                        </span>
                      ) : limit.remainingSeconds > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <Timer className="w-3 h-3 text-amber-600 animate-spin" />
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
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
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
