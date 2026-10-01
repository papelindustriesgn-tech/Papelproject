import Link from "next/link";

const SHORTCUTS = [
  { href: "/carte", emoji: "🎫", label: "Ma carte", bg: "bg-brand-50" },
  { href: "/avantages", emoji: "🔥", label: "Bons plans", bg: "bg-coral-50" },
  { href: "/jobs", emoji: "💼", label: "Jobs", bg: "bg-mango-50" },
  { href: "/logement", emoji: "🏠", label: "Logement", bg: "bg-mint-50" },
  { href: "/marketplace", emoji: "🛍️", label: "Marketplace", bg: "bg-brand-50" },
];

export function Shortcuts() {
  return (
    <nav aria-label="Raccourcis" className="grid grid-cols-5 gap-2">
      {SHORTCUTS.map((s) => (
        <Link key={s.href} href={s.href} className="group flex flex-col items-center gap-1.5 text-center">
          <span
            className={`flex aspect-square w-full max-w-16 items-center justify-center rounded-2xl ${s.bg} text-2xl transition group-hover:scale-105 group-active:scale-95`}
            aria-hidden
          >
            {s.emoji}
          </span>
          <span className="text-ink w-full truncate text-[11px] font-semibold sm:text-xs">{s.label}</span>
        </Link>
      ))}
    </nav>
  );
}
