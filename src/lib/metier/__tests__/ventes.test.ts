import { describe, expect, it } from "vitest";
import { calculerDso, margeBrute, montantEnLettresGnf, nombreEnLettres, prixMoyenPaquet, variationRelative } from "../ventes";

describe("nombres en lettres (orthographe rectifiée)", () => {
  it.each([
    [0, "zéro"],
    [1, "un"],
    [16, "seize"],
    [17, "dix-sept"],
    [21, "vingt-et-un"],
    [71, "soixante-et-onze"],
    [77, "soixante-dix-sept"],
    [80, "quatre-vingts"],
    [81, "quatre-vingt-un"],
    [91, "quatre-vingt-onze"],
    [100, "cent"],
    [200, "deux-cents"],
    [201, "deux-cent-un"],
    [1000, "mille"],
    [80000, "quatre-vingt-mille"],
    [200000, "deux-cent-mille"],
    [3400, "trois-mille-quatre-cents"],
    [7666, "sept-mille-six-cent-soixante-six"],
    [1_000_000, "un-million"],
    [20_060_000, "vingt-millions-soixante-mille"],
    [1_075_658_074, "un-milliard-soixante-quinze-millions-six-cent-cinquante-huit-mille-soixante-quatorze"],
  ])("%i → %s", (n, texte) => {
    expect(nombreEnLettres(n)).toBe(texte);
  });
  it("formule de facture", () => {
    expect(montantEnLettresGnf(200_600)).toBe("Deux-cent-mille-six-cents francs guinéens");
    expect(montantEnLettresGnf(1)).toBe("Un franc guinéen");
  });
  it("refuse les montants non entiers", () => {
    expect(() => nombreEnLettres(1.5)).toThrow();
  });
});

describe("indicateurs commerciaux", () => {
  it("DSO = créances ÷ CA TTC × jours", () => {
    expect(calculerDso(300_000_000, 1_000_000_000, 30)).toBe(9);
    expect(calculerDso(100, 0, 30)).toBeNull();
  });
  it("prix moyen au paquet", () => {
    expect(prixMoyenPaquet(17_000_000, 5000)).toBe(3400);
    expect(prixMoyenPaquet(0, 0)).toBeNull();
  });
});

describe("marge brute et variations", () => {
  it("marge = CA HT − coût de revient des ventes", () => {
    expect(margeBrute(17_000_000, 7_400_000)).toEqual({ margeGnf: 9_600_000, taux: 9_600_000 / 17_000_000 });
    expect(margeBrute(0, 0)).toEqual({ margeGnf: 0, taux: null });
    expect(() => margeBrute(100, -1)).toThrow();
  });
  it("variation par rapport à la période précédente", () => {
    expect(variationRelative(110, 100)).toBeCloseTo(0.1);
    expect(variationRelative(90, 100)).toBeCloseTo(-0.1);
    expect(variationRelative(10, 0)).toBeNull();
    expect(variationRelative(null, 5)).toBeNull();
  });
});
