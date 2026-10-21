import { describe, expect, it } from "vitest";
import { calculerBulletin, congesAcquis, impotProgressif, joursOuvrables, moisComplets, tauxAbsenteisme, type ReglesPaie } from "./rh";

const TRANCHES = [
  { deGnf: 0, taux: 0 },
  { deGnf: 1_000_001, taux: 0.05 },
  { deGnf: 3_000_001, taux: 0.08 },
  { deGnf: 5_000_001, taux: 0.1 },
];
const REGLES: ReglesPaie = {
  heuresMensuelles: 173.33,
  majorationHeuresSup: 0.3,
  joursOuvrablesMois: 26,
  tauxCnssSalarie: 0.05,
  tauxCnssEmployeur: 0.18,
  plafondCnssGnf: 2_500_000,
  tranchesRts: TRANCHES,
};

describe("jours ouvrables", () => {
  it("compte du lundi au samedi, sans le dimanche", () => {
    // 12/10/2026 est un lundi → 18/10 dimanche
    expect(joursOuvrables("2026-10-12", "2026-10-18")).toBe(6);
  });
  it("retire les jours fériés", () => {
    expect(joursOuvrables("2026-10-12", "2026-10-18", new Set(["2026-10-14"]))).toBe(5);
  });
  it("vaut 0 si la fin est avant le début", () => {
    expect(joursOuvrables("2026-10-12", "2026-10-11")).toBe(0);
  });
});

describe("congés acquis", () => {
  it("compte les mois complets", () => {
    expect(moisComplets("2026-01-15", "2026-10-14")).toBe(8);
    expect(moisComplets("2026-01-15", "2026-10-15")).toBe(9);
  });
  it("2,5 jours par mois complet", () => {
    expect(congesAcquis("2026-01-15", "2026-10-15", 2.5)).toBe(22.5);
  });
});

describe("impôt progressif (RTS)", () => {
  it("rien sous la première tranche", () => {
    expect(impotProgressif(900_000, TRANCHES)).toBe(0);
  });
  it("chaque taux s'applique à sa tranche", () => {
    // 2 000 000 − 1 000 000 = 1 000 000 à 5 %
    expect(impotProgressif(2_000_000, TRANCHES)).toBe(50_000);
    // 2 000 000 à 5 % + 500 000 à 8 %
    expect(impotProgressif(3_500_000, TRANCHES)).toBe(140_000);
  });
});

describe("bulletin de paie", () => {
  it("salaire simple", () => {
    const b = calculerBulletin({ salaireBaseGnf: 2_000_000, primesGnf: 0, heuresSup: 0, joursAbsenceNonPayee: 0, avancesGnf: 0 }, REGLES);
    expect(b.brutGnf).toBe(2_000_000);
    expect(b.cnssSalarieGnf).toBe(100_000);
    expect(b.cnssEmployeurGnf).toBe(360_000);
    expect(b.imposableGnf).toBe(1_900_000);
    expect(b.rtsGnf).toBe(45_000);
    expect(b.netGnf).toBe(1_855_000);
    expect(b.coutEmployeurGnf).toBe(2_360_000);
  });
  it("CNSS plafonnée", () => {
    const b = calculerBulletin({ salaireBaseGnf: 4_000_000, primesGnf: 0, heuresSup: 0, joursAbsenceNonPayee: 0, avancesGnf: 0 }, REGLES);
    expect(b.cnssSalarieGnf).toBe(125_000);
    expect(b.cnssEmployeurGnf).toBe(450_000);
  });
  it("heures sup, primes, absence et avance", () => {
    const b = calculerBulletin({ salaireBaseGnf: 1_733_300, primesGnf: 100_000, heuresSup: 10, joursAbsenceNonPayee: 2, avancesGnf: 200_000 }, REGLES);
    // taux horaire 10 000 × 1,3 × 10 h = 130 000 ; retenue 1 733 300 ÷ 26 × 2 = 133 331
    expect(b.montantHeuresSupGnf).toBe(130_000);
    expect(b.retenueAbsencesGnf).toBe(133_331);
    expect(b.brutGnf).toBe(1_733_300 + 100_000 + 130_000 - 133_331);
    expect(b.netGnf).toBe(b.brutGnf - b.cnssSalarieGnf - b.rtsGnf - 200_000);
  });
  it("la retenue d'absence ne dépasse jamais le salaire de base", () => {
    const b = calculerBulletin({ salaireBaseGnf: 1_000_000, primesGnf: 0, heuresSup: 0, joursAbsenceNonPayee: 40, avancesGnf: 0 }, REGLES);
    expect(b.retenueAbsencesGnf).toBe(1_000_000);
    expect(b.brutGnf).toBe(0);
  });
});

describe("absentéisme", () => {
  it("absences ÷ jours pointés, congés exclus", () => {
    expect(tauxAbsenteisme([{ statut: "present" }, { statut: "absent" }, { statut: "retard" }, { statut: "conge" }])).toBeCloseTo(1 / 3);
    expect(tauxAbsenteisme([])).toBeNull();
  });
});
