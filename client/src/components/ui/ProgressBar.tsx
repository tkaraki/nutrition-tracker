interface ProgressBarProps {
  value: number;
  variant?: "primary" | "warning" | "error";
  label?: string;
}

const variantColors: Record<NonNullable<ProgressBarProps["variant"]>, string> = {
  primary: "var(--color-primary)",
  warning: "var(--color-warning)",
  error: "var(--color-error)",
};

export function ProgressBar({
  value,
  variant = "primary",
  label,
}: ProgressBarProps) {
  const clamped = Math.min(value, 100);
  const isOverflowing = value > 100;
  const color = variantColors[variant];

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className="h-2 rounded-[var(--radius-full)] bg-[var(--color-surface-alt)] overflow-hidden"
    >
      <div
        className="rounded-[var(--radius-full)] h-full transition-[width] duration-300 ease-out"
        style={{
          width: `${clamped}%`,
          backgroundColor: color,
          backgroundImage: isOverflowing
            ? "repeating-linear-gradient(45deg, rgba(255,255,255,.35) 0 4px, transparent 4px 8px)"
            : undefined,
        }}
      />
    </div>
  );
}
