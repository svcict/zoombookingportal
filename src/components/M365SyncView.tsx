import React, { useState } from 'react';
import { 
  Calendar, 
  CheckCircle2, 
  RefreshCw, 
  ShieldCheck, 
  Mail, 
  Clock, 
  Plus, 
  AlertTriangle, 
  Check, 
  ExternalLink,
  Settings,
  Layers
} from 'lucide-react';
import { M365CalendarState } from '../types';
import { M365LoginSettingsConfig } from './M365LoginSettingsConfig';

interface M365SyncViewProps {
  m365State: M365CalendarState;
  onToggleSync: () => Promise<void>;
  onAddBusySlot: (date: string, time: string, title: string) => Promise<void>;
  adminEmail?: string;
}

export const M365SyncView: React.FC<M365SyncViewProps> = ({
  m365State,
  onToggleSync,
  onAddBusySlot,
  adminEmail,
}) => {
  const [newBusyDate, setNewBusyDate] = useState('2026-08-26');
  const [newBusyTime, setNewBusyTime] = useState('14:00');
  const [newBusyTitle, setNewBusyTitle] = useState('Executive Board Review (M365)');
  const [isAdding, setIsAdding] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBusyDate || !newBusyTime) return;
    setIsAdding(true);
    await onAddBusySlot(newBusyDate, newBusyTime, newBusyTitle);
    setIsAdding(false);
    setAddSuccess(true);
    setTimeout(() => setAddSuccess(false), 3000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* 1. O365 / AZURE ENTRA ID LOGIN SETTINGS DROPDOWN (Direct .env sync & Green Validator) */}
      <M365LoginSettingsConfig adminEmail={adminEmail} />

      {/* 2. Overview Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-50 text-green-700 flex items-center justify-center shrink-0 border border-green-200">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900">Microsoft 365 Calendar Synchronization</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-800 border border-green-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Graph API Active
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1 max-w-xl">
                Automatically reads the host&apos;s Microsoft 365 Exchange Calendar, prevents double-booking conflicts by turning conflicting slots <strong className="text-red-600">RED (Unavailable)</strong>, and dispatches authenticated Outlook email invites.
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
              <span>{m365State.syncEnabled ? 'Auto-Sync Active' : 'Sync Paused'}</span>
            </button>
          </div>
        </div>

        {/* Status Metrics Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100 text-xs">
          <div className="p-3.5 bg-[#F7F9FA] rounded-xl border border-gray-200">
            <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">Connected Account</span>
            <div className="font-bold text-gray-900 mt-0.5 truncate">{m365State.accountEmail}</div>
            <div className="text-[11px] text-gray-500">{m365State.displayName}</div>
          </div>

          <div className="p-3.5 bg-[#F7F9FA] rounded-xl border border-gray-200">
            <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">Primary Synced Calendar</span>
            <div className="font-bold text-gray-900 mt-0.5">{m365State.calendarName}</div>
            <div className="text-[11px] text-green-700 font-bold">Bidirectional 2-Way Sync</div>
          </div>

          <div className="p-3.5 bg-[#F7F9FA] rounded-xl border border-gray-200">
            <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">Email Dispatch Engine</span>
            <div className="font-bold text-gray-900 mt-0.5">Microsoft Graph Mail API</div>
            <div className="text-[11px] text-gray-500">Sends confirmation links &amp; .ics attachments</div>
          </div>
        </div>
      </div>

      {/* Interactive Conflict Testing Box */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#0b5cff]" />
            Test Real-Time Microsoft 365 Slot Blocking
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Add an external Microsoft 365 / Outlook calendar busy event below to see the slot turn <strong className="text-red-600 font-bold">RED (Booked / Conflict)</strong> in real time!
          </p>
        </div>

        <form onSubmit={handleAddSlot} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Date</label>
            <input
              type="date"
              value={newBusyDate}
              onChange={(e) => setNewBusyDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#F0F2F4] border-none rounded-xl text-xs text-gray-900 focus:ring-2 focus:ring-[#0b5cff]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Time (24h)</label>
            <select
              value={newBusyTime}
              onChange={(e) => setNewBusyTime(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#F0F2F4] border-none rounded-xl text-xs text-gray-900 focus:ring-2 focus:ring-[#0b5cff]"
            >
              <option value="08:00">08:00 AM</option>
              <option value="08:30">08:30 AM</option>
              <option value="09:00">09:00 AM</option>
              <option value="09:30">09:30 AM</option>
              <option value="10:00">10:00 AM</option>
              <option value="10:30">10:30 AM</option>
              <option value="11:00">11:00 AM</option>
              <option value="11:30">11:30 AM</option>
              <option value="13:00">01:00 PM</option>
              <option value="13:30">01:30 PM</option>
              <option value="14:00">02:00 PM</option>
              <option value="14:30">02:30 PM</option>
              <option value="15:00">03:00 PM</option>
              <option value="15:30">03:30 PM</option>
              <option value="16:00">04:00 PM</option>
              <option value="16:30">04:30 PM</option>
              <option value="17:00">05:00 PM</option>
              <option value="17:30">05:30 PM</option>
              <option value="18:00">06:00 PM</option>
              <option value="18:30">06:30 PM</option>
              <option value="19:00">07:00 PM</option>
              <option value="19:30">07:30 PM</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">M365 Event Title</label>
            <input
              type="text"
              value={newBusyTitle}
              onChange={(e) => setNewBusyTitle(e.target.value)}
              placeholder="e.g. Client Call in Outlook"
              className="w-full px-3.5 py-2.5 bg-[#F0F2F4] border-none rounded-xl text-xs text-gray-900 focus:ring-2 focus:ring-[#0b5cff]"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isAdding}
              className="w-full py-2.5 px-4 rounded-xl bg-[#0b5cff] hover:bg-[#0049d1] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAdding ? 'Adding...' : 'Block Slot in M365'}</span>
            </button>
          </div>
        </form>

        {addSuccess && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-xs text-green-800 font-medium flex items-center gap-2">
            <Check className="w-4 h-4 text-green-600" />
            <span>Successfully added busy event to Microsoft 365 calendar. That slot will now display as RED (Unavailable) in the booking portal.</span>
          </div>
        )}
      </div>

      {/* Feature Architecture Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-gray-900 font-bold">
            <ShieldCheck className="w-4 h-4 text-[#0b5cff]" />
            <h3>Automated Time Zone Conversion</h3>
          </div>
          <p className="text-gray-600 leading-relaxed">
            The scheduling engine converts Microsoft 365 UTC timestamps seamlessly into each participant&apos;s local timezone (e.g. EST, PST, GMT, JST, AEST), preventing scheduling misunderstandings.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-gray-900 font-bold">
            <Mail className="w-4 h-4 text-green-600" />
            <h3>Microsoft 365 Email Confirmation Links</h3>
          </div>
          <p className="text-gray-600 leading-relaxed">
            Generates standardized .ICS calendar attachments, direct deep links to Outlook Live / Microsoft 365 Office Web, and automatically delivers encrypted Zoom passcodes.
          </p>
        </div>
      </div>

    </div>
  );
};
