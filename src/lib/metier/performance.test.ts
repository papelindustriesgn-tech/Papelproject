import { describe, expect, it } from "vitest";
import { coutCompletParPaquet, coutEnergieParTonne, indicateursLivraison, margeCompleteParPaquet } from "./performance";

describe("coutEnergieParTonne", () => {
  it("rapporte l'énergie aux tonnes de papier consommées", () => {
    // 32 M GNF d'électricité + carburant pour 20 t de papier → 1,6 M GNF par tonne
    expect(coutEnergieParTonne(32_000_000, 20_000)).toBe(1_600_000);
  });
  it("sans papier consommé : pas de chiffre (et non zéro)", () => {
    expect(coutEnergieParTonne(32_000_000, 0)).toBeNull();
  });
});

describe("coutCompletParPaquet", () => {
  it("matière + charges, ramenées au paquet", () => {
    // 10 389 paquets à partir d'1 t ; matière 2 703 USD × 9 450 ≈ 25,5 M ; charges 12 M
    const c = coutCompletParPaquet(25_543_350, 12_000_000, 10_389);
    expect(c).toEqual({ totalGnf: 3614, matiereGnf: 2459, chargesGnf: 1155 });
  });
  it("sans production : null", () => {
    expect(coutCompletParPaquet(1000, 1000, 0)).toBeNull();
  });
});

describe("indicateursLivraison (OTIF)", () => {
  const c = (datePiece: string, datePromise: string, paquetsCommandes: number, remises: { date: string; paquets: number }[]) => ({ datePiece, datePromise, paquetsCommandes, remises });

  it("à temps et complète, en retard, incomplète, livrée en deux fois", () => {
    const r = indicateursLivraison([
      c("2026-11-02", "2026-11-04", 100, [{ date: "2026-11-03", paquets: 100 }]), // OK, 1 jour
      c("2026-11-02", "2026-11-04", 100, [{ date: "2026-11-06", paquets: 100 }]), // en retard, 4 jours
      c("2026-11-02", "2026-11-04", 100, [{ date: "2026-11-03", paquets: 80 }]), // incomplète (20 rapportés)
      c("2026-11-01", "2026-11-04", 100, [
        { date: "2026-11-04", paquets: 40 },
        { date: "2026-11-02", paquets: 60 },
      ]), // deux remises, complète le 04 → OK, 3 jours
    ]);
    expect(r.commandes).toBe(4);
    expect(r.otifOk).toBe(2);
    expect(r.otif).toBe(0.5);
    expect(r.livreesCompletes).toBe(3);
    expect(r.delaiMoyenJours).toBe(2.7); // (1 + 4 + 3) ÷ 3
  });

  it("aucune commande à échéance : pas de taux (et non 0 %)", () => {
    expect(indicateursLivraison([])).toEqual({ commandes: 0, otifOk: 0, otif: null, delaiMoyenJours: null, livreesCompletes: 0 });
  });
});

describe("margeCompleteParPaquet", () => {
  it("prix moyen de vente − coût complet, positif ou négatif", () => {
    expect(margeCompleteParPaquet(2839, 2500)).toBe(339);
    expect(margeCompleteParPaquet(2839, 3942)).toBe(-1103); // vend en dessous de son coût complet
  });
  it("sans vente ou sans production : null", () => {
    expect(margeCompleteParPaquet(null, 2500)).toBeNull();
    expect(margeCompleteParPaquet(2839, null)).toBeNull();
  });
});
