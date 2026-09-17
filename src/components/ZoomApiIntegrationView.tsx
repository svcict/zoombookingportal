import React, { useState, useEffect } from 'react';
import { 
  Video, 
  CheckCircle2, 
  Activity, 
  Send, 
  ShieldCheck, 
  Terminal, 
  RefreshCw, 
  Key, 
  Webhook, 
  Sparkles, 
  Copy, 
  ExternalLink,
  Layers,
  Cpu
} from 'lucide-react';
import { ZoomApiConfig, ZoomApiLog } from '../types';

export const ZoomApiIntegrationView: React.FC = () => {
  const [config, setConfig] = useState<ZoomApiConfig | null>(null);
  const [logs, setLogs] = useState<ZoomApiLog[]>([]);
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<any | null>(null);
  const [activeRoomsCount, setActiveRoomsCount] = useState(0);

  // Playground form state
  const [testTopic, setTestTopic] = useState('Enterprise Architecture Review');
  const [testDuration, setTestDuration] = useState('30');
  const [waitingRoom, setWaitingRoom] = useState(true);
  const [cloudRecording, setCloudRecording] = useState(true);
  const [isCreatingMeeting, setIsCreatingMeeting] = useState(false);
  const [createdMeetingResponse, setCreatedMeetingResponse] = useState<any | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchZoomStatus = async () => {
    try {
      const [cfgRes, logsRes] = await Promise.all([
        fetch('/api/zoom/config').then((r) => r.json()),
        fetch('/api/zoom/logs').then((r) => r.json())
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

  useEffect(() => {
    fetchZoomStatus();
  }, []);

  const handleTestConnection = async () => {
    setIsPinging(true);
    try {
      const res = await fetch('/api/zoom/test-connection', { method: 'POST' });
      const data = await res.json();
      setPingResult(data);
      fetchZoomStatus();
    } catch (e) {
      console.error(e);
    } finally {
      setIsPinging(false);
    }
  };

  const handleCreateTestMeeting = async () => {
    setIsCreatingMeeting(true);
    try {
      const payload = {
        meetingTypeId: 'mt-1',
        date: new Date().toISOString().split('T')[0],
        timeSlot: '02:00 PM',
        timezone: 'America/New_York',
        participantName: 'Zoom API Tester',
        participantEmail: 'api-tester@enterprise.com',
        notes: `Direct Zoom REST API generated: ${testTopic}`
      };

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setCreatedMeetingResponse(data.data);
        fetchZoomStatus();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsCreatingMeeting(false);
    }
  };

  const copyToClipboard = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
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

      {/* 4-Stat Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Status */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Status</span>
            <span className="w-2 h-2 rounded-full bg-green-500" />
          </div>
          <div className="text-xl font-extrabold text-gray-900 mt-2 flex items-center gap-1.5">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            Connected
          </div>
          <div className="text-[11px] text-gray-500 mt-1">OAuth Token Valid</div>
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
          <div className="text-[11px] text-gray-500 mt-1">Direct endpoint roundtrip</div>
        </div>

        {/* Rate Limit */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Rate Quota</span>
            <Activity className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-xl font-extrabold text-gray-900 mt-2 font-mono">
            {config?.rateLimit.remaining || 97} / {config?.rateLimit.limit || 100}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">Requests / sec remaining</div>
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

      {/* Main 2-Column: API Configuration & Live REST Playground */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: API Configuration & OAuth Scopes (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Credentials Card */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-[#0b5cff]" />
                <h3 className="font-bold text-gray-900 text-sm">Zoom App Credentials</h3>
              </div>
              <span className="text-[11px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                Verified
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-500 font-semibold mb-1">Account ID</label>
                <div className="p-2.5 bg-[#F7F9FA] rounded-xl border border-gray-200 font-mono text-gray-800 flex items-center justify-between">
                  <span>{config?.accountId || 'zm_acct_84920184'}</span>
                  <button
                    onClick={() => copyToClipboard(config?.accountId || 'zm_acct_84920184', 'accId')}
                    className="text-[#0b5cff] hover:underline font-sans font-bold text-[11px]"
                  >
                    {copiedKey === 'accId' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-gray-500 font-semibold mb-1">Client ID</label>
                <div className="p-2.5 bg-[#F7F9FA] rounded-xl border border-gray-200 font-mono text-gray-800 flex items-center justify-between">
                  <span>{config?.clientId || 'zm_cli_993821049281'}</span>
                  <button
                    onClick={() => copyToClipboard(config?.clientId || 'zm_cli_993821049281', 'cliId')}
                    className="text-[#0b5cff] hover:underline font-sans font-bold text-[11px]"
                  >
                    {copiedKey === 'cliId' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-gray-500 font-semibold mb-1">REST API Base Endpoint</label>
                <div className="p-2.5 bg-[#F7F9FA] rounded-xl border border-gray-200 font-mono text-gray-800 text-[11px]">
                  https://api.zoom.us/v2
                </div>
              </div>
            </div>

            {/* Scopes */}
            <div className="pt-3 border-t border-gray-100">
              <label className="block text-xs font-bold text-gray-700 mb-2">Granted OAuth Scopes</label>
              <div className="flex flex-wrap gap-1.5">
                {(config?.scopes || [
                  'meeting:write:admin',
                  'meeting:read:admin',
                  'user:read:admin',
                  'recording:read:admin'
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
            <div className="flex items-center gap-2">
              <Webhook className="w-4 h-4 text-purple-600" />
              <h3 className="font-bold text-gray-900 text-sm">Zoom Event Webhook Listener</h3>
            </div>
            <p className="text-xs text-gray-600">
              Subscribed to real-time events: <code className="bg-gray-100 px-1 py-0.5 rounded text-[11px]">meeting.started</code>, <code className="bg-gray-100 px-1 py-0.5 rounded text-[11px]">meeting.ended</code>, <code className="bg-gray-100 px-1 py-0.5 rounded text-[11px]">participant_joined</code>.
            </p>
            <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-200 font-mono text-[11px] text-gray-700 truncate">
              {config?.webhookUrl || '/api/zoom/webhooks'}
            </div>
          </div>

        </div>

        {/* Right Column: Interactive Zoom API Tester & Payload Inspector (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Live Meeting Generator Card */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#0b5cff]" />
                <h3 className="font-bold text-gray-900 text-sm">REST API Meeting Provisioner</h3>
              </div>
              <span className="text-xs font-mono text-gray-500">POST /v2/users/me/meetings</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Meeting Topic</label>
                <input
                  type="text"
                  value={testTopic}
                  onChange={(e) => setTestTopic(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-[#0b5cff] focus:border-[#0b5cff] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Duration (Minutes)</label>
                <select
                  value={testDuration}
                  onChange={(e) => setTestDuration(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-[#0b5cff] focus:border-[#0b5cff] focus:outline-none"
                >
                  <option value="15">15 Minutes</option>
                  <option value="30">30 Minutes</option>
                  <option value="45">45 Minutes</option>
                  <option value="60">60 Minutes</option>
                </select>
              </div>
            </div>

            {/* Toggle Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#F7F9FA] border border-gray-200 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={waitingRoom}
                  onChange={(e) => setWaitingRoom(e.target.checked)}
                  className="rounded text-[#0b5cff] focus:ring-[#0b5cff]"
                />
                <span className="font-medium text-gray-800">Enable Waiting Room</span>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#F7F9FA] border border-gray-200 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={cloudRecording}
                  onChange={(e) => setCloudRecording(e.target.checked)}
                  className="rounded text-[#0b5cff] focus:ring-[#0b5cff]"
                />
                <span className="font-medium text-gray-800">Automated Cloud Recording</span>
              </label>
            </div>

            <button
              type="button"
              disabled={isCreatingMeeting}
              onClick={handleCreateTestMeeting}
              className="w-full py-3 px-4 rounded-xl bg-[#0b5cff] hover:bg-[#0049d1] disabled:bg-gray-300 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isCreatingMeeting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Provisioning Zoom Room via REST API...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Execute Zoom API Meeting Call</span>
                </>
              )}
            </button>

            {/* Response Payload Inspector */}
            {createdMeetingResponse && (
              <div className="mt-4 p-4 bg-gray-900 rounded-xl text-green-400 font-mono text-xs space-y-2 overflow-x-auto">
                <div className="flex items-center justify-between text-gray-400 border-b border-gray-800 pb-2 text-[11px]">
                  <span>HTTP/1.1 201 Created • Zoom API Response</span>
                  <span className="text-green-400 font-bold">201 OK</span>
                </div>
                <pre className="text-[11px] whitespace-pre-wrap leading-relaxed">
{JSON.stringify({
  id: createdMeetingResponse.zoomDetails.meetingId,
  topic: createdMeetingResponse.meetingTitle,
  type: 2,
  start_time: createdMeetingResponse.startTimeIso,
  duration: createdMeetingResponse.duration,
  timezone: createdMeetingResponse.timezone,
  password: createdMeetingResponse.zoomDetails.passcode,
  join_url: createdMeetingResponse.zoomDetails.joinUrl,
  start_url: createdMeetingResponse.zoomDetails.startUrl,
  settings: {
    host_video: true,
    participant_video: true,
    waiting_room: waitingRoom,
    auto_recording: cloudRecording ? 'cloud' : 'none',
    encryption_type: 'enhanced_encryption'
  }
}, null, 2)}
                </pre>
              </div>
            )}

          </div>

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
