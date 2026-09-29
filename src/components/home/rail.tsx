import type { ReactNode } from "react";

/** Rangée horizontale défilante (mobile) avec snap. */
export function Rail({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 scrollbar-none" role="region" aria-label={label}>
      <div className="flex snap-x snap-mandatory gap-3 pb-2">{children}</div>
    </div>
  );
}
