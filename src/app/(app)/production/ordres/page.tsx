import type { Metadata } from "next";
import { ExportCsv } from "@/components/donnees/export-csv";
import { lireParam } from "@/components/donnees/filtres";
import { Badge, Bouton, Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { aujourdhui, formaterDate } from "@/lib/formulaires/dates";
import { paquetsVersColis, type Paquets } from "@/lib/metier/unites";
import { nombre } from "@/lib/stocks/libelles";
import { clientServeur } from "@/lib/supabase/serveur";
import type { Database } from "@/lib/supabase/types";
import { changerStatutOrdre } from "../actions";
import { FormulaireOrdre } from "./formulaire";

export const metadata: Metadata = { title: "Ordres de fabrication" };

type Statut = Database["public"]["Enums"]["statut_of"];
const STATUTS: Record<Statut, { libelle: string; ton: "info" | "alerte" | "succes" | "neutre" }> = {
  planifie: { libelle: "Planifié", ton: "info" },
  en_cours: { libelle: "En cours", ton: "alerte" },
  termine: { libelle: "Terminé", ton: "succes" },
  annule: { libelle: "Annulé", ton: "neutre" },
};

export default async function PageOrdres({ searchParams }: PageProps<"/production/ordres">) {
  const sp = await searchParams;
  const tous = lireParam(sp, "tous") === "1";
  const supabase = await clientServeur();
  let requete = supabase.from("of_avancement").select("*").order("date_debut_prevue", { ascending: false }).limit(200);
  if (!tous) requete = requete.in("statut", ["planifie", "en_cours"]);
  const [{ data: ordres }, { data: conditionnements }, { data: campagnes }, { data: lignes }] = await Promise.all([
    requete,
    supabase.from("conditionnements").select("id, libelle, produits(libelle, actif)").eq("actif", true),
    supabase.from("campagnes").select("id, libelle").eq("actif", true).order("date_debut", { ascending: false }),
    supabase.from("lignes_production").select("id, libelle").eq("actif", true).order("libelle"),
  ]);
  const lignesOf = ordres ?? [];

  return (
    <>
      <TitrePage titre="Ordres de fabrication" sousTitre="Planification par campagne. L'avancement se calcule à partir des fiches validées rattachées à l'ordre." />
      <Carte titre={tous ? "Tous les ordres" : "Ordres en cours et planifiés"} className="mb-4" action={<a href={tous ? "?" : "?tous=1"} className="text-papel-700 underline">{tous ? "Masquer les ordres clos" : "Afficher aussi les ordres clos"}</a>}>
        <div className="mb-3">
          <ExportCsv
            nomFichier="ordres-fabrication"
            entetes={["Numéro", "Campagne", "Produit", "Colis", "Visé (colis)", "Produit (colis)", "Début prévu", "Fin prévue", "Statut"]}
            lignes={lignesOf.map((o) => [o.numero, o.campagne_libelle ?? "", o.produit_libelle, o.conditionnement_libelle, o.quantite_colis, Math.floor(Number(o.paquets_produits) / (o.paquets_par_colis ?? 1)), o.date_debut_prevue, o.date_fin_prevue, STATUTS[o.statut!].libelle])}
          />
        </div>
        <Tableau entetes={["Ordre", "Produit", "Avancement", "Prévu", "Statut", ""]}>
          {lignesOf.map((o) => {
            const produits = paquetsVersColis(Number(o.paquets_produits) as Paquets, { paquetsParColis: o.paquets_par_colis ?? 1 }).colis;
            const avancement = Math.min(1, produits / (o.quantite_colis ?? 1));
            return (
              <tr key={o.id}>
                <Cellule className="font-mono font-semibold">
                  {o.numero}
                  {o.campagne_libelle && <span className="block font-sans text-sm font-normal text-gray-600">{o.campagne_libelle}</span>}
                </Cellule>
                <Cellule>
                  {o.produit_libelle} – {o.conditionnement_libelle}
                </Cellule>
                <Cellule>
                  <div className="font-semibold">
                    {nombre(produits)} / {nombre(o.quantite_colis)} colis
                  </div>
                  <div className="mt-1 h-2 w-32 overflow-hidden rounded-full bg-gray-200" role="progressbar" aria-valuenow={Math.round(avancement * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Avancement">
                    <div className="h-full rounded-full bg-papel-500" style={{ width: `${avancement * 100}%` }} />
                  </div>
                </Cellule>
                <Cellule className="whitespace-nowrap text-sm">
                  {formaterDate(o.date_debut_prevue)} → {formaterDate(o.date_fin_prevue)}
                </Cellule>
                <Cellule>
                  <Badge ton={STATUTS[o.statut!].ton}>{STATUTS[o.statut!].libelle}</Badge>
                </Cellule>
                <Cellule>
                  {(o.statut === "planifie" || o.statut === "en_cours") && (
                    <div className="flex gap-1">
                      <form action={changerStatutOrdre.bind(null, o.id!, "termine")}>
                        <Bouton type="submit" variante="discret">
                          Terminer
                        </Bouton>
                      </form>
                      <form action={changerStatutOrdre.bind(null, o.id!, "annule")}>
                        <Bouton type="submit" variante="discret">
                          Annuler
                        </Bouton>
                      </form>
                    </div>
                  )}
                </Cellule>
              </tr>
            );
          })}
        </Tableau>
        {!lignesOf.length && <p className="py-4 text-gray-700">Aucun ordre.</p>}
      </Carte>
      <Carte titre="Nouvel ordre de fabrication">
        <FormulaireOrdre
          dateDuJour={aujourdhui()}
          conditionnements={(conditionnements ?? [])
            .filter((c) => c.produits?.actif)
            .map((c) => ({ id: c.id, libelle: `${c.produits?.libelle} – ${c.libelle}` }))
            .sort((a, b) => a.libelle.localeCompare(b.libelle))}
          campagnes={campagnes ?? []}
          lignes={lignes ?? []}
        />
      </Carte>
    </>
  );
}
