import type { Metadata } from "next";
import { lireParam } from "@/components/donnees/filtres";
import { Carte, TitrePage } from "@/components/ui";
import { aujourdhui } from "@/lib/formulaires/dates";
import { JOURNAUX } from "@/lib/finance/exports";

export const metadata: Metadata = { title: "Exports comptables" };

export default async function PageExports({ searchParams }: PageProps<"/finance/exports">) {
  const sp = await searchParams;
  const jour = aujourdhui();
  // Par défaut : le mois précédent (clôture mensuelle).
  const d = new Date(`${jour.slice(0, 8)}01T00:00:00Z`);
  d.setUTCDate(0);
  const du = lireParam(sp, "du") ?? `${d.toISOString().slice(0, 8)}01`;
  const au = lireParam(sp, "au") ?? d.toISOString().slice(0, 10);
  return (
    <>
      <TitrePage titre="Exports comptables" sousTitre="Journaux au format SYSCOHADA (CSV « ; », ouvrable dans Excel et importable dans la plupart des logiciels comptables)." />
      <Carte className="mb-4">
        <form className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col">
            <span className="text-sm font-medium text-gray-700">Du</span>
            <input type="date" name="du" defaultValue={du} className="min-h-11 rounded border border-gray-300 px-3 md:min-h-9" />
          </label>
          <label className="flex flex-col">
            <span className="text-sm font-medium text-gray-700">Au</span>
            <input type="date" name="au" defaultValue={au} className="min-h-11 rounded border border-gray-300 px-3 md:min-h-9" />
          </label>
          <button className="min-h-11 rounded border border-papel-700 px-4 font-semibold text-papel-700">Changer la période</button>
        </form>
      </Carte>
      <div className="grid gap-3 sm:grid-cols-3">
        {Object.entries(JOURNAUX).map(([code, j]) => (
          <Carte key={code} titre={`${j.libelle} (${j.code})`}>
            <p className="mb-3 text-gray-700">{j.description}</p>
            <a href={`/finance/exports/${code}?du=${du}&au=${au}`} className="inline-flex min-h-11 items-center rounded bg-papel-700 px-4 font-medium text-white hover:bg-papel-800 md:min-h-9" download>
              Télécharger
            </a>
          </Carte>
        ))}
      </div>
      <Carte className="mt-4">
        <p className="text-sm text-gray-700">
          Colonnes : Journal ; Date ; N° pièce ; Compte ; Compte tiers ; Libellé ; Débit ; Crédit. Chaque pièce est équilibrée (contrôlé avant l&apos;export).
          Les numéros de comptes se règlent dans Administration → Paramètres (catégorie « comptabilité »), dans Finance → Comptes et listes
          (comptes de trésorerie, catégories de charges) : à faire valider par le comptable.
        </p>
      </Carte>
    </>
  );
}
