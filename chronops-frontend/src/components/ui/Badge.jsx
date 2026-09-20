/**
 * Neo-brutalist Badge / pill.
 */
const colorClasses = {
  accent: "bg-neo-accent text-neo-ink",
  secondary: "bg-neo-secondary text-neo-ink",
  muted: "bg-neo-muted text-neo-ink",
  dark: "bg-neo-ink text-neo-white",
  white: "bg-neo-white text-neo-ink",
};

export default function Badge({
  children,
  color = "accent",
  rotate = false,
  className = "",
  ...props
}) {
  return (
    <span
      className={[
        "inline-flex items-center px-2.5 py-0.5",
        "font-semibold text-xs",
        "border-4 border-neo-ink rounded-full",
        "shadow-neo-sm",
        rotate ? "rotate-[-2deg]" : "",
        colorClasses[color] || colorClasses.accent,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </span>
  );
}
