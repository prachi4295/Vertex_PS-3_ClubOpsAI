import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import Button from "./Button";

/**
 * Neo-brutalist Modal (dialog overlay).
 */
export default function Modal({
  open,
  isOpen,
  onClose,
  title,
  children,
  className = "",
}) {
  const dialogRef = useRef(null);
  const isModalOpen = Boolean(open ?? isOpen);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (isModalOpen && !el.open) el.showModal();
    else if (!isModalOpen && el.open) el.close();
  }, [isModalOpen]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className={[
        "p-0 m-auto",
        "bg-neo-white border-4 border-neo-ink shadow-neo-lg",
        "rounded-none backdrop:bg-neo-ink/50",
        "max-w-lg w-[calc(100vw-2rem)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b-4 border-neo-ink bg-neo-secondary">
        <h2 className="font-black text-lg tracking-tight text-neo-ink m-0">
          {title}
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          aria-label="Close modal"
          className="!p-1 !h-auto !border-0"
        >
          <X size={20} strokeWidth={3} />
        </Button>
      </div>

      {/* Body */}
      <div className="p-5">{children}</div>
    </dialog>
  );
}
