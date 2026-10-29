import type { Metadata } from "next";
import { lirePeriode } from "@/lib/formulaires/filtres-analyse";
import { lireSeuils } from "@/lib/parametres";
import { ActionsAppli } from "@/components/coque/entree-appli";
import { CarteObjectifs } from "@/components/objectifs/carte-objectifs";
import Link from "next/link";
import { SelecteurPeriode } from "@/components/donnees/selecteur-periode";
import { Badge, Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { Indicateur } from "@/components/ui/indicateur";
import { aujourdhui, formaterDateHeure } from "@/lib/formulaires/dates";
import { chargerIndicateursMaintenance } from "@/lib/maintenance/indicateurs";
import { PRIORITES, STATUTS_INTERVENTION } from "@/lib/maintenance/libelles";
import { minutes, pct } from "@/lib/production/affichage";
import { gnf, nombre } from "@/lib/stocks/libelles";
import { clientServeur } from "@/lib/supabase/serveur";

export const metadata: Metadata = { title: "Maintenance" };

export default async function TableauDeBordMaintenance({ searchParams }: PageProps<"/maintenance">) {
  const sp = await searchParams;
  const periode = lirePeriode(sp, aujourdhui());
  const supabase = await clientServeur();
  const [ind, { data: ouverts }, { data: retards }, { data: pieces }] = await Promise.all([
    chargerIndicateursMaintenance(periode),
    supabase.from("interventions_etat").select("id, numero, equipement_code, description, priorite, statut, signale_le, type_intervention").in("statut", ["demandee", "en_cours"]).order("signale_le"),
    supabase.from("echeances_preventif").select("id, libelle, equipement_code, prochaine_echeance, jours_restants").lt("jours_restants", 0).order("prochaine_echeance"),
    supabase.from("pieces_critiques_alerte").select("*"),
  ]);
  const { alerte_disponibilite_min: seuilDisponibilite } = await lireSeuils({ alerte_disponibilite_min: 0.95 });
  const g = ind.global;
  return (
    <>
      <TitrePage titre="Maintenance" sousTitre="Pannes, réparations et entretien des machines" action={<ActionsAppli espace="maintenance" />} />
      <SelecteurPeriode periode={periode} params={sp} />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicateur lien="/maintenance/interventions" libelle="Pannes (arrêt machine)" valeur={nombre(g.nbPannes)} detail={`${minutes(g.heuresArret * 60)} d'arrêt au total`} />
        <Indicateur lien="/maintenance/equipements" libelle="Disponibilité" valeur={pct(g.disponibilite)} detail={`Sur ${nombre(g.heuresRequises)} h requises`} ton={g.disponibilite !== null && g.disponibilite < seuilDisponibilite ? "alerte" : "normal"} />
        <Indicateur libelle="Temps moyen de réparation" valeur={g.mttrMinutes === null ? "—" : minutes(g.mttrMinutes)} detail={`Coût de la période : ${gnf(ind.coutTotalGnf)}`} />
        <Indicateur lien="/maintenance/preventif" libelle="Préventifs en retard" valeur={nombre(retards?.length ?? 0)} ton={(retards?.length ?? 0) > 0 ? "alerte" : "normal"} />
        <Indicateur lien="/maintenance/equipements" libelle="Pièces critiques en alerte" valeur={nombre(pieces?.length ?? 0)} ton={(pieces?.length ?? 0) > 0 ? "danger" : "normal"} />
      </div>
      <CarteObjectifs
        espace="maintenance"
        du={periode.du}
        au={periode.au}
        reels={{ disponibilite: g.disponibilite, mttr: g.mttrMinutes, part_preventif: ind.partPreventif, cout_maintenance: ind.coutTotalGnf }}
      />
      <div className="flex flex-col gap-4">
        <Carte titre={`Ordres de travail ouverts (${ouverts?.length ?? 0})`}>
          <Tableau entetes={["N° d'intervention", "Équipement", "Description", "Priorité", "Signalé", "Statut"]}>
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
      </div>
    </>
  );
}
