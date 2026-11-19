import "server-only";
import { chargerCoordination } from "@/lib/coordination/charger";
import { exigerDonnees, lireTout } from "@/lib/donnees/resultat";
import { etatProduction, etatTresorerie, margeAffichable, type EtatDonnee } from "@/lib/metier/chiffres";
import { clientServeur } from "@/lib/supabase/serveur";

/** Ce qui manque pour que les chiffres du PDG soient complets, avec l'écran où le saisir. */
export interface DonneeACompleter {
  texte: string;
  action: string;
  lien: string;
  nombre?: number;
}

export interface ComplementsPdg {
  tresorerie: ReturnType<typeof etatTresorerie> | null;
  marge: ReturnType<typeof margeAffichable> | null;
  production: ReturnType<typeof etatProduction> | null;
  commandes: { nombre: number; paquetsRestants: number; enRetard: number; sansDate: number } | null;
  stock: { produit: string; conditionnement: string; paquetsParColis: number; disponible: number; physique: number }[] | null;
  /** Date (ISO) de la dernière saisie qui alimente chaque chiffre. */
  majs: { facture: string | null; paiement: string | null; mouvement: string | null; fiche: string | null };
  aCompleter: DonneeACompleter[];
}

const derniere = async (r: PromiseLike<{ data: Record<string, string | null> | null; error: unknown }>, col: string) => {
  const { data } = await r;
  return (data?.[col] as string | null) ?? null;
};

/**
 * Compléments du tableau de bord du PDG pour une période. Chaque partie est lue à part : une lecture en échec
 * rend cette partie « Indisponible » (null), sans cacher les autres et sans jamais afficher 0 à la place.
 */
