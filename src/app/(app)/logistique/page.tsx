import type { Metadata } from "next";
import Link from "next/link";
import { lireParam } from "@/components/donnees/filtres";
import { SelecteurPeriode } from "@/components/donnees/selecteur-periode";
import { Badge, Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { Indicateur } from "@/components/ui/indicateur";
import { aujourdhui } from "@/lib/formulaires/dates";
import { resoudrePeriode } from "@/lib/formulaires/periode";
import { chargerBilanLogistique } from "@/lib/logistique/indicateurs";
import { STATUTS_TOURNEE } from "@/lib/logistique/libelles";
import { coutAuKm, coutParColis, tauxLivraisonReussie, tauxRetour } from "@/lib/metier/logistique";
import { pct } from "@/lib/production/affichage";
import { gnf, nombre } from "@/lib/stocks/libelles";
import { clientServeur } from "@/lib/supabase/serveur";

export const metadata: Metadata = { title: "Logistique" };

export default async function TableauDeBordLogistique({ searchParams }: PageProps<"/logistique">) {
  const sp = await searchParams;
  const jour = aujourdhui();
  const periode = resoudrePeriode(lireParam(sp, "periode") ?? "30j", jour, lireParam(sp, "du"), lireParam(sp, "au"));
  const supabase = await clientServeur();
  const [b, { data: duJour }, { count: aPlanifier }] = await Promise.all([
    chargerBilanLogistique(periode.du, periode.au),
    supabase.from("tournees_livraison_etat").select("*").or(`date_tournee.eq.${jour},statut.eq.en_cours`).neq("statut", "annulee").order("date_tournee"),
    supabase.from("livraisons").select("id", { count: "exact", head: true }).eq("statut", "validee").is("tournee_id", null).eq("statut_remise", "a_livrer"),
  ]);
  const reussite = tauxLivraisonReussie(b);

  return (
    <>
      <TitrePage titre="Logistique" sousTitre="Tournées de livraison depuis l'usine de Coyah" />
      <SelecteurPeriode periode={periode} />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicateur libelle="Bons à planifier" valeur={nombre(aPlanifier ?? 0)} detail="Bons de livraison validés sans tournée" ton={(aPlanifier ?? 0) > 0 ? "alerte" : "normal"} />
        <Indicateur libelle="Tournées" valeur={nombre(b.nbTournees)} detail={`${nombre(b.nbLivraisons)} bons de livraison`} />
        <Indicateur libelle="Livraisons réussies" valeur={pct(reussite)} detail={`${b.nbPartielles} partielle(s) · ${b.nbRefusees} refus`} ton={reussite !== null && reussite < 0.95 ? "alerte" : "normal"} />
        <Indicateur libelle="Colis livrés" valeur={nombre(b.colisLivres)} detail={`Retours : ${pct(tauxRetour(b))} des paquets chargés`} />
        <Indicateur libelle="Dépenses de tournée" valeur={gnf(b.depensesGnf)} />
        <Indicateur libelle="Coût par colis livré" valeur={coutParColis(b.depensesGnf, b.colisLivres) === null ? "—" : gnf(coutParColis(b.depensesGnf, b.colisLivres))} />
        <Indicateur libelle="Kilomètres" valeur={b.kmParcourus === null ? "—" : `${nombre(b.kmParcourus)} km`} detail={coutAuKm(b.depensesGnf, b.kmParcourus) === null ? undefined : `${gnf(coutAuKm(b.depensesGnf, b.kmParcourus))} / km`} />
      </div>
      <Carte titre="Tournées du jour et en cours">
        {duJour && duJour.length > 0 ? (
          <Tableau entetes={["Tournée", "Véhicule", "Chauffeur", "Bons", "Colis", "Statut"]}>
            {duJour.map((t) => (
              <tr key={t.id}>
                <Cellule>
                  <Link href={`/logistique/tournees/${t.id}`} className="font-mono font-semibold text-papel-700 hover:underline">{t.numero}</Link>
                </Cellule>
                <Cellule>{t.immatriculation}</Cellule>
                <Cellule>{t.chauffeur_nom}</Cellule>
                <Cellule>{t.nb_remises} / {t.nb_livraisons} remis</Cellule>
                <Cellule>{nombre(t.colis_charges)}</Cellule>
                <Cellule><Badge ton={STATUTS_TOURNEE[t.statut!].ton}>{STATUTS_TOURNEE[t.statut!].libelle}</Badge></Cellule>
              </tr>
            ))}
          </Tableau>
        ) : (
          <p className="text-gray-700">
            Aucune tournée aujourd&apos;hui. <Link href="/logistique/tournees/nouvelle" className="font-semibold text-papel-700 underline">Planifier une tournée</Link>
          </p>
        )}
      </Carte>
    </>
  );
}
