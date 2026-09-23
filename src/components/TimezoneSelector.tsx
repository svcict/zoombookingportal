import React, { useState, useMemo } from 'react';
import { Search, Globe, Check, X, Clock } from 'lucide-react';
import { getTimezoneOptions } from '../utils/timezone';

interface TimezoneSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTimezone: string;
  onSelectTimezone: (timezone: string) => void;
}

export const TimezoneSelector: React.FC<TimezoneSelectorProps> = ({
  isOpen,
  onClose,
  selectedTimezone,
  onSelectTimezone,
}) => {
  const [search, setSearch] = useState('');
  const allTimezones = useMemo(() => getTimezoneOptions(), []);

  const filteredTimezones = useMemo(() => {
    if (!search.trim()) return allTimezones;
    const query = search.toLowerCase();
    return allTimezones.filter(
      (tz) =>
        tz.label.toLowerCase().includes(query) ||
        tz.id.toLowerCase().includes(query) ||
        tz.region.toLowerCase().includes(query) ||
        tz.offset.toLowerCase().includes(query)
    );
  }, [allTimezones, search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-[#F7F9FA]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0b5cff] flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">Select Time Zone</h3>
              <p className="text-xs text-gray-500">Slots will automatically convert seamlessly</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Box */}
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search city, country, or time zone (e.g. London, Tokyo, EST)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#F0F2F4] border-none rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0b5cff] transition-all"
              autoFocus
            />
          </div>
        </div>

        {/* Timezone List */}
        <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 p-2">
          {filteredTimezones.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-xs">
              No timezones matching "{search}"
            </div>
          ) : (
            filteredTimezones.map((tz) => {
              const isSelected = tz.id === selectedTimezone;
              return (
                <button
                  key={tz.id}
                  onClick={() => {
                    onSelectTimezone(tz.id);
                    onClose();
                  }}
                  className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-blue-50 text-[#0b5cff] font-bold'
                      : 'hover:bg-[#F7F9FA] text-gray-700 font-medium'
                  }`}
                >
                  <div className="min-w-0 pr-4">
                    <div className="text-xs font-bold truncate">{tz.label}</div>
                    <div className="text-[11px] text-gray-400 flex items-center gap-2 mt-0.5">
                      <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-[10px] text-gray-600 font-semibold">
                        {tz.offset}
                      </span>
                      <span>{tz.id}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-gray-800">{tz.sampleTime}</div>
                      <div className="text-[10px] text-gray-400">Current time</div>
                    </div>
                    {isSelected ? (
                      <div className="w-6 h-6 rounded-full bg-[#0b5cff] text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <div className="w-6 h-6" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#F7F9FA] border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span>Timezone conversion handled automatically by backend engine</span>
          </div>
          <button
            onClick={onClose}
            className="font-bold text-[#0b5cff] hover:underline"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
