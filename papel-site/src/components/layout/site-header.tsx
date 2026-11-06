"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { NAV } from "@/components/layout/nav";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { track } from "@/lib/track";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Fermer le menu à chaque navigation et bloquer le défilement quand il est ouvert
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }
  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 border-b bg-white/90 backdrop-blur-md transition-colors supports-[backdrop-filter]:bg-white/80",
          scrolled ? "border-line" : "border-transparent",
        )}
      >
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:rounded-full focus:bg-papel-700 focus:px-4 focus:py-2 focus:text-white"
        >
          Aller au contenu
        </a>
        <div className="container-page flex h-16 items-center justify-between gap-6 lg:h-20">
          <Link href="/" aria-label="Papel Industries — accueil" className="shrink-0">
            <Logo className="h-8 w-auto lg:h-10" />
          </Link>

          <nav aria-label="Navigation principale" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className={cn(
                      "rounded-full px-4 py-2 text-[0.95rem] font-medium text-ink/80 transition hover:bg-papel-50 hover:text-papel-800",
                      isActive(item.href) && "bg-papel-50 text-papel-800",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="hidden lg:block">
            <Link
              href="/professionnels#demande"
              className={buttonClass("primary", "md")}
              onClick={() => track("cta_click", "header_distributeur")}
            >
              Devenir distributeur
            </Link>
          </div>

          <button
            type="button"
            className="-mr-2 inline-flex size-11 items-center justify-center rounded-full text-papel-900 hover:bg-papel-50 lg:hidden"
            aria-expanded={open}
            aria-controls="menu-mobile"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </header>

      <div id="menu-mobile" hidden={!open} className="fixed inset-x-0 top-16 bottom-0 z-50 overflow-y-auto bg-white lg:hidden">
        <nav aria-label="Navigation mobile" className="container-page flex flex-col py-6">
          <ul className="divide-y divide-line border-y border-line">
            <li>
              <Link href="/" className="flex min-h-14 items-center text-lg font-semibold text-papel-950">
                Accueil
              </Link>
            </li>
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "flex min-h-14 items-center text-lg font-semibold text-papel-950",
                    isActive(item.href) && "text-papel-600",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/professionnels#demande"
            className={buttonClass("primary", "lg", "mt-8 w-full")}
            onClick={() => track("cta_click", "menu_distributeur")}
          >
            Devenir distributeur
          </Link>
          <Link href="/produits" className={buttonClass("secondary", "lg", "mt-3 w-full")}>
            Découvrir nos produits
          </Link>
        </nav>
      </div>
    </>
  );
}
