import { describe, expect, it } from "vitest";
import { aideDuLibelle, LEXIQUE } from "./lexique";

describe("aideDuLibelle", () => {
  it("trouve l'explication d'après le libellé de la tuile", () => {
    expect(aideDuLibelle("Livrées à temps et complètes")).toBe(LEXIQUE.livre_a_temps);
    expect(aideDuLibelle("Efficacité des machines")).toBe(LEXIQUE.efficacite_machines);
    expect(aideDuLibelle("Rendement")).toBe(LEXIQUE.rendement);
    expect(aideDuLibelle("Bénéfice (ou perte)")).toBe(LEXIQUE.benefice);
    expect(aideDuLibelle("Marge sur les ventes")).toBe(LEXIQUE.marge);
    expect(aideDuLibelle("Ventes (hors taxes)")).toBe(LEXIQUE.ventes);
    expect(aideDuLibelle("Jours de stock de matière")).toBe(LEXIQUE.jours_stock);
    expect(aideDuLibelle("Temps moyen entre deux pannes")).toBe(LEXIQUE.temps_entre_pannes);
  });

  it("ne met pas de « ? » sur un libellé déjà clair", () => {
    expect(aideDuLibelle("Visites")).toBeNull();
    expect(aideDuLibelle("Paquets produits")).toBeNull();
  });

  it("chaque explication est courte et sans sigle seul", () => {
    for (const m of Object.values(LEXIQUE)) {
      expect(m.explication.length).toBeLessThanOrEqual(260);
      expect(m.explication).not.toMatch(/\b(OTIF|TRS|DSO|BFR|CMP|MTBF|MTTR|PVA)\b/);
    }
  });
});
