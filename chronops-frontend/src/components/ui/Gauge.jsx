/**
 * Neo-brutalist Gauge placeholder.
 * A circular progress indicator with a label.
 */
export default function Gauge({
  value = 0,
  max = 100,
  label = "",
  size = 96,
  className = "",
}) {
  const pct = Math.min(Math.max(value / max, 0), 1);
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct);

  return (
    <div
      className={[
        "inline-flex flex-col items-center gap-2",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className="relative border-4 border-neo-ink rounded-full shadow-neo-sm bg-neo-white"
        style={{ width: size, height: size }}
      >
        <svg
          width={size - 8}
          height={size - 8}
          className="absolute top-0 left-0"
          style={{ transform: "rotate(-90deg)" }}
        >
          {/* Background track */}
          <circle
            cx={(size - 8) / 2}
            cy={(size - 8) / 2}
            r={radius}
            fill="none"
            stroke="#FFFDF5"
            strokeWidth={8}
          />
          {/* Filled arc */}
          <circle
            cx={(size - 8) / 2}
            cy={(size - 8) / 2}
            r={radius}
            fill="none"
            stroke={pct >= 0.7 ? "#FF6B6B" : "#FFD93D"}
            strokeWidth={8}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="butt"
            className="transition-all duration-300 ease-linear"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-black text-lg text-neo-ink">
          {Math.round(pct * 100)}%
        </span>
      </div>
      {label && (
        <span className="font-bold text-xs uppercase tracking-wider text-neo-ink">
          {label}
        </span>
      )}
    </div>
  );
}
