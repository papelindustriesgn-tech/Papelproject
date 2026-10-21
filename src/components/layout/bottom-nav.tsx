"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { isActive, MOBILE_NAV } from "./nav-items";

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navigation principale"
      className="pb-safe border-line/80 fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 backdrop-blur-lg lg:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-lg grid-cols-5">
        {MOBILE_NAV.map((item) => {
          const { href, label, icon: Icon } = item;
          const active = isActive(pathname, item);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 text-[10.5px] font-semibold tracking-tight transition min-[380px]:text-[11px]",
                  active ? "text-brand-600" : "text-muted hover:text-ink",
                )}
              >
                <span
                  className={cn("flex h-7 w-11 items-center justify-center rounded-full transition", active && "bg-brand-50")}
                >
                  <Icon className="size-[22px]" strokeWidth={active ? 2.4 : 2} aria-hidden />
                </span>
                <span className="max-w-full truncate">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
