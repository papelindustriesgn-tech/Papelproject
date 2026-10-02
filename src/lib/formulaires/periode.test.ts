import { describe, expect, it } from "vitest";
import { joursDeLaPeriode, resoudrePeriode } from "./periode";

describe("périodes d'analyse", () => {
  const auj = "2026-10-02";
  it("jour, 7 jours, 30 jours avec période précédente de même durée", () => {
    expect(resoudrePeriode("jour", auj)).toMatchObject({ du: auj, au: auj, nbJours: 1, precedente: { du: "2026-10-01", au: "2026-10-01" } });
    expect(resoudrePeriode("7j", auj)).toMatchObject({ du: "2026-09-26", au: auj, nbJours: 7, precedente: { du: "2026-09-19", au: "2026-09-25" } });
    expect(resoudrePeriode(undefined, auj)).toMatchObject({ code: "30j", du: "2026-09-03", nbJours: 30 });
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
});
