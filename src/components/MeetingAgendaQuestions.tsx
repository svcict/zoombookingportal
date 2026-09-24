import React from 'react';
import { Video } from 'lucide-react';
import { MeetingType } from '../types';

interface MeetingAgendaQuestionsProps {
  meetingType: MeetingType;
  answers: Record<string, any>;
  errors: Record<string, string>;
  onAnswerChange: (questionId: string, value: any) => void;
}

// Renders whichever custom questions the selected meeting type defines (most
// commonly a "Meeting Agenda" textarea) - moved out of ZoomIntakeForm so it
// sits on the same initial scheduling step as Topic, answered before the
// user picks a date/time rather than after.
export const MeetingAgendaQuestions: React.FC<MeetingAgendaQuestionsProps> = ({
  meetingType,
  answers,
  errors,
  onAnswerChange,
}) => {
  if (meetingType.customQuestions.length === 0) return null;

  return (
    <div
      id="meeting-agenda-card"
      className="bg-white rounded-2xl p-6 sm:p-7 border border-gray-200 shadow-xs space-y-4"
    >
      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
        <Video className="w-4 h-4 text-[#0b5cff]" />
        Meeting Preparation Questions
      </h3>

      {meetingType.customQuestions.map((q) => {
        const val = answers[q.id] || '';
        const hasError = errors[q.id];

        return (
          <div key={q.id} className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600">
              {q.label} {q.required && <span className="text-red-500">*</span>}
            </label>
            {q.helpText && <p className="text-[11px] text-gray-400 mb-1">{q.helpText}</p>}

            {q.type === 'textarea' && (
              <textarea
                rows={3}
                value={val}
                onChange={(e) => onAnswerChange(q.id, e.target.value)}
                placeholder={q.placeholder || 'Your response...'}
                className={`w-full px-4 py-3 bg-[#F7F9FA] border-none rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0b5cff] transition-all ${
                  hasError ? 'ring-2 ring-red-400 bg-red-50/50' : ''
                }`}
              />
            )}

            {(q.type === 'text' || q.type === 'phone') && (
              <input
                type={q.type}
                value={val}
                onChange={(e) => onAnswerChange(q.id, e.target.value)}
                placeholder={q.placeholder || ''}
                className={`w-full px-4 py-3 bg-[#F7F9FA] border-none rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0b5cff] transition-all ${
                  hasError ? 'ring-2 ring-red-400 bg-red-50/50' : ''
                }`}
              />
            )}

            {q.type === 'select' && (
              <select
                value={val}
                onChange={(e) => onAnswerChange(q.id, e.target.value)}
                className={`w-full px-4 py-3 bg-[#F7F9FA] border-none rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0b5cff] ${
                  hasError ? 'ring-2 ring-red-400 bg-red-50/50' : ''
                }`}
              >
                <option value="">-- Please select an option --</option>
                {q.options?.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            )}

            {q.type === 'radio' && (
              <div className="space-y-2 mt-1">
                {q.options?.map((opt) => (
                  <label
                    key={opt}
                    className="flex items-center gap-2.5 p-3 rounded-xl bg-[#F7F9FA] hover:bg-gray-100 cursor-pointer text-xs text-gray-700 font-medium transition-colors"
                  >
                    <input
                      type="radio"
                      name={q.id}
                      value={opt}
                      checked={val === opt}
                      onChange={() => onAnswerChange(q.id, opt)}
                      className="w-4 h-4 text-[#0b5cff] focus:ring-[#0b5cff]"
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            )}

            {hasError && <p className="text-red-500 text-xs mt-1">{hasError}</p>}
          </div>
        );
      })}
    </div>
  );
};
