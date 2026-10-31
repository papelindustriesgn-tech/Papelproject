import type { SupabaseClient } from "@supabase/supabase-js";
import { choixDeListe, normaliser, type ColonneImport } from "@/lib/import/collage";
import type { Database } from "@/lib/supabase/types";

/** Colonnes du « Coller depuis Excel » des employés ; les listes (services, fonctions, contrats) viennent de l'ERP. */
export function colonnesEmployes(listes: { departements: { id: string; libelle: string }[]; fonctions: { id: string; libelle: string }[]; contrats: { id: string; libelle: string }[] }): ColonneImport[] {
  return [
    { cle: "nom", libelle: "Nom", obligatoire: true, max: 60, exemple: "Bah" },
    { cle: "prenom", libelle: "Prénom", max: 60, exemple: "Mamadou" },
    { cle: "sexe", libelle: "Sexe", type: "choix", choix: [{ valeur: "M", libelles: ["Homme", "M", "H", "Masculin"] }, { valeur: "F", libelles: ["Femme", "F", "Féminin"] }], exemple: "Homme" },
    { cle: "telephone", libelle: "Téléphone", max: 30, exemple: "+224 620 00 00 00" },
    { cle: "departement_id", libelle: "Service", type: "choix", choix: choixDeListe(listes.departements), exemple: listes.departements[0]?.libelle ?? "" },
    { cle: "fonction_id", libelle: "Fonction", type: "choix", choix: choixDeListe(listes.fonctions), exemple: listes.fonctions[0]?.libelle ?? "" },
    { cle: "type_contrat_id", libelle: "Type de contrat", type: "choix", choix: choixDeListe(listes.contrats), exemple: listes.contrats[0]?.libelle ?? "" },
    { cle: "date_embauche", libelle: "Date d'embauche", obligatoire: true, type: "date", exemple: "01/11/2026" },
    { cle: "salaire_base_gnf", libelle: "Salaire de base (GNF)", type: "montant", exemple: "1 500 000" },
    { cle: "numero_cnss", libelle: "N° CNSS", max: 30, exemple: "" },
  ];
}

/** Un employé est « déjà là » s'il a le même nom et le même prénom. */
export const DOUBLON_EMPLOYE = ["nom", "prenom"];

export async function chargerImportEmployes(supabase: SupabaseClient<Database>) {
  const [dep, fon, con, emp] = await Promise.all([
    supabase.from("departements").select("id, libelle").eq("actif", true).order("ordre"),
    supabase.from("fonctions").select("id, libelle").eq("actif", true).order("libelle"),
    supabase.from("types_contrats").select("id, libelle").eq("actif", true).order("ordre"),
    supabase.from("employes").select("nom, prenom"),
  ]);
  const erreur = dep.error ?? fon.error ?? con.error ?? emp.error;
  if (erreur) throw new Error(`Chargement impossible des listes du personnel : ${erreur.message}`);
  return {
    colonnes: colonnesEmployes({ departements: dep.data ?? [], fonctions: fon.data ?? [], contrats: con.data ?? [] }),
    existants: (emp.data ?? []).map((e) => `${normaliser(e.nom)}|${normaliser(e.prenom)}`),
  };
}