export async function chargerComplementsPdg(du: string, au: string, jour: string, fichesPeriode: number): Promise<ComplementsPdg> {
  const s = await clientServeur();
  const compter = { count: "exact" as const, head: true };
  const [verifs, ventesPf, fichesTotal, coordination, suivis, majs, sansPrix, charges, objectifs, cadences] = await Promise.allSettled([
    s.from("derniers_rapprochements").select("compte_id, libelle, date_releve").then((r) => exigerDonnees(r, "les vérifications de caisse")),
    lireTout(() => s.from("mouvements_stock").select("quantite, valeur_gnf, articles!inner(famille)").eq("articles.famille", "produit_fini").in("type", ["vente", "dotation"]).gte("date_operation", du).lte("date_operation", au).order("id")).then((r) =>
      exigerDonnees(r, "le coût des paquets vendus"),
    ),
    s.from("fiches_production").select("id", compter).eq("statut", "validee").then((r) => (r.error ? Promise.reject(r.error) : (r.count ?? 0))),
    chargerCoordination().then((c) => c ?? Promise.reject(new Error("coordination"))),
    lireTout(() => s.from("suivi_commandes").select("commande_id, date_confirmee").order("commande_id")).then((r) => exigerDonnees(r, "les dates promises")),
    Promise.all([
      derniere(s.from("pieces_vente").select("valide_le").eq("statut", "valide").not("valide_le", "is", null).order("valide_le", { ascending: false }).limit(1).maybeSingle(), "valide_le"),
      derniere(s.from("paiements").select("created_at").order("created_at", { ascending: false }).limit(1).maybeSingle(), "created_at"),
      derniere(s.from("mouvements_stock").select("created_at").order("created_at", { ascending: false }).limit(1).maybeSingle(), "created_at"),
      derniere(s.from("fiches_production").select("validee_le").eq("statut", "validee").order("validee_le", { ascending: false }).limit(1).maybeSingle(), "validee_le"),
    ]),
    Promise.all([s.from("produits").select("id, libelle").eq("actif", true), s.from("prix_actuels").select("produit_id").eq("niveau", "papel")]).then(([p, x]) => {
      const avecPrix = new Set((exigerDonnees(x, "les prix") ?? []).map((l) => l.produit_id));
      return (exigerDonnees(p, "les produits") ?? []).filter((l) => !avecPrix.has(l.id));
    }),
    s.from("charges_recurrentes").select("id", compter).eq("actif", true).then((r) => (r.error ? Promise.reject(r.error) : (r.count ?? 0))),
    s.from("objectifs_services").select("mois", compter).eq("mois", `${jour.slice(0, 7)}-01`).then((r) => (r.error ? Promise.reject(r.error) : (r.count ?? 0))),
    s.from("cadences_nominales").select("ligne_id", compter).then((r) => (r.error ? Promise.reject(r.error) : (r.count ?? 0))),
  ]);
  const ok = <T,>(r: PromiseSettledResult<T>): T | null => (r.status === "fulfilled" ? r.value : null);

  const v = ok(verifs);
  const tresorerie = v ? etatTresorerie(v.map((x) => ({ date: x.date_releve })), jour) : null;

  const pf = ok(ventesPf);
  const vendus = pf ? pf.reduce((t, m) => t + Math.abs(Number(m.quantite)), 0) : 0;
  const sansCout = pf ? pf.filter((m) => !Number(m.valeur_gnf)).reduce((t, m) => t + Math.abs(Number(m.quantite)), 0) : 0;
  const marge = pf ? margeAffichable(vendus, sansCout) : null;

  const total = ok(fichesTotal);
  const production = total === null ? null : etatProduction(fichesPeriode, total);

  const c = ok(coordination);
  const sv = ok(suivis);
  const promises = new Map((sv ?? []).map((x) => [x.commande_id, x.date_confirmee]));
  const commandes =
    c && sv
      ? {
          nombre: c.commandes.length,
          paquetsRestants: c.commandes.reduce((t, x) => t + x.lignes.reduce((u, l) => u + l.ligne.paquetsRestants, 0), 0),
          enRetard: c.commandes.filter((x) => (promises.get(x.id) ?? "9999") < jour).length,
          sansDate: c.commandes.filter((x) => !promises.get(x.id)).length,
        }
      : null;
  const stock = c ? c.stocks.map((x) => ({ produit: x.produit, conditionnement: x.conditionnement, paquetsParColis: x.paquetsParColis, disponible: x.disponible, physique: x.physique })) : null;

  const m = ok(majs) ?? [null, null, null, null];

  // Données à compléter : chaque ligne dit ce qui manque et ouvre l'écran où le saisir.
  const aCompleter: DonneeACompleter[] = [];
  if (tresorerie && tresorerie.jamais > 0) aCompleter.push({ texte: `${tresorerie.jamais} compte(s) de caisse ou de banque jamais vérifié(s) : la trésorerie est seulement estimée`, action: "Vérifier la caisse et la banque", lien: "/finance/tresorerie", nombre: tresorerie.jamais });
  else if (tresorerie && tresorerie.enRetard > 0) aCompleter.push({ texte: `${tresorerie.enRetard} compte(s) pas vérifié(s) depuis plus de 7 jours`, action: "Vérifier la caisse et la banque", lien: "/finance/tresorerie", nombre: tresorerie.enRetard });
  if (marge?.etat === "non_renseigne" || marge?.etat === "estime")
    aCompleter.push({ texte: `${sansCout.toLocaleString("fr-FR")} paquets vendus sans coût d'achat ou de fabrication : la marge ${marge.etat === "estime" ? "est approximative" : "n'est pas affichée"}`, action: "Voir les entrées de stock", lien: "/magasin/mouvements", nombre: sansCout });
  const sp = ok(sansPrix);
  if (sp?.length) aCompleter.push({ texte: `Produit(s) sans prix de vente Papel : ${sp.map((p) => p.libelle).join(", ")}`, action: "Saisir le prix", lien: "/admin/produits", nombre: sp.length });
  if (ok(charges) === 0) aCompleter.push({ texte: "Aucune charge fixe mensuelle (salaires, électricité…) : le bénéfice et le coût complet du paquet sont incomplets", action: "Saisir les charges fixes", lien: "/finance/listes/charges-recurrentes" });
  if (ok(objectifs) === 0) aCompleter.push({ texte: "Pas d'objectif fixé pour ce mois", action: "Fixer les objectifs", lien: "/direction/objectifs" });
  if (production && production !== "pas_demarree" && ok(cadences) === 0) aCompleter.push({ texte: "Vitesse des machines non saisie : l'efficacité des machines ne peut pas être calculée", action: "Saisir les vitesses", lien: "/production/listes/cadences" });
  if (commandes?.sansDate) aCompleter.push({ texte: `${commandes.sansDate} commande(s) client sans date de livraison promise`, action: "Confirmer les dates", lien: "/ventes/commandes", nombre: commandes.sansDate });

  return { tresorerie, marge, production, commandes, stock, majs: { facture: m[0], paiement: m[1], mouvement: m[2], fiche: m[3] }, aCompleter };
}

export type { EtatDonnee };
