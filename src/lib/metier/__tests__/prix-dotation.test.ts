import { describe, expect, it } from "vitest";
import { calculerDotation, remiseDotationEnColis } from "../dotation";
import { montantLigneColis, prixColisGnf, prixEnVigueur } from "../prix";
import { colis, paquets } from "../unites";

describe("prix au paquet et prix du colis", () => {
  it("le prix du colis dépend du conditionnement", () => {
    expect(prixColisGnf(3400, { paquetsParColis: 50 })).toBe(170_000);
    expect(prixColisGnf(3400, { paquetsParColis: 80 })).toBe(272_000);
    expect(prixColisGnf(3400, { paquetsParColis: 100 })).toBe(340_000);
    expect(prixColisGnf(7666, { paquetsParColis: 30 })).toBe(229_980);
  });
  it("montant d'une ligne en colis", () => {
    expect(montantLigneColis(colis(10), { paquetsParColis: 30 }, 7666)).toBe(2_299_800);
  });
  it("historique : prix en vigueur à une date", () => {
    const h = [
      { prixPaquetGnf: 3500, dateDebut: "2026-01-01", dateFin: "2026-09-30" },
      { prixPaquetGnf: 3400, dateDebut: "2026-10-01", dateFin: null },
    ];
    expect(prixEnVigueur(h, "2026-09-30")?.prixPaquetGnf).toBe(3500);
    expect(prixEnVigueur(h, "2026-10-01")?.prixPaquetGnf).toBe(3400);
    expect(prixEnVigueur(h, "2025-01-01")).toBeNull();
    expect(() => prixEnVigueur([...h, { prixPaquetGnf: 1, dateDebut: "2026-10-05", dateFin: null }], "2026-10-10")).toThrow(/chevauchent/);
  });
});

describe("dotation sur montants encaissés", () => {
  // 100 colis de 50 paquets Petit à 3 400 = 5 000 paquets, 17 000 000 GNF
  const lignes = [{ produitId: "petit", paquets: paquets(5000), montantGnf: 17_000_000 }];

  it("rien n'est dû tant que rien n'est encaissé", () => {
    expect(calculerDotation(lignes, 0)[0].paquetsAAttribuer).toBe(0);
  });
  it("facture entièrement payée : 4 % = 200 paquets = 4 colis de 50", () => {
    const [d] = calculerDotation(lignes, 17_000_000);
    expect(d.paquetsAAttribuer).toBe(200);
    expect(remiseDotationEnColis(d.paquetsAAttribuer, { paquetsParColis: 50 })).toEqual({ colis: 4, restePaquets: 0 });
  });
  it("paiements partiels : aucun paquet perdu ni doublé", () => {
    const p1 = calculerDotation(lignes, 5_100_000)[0]; // 30 % payé → 60 paquets
    expect(p1.paquetsAAttribuer).toBe(60);
    const p2 = calculerDotation(lignes, 17_000_000, { petit: 60 })[0];
    expect(p2.paquetsAAttribuer).toBe(140);
    expect(p1.paquetsAAttribuer + p2.paquetsAAttribuer).toBe(200);
  });
  it("un trop-perçu n'augmente pas la dotation", () => {
    expect(calculerDotation(lignes, 20_000_000)[0].paquetsDusCumules).toBe(200);
  });
  it("répartit par produit au prorata de l'encaissé", () => {
    const mixte = [
      { produitId: "petit", paquets: paquets(5000), montantGnf: 17_000_000 },
      { produitId: "grand", paquets: paquets(3000), montantGnf: 22_998_000 },
    ];
    const r = calculerDotation(mixte, 19_999_000); // ≈ 50 %
    expect(r.find((x) => x.produitId === "petit")?.paquetsAAttribuer).toBe(100);
    expect(r.find((x) => x.produitId === "grand")?.paquetsAAttribuer).toBe(60);
  });
  it("taux paramétrable", () => {
    expect(calculerDotation(lignes, 17_000_000, {}, 0.05)[0].paquetsAAttribuer).toBe(250);
  });
});
