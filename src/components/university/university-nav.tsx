"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, FileSpreadsheet, GraduationCap, Inbox, LayoutDashboard, Landmark } from "lucide-react";
import { cn } from "@/lib/cn";

const ALL = [
  { href: "/universite", label: "Tableau de bord", short: "Accueil", icon: LayoutDashboard },
  { href: "/universite/demandes", label: "Demandes à traiter", short: "Demandes", icon: Inbox },
  { href: "/universite/etudiants", label: "Étudiants & cartes", short: "Étudiants", icon: GraduationCap },
  { href: "/universite/imports", label: "Listes d'étudiants", short: "Listes", icon: FileSpreadsheet },
  { href: "/universite/carte", label: "Carte de l'université", short: "Carte", icon: CreditCard },
  { href: "/universite/etablissement", label: "Établissement & connexion", short: "Fiche", icon: Landmark },
];

const isActive = (pathname: string, href: string) =>
  href === "/universite" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

export function UniversitySidebar({ pending }: { pending: number }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Portail université">
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
                <span className="flex-1">{label}</span>
                {href === "/universite/demandes" && pending > 0 && (
                  <span className="bg-coral-500 rounded-full px-1.5 text-xs font-bold text-white">{pending}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

const MOBILE = [ALL[0], ALL[1], ALL[2], ALL[3], ALL[4]];

export function UniversityBottomNav({ pending }: { pending: number }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navigation université"
      className="pb-safe border-line/80 fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 backdrop-blur-lg lg:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-lg grid-cols-5">
        {MOBILE.map(({ href, short, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-full flex-col items-center justify-center gap-1 text-[11px] font-semibold transition",
                  active ? "text-brand-600" : "text-muted hover:text-ink",
                )}
              >
                <span
                  className={cn("flex h-7 w-12 items-center justify-center rounded-full transition", active && "bg-brand-50")}
                >
                  <Icon className="size-[22px]" strokeWidth={active ? 2.4 : 2} aria-hidden />
                </span>
                {href === "/universite/demandes" && pending > 0 && (
                  <span className="bg-coral-500 absolute top-1.5 right-[calc(50%-1.4rem)] rounded-full px-1.5 text-[10px] font-bold text-white">
                    {pending}
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
