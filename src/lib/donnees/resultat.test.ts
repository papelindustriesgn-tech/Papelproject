import { describe, expect, it, vi } from "vitest";
import { ErreurChargement, exigerDonnees } from "./resultat";

describe("exigerDonnees", () => {
  it("renvoie les données d'une requête réussie, même vides", () => {
    expect(exigerDonnees({ data: [1, 2], error: null }, "les articles")).toEqual([1, 2]);
    expect(exigerDonnees({ data: [], error: null }, "les articles")).toEqual([]);
    expect(exigerDonnees({ data: null, error: null }, "la facture")).toBeNull();
  });

  it("lève une erreur au lieu de laisser croire à une liste vide quand la requête échoue", () => {
    const journal = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => exigerDonnees({ data: null, error: { code: "PGRST301", message: "JWT expired" } }, "l'état du stock")).toThrow(ErreurChargement);
    expect(() => exigerDonnees({ data: null, error: { message: "fetch failed" } }, "l'état du stock")).toThrow("Chargement impossible : l'état du stock.");
    journal.mockRestore();
  });
});
