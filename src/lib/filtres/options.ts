import "server-only";
import { cache } from "react";
import type { OptionFiltre } from "@/components/donnees/filtres";
import type { FiltresAnalyse } from "@/lib/formulaires/filtres-analyse";
import { clientServeur } from "@/lib/supabase/serveur";

/**
 * Choix proposés dans les filtres des vues d'ensemble : les gammes (table `produits`, saisie dans Admin)
 * (archivées comprises) et les commerciaux terrain (comptes ayant le rôle). Lus une fois par requête.
 * La liste des commerciaux n'est lisible (RLS) que par la Direction, le responsable commercial et la finance :
 * pour les autres, elle est vide et le filtre n'est pas affiché.
 */
export const chargerOptionsFiltres = cache(async (): Promise<{ produits: OptionFiltre[]; commerciaux: OptionFiltre[] }> => {
  const supabase = await clientServeur();
  const [{ data: produits }, { data: roles }] = await Promise.all([
    supabase.from("produits").select("id, libelle, actif").order("libelle"),
    supabase.from("utilisateur_roles").select("profils(id, nom, prenom)").eq("role", "commercial_terrain"),
  ]);
  return {
    // Une gamme archivée garde son historique (ventes, production) : elle reste proposée, après les actives.
    produits: (produits ?? [])
      .sort((a, b) => Number(b.actif) - Number(a.actif))
      .map((p) => ({ valeur: p.id, libelle: p.actif ? p.libelle : `${p.libelle} (archivé)` })),
    commerciaux: (roles ?? [])
      .filter((r) => r.profils)
      .map((r) => ({ valeur: r.profils!.id, libelle: `${r.profils!.prenom} ${r.profils!.nom}`.trim() }))
      .sort((a, b) => a.libelle.localeCompare(b.libelle, "fr")),
  };
});

/** Libellé des filtres actifs (« Petit 100 · Mamadou Diallo »), pour le sous-titre et l'impression ; "" sans filtre. */
export function decrireFiltres(f: FiltresAnalyse, options: { produits: OptionFiltre[]; commerciaux: OptionFiltre[] }): string {
  return [options.produits.find((p) => p.valeur === f.produit)?.libelle, options.commerciaux.find((c) => c.valeur === f.commercial)?.libelle].filter(Boolean).join(" · ");
}
