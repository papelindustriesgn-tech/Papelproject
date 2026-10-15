import type { Metadata } from "next";
import Link from "next/link";
import { RaccourcisAppli, UrgencesAppli } from "@/components/coque/entree-appli";
import { Badge, Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { ecartPoints, ecartRelatif, Indicateur, jourCourt } from "@/components/ui/indicateur";
import { aujourdhui, formaterDate } from "@/lib/formulaires/dates";
import { tauxAbsenteisme } from "@/lib/metier/rh";
import { lireSeuils } from "@/lib/parametres";
import { pct } from "@/lib/production/affichage";
import { libelleMois, nomComplet, STATUTS_PRESENCE } from "@/lib/rh/libelles";
import { gnf, nombre } from "@/lib/stocks/libelles";
import { clientServeur } from "@/lib/supabase/serveur";

export const metadata: Metadata = { title: "Ressources humaines" };

const jourMoins = (jour: string, n: number) => new Date(Date.parse(`${jour}T00:00:00Z`) - n * 86_400_000).toISOString().slice(0, 10);

export default async function VueRh() {
  const jour = aujourdhui();
  const debut = jourMoins(jour, 29);
  const debutPrec = jourMoins(jour, 59);
  const supabase = await clientServeur();
  const { rh_alerte_fin_contrat_jours: n } = await lireSeuils({ rh_alerte_fin_contrat_jours: 30 });
  const limite = new Date(Date.parse(`${jour}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
  const [{ data: employes }, { data: pointages }, { data: absencesDuJour }, { count: demandes }, { data: periodes }] = await Promise.all([
    supabase.from("employes").select("id, matricule, nom, prenom, date_fin_contrat, departements(libelle), types_contrats(libelle)").eq("actif", true),
    supabase.from("presences").select("employe_id, jour, statut").gte("jour", debutPrec).lte("jour", jour).limit(50000),
    supabase.from("absences").select("employe_id").eq("statut", "approuvee").lte("du", jour).gte("au", jour),
    supabase.from("absences").select("id", { count: "exact", head: true }).eq("statut", "demandee"),
    supabase.from("periodes_paie").select("mois, statut").order("mois", { ascending: false }).limit(2),
  ]);
  const actifs = employes ?? [];
  const p = pointages ?? [];
  const duJour = p.filter((x) => x.jour === jour);
  const presents = duJour.filter((x) => x.statut === "present" || x.statut === "retard").length;
  const absentsJour = duJour.filter((x) => x.statut === "absent");
  const periode = p.filter((x) => x.jour >= debut);
  const precedente = p.filter((x) => x.jour < debut);
  const taux = tauxAbsenteisme(periode);
  const tauxPrec = tauxAbsenteisme(precedente);
  const jours = Array.from({ length: 30 }, (_, i) => jourMoins(jour, 29 - i));
  const parJour = new Map<string, { statut: string }[]>();
  for (const x of periode) parJour.set(x.jour, [...(parJour.get(x.jour) ?? []), x]);
  const echeances = actifs.filter((e) => e.date_fin_contrat && e.date_fin_contrat >= jour && e.date_fin_contrat <= limite).sort((a, b) => a.date_fin_contrat!.localeCompare(b.date_fin_contrat!));
  // Masse salariale des deux dernières paies.
  const moisPaie = (periodes ?? []).map((x) => x.mois);
  const { data: bulletins } = moisPaie.length ? await supabase.from("bulletins").select("mois, brut_gnf, cnss_employeur_gnf").in("mois", moisPaie) : { data: [] };
  const cout = (m?: string) => (m ? (bulletins ?? []).filter((b) => b.mois === m).reduce((s, b) => s + Number(b.brut_gnf) + Number(b.cnss_employeur_gnf), 0) : null);
  const parService = new Map<string, number>();
  for (const e of actifs) parService.set(e.departements?.libelle ?? "Sans service", (parService.get(e.departements?.libelle ?? "Sans service") ?? 0) + 1);
  const nomDe = new Map(actifs.map((e) => [e.id, e]));

  return (
    <>
      <TitrePage titre="Ressources humaines" sousTitre={`${actifs.length} employé(s) actif(s)`} />
      <UrgencesAppli espace="rh" />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Indicateur libelle="Effectif actif" valeur={nombre(actifs.length)} detail={[...parService.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([s, k]) => `${s} : ${k}`).join(" · ") || "—"} lien="/rh/employes" />
        <Indicateur
          libelle="Présents aujourd'hui"
          valeur={duJour.length ? `${presents} / ${actifs.length}` : "Non pointé"}
          detail={duJour.length ? `${absentsJour.length} absent(s) · ${absencesDuJour?.length ?? 0} en congé` : "Remplissez la feuille de présence"}
          ton={!duJour.length && actifs.length ? "alerte" : absentsJour.length ? "alerte" : "normal"}
          lien="/rh/presences"
        />
        <Indicateur
          libelle="Absentéisme (30 jours)"
          valeur={pct(taux)}
          variation={{ ecart: ecartPoints(taux, tauxPrec), unite: "points", hausseBonne: false }}
          tendance={jours.map((d) => ({ libelle: jourCourt(d), valeur: parJour.has(d) ? tauxAbsenteisme(parJour.get(d)!) : null }))}
          formatTendance="pct"
          detail="Jours d'absence ÷ jours pointés (congés exclus)"
          lien="/rh/presences"
        />
        <Indicateur libelle="Demandes de congé à décider" valeur={nombre(demandes ?? 0)} ton={(demandes ?? 0) > 0 ? "alerte" : "normal"} lien="/rh/absences?statut=demandee" />
        <Indicateur libelle={`Contrats qui finissent sous ${n} j`} valeur={nombre(echeances.length)} ton={echeances.length ? "alerte" : "normal"} lien="/rh/employes?contrat=echeance" />
        <Indicateur
          libelle="Coût salarial du mois"
          valeur={moisPaie[0] ? gnf(cout(moisPaie[0])!) : "—"}
          variation={moisPaie[1] ? { ecart: ecartRelatif(cout(moisPaie[0]), cout(moisPaie[1])), hausseBonne: false } : undefined}
          detail={moisPaie[0] ? `Paie de ${libelleMois(moisPaie[0])} (brut + CNSS patronale)${(periodes ?? [])[0]?.statut === "validee" ? "" : " · à valider"}` : "Aucune paie préparée"}
          lien={moisPaie[0] ? `/rh/paie/${moisPaie[0].slice(0, 7)}` : "/rh/paie"}
        />
      </div>
      <RaccourcisAppli espace="rh" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Carte titre={`Absents aujourd'hui (${absentsJour.length})`}>
          {absentsJour.length ? (
            <ul className="divide-y divide-gray-100">
              {absentsJour.map((a) => {
                const e = nomDe.get(a.employe_id);
                return (
                  <li key={a.employe_id} className="flex items-center justify-between gap-2 py-2">
                    <Link href={`/rh/employes/${a.employe_id}`} className="font-semibold text-papel-700 hover:underline">
                      {e ? nomComplet(e) : "—"}
                    </Link>
                    <Badge ton={STATUTS_PRESENCE.absent.ton}>{STATUTS_PRESENCE.absent.libelle}</Badge>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-gray-700">{duJour.length ? "Personne n'est absent sans autorisation." : "La feuille du jour n'est pas encore remplie."}</p>
          )}
        </Carte>
        <Carte titre="Contrats qui se terminent bientôt">
          {echeances.length ? (
            <Tableau entetes={["Employé", "Contrat", "Fin"]}>
              {echeances.map((e) => (
                <tr key={e.id}>
                  <Cellule>
                    <Link href={`/rh/employes/${e.id}`} className="font-semibold text-papel-700 hover:underline">
                      {nomComplet(e)}
                    </Link>
                  </Cellule>
                  <Cellule>{e.types_contrats?.libelle ?? "—"}</Cellule>
                  <Cellule className="font-semibold text-amber-800">{formaterDate(e.date_fin_contrat)}</Cellule>
                </tr>
              ))}
            </Tableau>
          ) : (
            <p className="text-gray-700">Aucun contrat ne se termine dans les {n} prochains jours.</p>
          )}
        </Carte>
      </div>
    </>
  );
}
