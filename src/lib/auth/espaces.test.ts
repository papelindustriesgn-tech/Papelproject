import { describe, expect, it } from "vitest";
import { accueilPour, espaceDuChemin, espacesAccessibles, ESPACES, peutAcceder } from "./espaces";

const espace = (code: string) => ESPACES.find((e) => e.code === code)!;

describe("accès aux espaces", () => {
  it("chaque rôle ne voit que ses espaces", () => {
    expect(espacesAccessibles(["magasin"]).map((e) => e.code)).toEqual(["magasin"]);
    expect(espacesAccessibles(["commercial_terrain"]).map((e) => e.code)).toEqual(["terrain"]);
    expect(peutAcceder(espace("finance"), ["magasin"])).toBe(false);
    expect(peutAcceder(espace("admin"), ["finance"])).toBe(false);
  });
  it("la direction voit tout", () => {
    expect(espacesAccessibles(["direction"])).toHaveLength(ESPACES.length);
  });
  it("cumul de rôles", () => {
    expect(espacesAccessibles(["magasin", "production"]).map((e) => e.code)).toEqual(["magasin", "production"]);
  });
  it("page d'accueil selon le rôle", () => {
    expect(accueilPour(["commercial_terrain"])).toBe("/terrain");
    expect(accueilPour(["direction"])).toBe("/direction");
    expect(accueilPour([])).toBe("/acces-refuse");
  });
  it("espace d'un chemin", () => {
    expect(espaceDuChemin("/admin/utilisateurs")?.code).toBe("admin");
    expect(espaceDuChemin("/connexion")).toBeUndefined();
  });
});
