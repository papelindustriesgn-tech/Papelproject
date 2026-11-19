import { describe, expect, it, vi } from "vitest";
import { ErreurChargement, exigerDonnees, lireTout } from "./resultat";

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

describe("lireTout", () => {
  /** Fausse table de n lignes servie par pages, comme l'API (jamais plus de 1 000 lignes par réponse). */
  const table = (n: number, panneA?: number) => {
    const appels: [number, number][] = [];
    const fabrique = () => ({
      range: (de: number, a: number) => {
        appels.push([de, a]);
        if (panneA !== undefined && de >= panneA) return Promise.resolve({ data: null, error: new Error("réseau") });
        const fin = Math.min(a + 1, n, de + 1000);
        return Promise.resolve({ data: Array.from({ length: Math.max(0, fin - de) }, (_, i) => de + i), error: null });
      },
    });
    return { fabrique, appels };
  };

  it("lit toutes les lignes au-delà de 1 000, sans doublon", async () => {
    const t = table(2500);
    const r = await lireTout(t.fabrique);
    expect(r.error).toBeNull();
    expect(r.data).toHaveLength(2500);
    expect(new Set(r.data).size).toBe(2500);
    expect(t.appels).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
  });

  it("exactement 1 000 lignes : une page de plus, vide", async () => {
    const r = await lireTout(table(1000).fabrique);
    expect(r.data).toHaveLength(1000);
  });

  it("une page en échec rend l'erreur, jamais une liste partielle", async () => {
    const r = await lireTout(table(3000, 1000).fabrique);
    expect(r.data).toBeNull();
    expect(r.error).toBeInstanceOf(Error);
  });
});
