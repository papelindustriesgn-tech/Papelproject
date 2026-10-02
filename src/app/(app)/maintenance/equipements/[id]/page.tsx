import Link from "next/link";
import { notFound } from "next/navigation";
import { lireParam } from "@/components/donnees/filtres";
import { SelecteurPeriode } from "@/components/donnees/selecteur-periode";
import { Badge, Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { Indicateur } from "@/components/ui/indicateur";
import { aujourdhui, formaterDate, formaterDateHeure } from "@/lib/formulaires/dates";
import { resoudrePeriode } from "@/lib/formulaires/periode";
import { chargerIndicateursMaintenance } from "@/lib/maintenance/indicateurs";
import { STATUTS_INTERVENTION, TYPES_INTERVENTION } from "@/lib/maintenance/libelles";
import { minutes, pct } from "@/lib/production/affichage";
import { afficherStock, gnf, nombre } from "@/lib/stocks/libelles";
import { clientServeur } from "@/lib/supabase/serveur";
import { dissocierPiece } from "../../actions";
import { FormulaireAssocierPiece } from "./formulaire";

export default async function PageEquipement({ params, searchParams }: PageProps<"/maintenance/equipements/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const periode = resoudrePeriode(lireParam(sp, "periode") ?? "trimestre", aujourdhui(), lireParam(sp, "du"), lireParam(sp, "au"));
  const supabase = await clientServeur();
  const [{ data: e }, ind, { data: historique }, { data: pieces }, { data: plans }, { data: catalogue }] = await Promise.all([
    supabase.from("equipements").select("*, lignes_production(libelle)").eq("id", id).maybeSingle(),
    chargerIndicateursMaintenance(periode),
    supabase.from("interventions_etat").select("id, numero, type_intervention, signale_le, description, duree_min, statut, arret_machine").eq("equipement_id", id).order("signale_le", { ascending: false }).limit(50),
    supabase.from("equipement_pieces").select("id, critique, articles(id, code, libelle, unite, seuil_alerte, stocks_articles(quantite))").eq("equipement_id", id),
    supabase.from("echeances_preventif").select("id, libelle, frequence_jours, prochaine_echeance").eq("equipement_id", id),
    supabase.from("articles").select("id, code, libelle").eq("famille", "piece_detachee").eq("actif", true).order("libelle"),
  ]);
  if (!e) notFound();
  const f = ind.parEquipement.find((x) => x.id === id);
  return (
    <>
      <Link href="/maintenance/equipements" className="text-papel-700 underline">← Équipements</Link>
      <TitrePage titre={`${e.code} – ${e.libelle}`} sousTitre={[e.lignes_production?.libelle, e.categorie, e.marque_modele, e.date_mise_service && `en service depuis le ${formaterDate(e.date_mise_service)}`].filter(Boolean).join(" · ")} action={<Badge ton={e.criticite === "A" ? "erreur" : e.criticite === "B" ? "alerte" : "neutre"}>Criticité {e.criticite}</Badge>} />
      <SelecteurPeriode periode={periode} />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicateur libelle="Pannes" valeur={nombre(f?.fiabilite.nbPannes ?? 0)} />
        <Indicateur libelle="MTBF" valeur={f?.fiabilite.mtbfHeures == null ? "—" : `${nombre(f.fiabilite.mtbfHeures, 0)} h`} />
        <Indicateur libelle="MTTR" valeur={f?.fiabilite.mttrMinutes == null ? "—" : minutes(f.fiabilite.mttrMinutes)} />
        <Indicateur libelle="Disponibilité" valeur={pct(f?.fiabilite.disponibilite)} detail={`Coût : ${gnf(f?.coutGnf ?? 0)}`} />
      </div>
      <div className="flex flex-col gap-4">
        <Carte titre="Pièces de rechange">
          <Tableau entetes={["Pièce", "Stock", "Seuil", "Critique", ""]}>
            {(pieces ?? []).map((p) => {
              const q = Number(p.articles?.stocks_articles?.quantite ?? 0);
              const alerte = q <= Number(p.articles?.seuil_alerte ?? 0);
              return (
                <tr key={p.id}>
                  <Cellule>{p.articles?.code} – {p.articles?.libelle}</Cellule>
                  <Cellule className={alerte ? "font-semibold text-red-700" : ""}>{afficherStock(q, p.articles?.unite ?? "unite")}</Cellule>
                  <Cellule>{nombre(p.articles?.seuil_alerte)}</Cellule>
                  <Cellule>{p.critique ? <Badge ton="erreur">Critique</Badge> : "—"}</Cellule>
                  <Cellule>
                    <form action={dissocierPiece.bind(null, p.id, id)}>
                      <button className="min-h-11 px-2 text-gray-700 underline">Retirer</button>
                    </form>
                  </Cellule>
                </tr>
              );
            })}
          </Tableau>
          <div className="mt-3">
            <FormulaireAssocierPiece equipementId={id} pieces={(catalogue ?? []).map((a) => ({ id: a.id, libelle: `${a.code} – ${a.libelle}` }))} />
          </div>
        </Carte>
        <Carte titre="Plans préventifs">
          {plans && plans.length ? (
            <ul className="list-disc pl-5">
              {plans.map((p) => (
                <li key={p.id}>{p.libelle} — tous les {p.frequence_jours} j, prochaine le {formaterDate(p.prochaine_echeance)}</li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-700">Aucun plan. <Link href="/maintenance/preventif" className="font-semibold text-papel-700 underline">Créer un plan préventif</Link></p>
          )}
        </Carte>
        <Carte titre="Historique des interventions">
          <Tableau entetes={["OT", "Date", "Type", "Description", "Arrêt", "Statut"]}>
            {(historique ?? []).map((o) => (
              <tr key={o.id}>
                <Cellule><Link href={`/maintenance/interventions/${o.id}`} className="font-mono text-papel-800 underline">{o.numero}</Link></Cellule>
                <Cellule className="whitespace-nowrap">{formaterDateHeure(o.signale_le!)}</Cellule>
                <Cellule>{TYPES_INTERVENTION[o.type_intervention!]}</Cellule>
                <Cellule className="text-sm">{o.description}</Cellule>
                <Cellule>{o.arret_machine && o.duree_min !== null ? minutes(o.duree_min) : "—"}</Cellule>
                <Cellule><Badge ton={STATUTS_INTERVENTION[o.statut!].ton}>{STATUTS_INTERVENTION[o.statut!].libelle}</Badge></Cellule>
              </tr>
            ))}
          </Tableau>
        </Carte>
      </div>
    </>
  );
}
