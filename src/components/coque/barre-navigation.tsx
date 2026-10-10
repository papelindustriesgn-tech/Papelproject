"use client";

import { ChevronDown, LayoutGrid, LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { lienActif, MENUS, type EntreeMenu } from "@/lib/navigation/menus";
import { IconeAppli } from "./applications";

interface AppliNav {
  code: string;
  libelle: string;
}

/**
 * Barre de navigation à la Odoo : bouton « applications », nom de l'application courante,
 * menus de l'application (avec sous-menus déroulants), utilisateur à droite.
 * Sur téléphone, les menus passent dans un panneau ouvert par le bouton ☰.
 */
export function BarreNavigation({
  applis,
  utilisateur,
  deconnexion,
}: {
  applis: AppliNav[];
  utilisateur: { nomComplet: string; initiales: string; roles: string };
  deconnexion: (fd: FormData) => Promise<void>;
}) {
  const chemin = usePathname();
  const recherche = useSearchParams().toString();
  const code = chemin.split("/")[1] ?? "";
  const appli = applis.find((a) => a.code === code);
  const menu = MENUS[code] ?? [];
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [panneau, setPanneau] = useState(false);
  const racine = useRef<HTMLElement>(null);

  // Ferme les menus au clic en dehors (et, plus bas, au choix d'un lien).
  useEffect(() => {
    const fermer = (e: MouseEvent) => {
      if (racine.current && !racine.current.contains(e.target as Node)) setOuvert(null);
    };
    document.addEventListener("mousedown", fermer);
    return () => document.removeEventListener("mousedown", fermer);
  }, []);

  // L'application terrain a sa propre interface plein écran (en-tête et onglets en bas).
  if (code === "terrain") return null;

  const actif = (e: EntreeMenu) => (e.href ? lienActif(e.href, chemin, recherche) : (e.enfants ?? []).some((l) => lienActif(l.href, chemin, recherche)));

  return (
    <header
      ref={racine}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a")) {
          setOuvert(null);
          setPanneau(false);
        }
      }}
      className="sticky top-0 z-[1100] bg-papel-700 text-white shadow print:hidden">
      <div className="flex h-12 items-center gap-1 px-2 md:px-3">
        <Link href="/applications" className="flex size-10 items-center justify-center rounded hover:bg-white/10" aria-label="Toutes les applications" title="Applications">
          <LayoutGrid size={20} />
        </Link>
        {appli && (
          <Link href={`/${appli.code}`} className="mr-2 flex items-center gap-2 rounded px-2 py-1 text-[1.05rem] font-semibold hover:bg-white/10">
            <IconeAppli code={appli.code} taille={24} contour />
            <span className="truncate">{appli.libelle}</span>
          </Link>
        )}
        {!appli && <span className="mr-2 px-2 text-[1.05rem] font-semibold">Papel ERP</span>}

        <nav aria-label="Menus de l'application" className="hidden min-w-0 flex-1 items-center md:flex">
          {menu.map((e) =>
            e.href ? (
              <Link key={e.libelle} href={e.href} aria-current={actif(e) ? "page" : undefined} className={`whitespace-nowrap rounded px-3 py-2 text-[0.95rem] hover:bg-white/10 ${actif(e) ? "bg-white/15 font-semibold" : ""}`}>
                {e.libelle}
              </Link>
            ) : (
              <div key={e.libelle} className="relative">
                <button
                  type="button"
                  aria-expanded={ouvert === e.libelle}
                  onClick={() => setOuvert(ouvert === e.libelle ? null : e.libelle)}
                  className={`flex items-center gap-1 whitespace-nowrap rounded px-3 py-2 text-[0.95rem] hover:bg-white/10 ${actif(e) ? "bg-white/15 font-semibold" : ""}`}
                >
                  {e.libelle}
                  <ChevronDown size={14} />
                </button>
                {ouvert === e.libelle && (
                  <div className="absolute left-0 top-full mt-1 min-w-60 rounded-md border border-gray-200 bg-white py-1 text-gray-800 shadow-lg">
                    {(e.enfants ?? []).map((l) => (
                      <Link key={l.href} href={l.href} className={`block px-4 py-2 text-[0.95rem] hover:bg-gray-100 ${lienActif(l.href, chemin, recherche) ? "font-semibold text-papel-700" : ""}`}>
                        {l.libelle}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ),
          )}
        </nav>
        <div className="flex-1 md:hidden" />

        <div className="relative">
          <button
            type="button"
            onClick={() => setOuvert(ouvert === "@moi" ? null : "@moi")}
            aria-expanded={ouvert === "@moi"}
            className="flex items-center gap-2 rounded px-2 py-1 hover:bg-white/10"
            title={utilisateur.nomComplet}
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-white text-sm font-bold text-papel-700">{utilisateur.initiales}</span>
            <span className="hidden max-w-40 truncate text-sm lg:inline">{utilisateur.nomComplet}</span>
          </button>
          {ouvert === "@moi" && (
            <div className="absolute right-0 top-full mt-1 w-64 rounded-md border border-gray-200 bg-white py-2 text-gray-800 shadow-lg">
              <div className="border-b border-gray-100 px-4 pb-2">
                <div className="font-semibold">{utilisateur.nomComplet}</div>
                <div className="text-sm text-gray-600">{utilisateur.roles}</div>
              </div>
              <Link href="/applications" className="block px-4 py-2 hover:bg-gray-100">
                Applications
              </Link>
              <form action={deconnexion}>
                <button className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-gray-100">
                  <LogOut size={16} /> Se déconnecter
                </button>
              </form>
            </div>
          )}
        </div>

        {menu.length > 0 && (
          <button type="button" onClick={() => setPanneau(!panneau)} className="flex size-10 items-center justify-center rounded hover:bg-white/10 md:hidden" aria-label="Menu" aria-expanded={panneau}>
            {panneau ? <X size={22} /> : <Menu size={22} />}
          </button>
        )}
      </div>

      {panneau && (
        <nav aria-label="Menus de l'application" className="max-h-[75vh] overflow-y-auto border-t border-white/10 bg-white pb-2 text-gray-800 shadow-lg md:hidden">
          {menu.map((e) =>
            e.href ? (
              <Link key={e.libelle} href={e.href} className={`block border-b border-gray-100 px-4 py-3 ${actif(e) ? "font-semibold text-papel-700" : ""}`}>
                {e.libelle}
              </Link>
            ) : (
              <div key={e.libelle} className="border-b border-gray-100 py-1">
                <div className="px-4 pt-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{e.libelle}</div>
                {(e.enfants ?? []).map((l) => (
                  <Link key={l.href} href={l.href} className={`block px-6 py-2.5 ${lienActif(l.href, chemin, recherche) ? "font-semibold text-papel-700" : ""}`}>
                    {l.libelle}
                  </Link>
                ))}
              </div>
            ),
          )}
        </nav>
      )}
    </header>
  );
}
