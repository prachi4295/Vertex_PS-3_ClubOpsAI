import { useState, useEffect } from "react";
import { splitTime12, joinTime24 } from "../../lib/time";

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

/**
 * TimeInput12:
 * Neo-brutalist 12-hour time selector with dedicated Hour and Minute dropdowns and AM / PM toggle buttons.
 * Emits a standard 24-hour "HH:mm" string on change for reliable storage and event scheduling.
 */
export default function TimeInput12({
  value = "09:00",
  onChange,
  disabled = false,
  className = "",
  id,
}) {
  const parsed = splitTime12(value);
  const [hour, setHour] = useState(parsed.hour12);
  const [minute, setMinute] = useState(parsed.minute);
  const [period, setPeriod] = useState(parsed.period);

  useEffect(() => {
    const next = splitTime12(value);
    setHour(next.hour12);
    setMinute(next.minute);
    setPeriod(next.period);
  }, [value]);

  const update = (newHour, newMin, newPeriod) => {
    const safeHour = newHour || "09";
    const safeMin = newMin || "00";
    const safePeriod = newPeriod || "AM";
    setHour(safeHour);
    setMinute(safeMin);
    setPeriod(safePeriod);
    if (typeof onChange === "function") {
      const time24 = joinTime24(safeHour, safeMin, safePeriod);
      onChange(time24);
    }
  };

  const togglePeriod = (p) => {
    if (disabled || p === period) return;
    update(hour, minute, p);
  };

  return (
    <div
      id={id}
      className={`inline-flex items-center gap-2 p-1 bg-neo-white border-2 border-neo-ink shadow-[2px_2px_0_#000] ${className}`}
    >
      {/* Time Pickers (Hour & Minute) */}
      <div className="flex items-center gap-1">
        {/* Hour Dropdown */}
        <div className="relative inline-flex items-center">
          <select
            id={id ? `${id}-hour` : undefined}
            value={hour}
            disabled={disabled}
            onChange={(e) => update(e.target.value, minute, period)}
            aria-label="Hour (1-12)"
            className="h-8 px-2 pr-5 text-center font-black text-sm text-neo-ink bg-neo-bg border border-neo-ink cursor-pointer hover:bg-neo-white focus:outline-none focus:bg-neo-secondary appearance-none rounded-none"
          >
            {HOURS.map((h) => (
              <option key={h} value={h} className="font-bold">
                {h}
              </option>
            ))}
          </select>
          <span className="absolute right-1.5 text-[9px] pointer-events-none text-neo-ink font-black select-none">
            ▼
          </span>
        </div>

        <span className="font-black text-base text-neo-ink px-0.5 select-none">:</span>

        {/* Minute Dropdown */}
        <div className="relative inline-flex items-center">
          <select
            id={id ? `${id}-minute` : undefined}
            value={minute}
            disabled={disabled}
            onChange={(e) => update(hour, e.target.value, period)}
            aria-label="Minute (00-59)"
            className="h-8 px-2 pr-5 text-center font-black text-sm text-neo-ink bg-neo-bg border border-neo-ink cursor-pointer hover:bg-neo-white focus:outline-none focus:bg-neo-secondary appearance-none rounded-none"
          >
            {MINUTES.map((m) => (
              <option key={m} value={m} className="font-bold">
                {m}
              </option>
            ))}
          </select>
          <span className="absolute right-1.5 text-[9px] pointer-events-none text-neo-ink font-black select-none">
            ▼
          </span>
        </div>
      </div>

      {/* AM / PM Segmented Toggle Buttons */}
      <div className="flex items-center border border-neo-ink overflow-hidden bg-neo-bg ml-auto">
        <button
          type="button"
          disabled={disabled}
          onClick={() => togglePeriod("AM")}
          className={[
            "h-8 px-2.5 text-xs font-black uppercase transition-all cursor-pointer select-none",
            period === "AM"
              ? "bg-neo-accent text-neo-ink font-black shadow-[inset_0_0_0_1px_#000]"
              : "text-neo-ink/70 hover:text-neo-ink bg-transparent",
          ].join(" ")}
        >
          AM
        </button>
        <div className="w-[1px] h-8 bg-neo-ink" />
        <button
          type="button"
          disabled={disabled}
          onClick={() => togglePeriod("PM")}
          className={[
            "h-8 px-2.5 text-xs font-black uppercase transition-all cursor-pointer select-none",
            period === "PM"
              ? "bg-neo-accent text-neo-ink font-black shadow-[inset_0_0_0_1px_#000]"
              : "text-neo-ink/70 hover:text-neo-ink bg-transparent",
          ].join(" ")}
        >
          PM
        </button>
      </div>
    </div>
  );
}
