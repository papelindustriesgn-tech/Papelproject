import { describe, expect, it } from "vitest";
import { ecrituresAchat, ecrituresTresorerie, ecrituresVente, lignesExport, piecesDesequilibrees, type ComptesParametres } from "../comptabilite";

const C: ComptesParametres = { clients: "4111", ventes: "7021", tvaCollectee: "4431", fournisseurs: "4011", tvaDeductible: "4452", virements: "585", attente: "4711" };

describe("écritures comptables", () => {
  it("facture de vente TTC équilibrée, avoir inversé", () => {
    const f = ecrituresVente({ type: "facture", numero: "FA-2026-00001", date: "2026-10-01", clientCode: "CL-00001", clientNom: "Grossiste", htGnf: 170_000, tvaGnf: 30_600, ttcGnf: 200_600 }, C);
    expect(f.map((e) => [e.compte, e.debit, e.credit])).toEqual([
      ["4111", 200_600, 0],
      ["7021", 0, 170_000],
      ["4431", 0, 30_600],
    ]);
    const a = ecrituresVente({ type: "avoir", numero: "AV-2026-00001", date: "2026-10-02", clientCode: "CL-00001", clientNom: "Grossiste", htGnf: 34_000, tvaGnf: 6_120, ttcGnf: 40_120 }, C);
    expect(a[0]).toMatchObject({ compte: "4111", debit: 0, credit: 40_120 });
    expect(piecesDesequilibrees([...f, ...a])).toEqual([]);
  });

  it("facture fournisseur : charge + TVA déductible / fournisseur", () => {
    const e = ecrituresAchat({ numero: "FF-2026-00001", date: "2026-10-01", tiers: "Station", libelle: "Gasoil", compteCharge: "6052", htGnf: 9_500_000, tvaGnf: 1_710_000 }, C);
    expect(e.map((x) => [x.compte, x.debit, x.credit])).toEqual([
      ["6052", 9_500_000, 0],
      ["4452", 1_710_000, 0],
      ["4011", 0, 11_210_000],
    ]);
    expect(ecrituresAchat({ numero: "FF-2", date: "2026-10-01", tiers: "X", libelle: "Y", compteCharge: "", htGnf: 10, tvaGnf: 0 }, C)[0].compte).toBe("4711");
  });

  it("trésorerie : encaissement client, règlement fournisseur, virement, divers", () => {
    const base = { date: "2026-10-01", montantGnf: 1000, compteTresorerie: "5711", compteCharge: null, tiers: "T", libelle: "L", reference: "R" };
    const enc = ecrituresTresorerie({ ...base, id: "1", sens: "entree", origine: "client" }, C);
    expect(enc.map((x) => [x.compte, x.debit, x.credit, x.tiers])).toEqual([
      ["5711", 1000, 0, ""],
      ["4111", 0, 1000, "T"],
    ]);
    expect(ecrituresTresorerie({ ...base, id: "2", sens: "sortie", origine: "fournisseur" }, C)[1]).toMatchObject({ compte: "4011", debit: 1000 });
    expect(ecrituresTresorerie({ ...base, id: "3", sens: "sortie", origine: "virement" }, C)[1].compte).toBe("585");
    expect(ecrituresTresorerie({ ...base, id: "4", sens: "sortie", origine: "autre", compteCharge: "6311" }, C)[1].compte).toBe("6311");
    expect(ecrituresTresorerie({ ...base, id: "5", sens: "entree", origine: "autre" }, C)[1]).toMatchObject({ compte: "4711", credit: 1000 });
  });

  it("export : date française", () => {
    const l = lignesExport(ecrituresTresorerie({ id: "abcdefgh-1", date: "2026-10-01", sens: "entree", montantGnf: 5, origine: "autre", compteTresorerie: "5211", compteCharge: null, tiers: "", libelle: "Apport", reference: "" }, C));
    expect(l[0]).toEqual(["TR", "01/10/2026", "abcdefgh", "5211", "", "Apport", 5, 0]);
  });
});
