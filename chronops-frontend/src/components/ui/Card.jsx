/**
 * Neo-brutalist Card with optional colored header and lift-on-hover.
 */
export default function Card({
  children,
  className = "",
  headerColor,
  headerContent,
  noPadding = false,
  ...props
}) {
  return (
    <div
      className={[
        "border-4 border-neo-ink bg-neo-white",
        "shadow-neo-sm hover:shadow-neo-md",
        "hover:-translate-y-1",
        "transition-all duration-200 ease-linear",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {headerContent && (
        <div
          className={[
            "px-4 py-3 border-b-4 border-neo-ink font-bold uppercase tracking-wider text-sm",
            headerColor || "bg-neo-white",
          ].join(" ")}
        >
          {headerContent}
        </div>
      )}
      {!noPadding ? <div className="p-4">{children}</div> : children}
    </div>
  );
}
