import { describe, expect, it } from "vitest";
import { calculerFiabilite, etatEcheance } from "../maintenance";

describe("fiabilité", () => {
  it("MTBF, MTTR et disponibilité sur 30 jours à 16 h/jour", () => {
    // 3 pannes : 60 + 90 + 30 = 180 min = 3 h d'arrêt sur 480 h requises.
    const f = calculerFiabilite([60, 90, 30], 30, 16);
    expect(f.heuresRequises).toBe(480);
    expect(f.heuresArret).toBe(3);
    expect(f.mtbfHeures).toBe(159);
    expect(f.mttrMinutes).toBe(60);
    expect(f.disponibilite).toBeCloseTo(477 / 480);
  });

  it("sans panne : disponibilité 100 %, MTBF et MTTR non définis", () => {
    const f = calculerFiabilite([], 7, 16);
    expect(f.disponibilite).toBe(1);
    expect(f.mtbfHeures).toBeNull();
    expect(f.mttrMinutes).toBeNull();
  });

  it("les arrêts ne dépassent jamais le temps requis", () => {
    const f = calculerFiabilite([2000], 1, 16);
    expect(f.heuresArret).toBe(16);
    expect(f.disponibilite).toBe(0);
  });

  it("échéances préventives", () => {
    expect(etatEcheance(-2)).toBe("retard");
    expect(etatEcheance(0)).toBe("proche");
    expect(etatEcheance(7)).toBe("proche");
    expect(etatEcheance(8)).toBe("planifie");
  });
});
