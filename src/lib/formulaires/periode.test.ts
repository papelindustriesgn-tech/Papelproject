import { describe, expect, it } from "vitest";
import { joursDeLaPeriode, libelleMois, listeMois, resoudrePeriode, serieRegroupee } from "./periode";

describe("périodes d'analyse", () => {
  const auj = "2026-10-02";
  it("jour, 7 jours, 30 jours avec période précédente de même durée", () => {
    expect(resoudrePeriode("jour", auj)).toMatchObject({ du: auj, au: auj, nbJours: 1, precedente: { du: "2026-10-01", au: "2026-10-01" } });
    expect(resoudrePeriode("7j", auj)).toMatchObject({ du: "2026-09-26", au: auj, nbJours: 7, precedente: { du: "2026-09-19", au: "2026-09-25" } });
    expect(resoudrePeriode(undefined, auj)).toMatchObject({ code: "30j", du: "2026-09-03", nbJours: 30 });
  });
  it("semaine en cours, du lundi à aujourd'hui", () => {
    // 2026-10-02 est un vendredi : semaine du lundi 28 septembre, comparée au lundi-vendredi précédent.
    expect(resoudrePeriode("semaine", auj)).toMatchObject({ du: "2026-09-28", au: auj, nbJours: 5, precedente: { du: "2026-09-21", au: "2026-09-25" } });
    expect(resoudrePeriode("semaine", "2026-09-28")).toMatchObject({ du: "2026-09-28", nbJours: 1 });
    expect(resoudrePeriode("semaine", "2026-10-04")).toMatchObject({ du: "2026-09-28", nbJours: 7 });
  });
  it("mois, trimestre, année en cours", () => {
    expect(resoudrePeriode("mois", auj).du).toBe("2026-10-01");
    expect(resoudrePeriode("trimestre", "2026-08-15").du).toBe("2026-07-01");
    expect(resoudrePeriode("annee", auj).du).toBe("2026-01-01");
  });
  it("période personnalisée, et repli si les dates sont invalides", () => {
    expect(resoudrePeriode("perso", auj, "2026-09-01", "2026-09-30")).toMatchObject({ du: "2026-09-01", au: "2026-09-30", nbJours: 30, precedente: { du: "2026-08-02", au: "2026-08-31" } });
    expect(resoudrePeriode("perso", auj, "2026-09-30", "2026-09-01").nbJours).toBe(30);
  });
  it("jours d'une période, y compris un changement de mois", () => {
    expect(joursDeLaPeriode({ du: "2026-09-29", au: "2026-10-02" })).toEqual(["2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"]);
  });
  it("courbe par jour, par semaine ou par mois selon la durée", () => {
    const parJour = serieRegroupee({ du: "2026-10-01", au: "2026-10-03" }, (j) => (j === "2026-10-02" ? null : 1));
    expect(parJour).toEqual([
      { date: "2026-10-01", valeur: 1, axe: "01/10", libelle: "Le 01/10" },
      { date: "2026-10-02", valeur: null, axe: "02/10", libelle: "Le 02/10" },
      { date: "2026-10-03", valeur: 1, axe: "03/10", libelle: "Le 03/10" },
    ]);
    // 2026-08-01 → 2026-10-02 (63 jours) : semaines du lundi, la première commence le 27/07.
    const semaines = serieRegroupee({ du: "2026-08-01", au: "2026-10-02" }, () => 1);
    expect(semaines[0]).toMatchObject({ date: "2026-07-27", valeur: 2, libelle: "Semaine du 27/07" });
    expect(semaines.reduce((s, p) => s + (p.valeur ?? 0), 0)).toBe(63);
    const mois = serieRegroupee({ du: "2026-01-01", au: "2026-10-02" }, () => 1);
    expect(mois).toHaveLength(10);
    expect(mois[1]).toMatchObject({ date: "2026-02-01", valeur: 28, axe: "févr. 26", libelle: "Février 2026" });
  });
  it("mois choisi dans la liste : complet s'il est passé, comparé au mois précédent", () => {
    expect(resoudrePeriode("mois", auj, undefined, undefined, "2026-09")).toMatchObject({ du: "2026-09-01", au: "2026-09-30", nbJours: 30, precedente: { du: "2026-08-01", au: "2026-08-30" } });
    // Mois en cours : jusqu'à aujourd'hui, comparé aux mêmes jours du mois précédent.
    expect(resoudrePeriode("mois", auj)).toMatchObject({ du: "2026-10-01", au: auj, precedente: { du: "2026-09-01", au: "2026-09-02" } });
    // Mars (31 j) comparé à février : borné au 28.
    expect(resoudrePeriode("mois", auj, undefined, undefined, "2026-03").precedente).toEqual({ du: "2026-02-01", au: "2026-02-28" });
    // Mois futur ou mal formé : mois en cours.
    expect(resoudrePeriode("mois", auj, undefined, undefined, "2027-01").du).toBe("2026-10-01");
    expect(resoudrePeriode("mois", auj, undefined, undefined, "2026-13").du).toBe("2026-10-01");
  });
  it("liste des mois, du plus récent au plus ancien, changement d'année compris", () => {
    expect(listeMois("2026-02-15", 3)).toEqual([
      { valeur: "2026-02", libelle: "Févr. 2026" },
      { valeur: "2026-01", libelle: "Janv. 2026" },
      { valeur: "2025-12", libelle: "Déc. 2025" },
    ]);
    expect(libelleMois("2026-08")).toBe("Août 2026");
  });
});
