import type { ReactNode } from "react";

export function EmptyState({
  emoji = "🔍",
  title,
  text,
  action,
}: {
  emoji?: string;
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="border-line flex flex-col items-center rounded-[var(--radius-card)] border border-dashed bg-white px-6 py-12 text-center">
      <div className="mb-3 text-4xl" aria-hidden>
        {emoji}
      </div>
      <p className="text-ink font-bold">{title}</p>
      {text && <p className="text-muted mt-1 max-w-xs text-sm">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
