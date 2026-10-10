import type { Metadata } from "next";
import Link from "next/link";
import { lireParam } from "@/components/donnees/filtres";
import { SelecteurPeriode } from "@/components/donnees/selecteur-periode";
import { Badge, Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { Indicateur } from "@/components/ui/indicateur";
import { aujourdhui, formaterDate, formaterDateHeure } from "@/lib/formulaires/dates";
import { resoudrePeriode } from "@/lib/formulaires/periode";
import { chargerIndicateursMaintenance } from "@/lib/maintenance/indicateurs";
import { PRIORITES, STATUTS_INTERVENTION } from "@/lib/maintenance/libelles";
import { minutes, pct } from "@/lib/production/affichage";
import { gnf, nombre } from "@/lib/stocks/libelles";
import { clientServeur } from "@/lib/supabase/serveur";

export const metadata: Metadata = { title: "Maintenance" };

export default async function TableauDeBordMaintenance({ searchParams }: PageProps<"/maintenance">) {
  const sp = await searchParams;
  const periode = resoudrePeriode(lireParam(sp, "periode") ?? "30j", aujourdhui(), lireParam(sp, "du"), lireParam(sp, "au"));
  const supabase = await clientServeur();
  const [ind, { data: ouverts }, { data: retards }, { data: pieces }] = await Promise.all([
    chargerIndicateursMaintenance(periode),
    supabase.from("interventions_etat").select("id, numero, equipement_code, description, priorite, statut, signale_le, type_intervention").in("statut", ["demandee", "en_cours"]).order("signale_le"),
    supabase.from("echeances_preventif").select("id, libelle, equipement_code, prochaine_echeance, jours_restants").lt("jours_restants", 0).order("prochaine_echeance"),
    supabase.from("pieces_critiques_alerte").select("*"),
  ]);
  const g = ind.global;
  return (
    <>
      <TitrePage titre="Maintenance" sousTitre="Fiabilité du parc, ordres de travail et pièces de rechange" />
      <SelecteurPeriode periode={periode} />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicateur libelle="Pannes (arrêt machine)" valeur={nombre(g.nbPannes)} detail={`${minutes(g.heuresArret * 60)} d'arrêt au total`} />
        <Indicateur libelle="Disponibilité" valeur={pct(g.disponibilite)} detail={`Sur ${nombre(g.heuresRequises)} h requises`} ton={g.disponibilite !== null && g.disponibilite < 0.95 ? "alerte" : "normal"} />
        <Indicateur libelle="MTBF" valeur={g.mtbfHeures === null ? "—" : `${nombre(g.mtbfHeures, 0)} h`} detail="Temps moyen entre deux pannes" />
        <Indicateur libelle="MTTR" valeur={g.mttrMinutes === null ? "—" : minutes(g.mttrMinutes)} detail="Temps moyen de réparation" />
        <Indicateur libelle="Coût de maintenance" valeur={gnf(ind.coutTotalGnf)} detail="Main-d'œuvre, prestataires, pièces" />
        <Indicateur libelle="Part du préventif" valeur={pct(ind.partPreventif)} detail={`${ind.nbInterventions} intervention(s) terminée(s)`} />
        <Indicateur libelle="Préventifs en retard" valeur={nombre(retards?.length ?? 0)} ton={(retards?.length ?? 0) > 0 ? "alerte" : "normal"} />
        <Indicateur libelle="Pièces critiques en alerte" valeur={nombre(pieces?.length ?? 0)} ton={(pieces?.length ?? 0) > 0 ? "danger" : "normal"} />
      </div>
      <div className="flex flex-col gap-4">
        <Carte titre={`Ordres de travail ouverts (${ouverts?.length ?? 0})`}>
          <Tableau entetes={["OT", "Équipement", "Description", "Priorité", "Signalé", "Statut"]}>
            {(ouverts ?? []).map((o) => (
              <tr key={o.id}>
                <Cellule><Link href={`/maintenance/interventions/${o.id}`} className="font-mono font-semibold text-papel-700 hover:underline">{o.numero}</Link></Cellule>
                <Cellule>{o.equipement_code}</Cellule>
                <Cellule className="text-sm">{o.description}</Cellule>
                <Cellule><Badge ton={PRIORITES[o.priorite!].ton}>{PRIORITES[o.priorite!].libelle}</Badge></Cellule>
                <Cellule className="whitespace-nowrap">{formaterDateHeure(o.signale_le!)}</Cellule>
                <Cellule><Badge ton={STATUTS_INTERVENTION[o.statut!].ton}>{STATUTS_INTERVENTION[o.statut!].libelle}</Badge></Cellule>
              </tr>
            ))}
          </Tableau>
        </Carte>
        {retards && retards.length > 0 && (
          <Carte titre="Préventifs en retard">
            <Tableau entetes={["Équipement", "Opération", "Échéance", "Retard"]}>
              {retards.map((r) => (
                <tr key={r.id}>
                  <Cellule>{r.equipement_code}</Cellule>
                  <Cellule>{r.libelle}</Cellule>
                  <Cellule>{formaterDate(r.prochaine_echeance)}</Cellule>
                  <Cellule className="font-semibold text-red-700">{-Number(r.jours_restants)} j</Cellule>
                </tr>
              ))}
            </Tableau>
          </Carte>
        )}
        {pieces && pieces.length > 0 && (
          <Carte titre="Pièces critiques sous le seuil">
            <Tableau entetes={["Pièce", "Stock", "Seuil", "Équipements"]}>
              {pieces.map((p) => (
                <tr key={p.article_id}>
                  <Cellule>{p.code} – {p.libelle}</Cellule>
                  <Cellule className="font-semibold text-red-700">{nombre(p.quantite)}</Cellule>
                  <Cellule>{nombre(p.seuil_alerte)}</Cellule>
                  <Cellule>{p.equipements}</Cellule>
                </tr>
              ))}
            </Tableau>
            <p className="mt-2 text-sm text-gray-700">Demandez le réapprovisionnement au service achats (Magasin → Demandes d&apos;achat).</p>
          </Carte>
        )}
        <Carte titre="Fiabilité par équipement">
          <Tableau entetes={["Équipement", "Criticité", "Pannes", "MTBF", "MTTR", "Disponibilité", "Coût"]}>
            {ind.parEquipement.map((e) => (
              <tr key={e.id}>
                <Cellule><Link href={`/maintenance/equipements/${e.id}`} className="font-medium text-papel-700 hover:underline">{e.code}</Link> {e.libelle}</Cellule>
                <Cellule>{e.criticite}</Cellule>
                <Cellule>{e.fiabilite.nbPannes}</Cellule>
                <Cellule>{e.fiabilite.mtbfHeures === null ? "—" : `${nombre(e.fiabilite.mtbfHeures, 0)} h`}</Cellule>
                <Cellule>{e.fiabilite.mttrMinutes === null ? "—" : minutes(e.fiabilite.mttrMinutes)}</Cellule>
                <Cellule>{pct(e.fiabilite.disponibilite)}</Cellule>
                <Cellule>{gnf(e.coutGnf)}</Cellule>
              </tr>
            ))}
          </Tableau>
        </Carte>
      </div>
    </>
  );
}
