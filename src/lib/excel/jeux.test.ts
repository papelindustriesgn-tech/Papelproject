import { describe, expect, it } from "vitest";
import { jeuExcel, JEUX_EXCEL, lignesOrdonnees } from "./jeux";

describe("jeux Excel", () => {
  it("connaît chaque jeu par son code", () => {
    expect(JEUX_EXCEL.map((j) => j.code)).toEqual(["factures", "paiements", "stock", "achats", "tresorerie", "production"]);
    expect(jeuExcel("inconnu")).toBeUndefined();
  });

  it("remet les colonnes dans l'ordre et arrondit les montants GNF", () => {
    const stock = jeuExcel("stock")!;
    const lignes = lignesOrdonnees(stock, [{ "Valeur": 229917281.03, "Code": "MP-BOB-13", "Quantité": 17063.456, "Article": "Bobine", "Unité": "kg" }]);
    expect(lignes[0].slice(0, 6)).toEqual(["MP-BOB-13", "Bobine", null, "kg", 17063.46, 229917281]);
  });
});
