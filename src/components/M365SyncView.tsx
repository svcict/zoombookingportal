import React, { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock,
  Search,
} from 'lucide-react';
import { M365CalendarState } from '../types';
import { M365LoginSettingsConfig } from './M365LoginSettingsConfig';

interface CheckNowResult {
  accountKey: 'A' | 'B';
  mailbox: string;
  reachable: boolean;
  busyBlocks: Array<{ startIso: string; endIso: string; status: string; subject?: string }>;
}

interface M365SyncViewProps {
  m365State: M365CalendarState;
  onToggleSync: () => Promise<void>;
  onCheckNow: (date: string) => Promise<{ success: boolean; message?: string; results?: CheckNowResult[] }>;
  adminEmail?: string;
  authHeaders?: Record<string, string>;
}

export const M365SyncView: React.FC<M365SyncViewProps> = ({
  m365State,
  onToggleSync,
  onCheckNow,
  adminEmail,
  authHeaders,
}) => {
  const [checkDate, setCheckDate] = useState(new Date().toISOString().slice(0, 10));
  const [isChecking, setIsChecking] = useState(false);
  const [checkResults, setCheckResults] = useState<CheckNowResult[] | null>(null);
  const [checkMessage, setCheckMessage] = useState<string | null>(null);

  const handleCheckNow = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChecking(true);
    setCheckResults(null);
    setCheckMessage(null);
    try {
      const data = await onCheckNow(checkDate);
      if (data.success) {
        setCheckResults(data.results || []);
      } else {
        setCheckMessage(data.message || 'Check failed.');
      }
    } catch (err) {
      setCheckMessage('Connection error contacting the server.');
    } finally {
      setIsChecking(false);
    }
  };

  const mailboxes = m365State.mailboxes || [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* 1. O365 / AZURE ENTRA ID LOGIN SETTINGS DROPDOWN (Direct .env sync & Green Validator) */}
      <M365LoginSettingsConfig adminEmail={adminEmail} authHeaders={authHeaders} />

      {/* 2. Overview Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
              m365State.connected ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'
            }`}>
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900">Microsoft 365 Calendar Sync</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1 ${
                  m365State.connected
                    ? 'bg-green-50 text-green-800 border-green-300'
                    : 'bg-gray-100 text-gray-600 border-gray-300'
                }`}>
                  {m365State.connected ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  {m365State.connected ? 'Graph Reachable' : 'Not Checked Yet'}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1 max-w-xl">
                Reads each rotating Zoom account&apos;s own real Microsoft 365 calendar via Graph
                (<code className="font-mono">getSchedule</code>) and skips a slot when that account is genuinely busy
                in Outlook - read-only, it does not write bookings back into Outlook as calendar events.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onToggleSync}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-xs ${
                m365State.syncEnabled
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{m365State.syncEnabled ? 'Sync Active' : 'Sync Paused'}</span>
            </button>
          </div>
        </div>

        {/* Status Metrics Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-100 text-xs">
          {mailboxes.length > 0 ? (
            mailboxes.map((mb) => (
              <div key={mb.accountKey} className="p-3.5 bg-[#F7F9FA] rounded-xl border border-gray-200">
                <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                  Rotating Zoom Account {mb.accountKey}
                </span>
                <div className="font-bold text-gray-900 mt-0.5 truncate">{mb.mailbox || 'Not configured'}</div>
                <div className="text-[11px] text-gray-500">Real M365 mailbox checked via Graph</div>
              </div>
            ))
          ) : (
            <div className="p-3.5 bg-[#F7F9FA] rounded-xl border border-gray-200 sm:col-span-2">
              <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">No Zoom accounts configured</span>
              <div className="text-[11px] text-gray-500 mt-0.5">Configure ZOOM_ACCOUNT_A / ZOOM_ACCOUNT_B first.</div>
            </div>
          )}
        </div>

        {m365State.lastCheckedAt && (
          <div className="mt-3 text-[11px] text-gray-500">
            Last checked: {new Date(m365State.lastCheckedAt).toLocaleString()}
            {m365State.lastError && <span className="text-red-600 font-semibold"> · {m365State.lastError}</span>}
          </div>
        )}
      </div>

      {/* Live Conflict Check */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#0b5cff]" />
            Check Live M365 Calendar
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Queries Microsoft Graph right now for both rotating accounts&apos; real Outlook calendars on the chosen date.
          </p>
        </div>

        <form onSubmit={handleCheckNow} className="flex flex-col sm:flex-row gap-3">
          <input
            type="date"
            value={checkDate}
            onChange={(e) => setCheckDate(e.target.value)}
            className="px-3.5 py-2.5 bg-[#F0F2F4] border-none rounded-xl text-xs text-gray-900 focus:ring-2 focus:ring-[#0b5cff]"
          />
          <button
            type="submit"
            disabled={isChecking}
            className="py-2.5 px-4 rounded-xl bg-[#0b5cff] hover:bg-[#0049d1] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs disabled:opacity-60"
          >
            <Search className="w-3.5 h-3.5" />
            <span>{isChecking ? 'Checking...' : 'Check Live Calendar Now'}</span>
          </button>
        </form>

        {checkMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 font-medium">
            {checkMessage}
          </div>
        )}

        {checkResults && (
          <div className="space-y-3">
            {checkResults.map((result) => (
              <div key={result.accountKey} className="p-3.5 bg-[#F7F9FA] rounded-xl border border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900">
                    Account {result.accountKey} - {result.mailbox || 'unconfigured'}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    result.reachable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {result.reachable ? 'Reachable' : 'Unreachable'}
                  </span>
                </div>
                {result.reachable && (
                  <div className="mt-2 text-[11px] text-gray-600">
                    {result.busyBlocks.length === 0 ? (
                      <span>No conflicts found on this date.</span>
                    ) : (
                      <ul className="space-y-1">
                        {result.busyBlocks.map((block, idx) => (
                          <li key={idx}>
                            <span className="font-semibold">{block.subject || 'Busy'}</span>
                            {' - '}
                            {new Date(block.startIso).toLocaleTimeString()} to {new Date(block.endIso).toLocaleTimeString()}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
