import { describe, expect, it } from "vitest";
import { bfrGnf, compteDeResultat, pointMortJours, premiereTensionTresorerie, seuilRentabiliteGnf, tresoreriePrevisionnelle } from "../finance";

describe("compte de résultat de gestion", () => {
  it("marge brute, marge sur coûts variables, résultat", () => {
    const r = compteDeResultat(500_000_000, 300_000_000, 50_000_000, 100_000_000);
    expect(r.margeBruteGnf).toBe(200_000_000);
    expect(r.margeSurCoutsVariablesGnf).toBe(150_000_000);
    expect(r.tauxMcv).toBe(0.3);
    expect(r.resultatGnf).toBe(50_000_000);
    expect(r.tauxResultat).toBe(0.1);
  });

  it("sans CA : taux non définis", () => {
    const r = compteDeResultat(0, 0, 0, 10);
    expect(r.tauxMcv).toBeNull();
    expect(r.resultatGnf).toBe(-10);
  });
});

describe("seuil de rentabilité et BFR", () => {
  it("seuil = charges fixes ÷ taux de MCV ; point mort dans la période", () => {
    const seuil = seuilRentabiliteGnf(100_000_000, 0.3);
    expect(seuil).toBe(333_333_333);
    expect(pointMortJours(seuil, 500_000_000, 30)).toBe(20);
    expect(pointMortJours(seuil, 300_000_000, 30)).toBeNull();
    expect(seuilRentabiliteGnf(100, 0)).toBeNull();
    expect(seuilRentabiliteGnf(100, null)).toBeNull();
  });

  it("BFR", () => {
    expect(bfrGnf(400, 300, 250)).toBe(450);
  });
});

describe("trésorerie prévisionnelle", () => {
  const flux = [
    { date: "2026-09-25", montantGnf: 1_000, nature: "Clients" }, // échu : première semaine
    { date: "2026-10-03", montantGnf: -3_000, nature: "Fournisseurs" },
    { date: "2026-10-09", montantGnf: 500, nature: "Clients" },
    { date: "2026-10-12", montantGnf: -400, nature: "Charges" },
    { date: "2026-12-31", montantGnf: 9_999, nature: "Clients" }, // hors horizon
  ];
  const s = tresoreriePrevisionnelle(2_000, flux, "2026-10-01", 2);

  it("regroupe par semaine et cumule le solde", () => {
    expect(s.map((x) => [x.debut, x.fin])).toEqual([
      ["2026-10-01", "2026-10-07"],
      ["2026-10-08", "2026-10-14"],
    ]);
    expect(s[0]).toMatchObject({ entreesGnf: 1_000, sortiesGnf: 3_000, soldeFinGnf: 0 });
    expect(s[1]).toMatchObject({ entreesGnf: 500, sortiesGnf: 400, soldeFinGnf: 100 });
    expect(s[1].parNature).toEqual({ Clients: 500, Charges: -400 });
  });

  it("signale la première semaine en tension", () => {
    expect(premiereTensionTresorerie(s)).toBeNull();
    expect(premiereTensionTresorerie(tresoreriePrevisionnelle(1_000, flux, "2026-10-01", 2))?.debut).toBe("2026-10-01");
  });
});
