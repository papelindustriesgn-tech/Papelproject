import {
  AlertTriangle,
  ArrowLeftRight,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
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
import { aujourdhui } from "@/lib/formulaires/dates";
import { lireSeuils } from "@/lib/parametres";
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

type Client = Awaited<ReturnType<typeof clientServeur>>;
const compter = { count: "exact", head: true } as const;
/** Nombre de lignes d'une requête « count » (0 si elle échoue ou si les droits la masquent). */
const n = (r: { count: number | null }) => r.count ?? 0;

/** Calcul de chaque indicateur du catalogue (INDICATEURS, indicateurs.ts). */
const CALCULS: Record<string, (s: Client, jour: string) => Promise<number>> = {
  stock_rupture: async (s) => n(await s.from("alertes_stock").select("article_id", compter).eq("niveau_alerte", "rupture")),
  stock_sous_seuil: async (s) => n(await s.from("alertes_stock").select("article_id", compter).neq("niveau_alerte", "rupture")),
  inventaires_en_cours: async (s) => n(await s.from("inventaires").select("id", compter).eq("statut", "en_cours")),
  bobines_bloquees: async (s) => n(await s.from("lots").select("id", compter).eq("statut", "bloque")),
  fiches_brouillon: async (s) => n(await s.from("fiches_production").select("id", compter).eq("statut", "brouillon")),
  of_a_produire: async (s) => n(await s.from("ordres_fabrication").select("id", compter).in("statut", ["planifie", "en_cours"])),
  pannes_en_cours: async (s) => n(await s.from("interventions").select("id", compter).eq("type_intervention", "curative").in("statut", ["demandee", "en_cours"])),
  factures_clients_retard: async (s) => n(await s.from("factures_etat").select("id", compter).gt("solde_gnf", 0).gt("jours_retard", 0)),
  commandes_a_livrer: async (s) => {
    const { data } = await s.from("reste_a_livrer").select("commande_id").gt("paquets_restants", 0).limit(5000);
    return new Set((data ?? []).map((l) => l.commande_id)).size;
  },
  pieces_brouillon: async (s) => n(await s.from("pieces_vente").select("id", compter).eq("statut", "brouillon")),
  reclamations_ouvertes: async (s) => n(await s.from("non_conformites").select("id", compter).eq("origine", "client").neq("statut", "cloturee")),
  pva_sans_gps: async (s) => n(await s.from("pva").select("id", compter).eq("actif", true).is("position", null)),
  demandes_a_approuver: async (s) => n(await s.from("demandes_achat").select("id", compter).eq("statut", "soumise")),
  bc_brouillon: async (s) => n(await s.from("bons_commande").select("id", compter).eq("statut", "brouillon")),
  conteneurs_en_route: async (s) => n(await s.from("conteneurs").select("id", compter).neq("statut", "livre")),
  livraisons_a_planifier: async (s) => n(await s.from("livraisons").select("id", compter).eq("statut", "validee").is("tournee_id", null).eq("statut_remise", "a_livrer")),
  livraisons_en_retard: async (s, jour) => {
    const { alerte_livraison_jours } = await lireSeuils({ alerte_livraison_jours: 2 });
    const limite = new Date(Date.parse(`${jour}T00:00:00Z`) - alerte_livraison_jours * 86_400_000).toISOString().slice(0, 10);
    return n(await s.from("livraisons").select("id", compter).eq("statut", "validee").eq("statut_remise", "a_livrer").lt("date_livraison", limite));
  },
  tournees_en_cours: async (s) => n(await s.from("tournees_livraison").select("id", compter).eq("statut", "en_cours")),
  nc_ouvertes: async (s) => n(await s.from("non_conformites").select("id", compter).eq("statut", "ouverte")),
  nc_critiques: async (s) => n(await s.from("non_conformites").select("id", compter).eq("gravite", "critique").neq("statut", "cloturee")),
  actions_en_retard: async (s, jour) => n(await s.from("actions_correctives").select("id", compter).is("realisee_le", null).lt("echeance", jour)),
  controles_brouillon: async (s) => n(await s.from("controles_qualite").select("id", compter).eq("statut", "brouillon")),
  ot_demandes: async (s) => n(await s.from("interventions").select("id", compter).eq("statut", "demandee")),
  ot_en_cours: async (s) => n(await s.from("interventions").select("id", compter).eq("statut", "en_cours")),
  preventif_en_retard: async (s) => n(await s.from("echeances_preventif").select("id", compter).lte("jours_restants", 0)),
  pieces_critiques: async (s) => n(await s.from("pieces_critiques_alerte").select("article_id", compter)),
  factures_fournisseurs_retard: async (s) => n(await s.from("factures_fournisseurs_etat").select("id", compter).gt("solde_gnf", 0).gt("jours_retard", 0)),
  factures_fournisseurs_a_payer: async (s) => n(await s.from("factures_fournisseurs_etat").select("id", compter).gt("solde_gnf", 0)),
};

/**
 * Entrée d'une application, pensée pour ne pas faire réfléchir — et réglée par le service lui-même
 * (page « Réglages du service ») : phrase d'accueil, UN bouton principal (le 1er), les autres en petit,
 * le parcours étape par étape, puis « À faire aujourd'hui » (seulement ce qui attend, urgent d'abord).
 */
export async function EntreeAppli({ espace }: { espace: string }) {
  const s = await clientServeur();
  const [{ data: accueil }, { data: elements }, { data: peutRegler }] = await Promise.all([
    s.from("accueil_espaces").select("promesse").eq("espace", espace).maybeSingle(),
    s.from("accueil_elements").select("id, genre, libelle, description, ecran, icone, indicateur, urgent, seuil").eq("espace", espace).eq("actif", true).order("ordre").order("created_at"),
    s.rpc("peut_regler_espace", { p_espace: espace }),
  ]);
  const liste = elements ?? [];
  const actions = liste.filter((e) => e.genre === "action");
  const etapes = liste.filter((e) => e.genre === "etape");
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
  const [principale, ...autres] = actions;
  const IconePrincipale = principale ? (ICONES[principale.icone] ?? FileText) : FileText;
  const aDesTaches = liste.some((e) => e.genre === "tache");

  return (
    <div className="mb-4 flex flex-col gap-3 print:hidden">
      {accueil?.promesse && <p className="text-[1.05rem] text-gray-700">{accueil.promesse}</p>}
      {principale && (
        <section aria-label="Que voulez-vous faire ?" className="flex flex-col gap-2 md:flex-row md:items-stretch">
          <Link
            href={principale.ecran}
            className="flex min-h-16 items-center gap-3 rounded-xl bg-papel-700 px-4 py-3 text-white shadow-sm transition hover:bg-papel-800 active:scale-[0.99] md:min-w-80"
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
                      className="flex h-full min-h-12 items-center gap-2 rounded-xl border border-papel-200 bg-white px-3 py-2 font-semibold leading-tight text-gray-900 hover:border-papel-500 hover:bg-papel-50 active:scale-[0.98]"
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
        </section>
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
      {(aDesTaches || peutRegler) && (
        <section aria-label="À faire aujourd'hui" className="rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">À faire aujourd&apos;hui</h2>
            {peutRegler && (
              <Link href={`/${espace}/reglages`} className="flex min-h-9 items-center gap-1 rounded px-2 text-sm font-semibold text-papel-700 hover:bg-papel-50">
                <Settings size={16} /> Régler cette page
              </Link>
            )}
          </div>
          {taches.length ? (
            <ul className="divide-y divide-gray-100">
              {taches.map((t) => (
                <li key={t.id}>
                  <Link href={t.ecran} className="flex min-h-14 items-center gap-3 px-4 py-2 hover:bg-gray-50 active:bg-gray-100">
                    <span className={`flex h-9 min-w-9 shrink-0 items-center justify-center rounded-full px-2 font-bold ${t.urgent ? "bg-red-100 text-red-800" : "bg-papel-100 text-papel-800"}`}>{t.nombre}</span>
                    <span className="min-w-0 flex-1 font-semibold text-gray-900">{t.libelle}</span>
                    <ChevronRight size={20} className="shrink-0 text-gray-400" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="flex items-center gap-2 px-4 py-3 font-semibold text-green-800">
              <CheckCircle2 size={20} /> {aDesTaches ? "Rien en attente : tout est à jour." : "Aucune ligne « À faire » choisie : réglez cette page."}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
