"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, LayoutDashboard, ScanLine, ShoppingBag, Tag } from "lucide-react";
import { cn } from "@/lib/cn";

const ALL = [
  { href: "/partenaire", label: "Tableau de bord", short: "Accueil", icon: LayoutDashboard },
  { href: "/partenaire/scanner", label: "Scanner une carte", short: "Scanner", icon: ScanLine },
  { href: "/partenaire/offres", label: "Offres étudiantes", short: "Offres", icon: Tag },
  { href: "/partenaire/boutique", label: "Boutique", short: "Boutique", icon: ShoppingBag },
  { href: "/partenaire/profil", label: "Ma fiche partenaire", short: "Fiche", icon: Building2 },
];

const isActive = (pathname: string, href: string) =>
  href === "/partenaire" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

export function PartnerSidebar() {
  const pathname = usePathname();
  return (
    <nav aria-label="Espace partenaire">
      <ul className="space-y-1">
        {ALL.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[15px] font-semibold transition",
                  active ? "bg-brand-50 text-brand-700" : "text-ink/80 hover:bg-canvas hover:text-ink",
                )}
              >
                <Icon className="size-5" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

const MOBILE = [ALL[0], ALL[2], ALL[1], ALL[3], ALL[4]];

export function PartnerBottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navigation partenaire"
      className="pb-safe border-line/80 fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 backdrop-blur-lg lg:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-lg grid-cols-5">
        {MOBILE.map(({ href, short, icon: Icon }) => {
          const active = isActive(pathname, href);
          const scan = href === "/partenaire/scanner";
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 text-[11px] font-semibold transition",
                  active ? "text-brand-600" : "text-muted hover:text-ink",
                )}
              >
                {scan ? (
                  <span className="bg-brand-600 -mt-6 flex size-14 items-center justify-center rounded-full text-white shadow-[var(--shadow-float)] ring-4 ring-white">
                    <Icon className="size-7" aria-hidden />
                  </span>
                ) : (
                  <span
                    className={cn("flex h-7 w-12 items-center justify-center rounded-full transition", active && "bg-brand-50")}
                  >
                    <Icon className="size-[22px]" strokeWidth={active ? 2.4 : 2} aria-hidden />
                  </span>
                )}
                <span className="max-w-full truncate px-0.5">{short}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
