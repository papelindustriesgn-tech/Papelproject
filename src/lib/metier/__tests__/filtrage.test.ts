import { describe, expect, it } from "vitest";
import { commercialDe, coutEstimeParGamme, lignesRetenues, partRetenue, pieceRetenue, type PieceFiltrable } from "../filtrage";

const petit = "petit";
const grand = "grand";
const piece: PieceFiltrable = {
  commercialId: null,
  clientCommercialId: "c1",
  lignes: [
    { produitId: petit, montantHtGnf: 170_000 },
    { produitId: grand, montantHtGnf: 229_980 },
  ],
};

describe("filtres gamme et commercial des ventes", () => {
  it("le commercial d'une pièce de bureau est celui du client", () => {
    expect(commercialDe(piece)).toBe("c1");
    expect(commercialDe({ commercialId: "c2", clientCommercialId: "c1" })).toBe("c2");
  });
  it("retient une pièce selon le commercial et la gamme", () => {
    expect(pieceRetenue(piece, { produit: null, commercial: null })).toBe(true);
    expect(pieceRetenue(piece, { produit: null, commercial: "c2" })).toBe(false);
    expect(pieceRetenue(piece, { produit: petit, commercial: "c1" })).toBe(true);
    expect(pieceRetenue(piece, { produit: "autre", commercial: null })).toBe(false);
  });
  it("répartit un montant global au prorata du HT de la gamme", () => {
    expect(partRetenue(piece, { produit: null, commercial: null })).toBe(1);
    expect(partRetenue(piece, { produit: petit, commercial: null })).toBeCloseTo(170_000 / 399_980, 10);
    expect(partRetenue(piece, { produit: petit, commercial: "c2" })).toBe(0);
    expect(lignesRetenues(piece.lignes, { produit: grand, commercial: null })).toHaveLength(1);
  });
  it("estime le coût des ventes d'un commercial au coût moyen du paquet de chaque gamme", () => {
    const sorties = [
      { gamme: "Petit 100", coutGnf: 2_000_000, paquets: 1_000 },
      { gamme: "Petit 100", coutGnf: -200_000, paquets: -100 },
      { gamme: "Grand 100", coutGnf: 3_000_000, paquets: 600 },
    ];
    // Petit : 1 800 000 ÷ 900 = 2 000 GNF/paquet ; Grand : 5 000 GNF/paquet ; gamme sans sortie ignorée.
    expect(coutEstimeParGamme(sorties, [{ gamme: "Petit 100", paquets: 50 }, { gamme: "Grand 100", paquets: 30 }, { gamme: "Autre", paquets: 10 }])).toBe(250_000);
  });
});
