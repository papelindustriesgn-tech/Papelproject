import { describe, expect, it } from "vitest";
import { avancement, objectifPeriode, type ObjectifMensuel } from "../objectifs";

const o = (mois: string, ca: number): ObjectifMensuel => ({ mois, productionKg: ca / 1000, paquets: ca / 100, caTtcGnf: ca, coutsVariablesGnf: ca / 2, chargesFixesGnf: 80_000_000 });
const objectifs = [o("2026-11-01", 3_000_000_000), o("2026-12-01", 3_100_000_000)];

describe("objectifs du business plan sur une période", () => {
  it("mois complet = objectif du mois", () => {
    expect(objectifPeriode(objectifs, "2026-11-01", "2026-11-30")).toMatchObject({ caTtcGnf: 3_000_000_000, chargesFixesGnf: 80_000_000, resultatGnf: 1_420_000_000, couverture: 1 });
  });
  it("une semaine à cheval sur deux mois : prorata des jours de chaque mois", () => {
    // 3 jours de novembre (30 j) + 4 jours de décembre (31 j)
    const r = objectifPeriode(objectifs, "2026-11-28", "2026-12-04")!;
    expect(r.caTtcGnf).toBe(Math.round((3_000_000_000 * 3) / 30 + (3_100_000_000 * 4) / 31));
    expect(r.couverture).toBe(1);
  });
  it("période en partie sans objectif, ou sans objectif du tout", () => {
    expect(objectifPeriode(objectifs, "2026-10-17", "2026-11-15")!.couverture).toBeCloseTo(15 / 30, 10);
    expect(objectifPeriode(objectifs, "2026-09-01", "2026-09-30")).toBeNull();
  });
  it("avancement", () => {
    expect(avancement(750, 1000)).toBe(0.75);
    expect(avancement(10, 0)).toBeNull();
  });
});
