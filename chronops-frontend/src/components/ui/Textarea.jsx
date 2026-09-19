import { forwardRef } from "react";

/**
 * Neo-brutalist Textarea with yellow focus.
 */
const Textarea = forwardRef(function Textarea(
  { className = "", rows = 4, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={[
        "w-full px-4 py-3",
        "bg-neo-white text-neo-ink font-bold",
        "border-4 border-neo-ink rounded-none resize-y",
        "placeholder:text-neo-ink/40 placeholder:font-bold",
        "focus:bg-neo-secondary focus:shadow-neo-sm focus:outline-none",
        "transition-all duration-100 ease-linear",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
});

export default Textarea;
