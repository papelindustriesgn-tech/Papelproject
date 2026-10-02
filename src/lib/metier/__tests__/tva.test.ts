import { describe, expect, it } from "vitest";
import { calculerTotaux } from "../tva";

describe("TVA ajoutée aux prix hors taxes", () => {
  it("18 % sur un colis Petit de 50 (170 000 GNF HT)", () => {
    expect(calculerTotaux(170_000, { applicable: true, taux: 0.18 })).toEqual({ totalHtGnf: 170_000, tvaGnf: 30_600, totalTtcGnf: 200_600 });
  });
  it("arrondi au GNF sur le total", () => {
    // Grand colis de 30 : 229 980 × 18 % = 41 396,4 → 41 396
    expect(calculerTotaux(229_980, { applicable: true, taux: 0.18 }).tvaGnf).toBe(41_396);
  });
  it("sans TVA si non applicable", () => {
    expect(calculerTotaux(170_000, { applicable: false, taux: 0.18 })).toEqual({ totalHtGnf: 170_000, tvaGnf: 0, totalTtcGnf: 170_000 });
  });
  it("refuse un taux invalide", () => {
    expect(() => calculerTotaux(100, { applicable: true, taux: 1.8 })).toThrow(/TVA/);
  });
});
