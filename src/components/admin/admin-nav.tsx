"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  CreditCard,
  Handshake,
  Landmark,
  LayoutDashboard,
  Mail,
  MessageSquareHeart,
  Send,
  ShoppingBag,
  Tag,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { cn } from "@/lib/cn";

export const ADMIN_NAV = [
  { href: "/admin", label: "Vue d'ensemble", icon: LayoutDashboard },
  { href: "/admin/inscriptions", label: "Inscriptions à valider", icon: UserPlus },
  { href: "/admin/verifications", label: "Vérifications", icon: UserCheck },
  { href: "/admin/utilisateurs", label: "Utilisateurs", icon: Users },
  { href: "/admin/universites", label: "Universités", icon: Landmark },
  { href: "/admin/cartes", label: "Cartes personnalisées", icon: CreditCard },
  { href: "/admin/emails", label: "Emails étudiants", icon: Mail },
  { href: "/admin/partenaires", label: "Partenaires", icon: Building2 },
  { href: "/admin/demandes-partenaires", label: "Demandes partenaires", icon: Handshake },
  { href: "/admin/avantages", label: "Avantages", icon: Tag },
  { href: "/admin/marketplace", label: "Marketplace", icon: ShoppingBag },
  { href: "/admin/statistiques", label: "Statistiques", icon: BarChart3 },
  { href: "/admin/avis", label: "Avis des inscrits", icon: MessageSquareHeart },
  { href: "/admin/contacts", label: "Contacter les inscrits", icon: Send },
];

export function AdminNav({
  pending,
  applications = 0,
  universities = 0,
  signups = 0,
}: {
  pending: number;
  applications?: number;
  universities?: number;
  signups?: number;
}) {
  const pathname = usePathname();
  return (
    <nav aria-label="Administration" className="-mx-4 scrollbar-none overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0">
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
                  active
                    ? "bg-ink text-white"
                    : "text-ink/80 ring-line hover:text-ink bg-white ring-1 lg:bg-transparent lg:ring-0 lg:hover:bg-white",
                )}
              >
                <Icon className="size-4" aria-hidden />
                <span className="flex-1">{label}</span>
                {href === "/admin/inscriptions" && signups > 0 && (
                  <span className="bg-coral-500 rounded-full px-1.5 text-xs font-bold text-white">{signups}</span>
                )}
                {href === "/admin/verifications" && pending > 0 && (
                  <span className="bg-coral-500 rounded-full px-1.5 text-xs font-bold text-white">{pending}</span>
                )}
                {href === "/admin/universites" && universities > 0 && (
                  <span className="bg-coral-500 rounded-full px-1.5 text-xs font-bold text-white">{universities}</span>
                )}
                {href === "/admin/demandes-partenaires" && applications > 0 && (
                  <span className="bg-coral-500 rounded-full px-1.5 text-xs font-bold text-white">{applications}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
