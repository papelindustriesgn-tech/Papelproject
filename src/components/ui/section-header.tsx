import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function SectionHeader({ title, href, linkLabel = "Tout voir" }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-lg font-extrabold tracking-tight text-ink">{title}</h2>
      {href && (
        <Link href={href} className="inline-flex shrink-0 items-center text-sm font-semibold text-brand-600 hover:text-brand-800">
          {linkLabel} <ChevronRight className="size-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}

export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
