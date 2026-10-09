import type { Metadata } from "next";
import { ExportCsv } from "@/components/donnees/export-csv";
import { Carte, Cellule, Message, Tableau, TitrePage } from "@/components/ui";
import { formaterDate } from "@/lib/formulaires/dates";
import { chargerPrevisionnel } from "@/lib/finance/indicateurs";
import { premiereTensionTresorerie } from "@/lib/metier/finance";
import { gnf } from "@/lib/stocks/libelles";

export const metadata: Metadata = { title: "Trésorerie prévisionnelle" };

const NATURES = ["Encaissements clients", "Fournisseurs et charges", "Charges récurrentes", "Commandes d'achat"];

export default async function PagePrevisionnel() {
  const { semaines, soldeInitialGnf } = await chargerPrevisionnel(13);
  const tension = premiereTensionTresorerie(semaines);
  return (
    <>
      <TitrePage
        titre="Trésorerie prévisionnelle (13 semaines)"
        sousTitre="Départ : soldes actuels. Encaissements et règlements à leur échéance (les retards tombent la 1re semaine), charges fixes à venir, commandes d'achat non facturées."
      />
      {tension && (
        <div className="mb-4">
          <Message ton="erreur">
            Trésorerie négative prévue la semaine du {formaterDate(tension.debut)} ({gnf(tension.soldeFinGnf)}) : relancer les créances, décaler des règlements ou prévoir un financement.
          </Message>
        </div>
      )}
      <Carte>
        <div className="mb-2">
          <ExportCsv
            nomFichier="tresorerie-previsionnelle"
            entetes={["Semaine du", "au", ...NATURES, "Entrées", "Sorties", "Solde fin de semaine"]}
            lignes={semaines.map((s) => [s.debut, s.fin, ...NATURES.map((n) => s.parNature[n] ?? 0), s.entreesGnf, -s.sortiesGnf, s.soldeFinGnf])}
          />
        </div>
        <p className="mb-2">Solde de départ : <strong>{gnf(soldeInitialGnf)}</strong></p>
        <Tableau entetes={["Semaine", "Clients", "Fournisseurs et charges", "Charges fixes à venir", "Achats", "Solde fin"]}>
          {semaines.map((s) => (
            <tr key={s.debut}>
              <Cellule className="whitespace-nowrap">{formaterDate(s.debut)}</Cellule>
              {NATURES.map((n) => (
                <Cellule key={n} className="whitespace-nowrap text-right">{s.parNature[n] ? gnf(s.parNature[n]) : "—"}</Cellule>
              ))}
              <Cellule className={`whitespace-nowrap text-right font-semibold ${s.soldeFinGnf < 0 ? "text-red-700" : ""}`}>{gnf(s.soldeFinGnf)}</Cellule>
            </tr>
          ))}
        </Tableau>
      </Carte>
    </>
  );
}
