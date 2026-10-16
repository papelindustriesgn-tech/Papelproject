import { describe, expect, it } from "vitest";
import { adresseFiltres, lireFiltresAnalyse } from "./filtres-analyse";

const id = "0b8e6f0e-1d2c-4a5b-9c8d-7e6f5a4b3c2d";

describe("filtres des vues d'ensemble", () => {
  it("lit gamme et commercial, ignore une valeur mal formée", () => {
    expect(lireFiltresAnalyse({ produit: id, commercial: "x' or 1=1" })).toEqual({ produit: id, commercial: null });
    expect(lireFiltresAnalyse({ produit: [id, "autre"] })).toEqual({ produit: id, commercial: null });
    expect(lireFiltresAnalyse({})).toEqual({ produit: null, commercial: null });
  });
  it("garde les autres filtres quand on en change un", () => {
    const actuels = { periode: "perso", du: "2026-09-01", au: "2026-09-30", produit: id, q: "recherche" };
    expect(adresseFiltres(actuels, { commercial: id })).toBe(`?periode=perso&du=2026-09-01&au=2026-09-30&produit=${id}&commercial=${id}`);
    expect(adresseFiltres(actuels, { periode: "mois", du: null, au: null })).toBe(`?periode=mois&produit=${id}`);
    expect(adresseFiltres({ produit: id }, { produit: "" })).toBe("?");
  });
});
