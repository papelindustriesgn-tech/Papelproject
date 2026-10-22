import { describe, expect, it } from "vitest";
import { consequencesAvoir, lireAnalyseAvoir } from "./avoirs";

describe("consequencesAvoir", () => {
  it("facture impayée, paquets déjà revenus à la livraison : réduction de créance, pas de nouvelle entrée", () => {
    const p = consequencesAvoir({ totalTtcGnf: 67000, reductionCreanceGnf: 67000, creditClientGnf: 0, paquetsRetourStock: 0, paquetsDejaRevenus: 20, factureNumero: "FA-2026-00001" });
    expect(p[0]).toContain("Le reste à payer de la facture FA-2026-00001 diminue de 67");
    expect(p.some((x) => x.includes("20 paquets sont déjà revenus en stock"))).toBe(true);
    expect(p.at(-1)).toContain("Aucun paquet n'entre en stock");
    expect(p.some((x) => x.includes("crédit"))).toBe(false);
  });

  it("facture payée : crédit client explicite, jamais de remboursement automatique", () => {
    const p = consequencesAvoir({ totalTtcGnf: 16750, reductionCreanceGnf: 13500, creditClientGnf: 3250, paquetsRetourStock: 5, paquetsDejaRevenus: 0 });
    expect(p.join(" ")).toContain("crédit en faveur du client");
    expect(p.join(" ")).toContain("rien n'est remboursé automatiquement");
    expect(p.join(" ")).toContain("5 paquets rapportés à l'usine entrent en stock (une seule fois)");
  });
});

describe("lireAnalyseAvoir", () => {
  it("convertit les nombres et tolère les champs absents (analyse en erreur)", () => {
    const a = lireAnalyseAvoir({ erreurs: ["L'avoir doit porter sur une facture validée."], lignes: [] });
    expect(a.erreurs).toHaveLength(1);
    expect(a.reduction_creance_gnf).toBe(0);
    const b = lireAnalyseAvoir({ lignes: [{ ligne_id: "x", conditionnement_id: "c", paquets: "20", retour_livraison: 20, retour_stock: 0, retour_stock_max: "0", max_creditable: 100 }] });
    expect(b.lignes[0]).toMatchObject({ paquets: 20, retour_livraison: 20, retour_stock_max: 0 });
  });
});
