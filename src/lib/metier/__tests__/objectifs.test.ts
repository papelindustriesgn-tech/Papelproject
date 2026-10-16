import { describe, expect, it } from "vitest";
import { avancement, etatObjectif, objectifSurPeriode } from "../objectifs";

const ca = [
  { mois: "2026-11-01", valeur: 3_000_000_000 },
  { mois: "2026-12-01", valeur: 3_100_000_000 },
];
const rendement = [
  { mois: "2026-11-01", valeur: 0.9 },
  { mois: "2026-12-01", valeur: 0.96 },
];

describe("objectifs mensuels sur une période", () => {
  it("mois complet = objectif du mois", () => {
    expect(objectifSurPeriode(ca, "2026-11-01", "2026-11-30", true)).toEqual({ valeur: 3_000_000_000, couverture: 1 });
    expect(objectifSurPeriode(rendement, "2026-11-01", "2026-11-30", false)).toEqual({ valeur: 0.9, couverture: 1 });
  });
  it("une semaine à cheval sur deux mois : prorata des jours (quantité) ou moyenne pondérée (taux)", () => {
    // 3 jours de novembre (30 j) + 4 jours de décembre (31 j)
    expect(objectifSurPeriode(ca, "2026-11-28", "2026-12-04", true)!.valeur).toBeCloseTo((3_000_000_000 * 3) / 30 + (3_100_000_000 * 4) / 31, 3);
    expect(objectifSurPeriode(rendement, "2026-11-28", "2026-12-04", false)!.valeur).toBeCloseTo((0.9 * 3 + 0.96 * 4) / 7, 10);
  });
  it("année entière : somme des mois pour une quantité, moyenne pour un taux", () => {
    expect(objectifSurPeriode(ca, "2026-01-01", "2026-12-31", true)!.valeur).toBeCloseTo(6_100_000_000, 3);
    const r = objectifSurPeriode(rendement, "2026-01-01", "2026-12-31", false)!;
    expect(r.valeur).toBeCloseTo((0.9 * 30 + 0.96 * 31) / 61, 10);
    expect(r.couverture).toBeCloseTo(61 / 365, 10);
  });
  it("période en partie sans objectif, ou sans objectif du tout", () => {
    expect(objectifSurPeriode(ca, "2026-10-17", "2026-11-15", true)!.couverture).toBeCloseTo(15 / 30, 10);
    expect(objectifSurPeriode(ca, "2026-09-01", "2026-09-30", true)).toBeNull();
  });
  it("avancement", () => {
    expect(avancement(750, 1000)).toBe(0.75);
    expect(avancement(10, 0)).toBeNull();
  });
  it("état : hausse bonne (CA) ou baisse bonne (pertes, délais)", () => {
    expect(etatObjectif(750, 1000, true)).toEqual({ part: 0.75, atteint: false, statut: "En retard" });
    expect(etatObjectif(950, 1000, true).statut).toBe("Presque atteint");
    expect(etatObjectif(1200, 1000, true)).toEqual({ part: 1, atteint: true, statut: "Atteint" });
    expect(etatObjectif(0.025, 0.03, false)).toEqual({ part: 1, atteint: true, statut: "Atteint" });
    expect(etatObjectif(0.032, 0.03, false).statut).toBe("Presque atteint");
    expect(etatObjectif(0.06, 0.03, false)).toEqual({ part: 0.5, atteint: false, statut: "Au-dessus de l'objectif" });
    expect(etatObjectif(null, 0.03, false).statut).toBe("Non mesuré");
  });
});
