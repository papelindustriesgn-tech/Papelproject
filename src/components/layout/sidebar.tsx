"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Logo } from "@/components/ui/logo";
import { ADMIN_LINK, DESKTOP_NAV } from "./nav-items";

export function Sidebar({ isAdmin, unread }: { isAdmin: boolean; unread: number }) {
  const pathname = usePathname();
  const items = isAdmin ? [...DESKTOP_NAV, ADMIN_LINK] : DESKTOP_NAV;
  return (
    <aside className="border-line sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r bg-white px-4 py-6 lg:flex">
      <Link href="/accueil" className="mb-8 px-2">
        <Logo />
      </Link>
      <nav aria-label="Navigation" className="flex-1">
        <ul className="space-y-1">
          {items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
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
                  {href === "/notifications" && unread > 0 && (
                    <span className="bg-coral-500 rounded-full px-2 py-0.5 text-xs font-bold text-white">{unread}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <p className="text-muted px-3 text-xs">Version pilote · Conakry</p>
    </aside>
  );
}
