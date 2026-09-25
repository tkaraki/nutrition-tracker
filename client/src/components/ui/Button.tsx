import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { Spinner } from "./Spinner";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "destructive" | "ghost";
  size?: "sm" | "default" | "lg";
  loading?: boolean;
}

const sizeClasses: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "min-h-8 px-3 text-[length:var(--text-caption)]",
  default: "min-h-11 px-4 py-2.5 text-[length:var(--text-body-sm)] font-semibold",
  lg: "min-h-12 px-6 text-[length:var(--text-body)]",
};

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-[var(--color-primary)] text-[var(--color-primary-contrast)] hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)] active:scale-[0.98]",
  secondary:
    "bg-transparent border border-[var(--color-border-strong)] text-[var(--color-text)] hover:bg-[var(--color-surface-alt)]",
  destructive: "bg-[var(--color-error)] text-white hover:opacity-90",
  ghost:
    "bg-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "default",
    loading = false,
    disabled,
    className = "",
    children,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-none disabled:active:scale-100 ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
});
