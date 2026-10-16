import type { Metadata } from "next";
import { lireSeuils } from "@/lib/parametres";
import { RaccourcisAppli, UrgencesAppli } from "@/components/coque/entree-appli";
import Link from "next/link";
import { EtapesConteneur } from "@/components/achats/etapes";
import { Badge, Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { Indicateur } from "@/components/ui/indicateur";
import { aujourdhui, formaterDate } from "@/lib/formulaires/dates";
import { delaiJours, ecartPrix } from "@/lib/metier/achats";
import { formaterPoids, kg } from "@/lib/metier/unites";
import { pct } from "@/lib/production/affichage";
import { gnf, nombre } from "@/lib/stocks/libelles";
import { clientServeur } from "@/lib/supabase/serveur";

import { lireParam } from "@/components/donnees/filtres";
import { SelecteurPeriode } from "@/components/donnees/selecteur-periode";
import { resoudrePeriode } from "@/lib/formulaires/periode";

export const metadata: Metadata = { title: "Achats" };

export default async function TableauDeBordAchats({ searchParams }: PageProps<"/achats">) {
  const sp = await searchParams;
  const jour = aujourdhui();
  // Les conteneurs arrivent rarement : l'année en cours par défaut.
  const periode = resoudrePeriode(lireParam(sp, "periode") ?? "annee", jour, lireParam(sp, "du"), lireParam(sp, "au"), lireParam(sp, "mois"));
  const supabase = await clientServeur();
  const [{ data: couts }, { data: transit }, { data: conteneurs }, { count: demandes }] = await Promise.all([
    supabase.from("couts_conteneurs").select("*"),
    supabase.from("transit").select("*").maybeSingle(),
    supabase.from("conteneurs").select("*, bons_commande(numero, fournisseurs(nom))").neq("statut", "livre").order("date_livraison_prevue"),
    supabase.from("demandes_achat").select("id", { count: "exact", head: true }).eq("statut", "soumise"),
  ]);
  const { alerte_ecart_cout_achat: seuilEcart } = await lireSeuils({ alerte_ecart_cout_achat: 0.05 });
  // Conteneurs livrés à l'usine pendant la période choisie.
  const livres = (couts ?? []).filter((c) => c.statut === "livre" && c.date_livraison_reelle && c.date_livraison_reelle >= periode.du && c.date_livraison_reelle <= periode.au);
  const kgLivres = livres.reduce((s, c) => s + Number(c.poids_net_prevu_kg), 0);
  const coutTotal = livres.reduce((s, c) => s + Number(c.marchandise_gnf) + Number(c.frais_gnf), 0);
  const coutTonne = kgLivres > 0 ? (coutTotal / kgLivres) * 1000 : null;
  const prevuTotal = livres.reduce((s, c) => s + Number(c.cout_kg_prevu_gnf ?? 0) * Number(c.poids_net_prevu_kg), 0);
  const delais = livres.filter((c) => c.date_livraison_reelle).map((c) => delaiJours(c.date_commande!, c.date_livraison_reelle!));

  return (
    <>
      <TitrePage titre="Achats et approvisionnement" />
      <UrgencesAppli espace="achats" />
      <SelecteurPeriode periode={periode} params={sp} />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicateur lien="/achats/conteneurs" libelle="En transit" valeur={formaterPoids(kg(Number(transit?.kg_en_transit ?? 0)))} detail={`${transit?.nb_conteneurs ?? 0} conteneur(s) non livré(s)`} />
        <Indicateur lien="/achats/conteneurs" libelle="Coût réel par tonne (livrés sur la période)" valeur={coutTonne === null ? "—" : gnf(coutTonne)} detail="Prix + fret + transit + douane + transport" />
        <Indicateur lien="/achats/conteneurs" libelle="Écart réel / prévu" valeur={pct(ecartPrix(coutTotal, prevuTotal))} ton={(ecartPrix(coutTotal, prevuTotal) ?? 0) > seuilEcart ? "alerte" : "normal"} detail="Coût complet réel vs prix commandé + frais estimés" />
        <Indicateur lien="/achats/commandes" libelle="Délai moyen fournisseur" valeur={delais.length ? `${nombre(delais.reduce((s, d) => s + d, 0) / delais.length, 0)} jours` : "—"} detail="De la commande à la livraison à l'usine" />
      </div>
      <RaccourcisAppli espace="achats" />
      {(demandes ?? 0) > 0 && (
        <p className="mb-4">
          <Link href="/achats/demandes" className="font-semibold text-papel-700 underline">
            {demandes} demande(s) d&apos;achat à traiter
          </Link>
        </p>
      )}
      <Carte titre="Conteneurs en cours">
        <ul className="divide-y divide-gray-100">
          {(conteneurs ?? []).map((c) => (
            <li key={c.id} className="py-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <Link href={`/achats/conteneurs/${c.id}`} className="font-mono font-semibold text-papel-700 hover:underline">
                  {c.reference}
                </Link>
                <span className="text-sm text-gray-700">
                  {c.bons_commande?.numero} · {c.bons_commande?.fournisseurs?.nom} · {formaterPoids(kg(Number(c.poids_net_prevu_kg)))}
                </span>
              </div>
              <EtapesConteneur conteneur={c} aujourdhui={jour} />
            </li>
          ))}
        </ul>
        {!conteneurs?.length && <p className="text-gray-700">Aucun conteneur en cours.</p>}
      </Carte>
      <Carte titre="Coût de revient des conteneurs livrés sur la période" className="mt-4">
        <Tableau entetes={["Conteneur", "Livré le", "Marchandise", "Frais", "Coût réel / kg", "Prévu / kg", "Écart"]}>
          {livres
            .sort((a, b) => (b.date_livraison_reelle ?? "").localeCompare(a.date_livraison_reelle ?? ""))
            .slice(0, 10)
            .map((c) => {
              const ecart = ecartPrix(Number(c.cout_kg_gnf), Number(c.cout_kg_prevu_gnf));
              return (
                <tr key={c.id}>
                  <Cellule className="font-mono">{c.reference}</Cellule>
                  <Cellule>{formaterDate(c.date_livraison_reelle)}</Cellule>
                  <Cellule>{gnf(c.marchandise_gnf)}</Cellule>
                  <Cellule>{gnf(c.frais_gnf)}</Cellule>
                  <Cellule className="font-semibold">{gnf(c.cout_kg_gnf)}</Cellule>
                  <Cellule>{gnf(c.cout_kg_prevu_gnf)}</Cellule>
                  <Cellule>{ecart === null ? "—" : <Badge ton={ecart > seuilEcart ? "erreur" : ecart > 0 ? "alerte" : "succes"}>{pct(ecart)}</Badge>}</Cellule>
                </tr>
              );
            })}
        </Tableau>
      </Carte>
    </>
  );
}
