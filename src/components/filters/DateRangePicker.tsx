// ============================================
// Date Range Picker Component
// Path: src/components/filters/DateRangePicker.tsx
// ============================================

import { Calendar } from 'lucide-react';

interface DateRangePickerProps {
  startDate: string | null;
  endDate: string | null;
  onStartDateChange: (date: string | null) => void;
  onEndDateChange: (date: string | null) => void;
  label?: string;
  className?: string;
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  label = 'Période',
  className = '',
}: DateRangePickerProps) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          {label}
        </label>
      )}
      <div className="flex gap-2 items-center">
        <input
          type="date"
          value={startDate || ''}
          onChange={(e) => onStartDateChange(e.target.value || null)}
          className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-cta text-sm"
          placeholder="Date début"
        />
        <span className="text-slate-500">→</span>
        <input
          type="date"
          value={endDate || ''}
          onChange={(e) => onEndDateChange(e.target.value || null)}
          className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-cta text-sm"
          placeholder="Date fin"
        />
        {(startDate || endDate) && (
          <button
            onClick={() => {
              onStartDateChange(null);
              onEndDateChange(null);
            }}
            className="text-sm text-red-600 hover:text-red-700 px-2 py-1 hover:bg-red-50 rounded transition-colors"
          >
            Effacer
          </button>
        )}
      </div>
    </div>
  );
}
