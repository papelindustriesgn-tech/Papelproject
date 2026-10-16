import type { Metadata } from "next";
import Link from "next/link";
import { ExportCsv } from "@/components/donnees/export-csv";
import { BarreFiltres, lireParam } from "@/components/donnees/filtres";
import { Badge, Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { formaterDate } from "@/lib/formulaires/dates";
import { nomComplet, STATUTS_ABSENCE } from "@/lib/rh/libelles";
import { nombre } from "@/lib/stocks/libelles";
import { clientServeur } from "@/lib/supabase/serveur";
import { BoutonsDecision, FormulaireAbsence } from "../formulaires";

export const metadata: Metadata = { title: "Congés et absences" };

export default async function PageAbsences({ searchParams }: PageProps<"/rh/absences">) {
  const sp = await searchParams;
  const statut = lireParam(sp, "statut");
  const type = lireParam(sp, "type");
  const supabase = await clientServeur();
  let requete = supabase.from("absences").select("*, employes(id, matricule, nom, prenom), types_absences(libelle, decompte_conges, payee)").order("du", { ascending: false }).limit(300);
  if (statut) requete = requete.eq("statut", statut);
  if (type) requete = requete.eq("type_absence_id", type);
  const [{ data }, { data: employes }, { data: types }, { data: soldes }] = await Promise.all([
    requete,
    supabase.from("employes").select("id, matricule, nom, prenom").eq("actif", true).order("nom"),
    supabase.from("types_absences").select("id, libelle").eq("actif", true).order("ordre"),
    supabase.from("soldes_conges").select("employe_id, solde"),
  ]);
  const solde = new Map((soldes ?? []).map((s) => [s.employe_id, Number(s.solde)]));
  const lignes = data ?? [];
  return (
    <>
      <TitrePage titre="Congés et absences" sousTitre="Les jours comptés sont des jours ouvrables (lundi à samedi, jours fériés exclus)." />
      <Carte titre="Nouvelle demande" className="mb-4">
        <FormulaireAbsence employes={(employes ?? []).map((e) => ({ id: e.id, libelle: `${nomComplet(e)} (${e.matricule}) · solde ${nombre(solde.get(e.id) ?? 0, 1)} j` }))} types={types ?? []} />
      </Carte>
      <Carte>
        <BarreFiltres
          valeurs={{ statut, type }}
          filtres={[
            { nom: "statut", libelle: "Statut", options: Object.entries(STATUTS_ABSENCE).map(([valeur, s]) => ({ valeur, libelle: s.libelle })) },
            { nom: "type", libelle: "Type", options: (types ?? []).map((t) => ({ valeur: t.id, libelle: t.libelle })) },
          ]}
          action={
            <ExportCsv
              nomFichier="absences"
              entetes={["Matricule", "Employé", "Type", "Du", "Au", "Jours ouvrables", "Motif", "Statut"]}
              lignes={lignes.map((a) => [a.employes?.matricule ?? "", a.employes ? nomComplet(a.employes) : "", a.types_absences?.libelle ?? "", a.du, a.au, a.nb_jours, a.motif, STATUTS_ABSENCE[a.statut].libelle])}
            />
          }
        />
        <Tableau entetes={["Employé", "Type", "Période", "Jours", "Motif", "Statut"]}>
          {lignes.map((a) => (
            <tr key={a.id}>
              <Cellule>
                {a.employes && (
                  <Link href={`/rh/employes/${a.employes.id}`} className="font-semibold text-papel-700 hover:underline">
                    {nomComplet(a.employes)}
                  </Link>
                )}
              </Cellule>
              <Cellule>
                {a.types_absences?.libelle}
                {a.types_absences && !a.types_absences.payee && <span className="block text-xs text-red-700">Non payée</span>}
              </Cellule>
              <Cellule className="whitespace-nowrap">
                {formaterDate(a.du)} → {formaterDate(a.au)}
              </Cellule>
              <Cellule>{a.nb_jours}</Cellule>
              <Cellule className="text-sm">{a.motif || "—"}</Cellule>
              <Cellule>{a.statut === "demandee" ? <BoutonsDecision id={a.id} /> : <Badge ton={STATUTS_ABSENCE[a.statut].ton}>{STATUTS_ABSENCE[a.statut].libelle}</Badge>}</Cellule>
            </tr>
          ))}
        </Tableau>
        {!lignes.length && <p className="py-4 text-gray-700">Aucune absence.</p>}
      </Carte>
    </>
  );
}
