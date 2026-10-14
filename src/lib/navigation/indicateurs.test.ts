import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { catalogueEcrans } from "./ecrans";
import { ICONES, INDICATEURS } from "./indicateurs";

// La configuration de départ (migration) ne doit utiliser que des indicateurs et icônes connus du code.
const migration = readFileSync("supabase/migrations/20261015001600_reglages_services.sql", "utf8");
const lignes = [...migration.matchAll(/\('([a-z]+)', '(action|etape|tache)', '(?:[^']|'')*', '(?:[^']|'')*', '([^']*)', '([^']*)', (null|'[a-z_]+'),/g)];

describe("réglages des services", () => {
  it("lit bien la configuration de départ", () => {
    expect(lignes.length).toBeGreaterThan(80);
  });
  it("chaque ligne « À faire » de départ utilise un indicateur du catalogue", () => {
    const codes = new Set(INDICATEURS.map((i) => i.code));
    for (const l of lignes.filter((x) => x[2] === "tache")) expect(codes.has(l[5].replaceAll("'", ""))).toBe(true);
  });
  it("chaque bouton de départ utilise une icône connue", () => {
    const icones = new Set(ICONES.map((i) => i.code));
    for (const l of lignes.filter((x) => x[2] === "action")) expect(icones.has(l[4])).toBe(true);
  });
  it("les codes d'indicateurs sont uniques", () => {
    expect(new Set(INDICATEURS.map((i) => i.code)).size).toBe(INDICATEURS.length);
  });
  it("le catalogue des écrans couvre les écrans de départ et n'a pas de doublon", () => {
    const ecrans = catalogueEcrans();
    const hrefs = new Set(ecrans.map((e) => e.href));
    expect(hrefs.size).toBe(ecrans.length);
    for (const l of lignes) expect(hrefs.has(l[3])).toBe(true);
  });
});
