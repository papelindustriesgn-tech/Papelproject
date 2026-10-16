import "server-only";
import { clientServeur } from "@/lib/supabase/serveur";

/** Paramètres utiles aux documents de vente (TVA, coordonnées de l'entreprise). */
export async function parametresVente() {
  const supabase = await clientServeur();
  const { data } = await supabase.from("parametres").select("cle, valeur").in("cle", ["tva_applicable", "tva_taux", "entreprise_nom", "entreprise_adresse", "entreprise_telephone", "entreprise_nif", "entreprise_rccm", "taux_dotation"]);
  const v = new Map((data ?? []).map((p) => [p.cle, p.valeur]));
  return {
    tva: { applicable: v.get("tva_applicable") === true, taux: Number(v.get("tva_taux") ?? 0.18) },
    tauxDotation: Number(v.get("taux_dotation") ?? 0.04),
    entreprise: {
      nom: String(v.get("entreprise_nom") ?? "Papel Industries"),
      adresse: String(v.get("entreprise_adresse") ?? ""),
      telephone: String(v.get("entreprise_telephone") ?? ""),
      nif: String(v.get("entreprise_nif") ?? ""),
      rccm: String(v.get("entreprise_rccm") ?? ""),
    },
  };
}
