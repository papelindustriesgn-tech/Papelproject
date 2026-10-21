import { describe, expect, it } from "vitest";
import {
  ErreurMontant, formaterMontant, gnfVersUsdCentimes, montantEnGnf, tauxALaDate, TAUX_USD_GNF_DEFAUT, usdCentimesVersGnf,
} from "../devises";

describe("conversions USD ↔ GNF", () => {
  it("au taux par défaut 9 450", () => {
    expect(TAUX_USD_GNF_DEFAUT).toBe(9450);
    expect(usdCentimesVersGnf(100_00, 9450)).toBe(945_000);
    expect(usdCentimesVersGnf(1, 9450)).toBe(95); // 94,5 → 95
  });
  it("GNF → centimes d'USD", () => {
    expect(gnfVersUsdCentimes(945_000, 9450)).toBe(10_000);
  });
  it("refuse montants non entiers et taux invalides", () => {
    expect(() => usdCentimesVersGnf(10.5, 9450)).toThrow(ErreurMontant);
    expect(() => usdCentimesVersGnf(100, 0)).toThrow(/Taux/);
  });
  it("contre-valeur GNF d'une opération avec taux figé", () => {
    expect(montantEnGnf({ devise: "GNF", montant: 175_000, tauxChange: 1 })).toBe(175_000);
    expect(montantEnGnf({ devise: "USD", montant: 1_250_000, tauxChange: 9500 })).toBe(118_750_000);
  });
});

describe("taux à la date de l'opération", () => {
  const historique = [
    { date: "2026-01-01", taux: 9400 },
    { date: "2026-06-15", taux: 9450 },
    { date: "2026-09-01", taux: 9520 },
  ];
  it("prend le dernier taux connu à la date", () => {
    expect(tauxALaDate(historique, "2026-06-14")).toBe(9400);
    expect(tauxALaDate(historique, "2026-06-15")).toBe(9450);
    expect(tauxALaDate(historique, "2026-10-01")).toBe(9520);
  });
  it("taux par défaut si aucun historique", () => {
    expect(tauxALaDate(historique, "2025-12-31")).toBe(9450);
  });
});

describe("formatage", () => {
  it("affiche en français", () => {
    expect(formaterMontant(175000)).toBe("175 000 GNF");
    expect(formaterMontant(125050, "USD")).toBe("1 250,50 USD");
  });
});
