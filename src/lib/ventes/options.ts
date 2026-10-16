import "server-only";
import { clientServeur } from "@/lib/supabase/serveur";

/** Listes déroulantes du formulaire client. */
export async function optionsClient() {
  const supabase = await clientServeur();
  const [{ data: types }, { data: quartiers }, { data: commerciaux }] = await Promise.all([
    supabase.from("types_clients").select("id, libelle").eq("actif", true).order("ordre"),
    supabase.from("quartiers").select("id, nom, communes(nom)").order("nom"),
    supabase.from("utilisateur_roles").select("profils(id, nom, prenom)").eq("role", "commercial_terrain"),
  ]);
  return {
    types: types ?? [],
    quartiers: (quartiers ?? []).map((q) => ({ id: q.id, libelle: `${q.nom} (${q.communes?.nom ?? ""})` })),
    commerciaux: (commerciaux ?? []).filter((c) => c.profils).map((c) => ({ id: c.profils!.id, libelle: `${c.profils!.prenom} ${c.profils!.nom}` })),
  };
}
