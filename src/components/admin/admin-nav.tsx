"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Briefcase, Building2, House, LayoutDashboard, ShoppingBag, Tag, UserCheck, Users } from "lucide-react";
import { cn } from "@/lib/cn";

export const ADMIN_NAV = [
  { href: "/admin", label: "Vue d'ensemble", icon: LayoutDashboard },
  { href: "/admin/verifications", label: "Vérifications", icon: UserCheck },
  { href: "/admin/utilisateurs", label: "Utilisateurs", icon: Users },
  { href: "/admin/partenaires", label: "Partenaires", icon: Building2 },
  { href: "/admin/avantages", label: "Avantages", icon: Tag },
  { href: "/admin/jobs", label: "Jobs", icon: Briefcase },
  { href: "/admin/logements", label: "Logements", icon: House },
  { href: "/admin/marketplace", label: "Marketplace", icon: ShoppingBag },
  { href: "/admin/statistiques", label: "Statistiques", icon: BarChart3 },
];

export function AdminNav({ pending }: { pending: number }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Administration" className="-mx-4 overflow-x-auto px-4 scrollbar-none lg:mx-0 lg:overflow-visible lg:px-0">
      <ul className="flex gap-1.5 lg:flex-col">
        {ADMIN_NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold whitespace-nowrap transition",
                  active ? "bg-ink text-white" : "bg-white text-ink/80 ring-1 ring-line hover:text-ink lg:bg-transparent lg:ring-0 lg:hover:bg-white",
                )}
              >
                <Icon className="size-4" aria-hidden />
                <span className="flex-1">{label}</span>
                {href === "/admin/verifications" && pending > 0 && (
                  <span className="rounded-full bg-coral-500 px-1.5 text-xs font-bold text-white">{pending}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
