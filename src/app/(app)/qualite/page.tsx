import type { Metadata } from "next";
import Link from "next/link";
import { lireParam } from "@/components/donnees/filtres";
import { SelecteurPeriode } from "@/components/donnees/selecteur-periode";
import { Badge, Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { Indicateur } from "@/components/ui/indicateur";
import { aujourdhui, formaterDate } from "@/lib/formulaires/dates";
import { resoudrePeriode } from "@/lib/formulaires/periode";
import { actionsEnRetard, delaiMoyenClotureJours, tauxConformite } from "@/lib/metier/qualite";
import { pct } from "@/lib/production/affichage";
import { GRAVITES_NC, ORIGINES_NC, STATUTS_NC } from "@/lib/qualite/libelles";
import { nombre } from "@/lib/stocks/libelles";
import { clientServeur } from "@/lib/supabase/serveur";

export const metadata: Metadata = { title: "Qualité" };

export default async function TableauDeBordQualite({ searchParams }: PageProps<"/qualite">) {
  const sp = await searchParams;
  const jour = aujourdhui();
  const periode = resoudrePeriode(lireParam(sp, "periode") ?? "30j", jour, lireParam(sp, "du"), lireParam(sp, "au"));
  const supabase = await clientServeur();
  const [{ data: controles }, { data: ncPeriode }, { data: ouvertes }, { data: actions }, { data: bloquees }] = await Promise.all([
    supabase.from("controles_qualite").select("etape, resultat").gte("date_controle", periode.du).lte("date_controle", periode.au).limit(5000),
    supabase.from("non_conformites").select("date_constat, cloturee_le, origine").gte("date_constat", periode.du).lte("date_constat", periode.au).limit(5000),
    supabase.from("non_conformites").select("id, numero, date_constat, origine, gravite, description, statut").neq("statut", "cloturee").order("date_constat"),
    supabase.from("actions_correctives").select("id, description, responsable, echeance, realisee_le, nc_id, non_conformites(numero)").is("realisee_le", null),
    supabase.from("etat_lots").select("id, numero_lot, poids_restant_kg, date_reception").eq("statut", "bloque").order("date_reception"),
  ]);
  const c = controles ?? [];
  const retard = actionsEnRetard(actions ?? [], jour);
  const critiques = (ouvertes ?? []).filter((n) => n.gravite === "critique").length;

  return (
    <>
      <TitrePage titre="Qualité" sousTitre="Contrôles, non-conformités et traçabilité" />
      <SelecteurPeriode periode={periode} />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicateur libelle="Conformité à réception" valeur={pct(tauxConformite(c.filter((x) => x.etape === "reception")))} detail={`${c.filter((x) => x.etape === "reception").length} contrôle(s) de bobines`} />
        <Indicateur libelle="Conformité en production" valeur={pct(tauxConformite(c.filter((x) => x.etape !== "reception")))} detail={`${c.filter((x) => x.etape !== "reception").length} contrôle(s)`} />
        <Indicateur libelle="Non-conformités ouvertes" valeur={nombre(ouvertes?.length ?? 0)} detail={`${critiques} critique(s) · ${ncPeriode?.length ?? 0} déclarée(s) sur la période`} ton={critiques > 0 ? "danger" : (ouvertes?.length ?? 0) > 0 ? "alerte" : "normal"} />
        <Indicateur libelle="Délai moyen de clôture" valeur={delaiMoyenClotureJours(ncPeriode ?? []) === null ? "—" : `${nombre(delaiMoyenClotureJours(ncPeriode ?? []), 1)} j`} detail={`Réclamations clients : ${(ncPeriode ?? []).filter((n) => n.origine === "client").length}`} />
      </div>
      <div className="flex flex-col gap-4">
        <Carte titre={`Non-conformités à traiter (${ouvertes?.length ?? 0})`}>
          <Tableau entetes={["Numéro", "Date", "Origine", "Gravité", "Description", "Statut"]}>
            {(ouvertes ?? []).map((n) => (
              <tr key={n.id}>
                <Cellule>
                  <Link href={`/qualite/non-conformites/${n.id}`} className="font-mono font-semibold text-papel-800 underline">{n.numero}</Link>
                </Cellule>
                <Cellule>{formaterDate(n.date_constat)}</Cellule>
                <Cellule>{ORIGINES_NC[n.origine]}</Cellule>
                <Cellule><Badge ton={GRAVITES_NC[n.gravite].ton}>{GRAVITES_NC[n.gravite].libelle}</Badge></Cellule>
                <Cellule className="text-sm">{n.description}</Cellule>
                <Cellule><Badge ton={STATUTS_NC[n.statut].ton}>{STATUTS_NC[n.statut].libelle}</Badge></Cellule>
              </tr>
            ))}
          </Tableau>
        </Carte>
        <Carte titre={`Actions correctives en retard (${retard.length})`}>
          {retard.length ? (
            <Tableau entetes={["NC", "Action", "Responsable", "Échéance"]}>
              {retard.map((a) => (
                <tr key={a.id}>
                  <Cellule><Link href={`/qualite/non-conformites/${a.nc_id}`} className="font-mono text-papel-800 underline">{a.non_conformites?.numero}</Link></Cellule>
                  <Cellule>{a.description}</Cellule>
                  <Cellule>{a.responsable || "—"}</Cellule>
                  <Cellule className="font-semibold text-red-700">{formaterDate(a.echeance)}</Cellule>
                </tr>
              ))}
            </Tableau>
          ) : (
            <p className="text-gray-700">Aucune action en retard.</p>
          )}
        </Carte>
        <Carte titre={`Bobines bloquées (${bloquees?.length ?? 0})`}>
          {bloquees && bloquees.length ? (
            <Tableau entetes={["Bobine", "Reçue le", "Poids restant", ""]}>
              {bloquees.map((l) => (
                <tr key={l.id}>
                  <Cellule className="font-mono">{l.numero_lot}</Cellule>
                  <Cellule>{formaterDate(l.date_reception)}</Cellule>
                  <Cellule>{nombre(l.poids_restant_kg, 1)} kg</Cellule>
                  <Cellule><Link href={`/qualite/tracabilite?q=${encodeURIComponent(l.numero_lot!)}`} className="font-semibold text-papel-700 underline">Décider</Link></Cellule>
                </tr>
              ))}
            </Tableau>
          ) : (
            <p className="text-gray-700">Aucune bobine en quarantaine.</p>
          )}
        </Carte>
      </div>
    </>
  );
}
