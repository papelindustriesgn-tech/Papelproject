import { describe, expect, it } from "vitest";
import { echapperHtml, lireDestinataires, pointsAttention, rapportHtml, rapportTexte, sujetRapport, variation, type DonneesRapport } from "../hebdo";

const D: DonneesRapport = {
  du: "2026-10-02", au: "2026-10-08", entreprise: "Papel Industries",
  ca_ht_gnf: 207_389_800, ca_ht_prec_gnf: 210_389_480, encaisse_gnf: 89_521_833, paquets_vendus: 41_800, creances_echues_gnf: 159_298_302,
  paquets_produits: 49_420, fiches: 14, kg_papier: 6_153, kg_mp: 17_063, kg_transit: 40_000, tresorerie_gnf: 1_043_846_105, dettes_echues_gnf: 0,
  alertes_stock: ["Courroie de plieuse : sous le seuil"], nc_ouvertes: 2, nc_critiques: 1, pannes: 1, ot_ouverts: 1, bl_non_remis: 0, destinataires: "dg@papel.gn, x, pdg@papel.gn",
};

describe("rapport hebdomadaire", () => {
  it("sujet, variation, destinataires", () => {
    expect(sujetRapport(D)).toBe("Papel Industries – rapport de la semaine du 02/10/2026 au 08/10/2026");
    expect(variation(207, 210)).toBe("-1 %");
    expect(variation(110, 100)).toBe("+10 %");
    expect(variation(5, 0)).toBeNull();
    expect(lireDestinataires(D.destinataires)).toEqual(["dg@papel.gn", "pdg@papel.gn"]);
    expect(lireDestinataires(null)).toEqual([]);
  });

  it("points d'attention : le plus grave d'abord, rien d'inutile", () => {
    expect(pointsAttention(D)).toEqual([
      "1 non-conformité(s) critique(s) ouverte(s)",
      "Créances clients échues : 159 298 302 GNF",
      "Stock – Courroie de plieuse : sous le seuil",
      "1 ordre(s) de travail de maintenance ouvert(s)",
    ]);
  });

  it("texte et HTML (échappé)", () => {
    expect(rapportTexte(D)).toContain("Production : 49 420 paquets sur 14 fiche(s) · papier consommé 6,2 t (8 032 paquets/t)");
    const html = rapportHtml({ ...D, alertes_stock: ["<script>"] }, "https://erp.papel.gn");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).toContain('href="https://erp.papel.gn/direction"');
    expect(echapperHtml('"a&b"')).toBe("&quot;a&amp;b&quot;");
  });
});
