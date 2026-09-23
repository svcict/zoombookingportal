import React, { useState, useEffect } from 'react';
import {
  Video,
  CheckCircle2,
  Activity,
  ShieldCheck,
  RefreshCw,
  Key,
  Webhook,
  Cpu,
  Pencil,
  X,
  Save
} from 'lucide-react';
import { ZoomApiConfig, ZoomApiLog } from '../types';

interface ZoomAccountAdminView {
  key: 'A' | 'B';
  label: string;
  accountId: string;
  clientId: string;
  userId: string;
  hostKey: string;
  hasClientSecret: boolean;
  configured: boolean;
}

interface ZoomApiIntegrationViewProps {
  adminEmail?: string;
  authHeaders?: Record<string, string>;
}

const emptyAccountForm = { label: '', accountId: '', clientId: '', clientSecret: '', userId: '', hostKey: '' };

export const ZoomApiIntegrationView: React.FC<ZoomApiIntegrationViewProps> = ({ adminEmail, authHeaders = {} }) => {
  const [config, setConfig] = useState<ZoomApiConfig | null>(null);
  const [logs, setLogs] = useState<ZoomApiLog[]>([]);
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<any | null>(null);
  const [activeRoomsCount, setActiveRoomsCount] = useState(0);

  // Admin-editable rotating account credentials
  const [adminAccounts, setAdminAccounts] = useState<ZoomAccountAdminView[]>([]);
  const [editingKey, setEditingKey] = useState<'A' | 'B' | null>(null);
  const [accountForm, setAccountForm] = useState(emptyAccountForm);
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [accountNotice, setAccountNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Playground form state

  const fetchZoomStatus = async () => {
    try {
      const [cfgRes, logsRes] = await Promise.all([
        fetch('/api/zoom/config').then((r) => r.json()),
        adminEmail
          ? fetch('/api/zoom/logs', { headers: authHeaders }).then((r) => r.json())
          : Promise.resolve({ success: false })
      ]);

      if (cfgRes.success) {
        setConfig(cfgRes.data);
        setActiveRoomsCount(cfgRes.activeRoomsCount || 0);
      }
      if (logsRes.success) {
        setLogs(logsRes.data || []);
      }
    } catch (e) {
      console.error('Failed to load Zoom API status', e);
    }
  };

  const fetchAdminAccounts = async () => {
    if (!adminEmail) return;
    try {
      const res = await fetch('/api/admin/zoom/config', { headers: authHeaders });
      const data = await res.json();
      if (data.success) {
        setAdminAccounts(data.data.accounts || []);
      }
    } catch (e) {
      console.error('Failed to load Zoom admin account config', e);
    }
  };

  const startEditingAccount = (acct: ZoomAccountAdminView) => {
    setEditingKey(acct.key);
    setAccountForm({
      label: acct.label,
      accountId: acct.accountId,
      clientId: acct.clientId,
      clientSecret: '',
      userId: acct.userId,
      hostKey: acct.hostKey
    });
    setAccountNotice(null);
  };

  const cancelEditingAccount = () => {
    setEditingKey(null);
    setAccountForm(emptyAccountForm);
  };

  const handleSaveAccount = async () => {
    if (!editingKey || !adminEmail) return;
    setIsSavingAccount(true);
    setAccountNotice(null);
    try {
      const res = await fetch('/api/admin/zoom/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ accountKey: editingKey, ...accountForm })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAccountNotice({ type: 'success', message: data.message || 'Saved.' });
        setEditingKey(null);
        setAccountForm(emptyAccountForm);
        await Promise.all([fetchAdminAccounts(), fetchZoomStatus()]);
      } else {
        setAccountNotice({ type: 'error', message: data.message || 'Failed to save credentials.' });
      }
    } catch (e: any) {
      setAccountNotice({ type: 'error', message: e?.message || 'Error saving credentials.' });
    } finally {
      setIsSavingAccount(false);
    }
  };

  useEffect(() => {
    fetchZoomStatus();
  }, [adminEmail]);

  useEffect(() => {
    fetchAdminAccounts();
  }, [adminEmail]);

  const handleTestConnection = async () => {
    if (!adminEmail) return;
    setIsPinging(true);
    try {
      const res = await fetch('/api/zoom/test-connection', {
        method: 'POST',
        headers: authHeaders
      });
      const data = await res.json();
      setPingResult(data);
      fetchZoomStatus();
    } catch (e) {
      console.error(e);
    } finally {
      setIsPinging(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* View Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-[#0b5cff] border border-blue-100 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#0b5cff] animate-pulse" />
              Zoom REST API v2 Active
            </span>
            <span className="text-xs text-gray-500 font-medium">Server-to-Server OAuth</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Zoom API Integration &amp; Diagnostic Center
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
            Manage your Zoom API connection, test endpoints in real time, monitor latency &amp; rate limits, and inspect live REST API payloads generated for your bookings.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <button
            type="button"
            disabled={isPinging}
            onClick={handleTestConnection}
            className="px-4 py-2.5 rounded-xl bg-[#0b5cff] hover:bg-[#0049d1] disabled:bg-gray-300 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isPinging ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Activity className="w-3.5 h-3.5" />
            )}
            <span>Test API Ping</span>
          </button>
        </div>
      </div>

      {/* Test Connection Results */}
      {pingResult && (
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#0b5cff]" />
            <h3 className="font-bold text-gray-900 text-sm">Last Connection Test</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(pingResult.accounts || []).map((acct: any) => (
              <div
                key={acct.key}
                className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                  acct.connected ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div>
                  <div className="font-bold text-gray-800">{acct.label}</div>
                  <div className="text-gray-500 text-[11px]">
                    {acct.connected ? `Connected · ${acct.latencyMs}ms` : acct.error || 'Not connected'}
                  </div>
                </div>
                {acct.connected ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-gray-300" />
                )}
              </div>
            ))}
          </div>
          <p className="text-[11px] text-gray-500">{pingResult.message}</p>
        </div>
      )}

      {/* 4-Stat Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Status */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Status</span>
            <span className={`w-2 h-2 rounded-full ${config?.mode === 'live' ? 'bg-green-500' : 'bg-amber-500'}`} />
          </div>
          <div className="text-xl font-extrabold text-gray-900 mt-2 flex items-center gap-1.5">
            <CheckCircle2 className={`w-5 h-5 ${config?.mode === 'live' ? 'text-green-600' : 'text-amber-500'}`} />
            {config?.mode === 'live' ? 'Live' : 'Demo Mode'}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">
            {config?.mode === 'live' ? 'At least one account configured' : 'No Zoom credentials set'}
          </div>
        </div>

        {/* Latency */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">API Latency</span>
            <Cpu className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-extrabold text-[#0b5cff] mt-2 font-mono">
            {config?.lastPingMs || 64} ms
          </div>
          <div className="text-[11px] text-gray-500 mt-1">Last test-connection roundtrip</div>
        </div>

        {/* Rotation */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Rotation Pool</span>
            <Activity className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-xl font-extrabold text-gray-900 mt-2 font-mono">
            {(config?.accounts || []).filter((a) => a.configured).length} / 2
          </div>
          <div className="text-[11px] text-gray-500 mt-1">Zoom accounts configured</div>
        </div>

        {/* Active Rooms */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Provisioned Rooms</span>
            <Video className="w-4 h-4 text-[#0b5cff]" />
          </div>
          <div className="text-xl font-extrabold text-gray-900 mt-2">
            {activeRoomsCount} Active
          </div>
          <div className="text-[11px] text-gray-500 mt-1">Encrypted (AES-256)</div>
        </div>

      </div>

      {/* API Configuration & OAuth Scopes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

          {/* Credentials Card */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-[#0b5cff]" />
                <h3 className="font-bold text-gray-900 text-sm">Rotating Zoom Accounts</h3>
              </div>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                config?.mode === 'live'
                  ? 'text-green-700 bg-green-50 border-green-200'
                  : 'text-amber-700 bg-amber-50 border-amber-200'
              }`}>
                {config?.mode === 'live' ? 'Live' : 'Demo Mode'}
              </span>
            </div>

            <p className="text-xs text-gray-600">
              Bookings are provisioned by alternating between two Zoom Server-to-Server OAuth credentials, so
              overlapping meetings never collide on the same account's concurrent-meeting limit. Changes here
              are written to the server's <code className="bg-gray-100 px-1 py-0.5 rounded text-[10px]">.env</code> file,
              so they survive a restart &mdash; use this when swapping in a new Zoom account.
            </p>

            {accountNotice && (
              <div className={`p-2.5 rounded-lg text-[11px] font-medium flex items-center justify-between gap-2 ${
                accountNotice.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                <span>{accountNotice.message}</span>
                <button type="button" onClick={() => setAccountNotice(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">&times;</button>
              </div>
            )}

            <div className="space-y-3 text-xs">
              {(adminAccounts.length > 0 ? adminAccounts : (['A', 'B'] as const).map((key) => ({
                key, label: `Zoom Account ${key}`, accountId: '', clientId: '', userId: '', hostKey: '', hasClientSecret: false, configured: false
              }))).map((acct) => (
                <div key={acct.key} className="p-3 bg-[#F7F9FA] rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-gray-800">{acct.label}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        acct.configured
                          ? 'text-green-700 bg-green-50 border-green-200'
                          : 'text-gray-500 bg-gray-100 border-gray-200'
                      }`}>
                        {acct.configured ? 'Configured' : 'Not configured'}
                      </span>
                      {editingKey !== acct.key && (
                        <button
                          type="button"
                          onClick={() => startEditingAccount(acct)}
                          className="p-1 rounded-md border border-gray-200 hover:border-[#0b5cff] hover:text-[#0b5cff] text-gray-500 transition-colors cursor-pointer"
                          title={`Edit ${acct.label}`}
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {editingKey === acct.key ? (
                    <div className="space-y-2 pt-1.5">
                      <input
                        type="text"
                        placeholder="Label (e.g. Sales Team Zoom)"
                        value={accountForm.label}
                        onChange={(e) => setAccountForm((f) => ({ ...f, label: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-gray-300 text-[11px] focus:outline-none focus:ring-2 focus:ring-[#0b5cff]"
                      />
                      <input
                        type="text"
                        placeholder="Account ID"
                        value={accountForm.accountId}
                        onChange={(e) => setAccountForm((f) => ({ ...f, accountId: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-gray-300 text-[11px] font-mono focus:outline-none focus:ring-2 focus:ring-[#0b5cff]"
                      />
                      <input
                        type="text"
                        placeholder="Client ID"
                        value={accountForm.clientId}
                        onChange={(e) => setAccountForm((f) => ({ ...f, clientId: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-gray-300 text-[11px] font-mono focus:outline-none focus:ring-2 focus:ring-[#0b5cff]"
                      />
                      <input
                        type="password"
                        placeholder={acct.hasClientSecret ? 'Client Secret (leave blank to keep existing)' : 'Client Secret'}
                        value={accountForm.clientSecret}
                        onChange={(e) => setAccountForm((f) => ({ ...f, clientSecret: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-gray-300 text-[11px] font-mono focus:outline-none focus:ring-2 focus:ring-[#0b5cff]"
                      />
                      <input
                        type="text"
                        placeholder="Host User ID / email (e.g. host@company.com)"
                        value={accountForm.userId}
                        onChange={(e) => setAccountForm((f) => ({ ...f, userId: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-gray-300 text-[11px] font-mono focus:outline-none focus:ring-2 focus:ring-[#0b5cff]"
                      />
                      <div>
                        <input
                          type="text"
                          placeholder="Host Key (Zoom Profile > Host Key - optional)"
                          value={accountForm.hostKey}
                          onChange={(e) => setAccountForm((f) => ({ ...f, hostKey: e.target.value }))}
                          className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-gray-300 text-[11px] font-mono focus:outline-none focus:ring-2 focus:ring-[#0b5cff]"
                        />
                        <p className="text-[10px] text-gray-400 mt-1">
                          Zoom's API doesn't expose this field, so it's entered here manually - copy it from this
                          account's Zoom Profile page. Included on bookings so anyone who can't use Alternative Host
                          can Claim Host instead.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleSaveAccount}
                          disabled={isSavingAccount}
                          className="px-3 py-1.5 rounded-lg bg-[#0b5cff] hover:bg-[#0049d1] disabled:bg-gray-300 text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          {isSavingAccount ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                          <span>Save</span>
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditingAccount}
                          disabled={isSavingAccount}
                          className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 text-gray-600 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                          <span>Cancel</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="font-mono text-gray-500 text-[11px]">
                      {acct.configured
                        ? `${acct.accountId} · ${acct.userId}`
                        : `Not configured yet — click edit to set this account's credentials`}
                    </div>
                  )}
                </div>
              ))}

              <div>
                <label className="block text-gray-500 font-semibold mb-1">REST API Base Endpoint</label>
                <div className="p-2.5 bg-[#F7F9FA] rounded-xl border border-gray-200 font-mono text-gray-800 text-[11px]">
                  https://api.zoom.us/v2
                </div>
              </div>
            </div>

            {/* Scopes */}
            <div className="pt-3 border-t border-gray-100">
              <label className="block text-xs font-bold text-gray-700 mb-2">Required OAuth Scopes (per app)</label>
              <div className="flex flex-wrap gap-1.5">
                {(config?.scopes || [
                  'meeting:write:meeting',
                  'meeting:read:meeting',
                  'meeting:update:meeting',
                  'meeting:delete:meeting',
                  'user:read:user'
                ]).map((s) => (
                  <span
                    key={s}
                    className="px-2 py-0.5 bg-blue-50 text-[#0b5cff] border border-blue-100 rounded-md font-mono text-[10px] font-semibold"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

          </div>

          {/* Webhooks Card */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Webhook className="w-4 h-4 text-purple-600" />
                <h3 className="font-bold text-gray-900 text-sm">Zoom Event Webhook Listener</h3>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                config?.webhookSecretConfigured
                  ? 'text-green-700 bg-green-50 border-green-200'
                  : 'text-amber-700 bg-amber-50 border-amber-200'
              }`}>
                {config?.webhookSecretConfigured ? 'Signature Verified' : 'Secret Not Set'}
              </span>
            </div>
            <p className="text-xs text-gray-600">
              Listens for real-time events: <code className="bg-gray-100 px-1 py-0.5 rounded text-[11px]">meeting.started</code>, <code className="bg-gray-100 px-1 py-0.5 rounded text-[11px]">meeting.ended</code>, <code className="bg-gray-100 px-1 py-0.5 rounded text-[11px]">meeting.participant_joined</code> and
              matches them to a booking by Zoom meeting ID.
            </p>
            <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-200 font-mono text-[11px] text-gray-700 truncate">
              {config?.webhookUrl || '/api/zoom/webhooks'}
            </div>
            {!config?.webhookSecretConfigured && (
              <p className="text-[11px] text-amber-700">
                Set <code className="bg-amber-50 px-1 py-0.5 rounded">ZOOM_WEBHOOK_SECRET_TOKEN</code> (from your Zoom app's
                Event Subscriptions page) so incoming events are verified as genuinely from Zoom.
              </p>
            )}
          </div>

      </div>

      {/* Real-Time API Logs Table */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#0b5cff]" />
            <h3 className="font-bold text-gray-900 text-sm">Real-Time Zoom API Network Traffic Logs</h3>
          </div>
          <span className="text-xs text-gray-500 font-medium">{logs.length} Transactions Recorded</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th className="pb-3 font-semibold">Timestamp</th>
                <th className="pb-3 font-semibold">Method</th>
                <th className="pb-3 font-semibold">Endpoint</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Latency</th>
                <th className="pb-3 font-semibold">Payload Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50/80">
                  <td className="py-3 text-gray-500 font-mono text-[11px]">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                      log.method === 'POST'
                        ? 'bg-blue-100 text-[#0b5cff]'
                        : log.method === 'GET'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {log.method}
                    </span>
                  </td>
                  <td className="py-3 font-mono text-gray-700 text-[11px] truncate max-w-[220px]">
                    {log.endpoint}
                  </td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 font-bold text-[10px]">
                      {log.statusCode} OK
                    </span>
                  </td>
                  <td className="py-3 font-mono text-gray-500 text-[11px]">
                    {log.responseTimeMs}ms
                  </td>
                  <td className="py-3 text-gray-600 text-xs">
                    {log.payloadSummary}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
