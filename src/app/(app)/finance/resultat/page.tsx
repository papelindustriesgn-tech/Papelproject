import type { Metadata } from "next";
import { ExportCsv } from "@/components/donnees/export-csv";
import { Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { BoutonImprimer } from "@/components/ui/bouton-imprimer";
import { aujourdhui } from "@/lib/formulaires/dates";
import { joursDeLaPeriode } from "@/lib/formulaires/periode";
import { chargerResultat } from "@/lib/finance/indicateurs";
import { pointMortJours, seuilRentabiliteGnf } from "@/lib/metier/finance";
import { pct } from "@/lib/production/affichage";
import { gnf } from "@/lib/stocks/libelles";

export const metadata: Metadata = { title: "Compte de résultat" };

const NOMS_MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

/** Les 6 derniers mois (le mois en cours jusqu'à aujourd'hui). */
function derniersMois(jour: string) {
  const mois = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(`${jour.slice(0, 8)}01T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() - i);
    const du = d.toISOString().slice(0, 10);
    const fin = new Date(d);
    fin.setUTCMonth(fin.getUTCMonth() + 1);
    fin.setUTCDate(0);
    const au = i === 0 ? jour : fin.toISOString().slice(0, 10);
    mois.push({ du, au, libelle: `${NOMS_MOIS[d.getUTCMonth()]} ${d.getUTCFullYear()}${i === 0 ? " (en cours)" : ""}` });
  }
  return mois;
}

export default async function PageResultat() {
  const mois = derniersMois(aujourdhui());
  const resultats = await Promise.all(mois.map((m) => chargerResultat(m.du, m.au, joursDeLaPeriode(m).length)));
  const lignes: { libelle: string; valeur: (r: (typeof resultats)[number]) => number; gras?: boolean; signe?: string }[] = [
    { libelle: "Chiffre d'affaires HT", valeur: (r) => r.caHtGnf, gras: true },
    { libelle: "Coût matière des produits vendus", valeur: (r) => -r.coutVentesGnf, signe: "−" },
    { libelle: "Marge brute", valeur: (r) => r.margeBruteGnf, gras: true },
    { libelle: "Charges variables", valeur: (r) => -r.chargesVariablesGnf },
    { libelle: "Marge sur coûts variables", valeur: (r) => r.margeSurCoutsVariablesGnf, gras: true },
    { libelle: "Charges fixes", valeur: (r) => -r.chargesFixesGnf },
    { libelle: "Résultat d'exploitation", valeur: (r) => r.resultatGnf, gras: true },
  ];
  const categories = [...new Set(resultats.flatMap((r) => r.chargesParCategorie.map((c) => c.libelle)))];
  const dernierComplet = resultats[resultats.length - 2];
  const seuil = seuilRentabiliteGnf(dernierComplet.chargesFixesGnf, dernierComplet.tauxMcv);
  return (
    <>
      <TitrePage titre="Compte de résultat de gestion" sousTitre="Ventes HT − coût matière (CMP) − charges des factures fournisseurs (HT, hors achats stockés)." action={<BoutonImprimer />} />
      <Carte className="mb-4">
        <div className="mb-2 print:hidden">
          <ExportCsv
            nomFichier="compte-de-resultat"
            entetes={["Poste", ...mois.map((m) => m.libelle)]}
            lignes={[
              ...lignes.map((l) => [l.libelle, ...resultats.map((r) => l.valeur(r))]),
              ...categories.map((c) => [`  dont ${c}`, ...resultats.map((r) => -(r.chargesParCategorie.find((x) => x.libelle === c)?.montantGnf ?? 0))]),
            ]}
          />
        </div>
        <Tableau entetes={["", ...mois.map((m) => m.libelle)]}>
          {lignes.map((l) => (
            <tr key={l.libelle} className={l.gras ? "bg-papel-50 font-semibold" : ""}>
              <Cellule>{l.libelle}</Cellule>
              {resultats.map((r, i) => (
                <Cellule key={i} className={`whitespace-nowrap text-right ${l.valeur(r) < 0 && l.gras ? "text-red-700" : ""}`}>{gnf(l.valeur(r))}</Cellule>
              ))}
            </tr>
          ))}
          <tr>
            <Cellule className="text-sm text-gray-600">Taux de résultat</Cellule>
            {resultats.map((r, i) => (
              <Cellule key={i} className="text-right text-sm text-gray-600">{pct(r.tauxResultat)}</Cellule>
            ))}
          </tr>
        </Tableau>
      </Carte>
      <Carte titre="Charges par catégorie" className="mb-4">
        <Tableau entetes={["Catégorie", ...mois.map((m) => m.libelle)]}>
          {categories.map((c) => (
            <tr key={c}>
              <Cellule>{c}</Cellule>
              {resultats.map((r, i) => (
                <Cellule key={i} className="whitespace-nowrap text-right">{gnf(r.chargesParCategorie.find((x) => x.libelle === c)?.montantGnf ?? 0)}</Cellule>
              ))}
            </tr>
          ))}
        </Tableau>
      </Carte>
      <Carte titre={`Seuil de rentabilité (${mois[mois.length - 2].libelle})`}>
        {seuil === null ? (
          <p>Marge sur coûts variables nulle ou négative : le seuil ne peut pas être atteint.</p>
        ) : (
          <p>
            Il faut <strong>{gnf(seuil)}</strong> de CA HT par mois pour couvrir {gnf(dernierComplet.chargesFixesGnf)} de charges fixes
            (taux de marge sur coûts variables : {pct(dernierComplet.tauxMcv)}).{" "}
            {pointMortJours(seuil, dernierComplet.caHtGnf, joursDeLaPeriode(mois[mois.length - 2]).length)
              ? `Atteint le ${pointMortJours(seuil, dernierComplet.caHtGnf, joursDeLaPeriode(mois[mois.length - 2]).length)}e jour du mois.`
              : "Non atteint ce mois-là."}
          </p>
        )}
      </Carte>
    </>
  );
}
