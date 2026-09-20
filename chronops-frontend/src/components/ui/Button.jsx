import { forwardRef } from "react";

/**
 * Neo-brutalist Button.
 *
 * @param {"primary"|"secondary"|"outline"|"ghost"} variant
 * @param {"sm"|"md"|"lg"} size
 */
const variantClasses = {
  primary:
    "bg-neo-accent text-neo-ink border-4 border-neo-ink shadow-neo-sm hover:shadow-neo-md",
  secondary:
    "bg-neo-secondary text-neo-ink border-4 border-neo-ink shadow-neo-sm hover:shadow-neo-md",
  outline:
    "bg-neo-white text-neo-ink border-4 border-neo-ink shadow-neo-sm hover:shadow-neo-md",
  ghost:
    "bg-transparent text-neo-ink border-4 border-transparent shadow-none hover:border-neo-ink hover:shadow-neo-sm",
};

const sizeClasses = {
  sm: "h-10 px-4 text-sm",
  md: "h-12 px-6 text-base",
  lg: "h-14 px-8 text-lg",
};

const Button = forwardRef(function Button(
  {
    variant = "primary",
    size = "md",
    className = "",
    disabled = false,
    children,
    ...props
  },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled}
      className={[
        "inline-flex items-center justify-center gap-2",
        "font-bold tracking-normal",
        "rounded-none cursor-pointer select-none",
        "transition-all duration-100 ease-linear",
        "active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
        "disabled:opacity-50 disabled:pointer-events-none",
        variantClasses[variant],
        sizeClasses[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </button>
  );
});

export default Button;
