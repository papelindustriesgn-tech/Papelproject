"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, FileText, Gauge, Home, Inbox, Layers, Package, Users } from "lucide-react";
import { cn } from "@/lib/cn";

const ITEMS = [
  { href: "/admin", label: "Tableau de bord", Icon: Gauge, exact: true },
  { href: "/admin/prospects", label: "Prospects", Icon: Users },
  { href: "/admin/messages", label: "Messages", Icon: Inbox },
  { href: "/admin/produits", label: "Produits", Icon: Package },
  { href: "/admin/gammes", label: "Gammes", Icon: Layers },
  { href: "/admin/actualites", label: "Actualités", Icon: FileText },
  { href: "/admin/accueil", label: "Page d'accueil", Icon: Home },
  { href: "/admin/entreprise", label: "Entreprise", Icon: Building2 },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Administration" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0">
      <ul className="flex gap-1 lg:flex-col">
        {ITEMS.map(({ href, label, Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium whitespace-nowrap text-white/75 hover:bg-white/10 hover:text-white",
                  active && "bg-white/15 text-white",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
