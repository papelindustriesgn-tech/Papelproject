"use client";

import {
  AlertTriangle,
  ArrowRight,
  ArrowLeftRight,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Download,
  Factory,
  FilePlus2,
  FileSpreadsheet,
  FileText,
  type LucideIcon,
  Map,
  MapPin,
  PackageCheck,
  PackagePlus,
  Receipt,
  ScanSearch,
  Settings,
  Ship,
  ShoppingCart,
  Truck,
  UserPlus,
  Wallet,
  Warehouse,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PARCOURS, PROMESSES } from "@/lib/navigation/guides";
import { ACTIONS_RAPIDES } from "@/lib/navigation/menus";

const ICONES_ACTIONS: Record<string, LucideIcon> = {
  rapport: FileText,
  ventes: Receipt,
  stock: Warehouse,
  argent: Wallet,
  reception: PackagePlus,
  mouvement: ArrowLeftRight,
  inventaire: ClipboardList,
  panier: ShoppingCart,
  fiche: ClipboardList,
  panne: Wrench,
  alerte: AlertTriangle,
  usine: Factory,
  facture: Receipt,
  devis: FilePlus2,
  client: UserPlus,
  carte: Map,
  calendrier: CalendarDays,
  visite: MapPin,
  bateau: Ship,
  camion: Truck,
  controle: ClipboardCheck,
  recherche: ScanSearch,
  export: Download,
  excel: FileSpreadsheet,
  reglages: Settings,
  livre: PackageCheck,
};

/**
 * Entrée d'une application, pensée pour ne pas faire réfléchir :
 * une phrase qui dit à quoi elle sert, UN bouton principal (le geste le plus courant),
 * les autres gestes en plus petit, et le parcours du travail étape par étape.
 */
export function ActionsRapides() {
  const chemin = usePathname();
  const code = chemin.split("/")[1] ?? "";
  const actions = ACTIONS_RAPIDES[code];
  if (!actions || chemin !== `/${code}`) return null;
  const [principale, ...autres] = actions;
  const IconePrincipale = ICONES_ACTIONS[principale.icone] ?? FileText;
  const parcours = PARCOURS[code];
  return (
    <section aria-label="Que voulez-vous faire ?" className="mb-4 flex flex-col gap-3 print:hidden">
      {PROMESSES[code] && <p className="text-[1.05rem] text-gray-700">{PROMESSES[code]}</p>}
      <div className="flex flex-col gap-2 md:flex-row md:items-stretch">
        <Link
          href={principale.href}
          className="flex min-h-16 items-center gap-3 rounded-xl bg-papel-700 px-4 py-3 text-white shadow-sm transition hover:bg-papel-800 active:scale-[0.99] md:min-w-80"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-white/15">
            <IconePrincipale size={24} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-bold leading-tight">{principale.libelle}</span>
            <span className="block text-sm text-white/80">{principale.description}</span>
          </span>
          <ArrowRight size={22} className="shrink-0" />
        </Link>
        {autres.length > 0 && (
          <ul className="grid grid-cols-2 gap-2 md:flex md:flex-1 md:flex-wrap" aria-label="Autres actions">
            {autres.map((a) => {
              const Icone = ICONES_ACTIONS[a.icone] ?? FileText;
              return (
                <li key={a.href} className="md:flex-1">
                  <Link
                    href={a.href}
                    title={a.description}
                    className="flex h-full min-h-12 items-center gap-2 rounded-xl border border-papel-200 bg-white px-3 py-2 font-semibold leading-tight text-gray-900 hover:border-papel-500 hover:bg-papel-50 active:scale-[0.98]"
                  >
                    <Icone size={18} className="shrink-0 text-papel-700" />
                    <span className="min-w-0 [hyphens:auto]" lang="fr">{a.libelle}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {parcours && (
        <nav aria-label="Comment ça marche" className="-mx-3 overflow-x-auto px-3 md:mx-0 md:px-0">
          <ol className="flex w-max items-center gap-1 text-sm">
            <li className="mr-1 font-semibold uppercase tracking-wide text-gray-500">Comment ça marche :</li>
            {parcours.map((e, i) => (
              <li key={e.libelle} className="flex items-center gap-1">
                {i > 0 && <ChevronRight size={16} className="text-gray-400" />}
                <Link href={e.href} className="flex min-h-9 items-center gap-1.5 rounded-full bg-papel-50 px-3 font-semibold text-papel-800 hover:bg-papel-100">
                  <span className="flex size-5 items-center justify-center rounded-full bg-papel-700 text-xs text-white">{i + 1}</span>
                  {e.libelle}
                </Link>
              </li>
            ))}
          </ol>
        </nav>
      )}
    </section>
  );
}
