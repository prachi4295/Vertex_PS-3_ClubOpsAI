import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Neo-brutalist dropdown menu.
 * Renders a trigger button with a pop-over list of items.
 */
export default function Dropdown({
  trigger,
  items = [],
  align = "right",
  className = "",
  ariaLabel,
  children,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <div ref={ref} className={["relative inline-block", className].join(" ")}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={ariaLabel}
        className="inline-flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0 m-0"
      >
        {trigger}
        {!children && (
          <ChevronDown
            size={16}
            strokeWidth={3}
            className={[
              "transition-transform duration-100 ease-linear",
              open ? "rotate-180" : "",
            ].join(" ")}
          />
        )}
      </button>

      {open && (
        <div
          role="menu"
          className={[
            "absolute top-full mt-2 z-50 min-w-[200px]",
            "bg-neo-white border-4 border-neo-ink shadow-neo-md",
            align === "right" ? "right-0" : "left-0",
          ].join(" ")}
        >
          {children
            ? children(() => setOpen(false))
            : items.map((item, i) => (
                <button
                  key={i}
                  role="menuitem"
                  onClick={() => {
                    item.onClick?.();
                    setOpen(false);
                  }}
                  disabled={item.disabled}
                  className={[
                    "w-full text-left px-4 py-3",
                    "font-bold text-sm text-neo-ink",
                    "hover:bg-neo-secondary cursor-pointer",
                    "border-0 bg-transparent",
                    "disabled:opacity-50 disabled:pointer-events-none",
                    i < items.length - 1 ? "border-b-2 border-neo-ink" : "",
                    "flex items-center gap-2",
                  ].join(" ")}
                >
                  {item.icon && (
                    <item.icon size={16} strokeWidth={3} />
                  )}
                  {item.label}
                </button>
              ))}
        </div>
      )}
    </div>
  );
}
