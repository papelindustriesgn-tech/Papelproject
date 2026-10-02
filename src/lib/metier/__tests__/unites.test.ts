import { describe, expect, it } from "vitest";
import {
  colis, colisVersPaquets, colisVersPalettes, equivalentColis, ErreurUnite, formaterPoids, formaterQuantite, formaterStockProduitFini, kg, kgVersTonnes,
  paquets, paquetsVersColis, palettes, palettesVersColis, poidsTotalBobines, somme, tonnes, tonnesVersKg,
} from "../unites";

const COLIS_PETIT_50 = { paquetsParColis: 50, colisParPalette: 40 };
const COLIS_PETIT_80 = { paquetsParColis: 80 };
const COLIS_GRAND_30 = { paquetsParColis: 30 };

describe("poids", () => {
  it("convertit kg ↔ tonnes", () => {
    expect(kgVersTonnes(kg(2500))).toBe(2.5);
    expect(tonnesVersKg(tonnes(1.2))).toBe(1200);
  });
  it("additionne les poids réels des bobines (pas de facteur bobine → kg)", () => {
    expect(poidsTotalBobines([kg(1050), kg(980.5), kg(1012)])).toBe(3042.5);
    expect(() => poidsTotalBobines([kg(-1)])).toThrow(ErreurUnite);
  });
});

describe("paquets ↔ colis selon le conditionnement", () => {
  it("colis → paquets", () => {
    expect(colisVersPaquets(colis(10), COLIS_PETIT_50)).toBe(500);
    expect(colisVersPaquets(colis(10), COLIS_PETIT_80)).toBe(800);
    expect(colisVersPaquets(colis(10), COLIS_GRAND_30)).toBe(300);
  });
  it("paquets → colis complets + reste, jamais de colis fractionnaire", () => {
    expect(paquetsVersColis(paquets(1234), COLIS_PETIT_50)).toEqual({ colis: 24, restePaquets: 34 });
    expect(paquetsVersColis(paquets(90), COLIS_GRAND_30)).toEqual({ colis: 3, restePaquets: 0 });
    expect(paquetsVersColis(paquets(0), COLIS_GRAND_30)).toEqual({ colis: 0, restePaquets: 0 });
  });
  it("équivalent colis décimal pour l'affichage", () => {
    expect(equivalentColis(paquets(10175), COLIS_PETIT_50)).toBeCloseTo(203.5);
  });
  it("palettes", () => {
    expect(palettesVersColis(palettes(2), COLIS_PETIT_50)).toBe(80);
    expect(colisVersPalettes(colis(85), COLIS_PETIT_50)).toEqual({ palettes: 2, resteColis: 5 });
    expect(() => palettesVersColis(palettes(1), COLIS_GRAND_30)).toThrow(/Colis par palette/);
  });
  it("refuse les quantités non entières et les facteurs invalides", () => {
    expect(() => paquets(1.5)).toThrow(ErreurUnite);
    expect(() => colis(Number.NaN)).toThrow(ErreurUnite);
    expect(() => colisVersPaquets(colis(1), { paquetsParColis: 0 })).toThrow(/supérieur à zéro/);
    expect(() => paquetsVersColis(paquets(-5), COLIS_PETIT_50)).toThrow(/négative/);
  });
  it("le typage interdit de mélanger les unités", () => {
    // @ts-expect-error : additionner des colis et des paquets ne compile pas
    somme(colis(1), paquets(1));
    // @ts-expect-error : un nombre brut n'est pas un nombre de paquets
    paquetsVersColis(12, COLIS_PETIT_50);
    expect(somme(paquets(3), paquets(4))).toBe(7);
  });
});

describe("affichage", () => {
  it("formate en français", () => {
    expect(formaterQuantite(1250, "paquet")).toBe("1 250 paquets");
    expect(formaterQuantite(1, "colis")).toBe("1 colis");
    expect(formaterQuantite(3.25, "tonne")).toBe("3,25 t");
    expect(formaterQuantite(12.5, "litre")).toBe("12,5 L");
    expect(formaterQuantite(3, "unite")).toBe("3 unités");
  });
  it("produits finis en paquets ET en colis", () => {
    expect(formaterStockProduitFini(paquets(29650), COLIS_PETIT_50)).toBe("29 650 paquets (593 colis)");
    expect(formaterStockProduitFini(paquets(1234), COLIS_PETIT_50)).toBe("1 234 paquets (24 colis + 34 paquets)");
  });
  it("poids en kg ou en tonnes", () => {
    expect(formaterPoids(kg(16305))).toBe("16,31 t");
    expect(formaterPoids(kg(850))).toBe("850 kg");
  });
});
