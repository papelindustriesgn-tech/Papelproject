"use client";

import {
  AlertTriangle,
  ArrowLeftRight,
  CalendarDays,
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

/** Gros boutons des gestes courants, affichés à l'entrée de chaque application. */
export function ActionsRapides() {
  const chemin = usePathname();
  const code = chemin.split("/")[1] ?? "";
  const actions = ACTIONS_RAPIDES[code];
  if (!actions || chemin !== `/${code}`) return null;
  return (
    <section aria-label="Que voulez-vous faire ?" className="mb-4 print:hidden">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">Que voulez-vous faire ?</h2>
      <ul className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
        {actions.map((a) => {
          const Icone = ICONES_ACTIONS[a.icone] ?? FileText;
          return (
            <li key={a.href}>
              <Link
                href={a.href}
                className="flex h-full min-h-20 flex-col items-start gap-2 rounded-lg border border-papel-200 bg-white p-3 shadow-sm transition hover:border-papel-500 hover:bg-papel-50 active:scale-[0.98] md:flex-row md:items-center md:gap-3"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-papel-700 text-white">
                  <Icone size={22} />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold leading-tight text-gray-900 [hyphens:auto]" lang="fr">{a.libelle}</span>
                  <span className="mt-0.5 block text-sm leading-tight text-gray-500">{a.description}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
