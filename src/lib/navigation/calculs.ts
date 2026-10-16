import "server-only";
import { lireSeuils } from "@/lib/parametres";
import type { clientServeur } from "@/lib/supabase/serveur";

type Client = Awaited<ReturnType<typeof clientServeur>>;
const compter = { count: "exact", head: true } as const;
/** Nombre de lignes d'une requête « count » (0 si elle échoue ou si les droits la masquent). */
const n = (r: { count: number | null }) => r.count ?? 0;

/**
 * Calcul de chaque indicateur « À faire » du catalogue (INDICATEURS, indicateurs.ts) : un nombre d'éléments
 * en attente, compté avec les droits de l'utilisateur (la RLS masque ce qu'il ne voit pas → 0).
 */
export const CALCULS: Record<string, (s: Client, jour: string) => Promise<number>> = {
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

