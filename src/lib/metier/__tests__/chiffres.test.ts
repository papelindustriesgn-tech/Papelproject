import { describe, expect, it } from "vitest";
import { etatProduction, etatTresorerie, margeAffichable } from "../chiffres";

describe("etatTresorerie", () => {
  const jour = "2026-11-19";
  it("validée quand tous les comptes sont vérifiés depuis moins de 7 jours", () => {
    expect(etatTresorerie([{ date: "2026-11-18" }, { date: "2026-11-15" }], jour)).toEqual({ etat: "valide", derniere: "2026-11-15", jamais: 0, enRetard: 0 });
  });
  it("estimée si un compte n'a jamais été vérifié ou l'a été il y a longtemps", () => {
    expect(etatTresorerie([{ date: "2026-11-18" }, { date: null }], jour)).toMatchObject({ etat: "estime", derniere: null, jamais: 1 });
    expect(etatTresorerie([{ date: "2026-10-01" }], jour)).toMatchObject({ etat: "estime", derniere: "2026-10-01", enRetard: 1 });
  });
  it("aucun compte : données à compléter", () => {
    expect(etatTresorerie([], jour).etat).toBe("non_renseigne");
  });
});

describe("margeAffichable", () => {
  it("aucune vente : aucune activité (pas une marge à 0)", () => {
    expect(margeAffichable(0, 0)).toEqual({ etat: "aucune_activite", partSansCout: null });
  });
  it("tous les paquets ont un coût : validée ; un peu sans coût : estimée ; trop : masquée", () => {
    expect(margeAffichable(1000, 0).etat).toBe("valide");
    expect(margeAffichable(1000, 30).etat).toBe("estime");
    expect(margeAffichable(1000, 300)).toEqual({ etat: "non_renseigne", partSansCout: 0.3 });
  });
});

describe("etatProduction", () => {
  it("usine pas démarrée : rien à afficher ni à alerter", () => {
    expect(etatProduction(0, 0)).toBe("pas_demarree");
    expect(etatProduction(0, 12)).toBe("aucune_sur_periode");
    expect(etatProduction(3, 12)).toBe("active");
  });
});
