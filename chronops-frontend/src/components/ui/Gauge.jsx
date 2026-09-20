import { useState } from "react";
import { HelpCircle } from "lucide-react";

const COLOR_MAP = {
  accent: "#E26D5C",
  secondary: "#FDE68A",
  muted: "#CBD5E1",
  ink: "#0F172A",
};

/**
 * Chunky Neo-Brutalist Gauge.
 * Features thick black borders, flat solid SVG arc (no gradients),
 * high-contrast centered typography, and an interactive "How is this calculated?" tooltip.
 */
export default function Gauge({
  value = 0,
  max = 100,
  displayValue,
  label = "",
  sublabel = "",
  color = "secondary",
  size = 88,
  tooltip = "",
  className = "",
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  const numericValue = typeof value === "number" ? value : 0;
  const pct = Math.min(Math.max(numericValue / max, 0), 1);
  const strokeColor = COLOR_MAP[color] || COLOR_MAP.secondary;

  const strokeWidth = 10;
  const radius = (size - 12 - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct);

  return (
    <div
      className={[
        "inline-flex flex-col items-center select-none relative group",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Gauge Outer Ring with Hard Shadow */}
      <div
        className="relative border-4 border-neo-ink rounded-full shadow-[3px_3px_0_#000] bg-neo-white flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <svg
          width={size - 8}
          height={size - 8}
          className="absolute inset-0 m-auto"
          style={{ transform: "rotate(-90deg)" }}
        >
          {/* Inner background track */}
          <circle
            cx={(size - 8) / 2}
            cy={(size - 8) / 2}
            r={radius}
            fill="none"
            stroke="#F8FAFC"
            strokeWidth={strokeWidth}
          />
          {/* Base track border outline */}
          <circle
            cx={(size - 8) / 2}
            cy={(size - 8) / 2}
            r={radius}
            fill="none"
            stroke="#000000"
            strokeWidth={strokeWidth}
            strokeDasharray="2 4"
            className="opacity-20"
          />
          {/* Solid fill arc (no gradient) */}
          <circle
            cx={(size - 8) / 2}
            cy={(size - 8) / 2}
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="butt"
            className="transition-all duration-300 ease-linear"
          />
        </svg>

        {/* Center reading */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center px-1">
          <span className="font-black text-sm sm:text-base text-neo-ink leading-none">
            {displayValue !== undefined ? displayValue : `${Math.round(pct * 100)}%`}
          </span>
          {sublabel && (
            <span className="font-black text-[9px] uppercase tracking-wider text-neo-ink/70 mt-0.5">
              {sublabel}
            </span>
          )}
        </div>
      </div>

      {/* Label and Tooltip Trigger */}
      <div className="flex items-center gap-1 mt-2">
        <span className="font-bold text-[11px] uppercase tracking-wider text-neo-ink">
          {label}
        </span>
        {tooltip && (
          <div className="relative">
            <button
              type="button"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onFocus={() => setShowTooltip(true)}
              onBlur={() => setShowTooltip(false)}
              onClick={() => setShowTooltip((v) => !v)}
              aria-label={`How is ${label} calculated?`}
              className="p-0.5 text-neo-ink/50 hover:text-neo-ink cursor-pointer bg-transparent border-0 inline-flex items-center"
            >
              <HelpCircle size={12} strokeWidth={3} />
            </button>

            {/* Neo-Brutalist Tooltip Popover */}
            {showTooltip && (
              <div
                role="tooltip"
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-52 p-2.5 bg-neo-white border-3 border-neo-ink shadow-neo-sm text-neo-ink font-bold text-[10px] leading-tight uppercase tracking-wider pointer-events-none"
              >
                <div className="text-neo-accent font-black mb-1">
                  Calculation Formula
                </div>
                {tooltip}
                {/* Arrow */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-neo-ink" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
