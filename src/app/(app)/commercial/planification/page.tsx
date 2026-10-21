import type { Metadata } from "next";
import { Carte, TitrePage } from "@/components/ui";
import { aujourdhui } from "@/lib/formulaires/dates";
import { clientServeur } from "@/lib/supabase/serveur";
import { FormulaireObjectifs, FormulaireTournee } from "./formulaires";

export const metadata: Metadata = { title: "Tournées et objectifs" };

export default async function PagePlanification() {
  const jour = aujourdhui();
  const mois = `${jour.slice(0, 7)}-01`;
  const supabase = await clientServeur();
  const [{ data: roles }, { data: pva }, { data: objectifs }] = await Promise.all([
    supabase.from("utilisateur_roles").select("profils(id, nom, prenom)").eq("role", "commercial_terrain"),
    supabase.from("pva").select("id, nom, commercial_id, repere").eq("actif", true).order("nom"),
    supabase.from("objectifs_commerciaux").select("commercial_id, visites, nouveaux_pva, ca_ht_gnf, colis").eq("mois", mois),
  ]);
  const commerciaux = (roles ?? []).filter((r) => r.profils).map((r) => ({ id: r.profils!.id, nom: `${r.profils!.prenom} ${r.profils!.nom}` })).sort((a, b) => a.nom.localeCompare(b.nom));
  const libelleMois = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${mois}T00:00:00Z`));

  return (
    <>
      <TitrePage titre="Tournées et objectifs" />
      <Carte titre="Tournée d'un commercial" className="mb-4">
        <FormulaireTournee commerciaux={commerciaux} pva={(pva ?? []).map((p) => ({ id: p.id, nom: p.nom, commercialId: p.commercial_id, repere: p.repere }))} dateDuJour={jour} />
      </Carte>
      <Carte titre={`Objectifs de ${libelleMois}`}>
        {commerciaux.map((c) => (
          <FormulaireObjectifs key={c.id} commercial={c} mois={mois} valeurs={(objectifs ?? []).find((o) => o.commercial_id === c.id) ?? null} />
        ))}
      </Carte>
    </>
  );
}
