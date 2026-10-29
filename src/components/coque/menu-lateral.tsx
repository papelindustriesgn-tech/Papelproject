"use client";

import {
  AlertTriangle,
  ArrowLeftRight,
  BarChart3,
  Bell,
  Boxes,
  CalendarCheck,
  CalendarDays,
  ChevronsUpDown,
  Circle,
  ClipboardCheck,
  ClipboardList,
  Container,
  Disc3,
  Factory,
  FileSpreadsheet,
  FileText,
  Gift,
  HandCoins,
  Landmark,
  LayoutDashboard,
  LayoutGrid,
  ListChecks,
  CircleHelp,
  LogOut,
  Map as IconeCarte,
  MapPin,
  Menu,
  Package,
  Receipt,
  ReceiptText,
  Rocket,
  Route,
  ScanSearch,
  Settings,
  Ship,
  ShoppingCart,
  Target,
  Truck,
  Users,
  Wallet,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { createElement, Suspense, use, useState } from "react";
import { lienActif, MENUS, type EntreeMenu } from "@/lib/navigation/menus";
import { IconeAppli } from "./applications";

interface AppliNav {
  code: string;
  libelle: string;
}

/** Icône d'une entrée de menu, déduite de son libellé (aucune liste à tenir à jour ailleurs). */
const ICONES_MENU: [RegExp, LucideIcon][] = [
  [/vue d'ensemble|tableau de bord/i, LayoutDashboard],
  [/^alertes$/i, Bell],
  [/^tâches$/i, ListChecks],
  [/^objectifs/i, Target],
  [/mise en route/i, Rocket],
  [/rapport/i, FileText],
  [/entrées|mouvement/i, ArrowLeftRight],
  [/bobine/i, Disc3],
  [/inventaire|fiches de poste/i, ClipboardList],
  [/ordres de fabrication/i, Factory],
  [/panne/i, Wrench],
  [/devis/i, FileText],
  [/impayé/i, Wallet],
  [/encaissement/i, HandCoins],
  [/^avoirs$/i, ReceiptText],
  [/dotation/i, Gift],
  [/commandes à livrer/i, Truck],
  [/prévision/i, BarChart3],
  [/carte/i, IconeCarte],
  [/portefeuille|clients?|employ|utilisateur/i, Users],
  [/visite/i, MapPin],
  [/tourn/i, Route],
  [/réclamation|non-conformit|signalement/i, AlertTriangle],
  [/opérations|mouvement/i, ArrowLeftRight],
  [/produits|articles/i, Package],
  [/commandes|achats|demandes/i, ShoppingCart],
  [/facturation|factures/i, Receipt],
  [/conteneur/i, Ship],
  [/contrôle/i, ClipboardCheck],
  [/traçabilité/i, ScanSearch],
  [/ordres de travail|préventif/i, Wrench],
  [/équipement/i, Factory],
  [/trésorerie/i, Landmark],
  [/fournisseur/i, Truck],
  [/analyse|résultat/i, BarChart3],
  [/présence/i, CalendarCheck],
  [/congé|absence/i, CalendarDays],
  [/paie|taux|prix/i, Wallet],
  [/paramètre|réglage|configuration|listes/i, Settings],
  [/journal/i, ClipboardList],
  [/excel|export/i, FileSpreadsheet],
  [/stock|magasin/i, Boxes],
  [/livraison|logistique/i, Container],
];
function iconeMenu(libelle: string): LucideIcon {
  return ICONES_MENU.find(([r]) => r.test(libelle))?.[1] ?? Circle;
}
function IconeMenu({ libelle, size = 16, className }: { libelle: string; size?: number; className?: string }) {
  return createElement(iconeMenu(libelle), { size, className, "aria-hidden": true });
}

/**
 * Menu latéral (inspiré des tableaux de bord modernes) : application courante en haut, menus avec icônes,
 * réglages en bas, carte de l'utilisateur. Sur ordinateur il reste affiché à gauche ; sur téléphone,
 * une barre en haut l'ouvre en panneau.
 */
export function MenuLateral({
  applis,
  utilisateur,
  deconnexion,
  badges,
}: {
  applis: AppliNav[];
  /**
   * Nombres affichés en pastille rouge à côté d'un lien (alertes, tâches reçues), par adresse du lien.
   * Promesse : le menu s'affiche tout de suite, les pastilles arrivent dès qu'elles sont calculées.
   */
  badges?: Promise<Record<string, number>>;
  utilisateur: { nomComplet: string; initiales: string; roles: string; estAdmin: boolean };
  deconnexion: (fd: FormData) => Promise<void>;
}) {
  const chemin = usePathname();
  const recherche = useSearchParams().toString();
  const code = chemin.split("/")[1] ?? "";
  const appli = applis.find((a) => a.code === code);
  const [ouvert, setOuvert] = useState(false);

  // L'application terrain a sa propre interface plein écran (en-tête et onglets en bas).
  if (code === "terrain") return null;

  const visible = (e: { adminSeulement?: boolean }) => !e.adminSeulement || utilisateur.estAdmin;
  const menu = (MENUS[code] ?? []).filter(visible).map((e) => (e.enfants ? { ...e, enfants: e.enfants.filter(visible) } : e));
  const principal = menu.filter((e) => e.libelle !== "Configuration");
  const configuration = menu.find((e) => e.libelle === "Configuration");

  const lien = (href: string, libelle: string, retrait = false) => {
    const actif = lienActif(href, chemin, recherche);
    return (
      <Link
        key={href}
        href={href}
        onClick={() => setOuvert(false)}
        aria-current={actif ? "page" : undefined}
        className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-[0.95rem] transition md:min-h-10 ${retrait ? "pl-9 text-[0.9rem]" : ""} ${
          actif ? "bg-papel-700 font-semibold text-white shadow-sm" : "text-gray-700 hover:bg-papel-50 hover:text-papel-800"
        }`}
      >
        {!retrait && <IconeMenu libelle={libelle} size={18} className={actif ? "text-white" : "text-gray-400"} />}
        <span className="truncate">{libelle}</span>
        {badges && (
          <Suspense fallback={null}>
            <Pastille badges={badges} href={href} />
          </Suspense>
        )}
      </Link>
    );
  };

  const groupe = (e: EntreeMenu) =>
    e.href ? (
      lien(e.href, e.libelle)
    ) : (
      <div key={e.libelle} className="mt-2">
        <div className="flex items-center gap-3 px-3 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
          <IconeMenu libelle={e.libelle} />
          {e.libelle}
        </div>
        {(e.enfants ?? []).map((l) => (
          lien(l.href, l.libelle, true)
        ))}
      </div>
    );

  const contenu = (
    <div className="flex h-full flex-col">
      <Link href="/applications" onClick={() => setOuvert(false)} className="mb-4 flex items-center gap-3 rounded-2xl p-2 hover:bg-gray-50" title="Toutes les applications">
        {appli ? <IconeAppli code={appli.code} taille={40} /> : <span className="flex size-10 items-center justify-center rounded-xl bg-papel-700 text-white"><LayoutGrid size={20} /></span>}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold text-gray-900">{appli?.libelle ?? "Papel ERP"}</span>
          <span className="block text-xs text-gray-500">Changer d&apos;application</span>
        </span>
        <ChevronsUpDown size={16} className="text-gray-400" aria-hidden />
      </Link>

      <nav aria-label="Menus de l'application" className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
        {appli
          ? principal.map(groupe)
          : applis.map((a) => (
              <Link key={a.code} href={`/${a.code}`} onClick={() => setOuvert(false)} className="flex min-h-11 items-center gap-3 rounded-xl px-2 text-[0.95rem] text-gray-700 hover:bg-gray-50 md:min-h-10">
                <IconeAppli code={a.code} taille={28} />
                <span className="truncate">{a.libelle}</span>
              </Link>
            ))}
      </nav>

      {configuration && (
        <details className="mt-2 border-t border-gray-100 pt-2" open={(configuration.enfants ?? []).some((l) => lienActif(l.href, chemin, recherche))}>
          <summary className="flex min-h-10 cursor-pointer list-none items-center gap-3 rounded-xl px-3 text-[0.95rem] text-gray-600 hover:bg-gray-50">
            <Settings size={18} className="text-gray-400" aria-hidden /> Configuration
          </summary>
          {(configuration.enfants ?? []).map((l) => (
            lien(l.href, l.libelle, true)
          ))}
        </details>
      )}

      <Link
        href="/applications/lexique"
        onClick={() => setOuvert(false)}
        className="mt-2 flex min-h-10 items-center gap-3 rounded-xl px-3 text-[0.95rem] text-gray-600 hover:bg-gray-50"
      >
        <CircleHelp size={18} className="text-gray-400" aria-hidden /> Les mots expliqués
      </Link>

      <div className="mt-3 flex items-center gap-3 rounded-2xl bg-gray-50 p-2.5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-papel-700 text-sm font-bold text-white">{utilisateur.initiales}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-gray-900">{utilisateur.nomComplet}</span>
          <span className="block truncate text-xs text-gray-500">{utilisateur.roles}</span>
        </span>
        <form action={deconnexion}>
          <button className="flex size-10 items-center justify-center rounded-full text-gray-500 hover:bg-white hover:text-red-700" aria-label="Se déconnecter" title="Se déconnecter">
            <LogOut size={18} />
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {/* Ordinateur : menu fixe à gauche, dans une carte blanche arrondie. */}
      <aside className="sticky top-0 hidden h-screen w-[264px] shrink-0 p-3 pr-0 lg:block print:hidden">
        <div className="h-full rounded-3xl bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_32px_-16px_rgba(16,24,40,0.18)]">{contenu}</div>
      </aside>

      {/* Téléphone et tablette : barre en haut + panneau. */}
      <header className="sticky top-0 z-[1100] flex h-14 items-center gap-2 bg-papel-700 px-2 text-white shadow lg:hidden print:hidden">
        <button type="button" onClick={() => setOuvert(true)} className="relative flex size-11 items-center justify-center rounded-xl hover:bg-white/10" aria-label="Ouvrir le menu" aria-expanded={ouvert}>
          <Menu size={22} />
          {badges && appli && (
            <Suspense fallback={null}>
              <PastilleTotale badges={badges} code={appli.code} />
            </Suspense>
          )}
        </button>
        <Link href={appli ? `/${appli.code}` : "/applications"} className="flex min-w-0 flex-1 items-center gap-2 font-semibold">
          {appli && <IconeAppli code={appli.code} taille={28} contour />}
          <span className="truncate text-[1.05rem]">{appli?.libelle ?? "Papel ERP"}</span>
        </Link>
        <Link href="/applications" className="flex size-11 items-center justify-center rounded-xl hover:bg-white/10" aria-label="Toutes les applications">
          <LayoutGrid size={20} />
        </Link>
      </header>
      {ouvert && (
        <div className="fixed inset-0 z-[1200] lg:hidden print:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="Fermer le menu" onClick={() => setOuvert(false)} />
          <div className="absolute inset-y-0 left-0 w-[86%] max-w-xs bg-white p-3 shadow-xl">
            <button type="button" onClick={() => setOuvert(false)} className="absolute right-2 top-2 flex size-11 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100" aria-label="Fermer">
              <X size={20} />
            </button>
            {contenu}
          </div>
        </div>
      )}
    </>
  );
}

/** Pastille rouge d'un lien du menu (rien si zéro). */
function Pastille({ badges, href }: { badges: Promise<Record<string, number>>; href: string }) {
  const n = use(badges)[href] ?? 0;
  if (!n) return null;
  return (
    <span className="ml-auto rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white" aria-label={`${n} à traiter`}>
      {n}
    </span>
  );
}

/** Sur téléphone : total des pastilles de l'application courante, sur le bouton du menu. */
function PastilleTotale({ badges, code }: { badges: Promise<Record<string, number>>; code: string }) {
  const b = use(badges);
  const n = (b[`/${code}/alertes`] ?? 0) + (b[`/${code}/taches`] ?? 0);
  if (!n) return null;
  return (
    <span className="absolute -right-0.5 -top-0.5 min-w-5 rounded-full bg-red-600 px-1 text-center text-[0.7rem] font-bold leading-5 text-white ring-2 ring-papel-700" aria-label={`${n} à traiter`}>
      {n}
    </span>
  );
}
