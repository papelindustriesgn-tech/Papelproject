import "server-only";
import { normaliser, type ColonneImport } from "@/lib/import/collage";
import { clientServeur } from "@/lib/supabase/serveur";

/** Un client est « déjà là » s'il porte le même nom. */
export const DOUBLON_CLIENT = ["nom"];

/** Colonnes du « Coller depuis Excel » des clients, avec les listes de l'ERP (types, quartiers, commerciaux). */
export async function chargerImportClients() {
  const supabase = await clientServeur();
  const [types, quartiers, commerciaux, clients] = await Promise.all([
    supabase.from("types_clients").select("id, libelle").eq("actif", true).order("ordre"),
    supabase.from("quartiers").select("id, nom, communes(nom)").order("nom"),
    supabase.from("utilisateur_roles").select("profils(id, nom, prenom)").eq("role", "commercial_terrain"),
    supabase.from("clients").select("nom"),
  ]);
  const erreur = types.error ?? quartiers.error ?? commerciaux.error ?? clients.error;
  if (erreur) throw new Error(`Chargement impossible des listes clients : ${erreur.message}`);
  const typesListe = types.data ?? [];
  const colonnes: ColonneImport[] = [
    { cle: "nom", libelle: "Nom", obligatoire: true, max: 120, exemple: "Ets Diallo & Frères" },
    { cle: "type_client_id", libelle: "Type de client", obligatoire: true, type: "choix", choix: typesListe.map((t) => ({ valeur: t.id, libelles: [t.libelle] })), exemple: typesListe[0]?.libelle ?? "" },
    { cle: "responsable", libelle: "Responsable", max: 100, exemple: "Mamadou Diallo" },
    { cle: "telephone", libelle: "Téléphone", max: 30, exemple: "+224 620 00 00 00" },
    { cle: "adresse", libelle: "Adresse", max: 200, exemple: "Marché Madina" },
    {
      cle: "quartier_id",
      libelle: "Quartier",
      type: "choix",
      choix: (quartiers.data ?? []).map((q) => ({ valeur: q.id, libelles: [q.nom, `${q.nom} (${q.communes?.nom ?? ""})`] })),
      exemple: quartiers.data?.[0]?.nom ?? "",
    },
    { cle: "nif", libelle: "NIF", max: 40, exemple: "" },
    {
      cle: "commercial_id",
      libelle: "Commercial",
      type: "choix",
      choix: (commerciaux.data ?? [])
        .filter((c) => c.profils)
        .map((c) => ({ valeur: c.profils!.id, libelles: [`${c.profils!.prenom} ${c.profils!.nom}`.trim(), `${c.profils!.nom} ${c.profils!.prenom}`.trim()] })),
      exemple: "",
    },
    { cle: "condition_paiement", libelle: "Paiement", type: "choix", choix: [{ valeur: "comptant", libelles: ["Comptant", "Cash", "Espèces"] }, { valeur: "credit", libelles: ["Crédit", "A crédit", "Credit"] }], exemple: "Comptant" },
    { cle: "delai_paiement_jours", libelle: "Délai de paiement (jours)", type: "entier", exemple: "0" },
    { cle: "plafond_credit_gnf", libelle: "Plafond de crédit (GNF)", type: "montant", exemple: "0" },
  ];
  return { colonnes, existants: (clients.data ?? []).map((c) => normaliser(c.nom)) };
}
