import type { Metadata } from "next";
import Link from "next/link";
import { ExportCsv } from "@/components/donnees/export-csv";
import { BarreFiltres, lireParam } from "@/components/donnees/filtres";
import { Badge, Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { formaterDateHeure } from "@/lib/formulaires/dates";
import { PRIORITES, STATUTS_INTERVENTION, TYPES_INTERVENTION } from "@/lib/maintenance/libelles";
import { minutes } from "@/lib/production/affichage";
import { gnf } from "@/lib/stocks/libelles";
import { clientServeur } from "@/lib/supabase/serveur";
import { FormulaireOt } from "./formulaire";

export const metadata: Metadata = { title: "Ordres de travail" };

export default async function PageInterventions({ searchParams }: PageProps<"/maintenance/interventions">) {
  const sp = await searchParams;
  const statut = lireParam(sp, "statut");
  const type = lireParam(sp, "type");
  const equipement = lireParam(sp, "equipement");
  const supabase = await clientServeur();
  let requete = supabase.from("interventions_etat").select("*").order("signale_le", { ascending: false }).limit(300);
  if (statut) requete = requete.eq("statut", statut);
  if (type) requete = requete.eq("type_intervention", type);
  if (equipement) requete = requete.eq("equipement_id", equipement);
  const [{ data }, { data: equipements }] = await Promise.all([requete, supabase.from("equipements").select("id, code, libelle").eq("actif", true).order("code")]);
  const lignes = data ?? [];
  const optionsEq = (equipements ?? []).map((e) => ({ id: e.id, libelle: `${e.code} – ${e.libelle}` }));
  return (
    <>
      <TitrePage titre="Ordres de travail" />
      <Carte titre="Nouvel ordre de travail" className="mb-4">
        <FormulaireOt equipements={optionsEq} />
      </Carte>
      <Carte>
        <BarreFiltres
          valeurs={{ statut, type, equipement }}
          filtres={[
            { nom: "statut", libelle: "Statut", options: Object.entries(STATUTS_INTERVENTION).map(([valeur, s]) => ({ valeur, libelle: s.libelle })) },
            { nom: "type", libelle: "Type", options: Object.entries(TYPES_INTERVENTION).map(([valeur, libelle]) => ({ valeur, libelle })) },
            { nom: "equipement", libelle: "Équipement", options: optionsEq.map((e) => ({ valeur: e.id, libelle: e.libelle })) },
          ]}
          action={
            <ExportCsv
              nomFichier="ordres-de-travail"
              entetes={["OT", "Signalé le", "Équipement", "Type", "Priorité", "Description", "Arrêt machine", "Début", "Fin", "Durée (min)", "Intervenant", "Cause", "Travaux", "Main-d'œuvre (GNF)", "Externe (GNF)", "Pièces (GNF)", "Statut"]}
              lignes={lignes.map((o) => [o.numero, o.signale_le, o.equipement_code, TYPES_INTERVENTION[o.type_intervention!], PRIORITES[o.priorite!].libelle, o.description, o.arret_machine ? "oui" : "non", o.debut ?? "", o.fin ?? "", o.duree_min ?? "", o.intervenant, o.cause, o.travaux, Number(o.cout_main_oeuvre_gnf), Number(o.cout_externe_gnf), Number(o.cout_pieces_gnf), STATUTS_INTERVENTION[o.statut!].libelle])}
            />
          }
        />
        <Tableau entetes={["OT", "Signalé", "Équipement", "Type", "Description", "Arrêt", "Coût", "Statut"]}>
          {lignes.map((o) => (
            <tr key={o.id}>
              <Cellule><Link href={`/maintenance/interventions/${o.id}`} className="font-mono font-semibold text-papel-800 underline">{o.numero}</Link></Cellule>
              <Cellule className="whitespace-nowrap">{formaterDateHeure(o.signale_le!)}</Cellule>
              <Cellule>{o.equipement_code}</Cellule>
              <Cellule>{TYPES_INTERVENTION[o.type_intervention!]}</Cellule>
              <Cellule className="text-sm">{o.description}</Cellule>
              <Cellule>{o.arret_machine && o.duree_min !== null ? minutes(o.duree_min) : "—"}</Cellule>
              <Cellule>{gnf(Number(o.cout_main_oeuvre_gnf) + Number(o.cout_externe_gnf) + Number(o.cout_pieces_gnf))}</Cellule>
              <Cellule><Badge ton={STATUTS_INTERVENTION[o.statut!].ton}>{STATUTS_INTERVENTION[o.statut!].libelle}</Badge></Cellule>
            </tr>
          ))}
        </Tableau>
      </Carte>
    </>
  );
}
