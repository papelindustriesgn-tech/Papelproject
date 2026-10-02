import { describe, expect, it } from "vitest";
import { calculerCoutRevient, delaiJours, ecartPrix, montantLigneDevise } from "../achats";
import { kg } from "../unites";

describe("coût de revient d'un conteneur", () => {
  // 20 t de pâte à 1 150 USD/t (taux 9 450) + fret 2 400 USD (taux 9 500) + transit, douane, transport en GNF
  const marchandise = [{ devise: "USD" as const, montant: 23_000_00, tauxChange: 9450 }];
  const frais = [
    { devise: "USD" as const, montant: 2_400_00, tauxChange: 9500 },
    { devise: "GNF" as const, montant: 4_500_000, tauxChange: 1 },
    { devise: "GNF" as const, montant: 18_000_000, tauxChange: 1 },
    { devise: "GNF" as const, montant: 3_000_000, tauxChange: 1 },
  ];
  it("additionne marchandise et frais en GNF, chacun à son taux", () => {
    const c = calculerCoutRevient(marchandise, frais, kg(20_000));
    expect(c.marchandiseGnf).toBe(217_350_000);
    expect(c.fraisGnf).toBe(22_800_000 + 25_500_000);
    expect(c.totalGnf).toBe(265_650_000);
    expect(c.coutKgGnf).toBe(13_282.5);
    expect(c.coutTonneGnf).toBe(13_282_500);
  });
  it("refuse un poids nul", () => {
    expect(() => calculerCoutRevient(marchandise, [], kg(0))).toThrow(/Poids/);
  });
});

describe("indicateurs achats", () => {
  it("écart réel / prévu", () => {
    expect(ecartPrix(13_282_500, 12_650_000)).toBeCloseTo(0.05, 3);
    expect(ecartPrix(1, 0)).toBeNull();
  });
  it("délai fournisseur en jours", () => {
    expect(delaiJours("2026-08-01", "2026-09-15")).toBe(45);
  });
  it("montant de ligne en unités minimales", () => {
    expect(montantLigneDevise(20_000, 1.15, "USD")).toBe(2_300_000); // 23 000 USD en centimes
    expect(montantLigneDevise(500, 1_500, "GNF")).toBe(750_000);
  });
});
