"use client";

import { format, parse, isValid } from "date-fns";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { Popover, PopoverTrigger, PopoverContent } from "@radix-ui/react-popover";

interface CalendarInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
  compact?: boolean;
}

function toDate(ymd: string): Date | undefined {
  if (!ymd) return undefined;
  const d = parse(ymd, "yyyy-MM-dd", new Date());
  return isValid(d) ? d : undefined;
}

function toYmd(date: Date | undefined): string {
  if (!date) return "";
  return format(date, "yyyy-MM-dd");
}

function formatDisplay(ymd: string): string {
  const d = toDate(ymd);
  if (!d) return "";
  return format(d, "dd MMM yyyy");
}

export default function CalendarInput({
  value,
  onChange,
  label,
  required,
  placeholder = "Select date",
  className = "",
  compact,
}: CalendarInputProps) {
  const selected = toDate(value);

  function handleSelect(date: Date | undefined) {
    onChange(toYmd(date));
  }

  return (
    <div className={className}>
      {label && (
        <label className="label">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={`flex w-full items-center rounded-xl border border-slate-200 bg-white transition focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 text-left ${
              compact
                ? "px-3 py-2.5 text-sm min-h-[40px]"
                : "px-4 py-3.5 text-base min-h-[48px]"
            }`}
          >
            <svg
              className="mr-2 h-4 w-4 shrink-0 text-slate-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zM4 8h12v8H4V8z"
                clipRule="evenodd"
              />
            </svg>
            <span className={value ? "text-ink" : "text-slate-400"}>
              {value ? formatDisplay(value) : placeholder}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="bottom"
          align="start"
          className="z-50 mt-1"
        >
          <div
            className="rounded-xl border border-slate-200 bg-white p-3 shadow-xl"
            style={
              {
                "--rdp-accent-color": "#0F3A44",
                "--rdp-accent-background-color": "#eaf0f1",
                "--rdp-day_height": "40px",
                "--rdp-day_width": "40px",
                "--rdp-day_button-border-radius": "8px",
                "--rdp-day_button-height": "36px",
                "--rdp-day_button-width": "36px",
                "--rdp-today-color": "#5B93A3",
              } as React.CSSProperties
            }
          >
            <DayPicker
              mode="single"
              selected={selected}
              onSelect={handleSelect}
              defaultMonth={selected}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
