import { useEffect, useState } from "react";
import { X } from "lucide-react";

/**
 * Neo-brutalist Toast notification.
 *
 * @param {string} message
 * @param {"info"|"success"|"error"} type
 * @param {{ label: string, onClick: () => void }} action - optional action button (e.g. Undo)
 * @param {number} duration - auto-dismiss ms (0 = manual dismiss)
 * @param {() => void} onClose
 */
const typeClasses = {
  info: "bg-neo-white",
  success: "bg-neo-secondary",
  error: "bg-neo-accent",
};

export default function Toast({
  message,
  type = "info",
  action,
  duration = 4000,
  onClose,
  visible = true,
}) {
  const [show, setShow] = useState(visible);

  useEffect(() => {
    setShow(visible);
  }, [visible]);

  useEffect(() => {
    if (show && duration > 0) {
      const t = setTimeout(() => {
        setShow(false);
        onClose?.();
      }, duration);
      return () => clearTimeout(t);
    }
  }, [show, duration, onClose]);

  if (!show) return null;

  return (
    <div
      role="alert"
      className={[
        "fixed bottom-6 right-6 z-50",
        "flex items-center gap-3 px-5 py-3",
        "border-4 border-neo-ink shadow-neo-md",
        "font-bold text-neo-ink",
        "animate-[slide-up_200ms_ease-linear]",
        typeClasses[type] || typeClasses.info,
      ].join(" ")}
    >
      <span className="flex-1">{message}</span>

      {action && (
        <button
          onClick={() => {
            action.onClick?.();
            setShow(false);
            onClose?.();
          }}
          className="font-black uppercase text-sm underline underline-offset-4 cursor-pointer bg-transparent border-0 text-neo-ink hover:text-neo-accent"
        >
          {action.label}
        </button>
      )}

      <button
        onClick={() => {
          setShow(false);
          onClose?.();
        }}
        aria-label="Dismiss notification"
        className="cursor-pointer bg-transparent border-0 text-neo-ink"
      >
        <X size={18} strokeWidth={3} />
      </button>
    </div>
  );
}
