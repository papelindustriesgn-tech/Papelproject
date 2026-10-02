import type { Metadata } from "next";
import Image from "next/image";
import { lireParam } from "@/components/donnees/filtres";
import { BlocsIndicateurs, ListeAlertes } from "@/components/direction/sections";
import { BoutonImprimer } from "@/components/ui/bouton-imprimer";
import { chargerSynthese } from "@/lib/direction/synthese";
import { aujourdhui, formaterDate } from "@/lib/formulaires/dates";
import { resoudrePeriode } from "@/lib/formulaires/periode";

export const metadata: Metadata = { title: "Rapport hebdomadaire" };

/** Rapport de la semaine (7 jours se terminant à la date choisie), à imprimer ou enregistrer en PDF. */
export default async function RapportHebdomadaire({ searchParams }: PageProps<"/direction/rapport">) {
  const sp = await searchParams;
  const fin = lireParam(sp, "au") ?? aujourdhui();
  const debut = new Date(`${fin}T00:00:00Z`);
  debut.setUTCDate(debut.getUTCDate() - 6);
  const periode = resoudrePeriode("perso", aujourdhui(), debut.toISOString().slice(0, 10), fin);
  const s = await chargerSynthese(periode);

  return (
    <div className="bg-white p-2 print:p-0">
      <form className="mb-4 flex flex-wrap items-end gap-2 print:hidden">
        <label className="flex flex-col">
          <span className="text-sm font-medium text-gray-700">Semaine se terminant le</span>
          <input type="date" name="au" defaultValue={fin} className="min-h-11 rounded-lg border border-gray-300 px-3" />
        </label>
        <button className="min-h-11 rounded-lg border border-papel-300 bg-white px-4 font-semibold text-papel-800">Afficher</button>
        <BoutonImprimer />
      </form>
      <header className="imprimer-couleurs mb-4 flex items-center justify-between rounded-lg bg-papel-700 p-4 text-white">
        <Image src="/logo-papel.png" alt="Papel" width={120} height={68} />
        <div className="text-right">
          <div className="text-xl font-bold">Rapport hebdomadaire</div>
          <div>
            Du {formaterDate(periode.du)} au {formaterDate(periode.au)}
          </div>
          <div className="text-sm">Comparé à la semaine précédente</div>
        </div>
      </header>
      <ListeAlertes alertes={s.alertes} />
      <BlocsIndicateurs s={s} />
      <p className="mt-4 text-sm text-gray-600">Rapport généré le {formaterDate(aujourdhui())} par Papel ERP. L&apos;envoi automatique par e-mail chaque lundi arrive avec la phase 3.</p>
    </div>
  );
}
