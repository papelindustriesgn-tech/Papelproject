import Link from "next/link";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/avantages", label: "Offres" },
  { href: "/avantages/mes-codes", label: "Codes" },
  { href: "/avantages/fidelite", label: "Fidélité" },
] as const;

/** Onglets de la rubrique « Avantages » (offres, codes promo, fidélité). */
export function DealsTabs({ current }: { current: (typeof TABS)[number]["href"] }) {
  return (
    <nav aria-label="Rubrique avantages" className="bg-canvas mb-4 grid grid-cols-3 gap-1 rounded-2xl p-1">
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
