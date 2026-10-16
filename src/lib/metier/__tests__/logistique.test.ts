import { describe, expect, it } from "vitest";
import { agregerTournees, coutAuKm, coutParColis, tauxLivraisonReussie, tauxRetour, type BilanTournee } from "../logistique";

const tournee = (p: Partial<BilanTournee>): BilanTournee => ({
  nbLivraisons: 0, nbLivrees: 0, nbPartielles: 0, nbRefusees: 0, paquetsCharges: 0, paquetsLivres: 0, colisLivres: 0, depensesGnf: 0, kmParcourus: null, ...p,
});

describe("indicateurs logistiques", () => {
  it("taux de livraison réussie sur les bons remis uniquement", () => {
    expect(tauxLivraisonReussie({ nbLivrees: 8, nbPartielles: 1, nbRefusees: 1 })).toBe(0.8);
    expect(tauxLivraisonReussie({ nbLivrees: 0, nbPartielles: 0, nbRefusees: 0 })).toBeNull();
  });

  it("taux de retour en paquets", () => {
    expect(tauxRetour({ paquetsCharges: 5000, paquetsLivres: 4900 })).toBe(0.02);
    expect(tauxRetour({ paquetsCharges: 0, paquetsLivres: 0 })).toBeNull();
  });

  it("coût par colis et au kilomètre, arrondis au GNF", () => {
    expect(coutParColis(500_000, 149)).toBe(3356);
    expect(coutParColis(500_000, 0)).toBeNull();
    expect(coutAuKm(450_000, 90)).toBe(5000);
    expect(coutAuKm(450_000, null)).toBeNull();
  });

  it("agrégation : sommes puis taux recalculés, km ignorés quand non relevés", () => {
    const a = agregerTournees([
      tournee({ nbLivrees: 1, paquetsCharges: 1000, paquetsLivres: 1000, colisLivres: 20, depensesGnf: 300_000, kmParcourus: 60 }),
      tournee({ nbRefusees: 1, paquetsCharges: 1000, paquetsLivres: 0, depensesGnf: 100_000 }),
    ]);
    expect(a.kmParcourus).toBe(60);
    expect(tauxLivraisonReussie(a)).toBe(0.5);
    expect(tauxRetour(a)).toBe(0.5);
    expect(coutParColis(a.depensesGnf, a.colisLivres)).toBe(20_000);
  });
});
