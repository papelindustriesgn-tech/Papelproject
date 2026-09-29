import type { ReactNode } from "react";

export function EmptyState({ emoji = "🔍", title, text, action }: { emoji?: string; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-[var(--radius-card)] border border-dashed border-line bg-white px-6 py-12 text-center">
      <div className="mb-3 text-4xl" aria-hidden>
        {emoji}
      </div>
      <p className="font-bold text-ink">{title}</p>
      {text && <p className="mt-1 max-w-xs text-sm text-muted">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
