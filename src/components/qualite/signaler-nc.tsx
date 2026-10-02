import { Badge, Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { formaterDate } from "@/lib/formulaires/dates";
import { GRAVITES_NC, ORIGINES_NC, STATUTS_NC } from "@/lib/qualite/libelles";
import { clientServeur } from "@/lib/supabase/serveur";
import { FormulaireNc } from "./formulaire-nc";

/** Options des listes de rattachement d'une NC (lues avec les droits de l'utilisateur). */
export async function optionsNc() {
  const supabase = await clientServeur();
  const [{ data: types }, { data: lots }, { data: fiches }, { data: clients }] = await Promise.all([
    supabase.from("types_non_conformite").select("id, libelle").eq("actif", true).order("ordre"),
    supabase.from("lots").select("id, numero_lot").neq("statut", "epuise").order("numero_lot").limit(500),
    supabase.from("fiches_production").select("id, code_lot, date_production").not("code_lot", "is", null).order("date_production", { ascending: false }).limit(200),
    supabase.from("clients").select("id, nom").eq("actif", true).order("nom").limit(1000),
  ]);
  return {
    types: types ?? [],
    lots: (lots ?? []).map((l) => ({ id: l.id, libelle: l.numero_lot })),
    fiches: (fiches ?? []).map((f) => ({ id: f.id, libelle: `${f.code_lot} (${formaterDate(f.date_production)})` })),
    clients: (clients ?? []).map((c) => ({ id: c.id, libelle: c.nom })),
  };
}

/** Page « Signaler une non-conformité » des espaces Production, Magasin et Commercial : formulaire + NC déclarées. */
export async function SignalerNc({ espace, origine }: { espace: string; origine: string }) {
  const supabase = await clientServeur();
  const [options, { data }] = await Promise.all([
    optionsNc(),
    supabase.from("non_conformites").select("id, numero, date_constat, origine, gravite, description, statut").order("created_at", { ascending: false }).limit(50),
  ]);
  return (
    <>
      <TitrePage titre="Non-conformités" sousTitre="Signalez tout problème de qualité, de matière, de fabrication ou de réclamation client." />
      <Carte titre="Signaler une non-conformité" className="mb-4">
        <FormulaireNc espace={espace} origine={origine} {...options} />
      </Carte>
      <Carte titre="Non-conformités récentes">
        <Tableau entetes={["Numéro", "Date", "Origine", "Gravité", "Description", "Statut"]}>
          {(data ?? []).map((n) => (
            <tr key={n.id}>
              <Cellule className="font-mono">{n.numero}</Cellule>
              <Cellule>{formaterDate(n.date_constat)}</Cellule>
              <Cellule>{ORIGINES_NC[n.origine]}</Cellule>
              <Cellule><Badge ton={GRAVITES_NC[n.gravite].ton}>{GRAVITES_NC[n.gravite].libelle}</Badge></Cellule>
              <Cellule className="text-sm">{n.description}</Cellule>
              <Cellule><Badge ton={STATUTS_NC[n.statut].ton}>{STATUTS_NC[n.statut].libelle}</Badge></Cellule>
            </tr>
          ))}
        </Tableau>
      </Carte>
    </>
  );
}
