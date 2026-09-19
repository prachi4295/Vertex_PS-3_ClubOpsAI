/**
 * Neo-brutalist icon container.
 * Wraps a lucide-react icon in a bordered box.
 */
const sizeClasses = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-12 h-12",
};

const colorClasses = {
  default: "bg-neo-white text-neo-ink",
  accent: "bg-neo-accent text-neo-ink",
  secondary: "bg-neo-secondary text-neo-ink",
  muted: "bg-neo-muted text-neo-ink",
  dark: "bg-neo-ink text-neo-white",
};

export default function IconBox({
  icon: Icon,
  size = "md",
  color = "default",
  className = "",
  ...props
}) {
  return (
    <div
      className={[
        "inline-flex items-center justify-center",
        "border-4 border-neo-ink shadow-neo-sm",
        sizeClasses[size] || sizeClasses.md,
        colorClasses[color] || colorClasses.default,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      <Icon size={size === "sm" ? 16 : size === "lg" ? 24 : 20} strokeWidth={3} />
    </div>
  );
}
