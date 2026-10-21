import "server-only";
import { agregerTournees, type BilanTournee } from "@/lib/metier/logistique";
import { clientServeur } from "@/lib/supabase/serveur";

/** Tournées terminées ou en cours d'une période, agrégées. */
export async function chargerBilanLogistique(du: string, au: string): Promise<BilanTournee & { nbTournees: number }> {
  const supabase = await clientServeur();
  const { data } = await supabase.from("tournees_livraison_etat").select("*").in("statut", ["en_cours", "terminee"]).gte("date_tournee", du).lte("date_tournee", au).limit(2000);
  const liste = (data ?? []).map((t) => ({
    nbLivraisons: Number(t.nb_livraisons),
    nbLivrees: Number(t.nb_livrees),
    nbPartielles: Number(t.nb_partielles),
    nbRefusees: Number(t.nb_refusees),
    paquetsCharges: Number(t.paquets_charges),
    paquetsLivres: Number(t.paquets_livres),
    colisLivres: Number(t.colis_livres),
    depensesGnf: Number(t.depenses_gnf),
    kmParcourus: t.km_parcourus === null ? null : Number(t.km_parcourus),
  }));
  return { ...agregerTournees(liste), nbTournees: liste.length };
}
