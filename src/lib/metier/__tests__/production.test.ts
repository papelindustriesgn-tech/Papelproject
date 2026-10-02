import { describe, expect, it } from "vitest";
import { calculerIndicateursFiche, dureePosteMinutes, repartirCoutMatiere } from "../production";
import { kg } from "../unites";

const PETIT = { produitId: "petit", rendementTheoriquePaquetsT: 10175, poidsPaquetG: 93.366, cadencePaquetsMinute: 30 };
const GRAND = { produitId: "grand", rendementTheoriquePaquetsT: 6508, poidsPaquetG: 145.977, cadencePaquetsMinute: 20 };

describe("durée des postes", () => {
  it("poste de jour et poste de nuit passant minuit", () => {
    expect(dureePosteMinutes("06:00", "14:00")).toBe(480);
    expect(dureePosteMinutes("22:00", "06:00")).toBe(480);
    expect(dureePosteMinutes("14:00:00", "22:00:00")).toBe(480);
    expect(() => dureePosteMinutes("25:00", "06:00")).toThrow(/Heure invalide/);
  });
});

describe("indicateurs d'une fiche", () => {
  it("un seul produit : rendement réel, ratio, perte", () => {
    // 1 000 kg consommés, 9 700 paquets, 40 kg de rebuts
    const r = calculerIndicateursFiche({ consommeKg: kg(1000), lignes: [{ ...PETIT, paquets: 9700, rebutsKg: 40 }], arrets: [], dureePosteMin: 480 });
    expect(r.rendementReelPaquetsT).toBe(9700);
    expect(r.ratioRendement).toBeCloseTo(9700 / 10175, 6);
    expect(r.tauxPerte).toBeCloseTo(0.04, 6);
  });

  it("plusieurs produits : ratio pondéré par les rendements théoriques", () => {
    // 700 kg théoriques en Petit (7 122,5 paquets) + 300 kg en Grand (1 952,4 paquets) = 100 %
    const r = calculerIndicateursFiche({
      consommeKg: kg(1000),
      lignes: [
        { ...PETIT, paquets: 7122.5, rebutsKg: 0 },
        { ...GRAND, paquets: 1952.4, rebutsKg: 0 },
      ],
      arrets: [],
      dureePosteMin: 480,
    });
    expect(r.ratioRendement).toBeCloseTo(1, 6);
    expect(r.rendementReelPaquetsT).toBeNull();
  });

  it("TRS = disponibilité × performance × qualité", () => {
    // Poste 480 min, pause planifiée 30 min → ouverture 450 ; panne 45 min → marche 405
    // Cadence 30 paquets/min ; 10 000 paquets bons + rebuts 93,366 kg = 1 000 paquets → 11 000 paquets → 366,67 min théoriques
    const r = calculerIndicateursFiche({
      consommeKg: kg(1100),
      lignes: [{ ...PETIT, paquets: 10000, rebutsKg: 93.366 }],
      arrets: [
        { minutes: 30, planifie: true },
        { minutes: 45, planifie: false },
      ],
      dureePosteMin: 480,
    });
    expect(r.disponibilite).toBeCloseTo(405 / 450, 6);
    expect(r.performance).toBeCloseTo(11000 / 30 / 405, 6);
    expect(r.qualite).toBeCloseTo(10000 / 11000, 6);
    expect(r.trs).toBeCloseTo((405 / 450) * (11000 / 30 / 405) * (10000 / 11000), 6);
    expect(r.minutesArretNonPlanifie).toBe(45);
  });

  it("TRS non calculé si la cadence nominale n'est pas renseignée", () => {
    const r = calculerIndicateursFiche({ consommeKg: kg(1000), lignes: [{ ...PETIT, cadencePaquetsMinute: null, paquets: 9000, rebutsKg: 0 }], arrets: [], dureePosteMin: 480 });
    expect(r.performance).toBeNull();
    expect(r.trs).toBeNull();
    expect(r.disponibilite).toBe(1);
  });

  it("fiche vide : pas de division par zéro", () => {
    const r = calculerIndicateursFiche({ consommeKg: kg(0), lignes: [], arrets: [], dureePosteMin: 480 });
    expect(r.ratioRendement).toBeNull();
    expect(r.tauxPerte).toBeNull();
    expect(r.qualite).toBeNull();
  });
});

describe("coût de revient matière", () => {
  it("répartition au prorata du poids de papier", () => {
    // 10 000 paquets Petit (933,66 kg) et 1 000 paquets Grand (145,98 kg) ; coût 14 000 000 GNF
    const [petit, grand] = repartirCoutMatiere(14_000_000, [
      { paquets: 10000, poidsPaquetG: 93.366 },
      { paquets: 1000, poidsPaquetG: 145.977 },
    ]);
    // Arrondi du coût unitaire au centime de GNF : écart total ≤ 0,005 GNF × 11 000 paquets
    expect(Math.abs(petit * 10000 + grand * 1000 - 14_000_000)).toBeLessThanOrEqual(55);
    expect(grand / petit).toBeCloseTo(145.977 / 93.366, 3);
  });
  it("ligne sans paquet : coût nul", () => {
    expect(repartirCoutMatiere(1000, [{ paquets: 0, poidsPaquetG: 93 }])).toEqual([0]);
  });
});
