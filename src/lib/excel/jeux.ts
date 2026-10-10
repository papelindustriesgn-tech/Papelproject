/**
 * Jeux de données publiés pour Excel et les outils comptables (connexion par clé, lecture seule).
 * L'ordre des colonnes est fixé ici (la base renvoie des objets JSON, sans ordre garanti).
 */
export interface JeuExcel {
  code: string;
  libelle: string;
  description: string;
  /** Vrai si le jeu dépend d'une période (du / au). */
  periode: boolean;
  colonnes: string[];
}

export const JEUX_EXCEL: JeuExcel[] = [
  {
    code: "factures",
    libelle: "Factures clients",
    description: "Une ligne par facture : montants, payé, reste dû, retard",
    periode: true,
    colonnes: ["Numéro", "Date", "Échéance", "Code client", "Client", "Total HT", "TVA", "Total TTC", "Payé", "Avoirs", "Reste dû", "Jours de retard"],
  },
  {
    code: "paiements",
    libelle: "Encaissements",
    description: "Paiements reçus des clients",
    periode: true,
    colonnes: ["Date", "Facture", "Client", "Mode", "Montant", "Référence"],
  },
  {
    code: "stock",
    libelle: "Stock actuel",
    description: "Quantité et valeur de chaque article, aujourd'hui",
    periode: false,
    colonnes: ["Code", "Article", "Famille", "Unité", "Quantité", "Valeur", "Coût moyen", "Seuil d'alerte", "Jours de couverture"],
  },
  {
    code: "achats",
    libelle: "Factures fournisseurs et charges",
    description: "Dépenses avec catégorie et compte comptable",
    periode: true,
    colonnes: ["Numéro", "Date", "Échéance", "Bénéficiaire", "Libellé", "Catégorie", "Nature", "Compte", "Devise", "HT (GNF)", "TVA (GNF)", "Total (GNF)", "Payé", "Reste à payer"],
  },
  {
    code: "tresorerie",
    libelle: "Mouvements de trésorerie",
    description: "Caisse, banques, mobile money",
    periode: true,
    colonnes: ["Date", "Compte", "Sens", "Montant", "Devise", "Montant (GNF)", "Origine", "Libellé", "Référence"],
  },
  {
    code: "production",
    libelle: "Production",
    description: "Paquets produits et rebuts par poste",
    periode: true,
    colonnes: ["Date", "Poste", "Lot", "Produit", "Conditionnement", "Paquets", "Colis", "Rebuts (kg)"],
  },
];

export function jeuExcel(code: string): JeuExcel | undefined {
  return JEUX_EXCEL.find((j) => j.code === code);
}

/** Met les lignes JSON dans l'ordre des colonnes ; les montants décimaux sont arrondis (GNF sans décimales). */
export function lignesOrdonnees(jeu: JeuExcel, lignes: Record<string, unknown>[]): (string | number | null)[][] {
  return lignes.map((l) =>
    jeu.colonnes.map((c) => {
      const v = l[c];
      if (typeof v === "number") return c.includes("Quantité") || c.includes("kg") || c.includes("couverture") ? Math.round(v * 100) / 100 : Math.round(v);
      return v === null || v === undefined ? null : String(v);
    }),
  );
}
