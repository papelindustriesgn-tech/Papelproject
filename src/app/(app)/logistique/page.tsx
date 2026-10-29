import type { Metadata } from "next";
import { lirePeriode } from "@/lib/formulaires/filtres-analyse";
import { lireSeuils } from "@/lib/parametres";
import { ActionsAppli } from "@/components/coque/entree-appli";
import { CarteObjectifs } from "@/components/objectifs/carte-objectifs";
import Link from "next/link";
import { SelecteurPeriode } from "@/components/donnees/selecteur-periode";
import { Badge, Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { ecartPoints, ecartRelatif, Indicateur } from "@/components/ui/indicateur";
import { aujourdhui } from "@/lib/formulaires/dates";
import { chargerBilanLogistique } from "@/lib/logistique/indicateurs";
import { STATUTS_TOURNEE } from "@/lib/logistique/libelles";
import { coutParColis, tauxLivraisonReussie, tauxRetour } from "@/lib/metier/logistique";
import { chargerIndicateursLivraison } from "@/lib/performance/charger";
import { pct } from "@/lib/production/affichage";
import { gnf, nombre } from "@/lib/stocks/libelles";
import { clientServeur } from "@/lib/supabase/serveur";

export const metadata: Metadata = { title: "Logistique" };

export default async function TableauDeBordLogistique({ searchParams }: PageProps<"/logistique">) {
  const sp = await searchParams;
  const jour = aujourdhui();
  const periode = lirePeriode(sp, jour);
  const supabase = await clientServeur();
  const [b, { data: duJour }, { count: aPlanifier }, liv, livPrec] = await Promise.all([
    chargerBilanLogistique(periode.du, periode.au),
    supabase.from("tournees_livraison_etat").select("*").or(`date_tournee.eq.${jour},statut.eq.en_cours`).neq("statut", "annulee").order("date_tournee"),
    supabase.from("livraisons").select("id", { count: "exact", head: true }).eq("statut", "validee").is("tournee_id", null).eq("statut_remise", "a_livrer"),
    chargerIndicateursLivraison(periode.du, periode.au),
    chargerIndicateursLivraison(periode.precedente.du, periode.precedente.au),
  ]);
  const { alerte_livraisons_reussies_min: seuilReussite } = await lireSeuils({ alerte_livraisons_reussies_min: 0.95 });
  const reussite = tauxLivraisonReussie(b);
  const { alerte_otif_min: seuilOtif } = await lireSeuils({ alerte_otif_min: 0.9 });

  return (
    <>
      <TitrePage titre="Logistique" sousTitre="Tournées de livraison depuis l'usine de Coyah" action={<ActionsAppli espace="logistique" />} />
      <SelecteurPeriode periode={periode} params={sp} />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicateur lien="/logistique/tournees/nouvelle" libelle="Bons à planifier" valeur={nombre(aPlanifier ?? 0)} detail="Bons de livraison validés sans tournée" ton={(aPlanifier ?? 0) > 0 ? "alerte" : "normal"} />
        <Indicateur lien="/logistique/tournees" libelle="Livraisons réussies" valeur={pct(reussite)} detail={`${b.nbPartielles} partielle(s) · ${b.nbRefusees} refus`} ton={reussite !== null && reussite < seuilReussite ? "alerte" : "normal"} />
        <Indicateur lien="/logistique/tournees" libelle="Colis livrés" valeur={nombre(b.colisLivres)} detail={`Retours : ${pct(tauxRetour(b))} des paquets chargés`} />
        <Indicateur libelle="Coût par colis livré" valeur={coutParColis(b.depensesGnf, b.colisLivres) === null ? "—" : gnf(coutParColis(b.depensesGnf, b.colisLivres))} detail={`${nombre(b.nbTournees)} tournée(s) · dépenses ${gnf(b.depensesGnf)}${b.kmParcourus === null ? "" : ` · ${nombre(b.kmParcourus)} km`}`} />
        <Indicateur
          lien="/logistique/commandes"
          libelle="Livrées à temps et complètes (OTIF)"
          valeur={pct(liv.otif)}
          variation={{ ecart: ecartPoints(liv.otif, livPrec.otif), unite: "points" }}
          detail={liv.commandes ? `${nombre(liv.otifOk)} sur ${nombre(liv.commandes)} commande(s) à échéance · promis sous ${liv.delaiPromisJours} j` : "Aucune commande arrivée à échéance"}
          ton={liv.otif !== null && liv.otif < seuilOtif ? "alerte" : "normal"}
        />
        <Indicateur
          lien="/logistique/commandes"
          libelle="Délai commande → livraison"
          valeur={liv.delaiMoyenJours === null ? "—" : `${nombre(liv.delaiMoyenJours, 1)} j`}
          variation={{ ecart: ecartRelatif(liv.delaiMoyenJours, livPrec.delaiMoyenJours), hausseBonne: false }}
          detail={liv.livreesCompletes ? `Moyenne sur ${nombre(liv.livreesCompletes)} commande(s) entièrement livrée(s)` : "Aucune commande entièrement livrée"}
        />
      </div>
      <CarteObjectifs
        espace="logistique"
        du={periode.du}
        au={periode.au}
        reels={{ colis_livres: b.colisLivres, taux_reussite: reussite, cout_par_colis: coutParColis(b.depensesGnf, b.colisLivres), otif: liv.otif, delai_livraison: liv.delaiMoyenJours }}
      />
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
