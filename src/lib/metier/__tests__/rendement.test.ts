import { describe, expect, it } from "vitest";
import {
  alertesProduction, poidsPaquetGrammes, ratioRendement, rendementReelPaquetsParTonne,
  rendementTheoriquePaquetsParTonne, tauxPerteReel,
} from "../rendement";
import { kg, paquets } from "../unites";

const PETIT = { nbMouchoirs: 100, plis: 3, longueurMm: 190, largeurMm: 126, grammageGm2ParPli: 13 };
const GRAND = { nbMouchoirs: 100, plis: 3, longueurMm: 190, largeurMm: 197, grammageGm2ParPli: 13 };

describe("rendement théorique", () => {
  it("poids d'un paquet", () => {
    expect(poidsPaquetGrammes(PETIT)).toBeCloseTo(93.366, 3);
    expect(poidsPaquetGrammes(GRAND)).toBeCloseTo(145.977, 3);
  });
  it("retrouve les valeurs de référence avec 5 % de pertes", () => {
    expect(rendementTheoriquePaquetsParTonne(PETIT, 0.05)).toBe(10175);
    expect(rendementTheoriquePaquetsParTonne(GRAND, 0.05)).toBe(6508);
  });
  it("sans perte", () => {
    expect(rendementTheoriquePaquetsParTonne(PETIT, 0)).toBe(10711);
  });
  it("refuse des paramètres invalides", () => {
    expect(() => rendementTheoriquePaquetsParTonne(PETIT, 1)).toThrow(/perte/);
    expect(() => poidsPaquetGrammes({ ...PETIT, plis: 0 })).toThrow(/positives/);
  });
});

describe("rendement réel et pertes", () => {
  it("paquets ÷ tonnes consommées", () => {
    expect(rendementReelPaquetsParTonne(paquets(19500), kg(2000))).toBe(9750);
    expect(rendementReelPaquetsParTonne(paquets(100), kg(0))).toBeNull();
  });
  it("ratio réel / théorique", () => {
    expect(ratioRendement(9750, 10175)).toBeCloseTo(0.9582, 4);
  });
  it("taux de perte", () => {
    expect(tauxPerteReel(kg(120), kg(2000))).toBeCloseTo(0.06);
    expect(tauxPerteReel(kg(0), kg(0))).toBeNull();
  });
});

describe("alertes de production", () => {
  it("rendement < 95 %, perte > 5 %, arrêt > 30 min", () => {
    const alertes = alertesProduction({ ratioRendement: 0.9, tauxPerte: 0.07, arretsMinutes: [10, 45] });
    expect(alertes).toEqual([
      { type: "rendement_faible", ratio: 0.9 },
      { type: "perte_elevee", taux: 0.07 },
      { type: "arret_long", minutes: 45 },
    ]);
  });
  it("pas d'alerte aux seuils exacts", () => {
    expect(alertesProduction({ ratioRendement: 0.95, tauxPerte: 0.05, arretsMinutes: [30] })).toEqual([]);
  });
});
