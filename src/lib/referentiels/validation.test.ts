import { describe, expect, it } from "vitest";
import { referentiel, REFERENTIELS } from "./definitions";
import { validerSaisie } from "./validation";

describe("validation des listes de référence", () => {
  const niveaux = referentiel("niveaux-prix")!;
  it("accepte une saisie valide et ignore les champs non déclarés", () => {
    expect(validerSaisie(niveaux, { code: "b2b", libelle: "Prix B2B", ordre: "4", pirate: "x" }, true)).toEqual({
      donnees: { code: "b2b", libelle: "Prix B2B", description: "", ordre: 4 },
    });
  });
  it("messages d'erreur en français", () => {
    const r = validerSaisie(niveaux, { code: "B2B !", libelle: "", ordre: "1,5" }, true);
    expect(r).toEqual({
      erreurs: {
        code: "Code : minuscules sans accent, chiffres ou _ (ex. b2b).",
        libelle: "Libellé : champ obligatoire.",
        ordre: "Ordre d'affichage : nombre entier attendu.",
      },
    });
  });
  it("un champ figé n'est pas modifiable après création", () => {
    expect(validerSaisie(niveaux, { code: "autre", libelle: "X" }, false)).toEqual({ donnees: { libelle: "X", description: "" } });
  });
  it("choix et références contrôlés", () => {
    const cat = referentiel("categories-articles")!;
    expect("erreurs" in validerSaisie(cat, { famille: "inconnue", libelle: "Films" }, true)).toBe(true);
    const communes = referentiel("communes")!;
    expect("erreurs" in validerSaisie(communes, { ville_id: "'; drop table", nom: "X" }, true)).toBe(true);
  });
  it("codes de listes uniques", () => {
    expect(new Set(REFERENTIELS.map((r) => r.code)).size).toBe(REFERENTIELS.length);
  });
});
