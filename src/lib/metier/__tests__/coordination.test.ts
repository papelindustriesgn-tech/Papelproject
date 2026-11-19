import { describe, expect, it } from "vitest";
import { etatCommande, planifierCommandes, type Approvisionnement } from "../coordination";
import { estimerCoordination, stocksProduitsFinis } from "@/lib/coordination/estimer";

const auj = "2026-11-10";
const appro = (p: Partial<Approvisionnement> = {}): Approvisionnement => ({
  stock: new Map(),
  rythmeReel: new Map(),
  rythmeTheorique: new Map(),
  ordres: [],
  ...p,
});
const l = (commandeId: string, paquetsRestants: number, conditionnementId = "petit100") => ({ commandeId, conditionnementId, paquetsRestants });

describe("coordination des commandes clients", () => {
  it("stock réservé dans l'ordre d'arrivée des commandes ; livraison = aujourd'hui + délai", () => {
    const r = planifierCommandes([l("A", 3000), l("B", 2000)], appro({ stock: new Map([["petit100", 4000]]) }), auj, 1);
    expect(r[0]).toMatchObject({ paquetsEnStock: 3000, paquetsAProduire: 0, datePrete: auj, dateLivraison: "2026-11-11", source: "stock" });
    // B : 1 000 en stock, 1 000 à produire, rien de planifié → délai inconnu.
    expect(r[1]).toMatchObject({ paquetsEnStock: 1000, paquetsAProduire: 1000, datePrete: null, dateLivraison: null, source: "inconnue" });
  });
  it("manque produit au rythme réel, cumulé d'une commande à l'autre", () => {
    const r = planifierCommandes([l("A", 5000), l("B", 5000)], appro({ rythmeReel: new Map([["petit100", 2000]]) }), auj, 2);
    // A : 5 000 ÷ 2 000 = 3 jours ; B : 10 000 ÷ 2 000 = 5 jours.
    expect(r[0]).toMatchObject({ datePrete: "2026-11-13", dateLivraison: "2026-11-15", source: "rythme" });
    expect(r[1]).toMatchObject({ datePrete: "2026-11-15", dateLivraison: "2026-11-17" });
  });
  it("sans rythme réel : ordres de fabrication en cours, puis cadence théorique", () => {
    const ordres = [
      { numero: "OF-2026-0002", conditionnementId: "petit100", paquetsRestants: 5000, dateFinPrevue: "2026-11-20" },
      { numero: "OF-2026-0001", conditionnementId: "petit100", paquetsRestants: 3000, dateFinPrevue: "2026-11-12" },
    ];
    const r = planifierCommandes([l("A", 2000), l("B", 4000), l("C", 5000)], appro({ ordres, rythmeTheorique: new Map([["petit100", 10000]]) }), auj, 1);
    expect(r[0]).toMatchObject({ datePrete: "2026-11-12", source: "ordre", ordre: "OF-2026-0001" });
    expect(r[1]).toMatchObject({ datePrete: "2026-11-20", source: "ordre", ordre: "OF-2026-0002" });
    // C : 11 000 cumulés > 8 000 couverts par les ordres → cadence théorique : 11 000 ÷ 10 000 = 2 jours.
    expect(r[2]).toMatchObject({ datePrete: "2026-11-12", source: "cadence" });
  });
  it("un conditionnement n'emprunte pas le stock d'un autre ; ordre en retard = disponible aujourd'hui au plus tôt", () => {
    const r = planifierCommandes(
      [l("A", 100, "grand30")],
      appro({ stock: new Map([["petit100", 9999]]), ordres: [{ numero: "OF-1", conditionnementId: "grand30", paquetsRestants: 500, dateFinPrevue: "2026-11-01" }] }),
      auj,
      0,
    );
    expect(r[0]).toMatchObject({ paquetsEnStock: 0, datePrete: auj, source: "ordre" });
  });
  it("état d'une commande et date de livraison la plus tardive", () => {
    expect(etatCommande([{ paquetsEnStock: 10, paquetsAProduire: 0, dateLivraison: "2026-11-11" }])).toEqual({ etat: "en_stock", dateLivraison: "2026-11-11" });
    expect(etatCommande([
      { paquetsEnStock: 10, paquetsAProduire: 0, dateLivraison: "2026-11-11" },
      { paquetsEnStock: 0, paquetsAProduire: 5, dateLivraison: "2026-11-14" },
    ])).toEqual({ etat: "partielle", dateLivraison: "2026-11-14" });
    expect(etatCommande([{ paquetsEnStock: 0, paquetsAProduire: 5, dateLivraison: null }])).toEqual({ etat: "a_produire", dateLivraison: null });
  });
});

describe("stocksProduitsFinis", () => {
  it("physique, réservé par les restes à livrer, disponible (négatif = manque)", () => {
    const r = stocksProduitsFinis({
      conditionnements: [
        { id: "c50", libelle: "Colis de 50", produit_id: "p", produit: "Petit 100", paquets_par_colis: 50 },
        { id: "c100", libelle: "Colis de 100", produit_id: "p", produit: "Petit 100", paquets_par_colis: 100 },
      ],
      stocks: [{ conditionnement_id: "c100", paquets: 1000 }, { conditionnement_id: "c50", paquets: 100 }],
      lignes: [
        { commande_id: "a", numero: "", date_piece: "", client_id: "", client_nom: "", commercial_id: null, commercial_nom: "", conditionnement_id: "c100", paquets_restants: 600 },
        { commande_id: "b", numero: "", date_piece: "", client_id: "", client_nom: "", commercial_id: null, commercial_nom: "", conditionnement_id: "c100", paquets_restants: 300 },
        { commande_id: "c", numero: "", date_piece: "", client_id: "", client_nom: "", commercial_id: null, commercial_nom: "", conditionnement_id: "c50", paquets_restants: 250 },
      ],
    });
    expect(r.map((x) => [x.conditionnementId, x.physique, x.reserve, x.disponible])).toEqual([
      ["c50", 100, 250, -150],
      ["c100", 1000, 900, 100],
    ]);
  });
});

describe("estimerCoordination : produit acheté (non fabriqué)", () => {
  it("le manque attend une réception, sans date ni besoin de production", () => {
    const brut = {
      jour: "2026-11-19",
      delai_livraison_jours: 1,
      jours_reference: 30,
      lignes: [{ commande_id: "k", numero: "CMD-1", date_piece: "2026-11-18", client_id: "x", client_nom: "X", commercial_id: null, commercial_nom: "", conditionnement_id: "ci", paquets_restants: 120 }],
      conditionnements: [{ id: "ci", libelle: "Colis de 30", produit_id: "importe", produit: "Importé", paquets_par_colis: 30 }],
      stocks: [{ conditionnement_id: "ci", paquets: 60 }],
      rythmes: [{ conditionnement_id: "ci", paquets_jour: 1000 }],
      cadences: [{ produit_id: "importe", paquets_jour: 5000 }],
      ordres: [],
    };
    const r = estimerCoordination(brut, new Set(["importe"]));
    expect(r.commandes[0].lignes[0]).toMatchObject({ paquetsEnStock: 60, paquetsAProduire: 60, source: "reception", dateLivraison: null });
    expect(r.besoins).toEqual([]);
    expect(r.aRecevoir).toEqual([{ conditionnementId: "ci", paquets: 60 }]);
    // Fabriqué : même cas, estimé au rythme de production.
    expect(estimerCoordination(brut).commandes[0].lignes[0].source).toBe("rythme");
  });
});
