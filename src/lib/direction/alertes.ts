import "server-only";
import { cache } from "react";
import { aujourdhui } from "@/lib/formulaires/dates";
import { lireSeuils } from "@/lib/parametres";
import { libelleAlerte } from "@/lib/production/affichage";
import { chargerFiches } from "@/lib/production/indicateurs";
import { clientServeur } from "@/lib/supabase/serveur";

export interface Alerte {
  gravite: "critique" | "importante";
  domaine: "Stock" | "Production" | "Ventes" | "Distribution" | "Logistique" | "Qualité" | "Maintenance";
  message: string;
  lien: string;
}

const joursAvant = (iso: string, jours: number) => new Date(Date.parse(`${iso}T00:00:00Z`) - jours * 86_400_000).toISOString().slice(0, 10);

/**
 * Alertes prioritaires de l'entreprise (« À traiter maintenant »), globales : aucun filtre ne les masque.
 * `au` : jour de référence (aujourd'hui par défaut) ; `tauxRupture` : taux déjà calculé sur la période du tableau de bord,
 * sinon calculé sur les 7 derniers jours de visites. Triées : critiques d'abord.
 */
export const chargerAlertes = cache(async (au: string = aujourdhui(), tauxRupture?: number | null): Promise<Alerte[]> => {
  const s = await lireSeuils({ alerte_impaye_jours: 30, alerte_impaye_critique_jours: 60, alerte_taux_rupture: 0.15, alerte_livraison_jours: 2 });
  const supabase = await clientServeur();
  const [alertesStock, fiches, factures, enRetard, ncCritiques, piecesCritiques, visites] = await Promise.all([
    supabase.from("alertes_stock").select("article_id, libelle, niveau_alerte, jours_couverture"),
    // Fiches validées de la veille et du jour en alerte (rendement, perte, arrêt long).
    chargerFiches({ du: joursAvant(au, 1), au }),
    supabase.from("factures_etat").select("id, numero, client_nom, solde_gnf, jours_retard").gt("solde_gnf", 0).gt("jours_retard", s.alerte_impaye_jours).order("jours_retard", { ascending: false }).limit(10),
    // Bons de livraison validés depuis plus de N jours (paramètre) et toujours pas remis au client.
    supabase.from("livraisons").select("id", { count: "exact", head: true }).eq("statut", "validee").eq("statut_remise", "a_livrer").lt("date_livraison", joursAvant(au, s.alerte_livraison_jours)),
    supabase.from("non_conformites").select("id, numero, description").eq("gravite", "critique").neq("statut", "cloturee"),
    supabase.from("pieces_critiques_alerte").select("article_id, libelle, equipements"),
    tauxRupture === undefined
      ? supabase.from("visites").select("rupture").gte("checkin_at", `${joursAvant(au, 6)}T00:00:00Z`).lte("checkin_at", `${au}T23:59:59Z`).limit(20000)
      : Promise.resolve({ data: null }),
  ]);
  const v = visites.data;
  const rupture = tauxRupture !== undefined ? tauxRupture : v && v.length ? v.filter((x) => x.rupture).length / v.length : null;

  const alertes: Alerte[] = [];
  for (const a of alertesStock.data ?? [])
    alertes.push({
      gravite: a.niveau_alerte === "couverture_faible" ? "importante" : "critique",
      domaine: "Stock",
      message:
        a.niveau_alerte === "rupture" ? `Rupture de stock : ${a.libelle}` : a.niveau_alerte === "sous_seuil" ? `${a.libelle} sous le seuil d'alerte` : `${a.libelle} : ${Number(a.jours_couverture ?? 0).toLocaleString("fr-FR")} jours de couverture`,
      lien: `/magasin/articles/${a.article_id}`,
    });
  for (const f of fiches.filter((x) => x.alertes.length))
    alertes.push({ gravite: f.alertes.some((a) => a.type === "arret_long") ? "critique" : "importante", domaine: "Production", message: `${f.poste} du ${f.date.split("-").reverse().join("/")} : ${f.alertes.map(libelleAlerte).join(", ")}`, lien: `/production/fiches/${f.id}` });
  for (const fa of factures.data ?? [])
    alertes.push({ gravite: Number(fa.jours_retard) > s.alerte_impaye_critique_jours ? "critique" : "importante", domaine: "Ventes", message: `Impayé ${fa.numero} – ${fa.client_nom} : ${Number(fa.solde_gnf).toLocaleString("fr-FR")} GNF, ${fa.jours_retard} j de retard`, lien: `/ventes/pieces/${fa.id}` });
  if ((rupture ?? 0) > s.alerte_taux_rupture)
    alertes.push({ gravite: "importante", domaine: "Distribution", message: `Taux de rupture chez les points de vente : ${Math.round((rupture ?? 0) * 100)} %`, lien: "/commercial" });
  if ((enRetard.count ?? 0) > 0)
    alertes.push({ gravite: "importante", domaine: "Logistique", message: `${enRetard.count} bon(s) de livraison validé(s) depuis plus de ${s.alerte_livraison_jours} jour(s) et non remis au client`, lien: "/logistique" });
  for (const n of ncCritiques.data ?? [])
    alertes.push({ gravite: "critique", domaine: "Qualité", message: `Non-conformité critique ${n.numero} : ${n.description}`, lien: `/qualite/non-conformites/${n.id}` });
  for (const pc of piecesCritiques.data ?? [])
    alertes.push({ gravite: "importante", domaine: "Maintenance", message: `Pièce critique sous le seuil : ${pc.libelle} (${pc.equipements})`, lien: "/maintenance" });
  return alertes.sort((a, b) => (a.gravite === b.gravite ? 0 : a.gravite === "critique" ? -1 : 1));
});
