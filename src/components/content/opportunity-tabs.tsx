import Link from "next/link";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/jobs", label: "Jobs" },
  { href: "/logement", label: "Logement" },
  { href: "/marketplace", label: "Marketplace" },
] as const;

/** Onglets de la rubrique « Opportunités » (jobs, logement, marketplace). */
export function OpportunityTabs({ current }: { current?: (typeof TABS)[number]["href"] }) {
  return (
    <nav aria-label="Rubrique opportunités" className="bg-canvas mb-4 grid grid-cols-3 gap-1 rounded-2xl p-1">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={t.href === current ? "page" : undefined}
          className={cn(
            "truncate rounded-xl px-2 py-2 text-center text-sm font-semibold transition",
            t.href === current ? "text-ink bg-white shadow-sm" : "text-muted hover:text-ink",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
