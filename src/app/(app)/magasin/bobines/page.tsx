import type { Metadata } from "next";
import { ExportCsv } from "@/components/donnees/export-csv";
import { BarreFiltres, lireParam, motifRecherche } from "@/components/donnees/filtres";
import { Badge, Bouton, Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { Indicateur } from "@/components/ui/indicateur";
import { aujourdhui, formaterDate } from "@/lib/formulaires/dates";
import { formaterPoids, kg } from "@/lib/metier/unites";
import { gnf, nombre } from "@/lib/stocks/libelles";
import { clientServeur } from "@/lib/supabase/serveur";
import type { Database } from "@/lib/supabase/types";
import { changerStatutLot } from "../actions";
import { FormulaireReception } from "./formulaire";

export const metadata: Metadata = { title: "Bobines jumbo" };

const STATUTS = [
  { valeur: "disponible", libelle: "Disponible" },
  { valeur: "bloque", libelle: "Bloquée" },
  { valeur: "epuise", libelle: "Épuisée" },
];

export default async function PageBobines({ searchParams }: PageProps<"/magasin/bobines">) {
  const sp = await searchParams;
  const q = lireParam(sp, "q");
  const statut = lireParam(sp, "statut");
  const supabase = await clientServeur();
  let requete = supabase.from("etat_lots").select("*").order("date_reception", { ascending: false }).limit(300);
  if (q) requete = requete.ilike("numero_lot", motifRecherche(q));
  if (statut) requete = requete.eq("statut", statut as Database["public"]["Enums"]["statut_lot"]);
  else requete = requete.neq("statut", "epuise");
  const [{ data }, { data: articles }, { data: fournisseurs }] = await Promise.all([
    requete,
    supabase.from("articles").select("id, libelle").eq("suivi_par_lot", true).eq("actif", true).order("libelle"),
    supabase.from("fournisseurs").select("id, nom").eq("actif", true).order("nom"),
  ]);
  const lots = data ?? [];
  const enStock = lots.filter((l) => Number(l.poids_restant_kg) > 0);
  const poids = enStock.reduce((s, l) => s + Number(l.poids_restant_kg), 0);

  return (
    <>
      <TitrePage titre="Bobines jumbo" sousTitre="Une ligne par bobine : n° de lot, poids, caractéristiques, poids restant." />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Indicateur libelle="Bobines affichées en stock" valeur={enStock.length} />
        <Indicateur libelle="Poids restant" valeur={formaterPoids(kg(poids))} />
        <Indicateur libelle="Bobines bloquées" valeur={lots.filter((l) => l.statut === "bloque").length} ton={lots.some((l) => l.statut === "bloque") ? "alerte" : "normal"} />
      </div>
      <Carte titre="Réception d'une bobine" className="mb-4">
        <FormulaireReception articles={(articles ?? []).map((a) => ({ id: a.id, libelle: a.libelle }))} fournisseurs={fournisseurs ?? []} dateDuJour={aujourdhui()} />
      </Carte>
      <Carte titre="Bobines">
        <BarreFiltres
          recherche={q}
          placeholder="N° de lot"
          valeurs={{ statut }}
          filtres={[{ nom: "statut", libelle: "Statut (par défaut : en stock)", options: STATUTS }]}
          action={
            <ExportCsv
              nomFichier="bobines"
              entetes={["N° de lot", "Article", "Fournisseur", "Reçue le", "Poids net (kg)", "Poids restant (kg)", "Grammage", "Largeur (mm)", "Diamètre (mm)", "Plis", "Coût (GNF/kg)", "Statut"]}
              lignes={lots.map((l) => [l.numero_lot, l.article_libelle, l.fournisseur_nom ?? "", l.date_reception, Number(l.poids_net_kg), Number(l.poids_restant_kg), l.grammage_g_m2 === null ? "" : Number(l.grammage_g_m2), l.largeur_mm === null ? "" : Number(l.largeur_mm), l.diametre_mm === null ? "" : Number(l.diametre_mm), l.plis ?? "", Number(l.cout_kg_gnf), l.statut])}
            />
          }
        />
        <Tableau entetes={["N° de lot", "Reçue le", "Fournisseur", "Poids net", "Reste", "Caractéristiques", "Coût/kg", "Statut", ""]}>
          {lots.map((l) => (
            <tr key={l.id}>
              <Cellule className="font-mono font-semibold">{l.numero_lot}</Cellule>
              <Cellule className="whitespace-nowrap">{formaterDate(l.date_reception)}</Cellule>
              <Cellule>{l.fournisseur_nom ?? "—"}</Cellule>
              <Cellule>{nombre(l.poids_net_kg, 1)} kg</Cellule>
              <Cellule className="font-semibold">{nombre(l.poids_restant_kg, 1)} kg</Cellule>
              <Cellule className="text-sm">
                {[l.grammage_g_m2 && `${nombre(l.grammage_g_m2, 2)} g/m²`, l.largeur_mm && `L ${nombre(l.largeur_mm)} mm`, l.diametre_mm && `Ø ${nombre(l.diametre_mm)} mm`, l.plis && `${l.plis} plis`].filter(Boolean).join(" · ")}
              </Cellule>
              <Cellule>{gnf(l.cout_kg_gnf)}</Cellule>
              <Cellule>
                {l.statut === "bloque" ? <Badge ton="erreur">Bloquée</Badge> : l.statut === "epuise" ? <Badge ton="neutre">Épuisée</Badge> : <Badge ton="succes">Disponible</Badge>}
              </Cellule>
              <Cellule>
                {l.statut !== "epuise" && (
                  <form action={changerStatutLot.bind(null, l.id!, l.statut === "bloque" ? "disponible" : "bloque")}>
                    <Bouton type="submit" variante="discret">
                      {l.statut === "bloque" ? "Débloquer" : "Bloquer"}
                    </Bouton>
                  </form>
                )}
              </Cellule>
            </tr>
          ))}
        </Tableau>
        {!lots.length && <p className="py-4 text-gray-700">Aucune bobine.</p>}
      </Carte>
    </>
  );
}
