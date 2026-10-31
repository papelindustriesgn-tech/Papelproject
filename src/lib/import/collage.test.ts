import { describe, expect, it } from "vitest";
import { analyserImport, lireCollage, lireDate, normaliser, type ColonneImport } from "./collage";

const COLONNES: ColonneImport[] = [
  { cle: "nom", libelle: "Nom", obligatoire: true, max: 60 },
  { cle: "prenom", libelle: "Prénom" },
  { cle: "fonction_id", libelle: "Fonction", type: "choix", choix: [{ valeur: "f1", libelles: ["Opérateur machine"] }, { valeur: "f2", libelles: ["Magasinier"] }] },
  { cle: "date_embauche", libelle: "Date d'embauche", obligatoire: true, type: "date" },
  { cle: "salaire", libelle: "Salaire de base", type: "montant" },
];

describe("lireCollage", () => {
  it("lit les tabulations d'Excel, sinon les « ; », sans lignes vides", () => {
    expect(lireCollage("a\tb\r\n\r\nc\td\n")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
    expect(lireCollage('"x";y')).toEqual([["x", "y"]]);
  });
});

describe("lireDate", () => {
  it("accepte JJ/MM/AAAA, J/M/AA et l'ISO ; refuse une date impossible", () => {
    expect(lireDate("15/03/2024")).toBe("2024-03-15");
    expect(lireDate("5/3/24")).toBe("2024-03-05");
    expect(lireDate("2024-03-15")).toBe("2024-03-15");
    expect(lireDate("31/02/2024")).toBeNull();
    expect(lireDate("mars 2024")).toBeNull();
  });
});

describe("analyserImport", () => {
  it("sans titres : colonnes dans l'ordre du modèle, nombres et listes reconnus", () => {
    const r = analyserImport("Bah\tMamadou\topérateur machine\t01/02/2025\t1 500 000 GNF", COLONNES);
    expect(r.entete).toBe(false);
    expect(r.valides).toHaveLength(1);
    expect(r.lignes[0]).toEqual({
      numero: 1,
      valeurs: { nom: "Bah", prenom: "Mamadou", fonction_id: "f1", date_embauche: "2025-02-01", salaire: 1500000 },
      erreurs: [],
    });
  });

  it("avec titres : colonnes dans n'importe quel ordre, colonnes inconnues ignorées", () => {
    const r = analyserImport("Date d'embauche\tNOM\tCouleur\n01/01/2025\tDiallo\tbleu", COLONNES);
    expect(r.entete).toBe(true);
    expect(r.colonnesIgnorees).toEqual(["Couleur"]);
    expect(r.lignes[0]).toMatchObject({ numero: 2, valeurs: { nom: "Diallo", date_embauche: "2025-01-01", prenom: null }, erreurs: [] });
  });

  it("explique chaque erreur en mots simples", () => {
    const r = analyserImport("\tAwa\tChauffeur\t32/01/2025\tbeaucoup", COLONNES);
    expect(r.valides).toHaveLength(0);
    expect(r.lignes[0].erreurs).toEqual([
      "« Nom » est obligatoire.",
      "« Fonction » : « Chauffeur » n'existe pas dans la liste (Opérateur machine, Magasinier…).",
      "« Date d'embauche » : date illisible « 32/01/2025 » (écrire JJ/MM/AAAA).",
      "« Salaire de base » : nombre illisible « beaucoup ».",
    ]);
  });

  it("refuse les doublons (déjà en base ou deux fois dans le collage) : recoller est sans danger", () => {
    const doublon = (v: Record<string, unknown>) => normaliser(String(v.nom));
    const r = analyserImport("Bah\t\t\t01/01/2025\nCamara\t\t\t01/01/2025\ncamara\t\t\t01/01/2025", COLONNES, { doublon, existants: new Set(["bah"]) });
    expect(r.lignes.map((l) => l.erreurs)).toEqual([["Existe déjà dans l'ERP."], [], ["En double dans le collage."]]);
  });
});
