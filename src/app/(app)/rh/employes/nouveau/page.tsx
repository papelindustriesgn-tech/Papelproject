import type { Metadata } from "next";
import { Carte, TitrePage } from "@/components/ui";
import { clientServeur } from "@/lib/supabase/serveur";
import { FormulaireEmploye } from "../../formulaires";

export const metadata: Metadata = { title: "Nouvel employé" };

export default async function NouvelEmploye() {
  const supabase = await clientServeur();
  const [{ data: departements }, { data: fonctions }, { data: contrats }] = await Promise.all([
    supabase.from("departements").select("id, libelle").eq("actif", true).order("ordre"),
    supabase.from("fonctions").select("id, libelle").eq("actif", true).order("libelle"),
    supabase.from("types_contrats").select("id, libelle").eq("actif", true).order("ordre"),
  ]);
  return (
    <>
      <TitrePage titre="Nouvel employé" fil={[{ libelle: "Employés", href: "/rh/employes" }]} sousTitre="Le matricule est attribué automatiquement." />
      <Carte>
        <FormulaireEmploye id={null} departements={departements ?? []} fonctions={fonctions ?? []} contrats={contrats ?? []} />
      </Carte>
    </>
  );
}
