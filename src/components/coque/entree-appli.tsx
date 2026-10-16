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
import { cache } from "react";
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
  absences_a_decider: async (s) => n(await s.from("absences").select("id", compter).eq("statut", "demandee")),
  presences_non_saisies: async (s, jour) => {
    const [actifs, saisies] = await Promise.all([s.from("employes").select("id", compter).eq("actif", true), s.from("presences").select("employe_id", compter).eq("jour", jour)]);
    return n(actifs) > 0 && n(saisies) === 0 ? 1 : 0;
  },
  contrats_echeance: async (s, jour) => {
    const { rh_alerte_fin_contrat_jours } = await lireSeuils({ rh_alerte_fin_contrat_jours: 30 });
    const limite = new Date(Date.parse(`${jour}T00:00:00Z`) + rh_alerte_fin_contrat_jours * 86_400_000).toISOString().slice(0, 10);
    return n(await s.from("employes").select("id", compter).eq("actif", true).gte("date_fin_contrat", jour).lte("date_fin_contrat", limite));
  },
  paie_a_valider: async (s, jour) => {
    const d = new Date(`${jour.slice(0, 7)}-01T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() - 1);
    const mois = d.toISOString().slice(0, 10);
    const [actifs, { data }] = await Promise.all([s.from("employes").select("id", compter).eq("actif", true), s.from("periodes_paie").select("statut").eq("mois", mois).maybeSingle()]);
    return n(actifs) > 0 && data?.statut !== "validee" ? 1 : 0;
  },
  absents_du_jour: async (s, jour) => n(await s.from("presences").select("employe_id", compter).eq("jour", jour).eq("statut", "absent")),
  factures_fournisseurs_a_payer: async (s) => n(await s.from("factures_fournisseurs_etat").select("id", compter).gt("solde_gnf", 0)),
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
 * Haut de la vue d'ensemble : « À traiter maintenant » — seulement ce qui attend, l'urgent d'abord, chaque carte
 * ouvre l'écran où le traiter. Contenu réglé par l'administrateur (Administration › Réglages des services).
 */
export async function UrgencesAppli({ espace }: { espace: string }) {
  const { taches, aDesTaches, peutRegler } = await chargerEntree(espace);
  if (!aDesTaches && !peutRegler) return null;
  return (
    <section aria-label="À traiter maintenant" className="mb-4 print:hidden">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">À traiter maintenant</h2>
        {peutRegler && (
          <Link href={`/admin/reglages/${espace}`} className="flex min-h-9 items-center gap-1 rounded px-2 text-sm font-semibold text-papel-700 hover:bg-papel-50">
            <Settings size={16} /> Régler cette page
          </Link>
        )}
      </div>
      {taches.length ? (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {taches.map((t) => (
            <li key={t.id}>
              <Link
                href={t.ecran}
                className={`ombre-carte flex h-full min-h-16 items-center gap-3 rounded-2xl px-4 py-3 transition hover:-translate-y-0.5 hover:shadow-lg ${t.urgent ? "bg-red-50 ring-1 ring-red-200" : "bg-white"}`}
              >
                <span className={`flex h-11 min-w-11 shrink-0 items-center justify-center rounded-full px-2 text-lg font-bold ${t.urgent ? "bg-red-600 text-white" : "bg-papel-100 text-papel-800"}`}>{t.nombre}</span>
                <span className="min-w-0 flex-1">
                  {t.urgent && (
                    <span className="mb-0.5 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-red-700">
                      <AlertTriangle size={12} aria-hidden /> Urgent
                    </span>
                  )}
                  <span className="block font-semibold leading-snug text-gray-900">{t.libelle}</span>
                </span>
                <ChevronRight size={20} className="shrink-0 text-gray-400" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="ombre-carte flex items-center gap-2 rounded-2xl bg-green-50 px-4 py-3 font-semibold text-green-800">
          <CheckCircle2 size={20} /> {aDesTaches ? "Rien en attente : tout est à jour." : "Aucune ligne « À traiter » choisie : réglez cette page."}
        </p>
      )}
    </section>
  );
}

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
