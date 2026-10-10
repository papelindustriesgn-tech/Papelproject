import type { Metadata } from "next";
import { Carte, TitrePage } from "@/components/ui";
import { aujourdhui } from "@/lib/formulaires/dates";
import { clientServeur } from "@/lib/supabase/serveur";
import { FormulaireFacture } from "./formulaire";

export const metadata: Metadata = { title: "Nouvelle facture fournisseur" };

export default async function NouvelleFacture() {
  const supabase = await clientServeur();
  const [{ data: fournisseurs }, { data: categories }] = await Promise.all([
    supabase.from("fournisseurs").select("id, nom").eq("actif", true).order("nom"),
    supabase.from("categories_charges").select("id, libelle, nature").eq("actif", true).order("ordre"),
  ]);
  const natures: Record<string, string> = { stock: "stocké", variable: "variable", fixe: "fixe" };
  return (
    <>
      <TitrePage
        fil={[{ libelle: "Fournisseurs et charges", href: "/finance/fournisseurs" }]} titre="Nouvelle facture fournisseur" />
      <Carte>
        <FormulaireFacture
          dateDuJour={aujourdhui()}
          fournisseurs={(fournisseurs ?? []).map((f) => ({ id: f.id, libelle: f.nom }))}
          categories={(categories ?? []).map((c) => ({ id: c.id, libelle: `${c.libelle} (${natures[c.nature]})` }))}
        />
      </Carte>
    </>
  );
}
