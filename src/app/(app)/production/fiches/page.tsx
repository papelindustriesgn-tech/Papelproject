import type { Metadata } from "next";
import Link from "next/link";
import { ExportCsv } from "@/components/donnees/export-csv";
import { lireParam } from "@/components/donnees/filtres";
import { Badge, Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { aujourdhui, formaterDate } from "@/lib/formulaires/dates";
import { resoudrePeriode } from "@/lib/formulaires/periode";
import { libelleAlerte, minutes, pct } from "@/lib/production/affichage";
import { chargerFiches } from "@/lib/production/indicateurs";
import { nombre } from "@/lib/stocks/libelles";

export const metadata: Metadata = { title: "Fiches de poste" };

export default async function PageFiches({ searchParams }: PageProps<"/production/fiches">) {
  const sp = await searchParams;
  const p = resoudrePeriode("perso", aujourdhui(), lireParam(sp, "du") ?? resoudrePeriode("7j", aujourdhui()).du, lireParam(sp, "au") ?? aujourdhui());
  const statut = lireParam(sp, "statut");
  const fiches = (await chargerFiches({ du: p.du, au: p.au, inclureBrouillons: true }))
    .filter((f) => !statut || f.statut === statut)
    .sort((a, b) => b.date.localeCompare(a.date) || b.posteOrdre - a.posteOrdre);

  return (
    <>
      <TitrePage
        titre="Fiches de poste"
        sousTitre="Une fiche par jour, par poste et par ligne. La validation met à jour les stocks."
        action={
          <Link href="/production/fiches/nouvelle" className="min-h-11 content-center rounded-lg bg-papel-700 px-4 font-semibold text-white">
            + Nouvelle fiche
          </Link>
        }
      />
      <Carte>
        <form className="mb-3 flex flex-wrap items-end gap-2">
          <label className="flex flex-col">
            <span className="text-sm font-medium text-gray-700">Du</span>
            <input type="date" name="du" defaultValue={p.du} className="min-h-11 rounded-lg border border-gray-300 bg-white px-3" />
          </label>
          <label className="flex flex-col">
            <span className="text-sm font-medium text-gray-700">Au</span>
            <input type="date" name="au" defaultValue={p.au} className="min-h-11 rounded-lg border border-gray-300 bg-white px-3" />
          </label>
          <label className="flex flex-col">
            <span className="text-sm font-medium text-gray-700">Statut</span>
            <select name="statut" defaultValue={statut ?? ""} className="min-h-11 rounded-lg border border-gray-300 bg-white px-3">
              <option value="">Tous</option>
              <option value="brouillon">Brouillon</option>
              <option value="validee">Validée</option>
            </select>
          </label>
          <button className="min-h-11 rounded-lg bg-papel-700 px-4 font-semibold text-white">Filtrer</button>
          <ExportCsv
            nomFichier="fiches-production"
            entetes={["Date", "Poste", "Équipe", "Statut", "Papier (kg)", "Paquets", "Rendement / théorique", "Taux de perte", "Arrêts non planifiés (min)", "TRS", "Alertes"]}
            lignes={fiches.map((f) => [
              f.date, f.poste, f.equipe ?? "", f.statut, f.papierKg, f.indicateurs.paquetsBons,
              f.indicateurs.ratioRendement === null ? "" : Math.round(f.indicateurs.ratioRendement * 1000) / 10,
              f.indicateurs.tauxPerte === null ? "" : Math.round(f.indicateurs.tauxPerte * 1000) / 10,
              f.indicateurs.minutesArretNonPlanifie, f.indicateurs.trs === null ? "" : Math.round(f.indicateurs.trs * 1000) / 10,
              f.alertes.map(libelleAlerte).join(" ; "),
            ])}
          />
        </form>
        <Tableau entetes={["Date", "Poste", "Papier", "Paquets", "Rendement", "Perte", "Arrêts", "TRS", ""]}>
          {fiches.map((f) => (
            <tr key={f.id}>
              <Cellule className="whitespace-nowrap">
                <Link href={`/production/fiches/${f.id}`} className="font-semibold text-papel-800 underline">
                  {formaterDate(f.date)}
                </Link>
              </Cellule>
              <Cellule>
                {f.poste}
                {f.equipe && <span className="block text-sm text-gray-600">{f.equipe}</span>}
              </Cellule>
              <Cellule>{nombre(f.papierKg)} kg</Cellule>
              <Cellule>{nombre(f.indicateurs.paquetsBons)}</Cellule>
              <Cellule className={f.alertes.some((a) => a.type === "rendement_faible") ? "font-bold text-red-700" : ""}>{pct(f.indicateurs.ratioRendement)}</Cellule>
              <Cellule className={f.alertes.some((a) => a.type === "perte_elevee") ? "font-bold text-red-700" : ""}>{pct(f.indicateurs.tauxPerte)}</Cellule>
              <Cellule className={f.alertes.some((a) => a.type === "arret_long") ? "font-bold text-red-700" : ""}>{minutes(f.indicateurs.minutesArretNonPlanifie)}</Cellule>
              <Cellule>{pct(f.indicateurs.trs)}</Cellule>
              <Cellule>
                {f.statut === "brouillon" ? <Badge ton="alerte">Brouillon</Badge> : f.alertes.length ? <Badge ton="erreur">{f.alertes.length} alerte(s)</Badge> : <Badge ton="succes">Validée</Badge>}
              </Cellule>
            </tr>
          ))}
        </Tableau>
        {!fiches.length && <p className="py-4 text-gray-700">Aucune fiche sur cette période.</p>}
      </Carte>
    </>
  );
}
