import {
  AlertTriangle,
  ArrowLeftRight,
  ArrowRight,
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
 * Bas de la vue d'ensemble, pour ne pas faire réfléchir : phrase d'accueil, UN bouton principal (le 1er),
 * les autres en petit, et le parcours étape par étape. Réglé par l'administrateur.
 */
export async function RaccourcisAppli({ espace }: { espace: string }) {
  const { promesse, actions, etapes } = await chargerEntree(espace);
  const [principale, ...autres] = actions;
  if (!principale && !etapes.length && !promesse) return null;
  const IconePrincipale = principale ? (ICONES[principale.icone] ?? FileText) : FileText;
  return (
    <section aria-label="Que voulez-vous faire ?" className="ombre-carte mb-4 flex flex-col gap-3 rounded-2xl bg-white p-4 print:hidden md:p-5">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Que voulez-vous faire ?</h2>
        {promesse && <p className="mt-0.5 text-gray-700">{promesse}</p>}
      </div>
      {principale && (
        <div className="flex flex-col gap-2 md:flex-row md:items-stretch">
          <Link
            href={principale.ecran}
            className="flex min-h-16 items-center gap-3 rounded-2xl bg-linear-to-br from-papel-700 to-papel-500 px-4 py-3 text-white shadow-md transition hover:brightness-110 active:scale-[0.99] md:min-w-80"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-white/15">
              <IconePrincipale size={24} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-bold leading-tight">{principale.libelle}</span>
              {principale.description && <span className="block text-sm text-white/80">{principale.description}</span>}
            </span>
            <ArrowRight size={22} className="shrink-0" />
          </Link>
          {autres.length > 0 && (
            <ul className="grid grid-cols-2 gap-2 md:flex md:flex-1 md:flex-wrap" aria-label="Autres actions">
              {autres.map((a) => {
                const Icone = ICONES[a.icone] ?? FileText;
                return (
                  <li key={a.id} className="md:flex-1">
                    <Link
                      href={a.ecran}
                      title={a.description}
                      className="flex h-full min-h-12 items-center gap-2 rounded-2xl bg-gray-50 px-3 py-2 font-semibold leading-tight text-gray-900 ring-1 ring-gray-100 hover:bg-papel-50 hover:ring-papel-200 active:scale-[0.98]"
                    >
                      <Icone size={18} className="shrink-0 text-papel-700" />
                      <span className="min-w-0 [hyphens:auto]" lang="fr">
                        {a.libelle}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
      {etapes.length > 0 && (
        <nav aria-label="Comment ça marche" className="-mx-3 overflow-x-auto px-3 md:mx-0 md:px-0">
          <ol className="flex w-max items-center gap-1 text-sm">
            <li className="mr-1 font-semibold uppercase tracking-wide text-gray-500">Comment ça marche :</li>
            {etapes.map((e, i) => (
              <li key={e.id} className="flex items-center gap-1">
                {i > 0 && <ChevronRight size={16} className="text-gray-400" />}
                <Link href={e.ecran} className="flex min-h-9 items-center gap-1.5 rounded-full bg-papel-50 px-3 font-semibold text-papel-800 hover:bg-papel-100">
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
