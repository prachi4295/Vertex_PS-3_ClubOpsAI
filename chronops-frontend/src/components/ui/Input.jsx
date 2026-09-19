import { forwardRef } from "react";

/**
 * Neo-brutalist Input with yellow focus.
 */
const Input = forwardRef(function Input(
  { className = "", ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={[
        "w-full h-12 px-4",
        "bg-neo-white text-neo-ink font-bold",
        "border-4 border-neo-ink rounded-none",
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

export default Input;
