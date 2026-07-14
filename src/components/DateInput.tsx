"use client";

type QuickPreset = "today" | "this-month-start" | "last-month-start" | "last-month-end" | "this-year-start" | "financial-year-start";

interface DateInputProps {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  required?: boolean;
  presets?: QuickPreset[];
}

function presetDate(preset: QuickPreset): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (preset) {
    case "today":
      return now.toISOString().slice(0, 10);
    case "this-month-start":
      return `${y}-${String(m + 1).padStart(2, "0")}-01`;
    case "last-month-start":
      return `${y}-${String(m).padStart(2, "0")}-01`;
    case "last-month-end":
      return new Date(y, m, 0).toISOString().slice(0, 10);
    case "this-year-start":
      return `${y}-01-01`;
    case "financial-year-start": {
      const fyStartYear = m >= 3 ? y : y - 1;
      return `${fyStartYear}-04-01`;
    }
    default:
      return now.toISOString().slice(0, 10);
  }
}

const PRESET_LABELS: Record<QuickPreset, string> = {
  today: "Today",
  "this-month-start": "This Month",
  "last-month-start": "Last Month Start",
  "last-month-end": "Last Month End",
  "this-year-start": "Year Start",
  "financial-year-start": "FY Start",
};

export default function DateInput({ value, onChange, label, required, presets }: DateInputProps) {
  return (
    <div>
      {label && (
        <label className="label">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={required}
            className="input w-full pl-9"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zM4 8h12v8H4V8z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        {presets?.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChange(presetDate(p))}
            className="rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition whitespace-nowrap"
          >
            {PRESET_LABELS[p]}
          </button>
        ))}
      </div>
    </div>
  );
}
