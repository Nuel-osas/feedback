"use client";

import { useMemo } from "react";
import { addDays, format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { X } from "lucide-react";

type Props = {
  value?: string;
  onChange: (next: string | undefined) => void;
  rangeDays?: number;
  minuteStep?: number;
};

const CLEAR = "__clear__";

export function DateTimePicker({
  value,
  onChange,
  rangeDays = 90,
  minuteStep = 30,
}: Props) {
  const dateOptions = useMemo(() => generateDateOptions(rangeDays), [rangeDays]);
  const timeOptions = useMemo(() => generateTimeOptions(minuteStep), [minuteStep]);

  const [date, time] = value ? value.split("T") : [undefined, undefined];

  function setDate(next: string) {
    if (next === CLEAR) {
      onChange(undefined);
      return;
    }
    onChange(`${next}T${time ?? "09:00"}`);
  }

  function setTime(next: string) {
    const d = date ?? format(new Date(), "yyyy-MM-dd");
    onChange(`${d}T${next}`);
  }

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1.5">
        <Select value={date ?? undefined} onValueChange={setDate}>
          <SelectTrigger className="min-w-0 flex-1 truncate">
            <SelectValue placeholder="Date" />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            {dateOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
            <SelectItem value={CLEAR}>Clear</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={time ?? undefined}
          onValueChange={setTime}
          disabled={!date}
        >
          <SelectTrigger className="min-w-0 w-[88px] truncate">
            <SelectValue placeholder="Time" />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            {timeOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <button
          type="button"
          onClick={() => onChange(undefined)}
          disabled={!value}
          aria-label="Clear"
          className="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed px-1"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function generateDateOptions(days: number) {
  const out: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < days; i++) {
    const d = addDays(now, i);
    const value = format(d, "yyyy-MM-dd");
    const label =
      i === 0 ? "Today" : i === 1 ? "Tomorrow" : format(d, "EEE, MMM d");
    out.push({ value, label });
  }
  return out;
}

function generateTimeOptions(step: number) {
  const out: { value: string; label: string }[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += step) {
      const value = `${pad(h)}:${pad(m)}`;
      const period = h < 12 ? "AM" : "PM";
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      out.push({ value, label: `${h12}:${pad(m)} ${period}` });
    }
  }
  return out;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}
