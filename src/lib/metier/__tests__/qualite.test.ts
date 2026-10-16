import { describe, expect, it } from "vitest";
import { actionsEnRetard, delaiMoyenClotureJours, libelleTolerance, mesureConforme, tauxConformite } from "../qualite";

describe("qualité", () => {
  it("conformité d'une mesure, bornes incluses", () => {
    const grammage = { min: 12.5, max: 13.5 };
    expect(mesureConforme(12.5, grammage)).toBe(true);
    expect(mesureConforme(13.5, grammage)).toBe(true);
    expect(mesureConforme(13.9, grammage)).toBe(false);
    expect(mesureConforme(9, { min: null, max: 8 })).toBe(false);
    expect(mesureConforme(1e6, { min: null, max: null })).toBe(true);
  });

  it("libellé des tolérances", () => {
    expect(libelleTolerance({ min: 12.5, max: 13.5 }, "g/m²")).toBe("12,5 à 13,5 g/m²");
    expect(libelleTolerance({ min: null, max: 8 }, "%")).toBe("≤ 8 %");
    expect(libelleTolerance({ min: 100, max: null })).toBe("≥ 100");
    expect(libelleTolerance({ min: 100, max: 100 }, "mouchoirs")).toBe("100 mouchoirs");
    expect(libelleTolerance({ min: null, max: null })).toBe("—");
  });

  it("taux de conformité sur les contrôles validés seulement", () => {
    expect(tauxConformite([{ resultat: "conforme" }, { resultat: "conforme" }, { resultat: "non_conforme" }, { resultat: null }])).toBeCloseTo(2 / 3);
    expect(tauxConformite([{ resultat: null }])).toBeNull();
  });

  it("délai moyen de clôture et actions en retard", () => {
    expect(
      delaiMoyenClotureJours([
        { date_constat: "2026-09-01", cloturee_le: "2026-09-04T12:00:00Z" },
        { date_constat: "2026-09-10", cloturee_le: "2026-09-11T00:00:00Z" },
        { date_constat: "2026-09-20", cloturee_le: null },
      ]),
    ).toBe(2.3);
    expect(delaiMoyenClotureJours([])).toBeNull();
    const actions = [
      { id: 1, echeance: "2026-09-30", realisee_le: null },
      { id: 2, echeance: "2026-10-05", realisee_le: null },
      { id: 3, echeance: "2026-09-01", realisee_le: "2026-09-02" },
      { id: 4, echeance: null, realisee_le: null },
    ];
    expect(actionsEnRetard(actions, "2026-10-02").map((a) => a.id)).toEqual([1]);
  });
});
