import type { ReactNode } from "react";

interface BadgeProps {
  variant: "primary" | "success" | "warning" | "error" | "info" | "neutral";
  icon?: ReactNode;
  children: ReactNode;
}

const variantClasses: Record<BadgeProps["variant"], string> = {
  primary:
    "bg-[var(--color-primary-wash)] text-[var(--color-primary)] border-[var(--color-primary-border)]",
  success:
    "bg-[var(--color-success-wash)] text-[var(--color-success)] border-[var(--color-success-border)]",
  warning:
    "bg-[var(--color-warning-wash)] text-[var(--color-warning)] border-[var(--color-warning-border)]",
  error:
    "bg-[var(--color-error-wash)] text-[var(--color-error)] border-[var(--color-error-border)]",
  info: "bg-[var(--color-info-wash)] text-[var(--color-info)] border-[var(--color-info-border)]",
  neutral:
    "bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] border-[var(--color-border-strong)]",
};

export function Badge({ variant, icon, children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--radius-full)] text-[length:var(--text-caption)] font-semibold border ${variantClasses[variant]}`}
    >
      {icon}
      {children}
    </span>
  );
}
