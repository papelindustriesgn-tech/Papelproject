import Link from "next/link";
import { cn } from "@/lib/cn";

const TABS = [
  { key: "etudiant", href: "/inscription", label: "🎓 Étudiant" },
  { key: "etablissement", href: "/inscription/etablissement", label: "🏛️ Établissement" },
] as const;

/** Choix du type de compte à l'inscription : étudiant ou établissement (université, institut, école). */
export function AccountTypeTabs({ current }: { current: (typeof TABS)[number]["key"] }) {
  return (
    <nav aria-label="Type de compte" className="bg-canvas ring-line mb-6 grid grid-cols-2 gap-1 rounded-2xl p-1 ring-1">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={t.key === current ? "page" : undefined}
          className={cn(
            "rounded-xl px-3 py-2.5 text-center text-sm font-bold transition",
            t.key === current ? "text-ink bg-white shadow-sm" : "text-muted hover:text-ink",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
