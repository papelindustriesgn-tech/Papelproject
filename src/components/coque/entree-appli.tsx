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
import { cache } from "react";
import { aujourdhui } from "@/lib/formulaires/dates";
import { CALCULS } from "@/lib/navigation/calculs";
import { clientServeur } from "@/lib/supabase/serveur";

/** Dessin de chaque code d'icône proposé dans les réglages (liste : ICONES, indicateurs.ts). */
const ICONES: Record<string, LucideIcon> = {
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

/** Chargement commun aux deux blocs d'entrée (une seule fois par page grâce à `cache`). */
const chargerEntree = cache(async (espace: string) => {
  const s = await clientServeur();
  const [{ data: accueil }, { data: elements }, { data: peutRegler }] = await Promise.all([
    s.from("accueil_espaces").select("promesse").eq("espace", espace).maybeSingle(),
    s.from("accueil_elements").select("id, genre, libelle, description, ecran, icone, indicateur, urgent, seuil").eq("espace", espace).eq("actif", true).order("ordre").order("created_at"),
    s.rpc("peut_regler_espace", { p_espace: espace }),
  ]);
  const liste = elements ?? [];
  const jour = aujourdhui();
  const taches = (
    await Promise.all(
      liste
        .filter((e) => e.genre === "tache")
        .map(async (t) => ({ ...t, nombre: CALCULS[t.indicateur ?? ""] ? await CALCULS[t.indicateur!](s, jour).catch(() => 0) : 0 })),
    )
  )
    .filter((t) => t.nombre >= t.seuil)
    .sort((a, b) => Number(b.urgent) - Number(a.urgent));
  return {
    promesse: accueil?.promesse ?? "",
    actions: liste.filter((e) => e.genre === "action"),
    etapes: liste.filter((e) => e.genre === "etape"),
    taches,
    aDesTaches: liste.some((e) => e.genre === "tache"),
    peutRegler: peutRegler === true,
  };
});

/**
 * Boutons d'action d'une vue d'ensemble, en haut à droite du titre : ce que le service fait le plus souvent,
 * en un clic. Le 1er bouton (réglé par l'administrateur, Réglages des services) est mis en avant, 2 autres au plus.
 */
export async function ActionsAppli({ espace }: { espace: string }) {
  const { actions } = await chargerEntree(espace);
  const [principale, ...autres] = actions;
  if (!principale) return null;
  const IconePrincipale = ICONES[principale.icone] ?? FileText;
  // Téléphone : bouton principal en premier sur toute la largeur, les autres côte à côte ; ordinateur : en ligne, principal à droite.
  return (
    <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
      {autres.slice(0, 2).map((a) => {
        const Icone = ICONES[a.icone] ?? FileText;
        return (
          <Link key={a.id} href={a.ecran} title={a.description} className="ombre-carte flex min-h-11 items-center gap-2 rounded-xl bg-white px-3 text-sm font-semibold leading-tight text-gray-800 hover:bg-papel-50 md:min-h-10">
            <Icone size={17} className="shrink-0 text-papel-700" aria-hidden />
            {a.libelle}
          </Link>
        );
      })}
      <Link href={principale.ecran} title={principale.description} className="order-first col-span-2 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-papel-700 px-4 text-base font-bold text-white shadow-md hover:bg-papel-800 sm:order-last sm:min-h-10 sm:text-sm">
        <IconePrincipale size={18} className="shrink-0" aria-hidden />
        {principale.libelle}
      </Link>
    </div>
  );
}
