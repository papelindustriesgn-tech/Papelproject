import { describe, expect, it } from "vitest";
import { distanceMetres, evaluerCheckin } from "./geo";
import { dimensionsCible } from "./image";
import { formaterNumero, prefixeSerie, prochainCompteur } from "./numerotation";

describe("distance GPS", () => {
  it("≈ 400 m pour 0,0036° de latitude", () => {
    expect(distanceMetres({ latitude: 9.54, longitude: -13.68 }, { latitude: 9.5436, longitude: -13.68 })).toBeCloseTo(400.3, 0);
  });
  it("Conakry (Kaloum) – Coyah ≈ 42 km à vol d'oiseau", () => {
    const d = distanceMetres({ latitude: 9.5092, longitude: -13.7122 }, { latitude: 9.7069, longitude: -13.3847 });
    expect(d / 1000).toBeGreaterThan(40);
    expect(d / 1000).toBeLessThan(45);
  });
  it("distance nulle pour le même point", () => {
    expect(distanceMetres({ latitude: 9.5, longitude: -13.7 }, { latitude: 9.5, longitude: -13.7 })).toBe(0);
  });
});

describe("évaluation du check-in", () => {
  const regles = { rayonM: 100, precisionMaxM: 50 };
  const pva = { latitude: 9.54, longitude: -13.68 };
  it("dans la zone", () => {
    expect(evaluerCheckin({ latitude: 9.5401, longitude: -13.68, precisionM: 10 }, pva, regles).statut).toBe("dans_zone");
  });
  it("hors zone", () => {
    expect(evaluerCheckin({ latitude: 9.5436, longitude: -13.68, precisionM: 10 }, pva, regles).statut).toBe("hors_zone");
  });
  it("GPS imprécis", () => {
    expect(evaluerCheckin({ latitude: 9.54, longitude: -13.68, precisionM: 120 }, pva, regles)).toEqual({ statut: "imprecis", precisionM: 120 });
  });
  it("nouveau PVA sans position", () => {
    expect(evaluerCheckin({ latitude: 9.54, longitude: -13.68, precisionM: 10 }, null, regles).statut).toBe("nouveau_pva");
  });
});

describe("numérotation hors ligne", () => {
  it("série du commercial", () => {
    expect(formaterNumero(prefixeSerie("facture", 2026, "C01"), 12)).toBe("FA-2026-C01-00012");
    expect(formaterNumero(prefixeSerie("devis", 2026, "C03"), 1)).toBe("DEV-2026-C03-00001");
  });
  it("le compteur ne recule jamais (téléphone réinstallé)", () => {
    expect(prochainCompteur(0, 41)).toBe(42);
    expect(prochainCompteur(50, 41)).toBe(51);
  });
  it("refuse un code de série invalide", () => {
    expect(() => prefixeSerie("facture", 2026, "c1 ")).toThrow(/série/);
  });
});

describe("compression des photos", () => {
  it("réduit en gardant les proportions", () => {
    expect(dimensionsCible(4000, 3000)).toEqual({ largeur: 1280, hauteur: 960 });
    expect(dimensionsCible(1080, 1920)).toEqual({ largeur: 720, hauteur: 1280 });
  });
  it("n'agrandit jamais", () => {
    expect(dimensionsCible(800, 600)).toEqual({ largeur: 800, hauteur: 600 });
  });
});
