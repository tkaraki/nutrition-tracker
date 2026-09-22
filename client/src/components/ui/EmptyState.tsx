import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center text-center py-12 px-6 max-w-md mx-auto">
      <div className="text-[2.5rem] text-[var(--color-text-subtle)]">{icon}</div>
      <h3 className="text-[length:var(--text-heading-sm)] text-[var(--color-text)] font-semibold mt-3">
        {title}
      </h3>
      {description && (
        <p className="text-[length:var(--text-body-sm)] text-[var(--color-text-muted)] mt-1">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
