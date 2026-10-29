/**
 * Catalogue des objectifs mensuels de chaque service : ce que chaque application peut se fixer comme objectif.
 * Les VALEURS (une par mois) sont saisies par la Direction dans l'interface (table `objectifs_services`,
 * écran « Objectifs mensuels » de chaque application) ; le réel est fourni par la vue d'ensemble de l'application.
 * Données pures, partagées serveur / navigateur.
 */
export type UniteObjectif = "gnf" | "paquets" | "kg" | "pct" | "nombre" | "jours" | "minutes";

export interface DefinitionObjectif {
  code: string;
  libelle: string;
  unite: UniteObjectif;
  /** Vrai : quantité qui s'additionne sur la période (prorata des jours) ; faux : taux ou niveau (moyenne). */
  cumul: boolean;
  /** Faux quand une baisse est bonne (pertes, délais, coûts) : l'objectif est alors un maximum. */
  hausseBonne: boolean;
}

const d = (code: string, libelle: string, unite: UniteObjectif, cumul: boolean, hausseBonne = true): DefinitionObjectif => ({ code, libelle, unite, cumul, hausseBonne });

export const OBJECTIFS: Record<string, DefinitionObjectif[]> = {
  direction: [
    d("ca_ttc", "Chiffre d'affaires TTC", "gnf", true),
    d("paquets_produits", "Paquets produits", "paquets", true),
    d("papier_kg", "Papier transformé", "kg", true),
    d("marge_brute", "Marge brute", "gnf", true),
    d("encaissements", "Encaissements", "gnf", true),
  ],
  ventes: [
    d("ca_ttc", "Chiffre d'affaires TTC", "gnf", true),
    d("paquets_vendus", "Paquets vendus", "paquets", true),
    d("commandes", "Commandes", "nombre", true),
    d("nouveaux_clients", "Nouveaux clients", "nombre", true),
    d("encaissements", "Encaissements", "gnf", true),
    d("dso", "Délai moyen de paiement (DSO)", "jours", false, false),
  ],
  production: [
    d("paquets_produits", "Paquets produits", "paquets", true),
    d("papier_kg", "Papier transformé", "kg", true),
    d("rendement", "Rendement réel / théorique", "pct", false),
    d("taux_perte", "Taux de perte", "pct", false, false),
    d("trs", "TRS (OEE)", "pct", false),
    d("cout_energie_tonne", "Coût de l'énergie par tonne (maximum)", "gnf", false, false),
    d("cout_complet_paquet", "Coût complet par paquet (maximum)", "gnf", false, false),
  ],
  magasin: [
    d("paquets_livres", "Paquets livrés aux clients", "paquets", true),
    d("couverture_mp", "Jours de couverture matière première", "jours", false),
    d("valeur_stock", "Valeur du stock (maximum)", "gnf", false, false),
  ],
  commercial: [
    d("visites", "Visites de points de vente", "nombre", true),
    d("nouveaux_pva", "Nouveaux points de vente", "nombre", true),
    d("taux_rupture", "Taux de rupture chez les points de vente", "pct", false, false),
    d("quartiers_couverts", "Quartiers couverts", "nombre", false),
  ],
  achats: [
    d("cout_tonne", "Coût rendu usine par tonne (maximum)", "gnf", false, false),
    d("ecart_prevu", "Écart réel / prévu (maximum)", "pct", false, false),
    d("delai_fournisseur", "Délai moyen fournisseur (maximum)", "jours", false, false),
  ],
  logistique: [
    d("colis_livres", "Colis livrés", "nombre", true),
    d("taux_reussite", "Livraisons réussies", "pct", false),
    d("cout_par_colis", "Coût par colis livré (maximum)", "gnf", false, false),
    d("otif", "Commandes livrées à temps et complètes (OTIF)", "pct", false),
    d("delai_livraison", "Délai commande → livraison (maximum)", "jours", false, false),
  ],
  qualite: [
    d("conformite_reception", "Conformité à réception", "pct", false),
    d("conformite_production", "Conformité en production", "pct", false),
    d("delai_cloture", "Délai moyen de clôture des NC (maximum)", "jours", false, false),
  ],
  maintenance: [
    d("disponibilite", "Disponibilité des équipements", "pct", false),
    d("mttr", "Temps moyen de réparation (maximum)", "minutes", false, false),
    d("part_preventif", "Part du préventif", "pct", false),
    d("cout_maintenance", "Coût de maintenance (budget)", "gnf", true, false),
  ],
  finance: [
    d("ca_ht", "Chiffre d'affaires HT", "gnf", true),
    d("marge_brute", "Marge brute", "gnf", true),
    d("resultat", "Résultat d'exploitation", "gnf", true),
  ],
  rh: [
    d("absenteisme", "Absentéisme (maximum)", "pct", false, false),
    d("cout_salarial", "Coût salarial du mois (budget)", "gnf", false, false),
  ],
};

/** Libellé de l'unité dans l'écran de saisie (un pourcentage se saisit en %, un poids en tonnes). */
export const UNITES_SAISIE: Record<UniteObjectif, string> = {
  gnf: "GNF",
  paquets: "paquets",
  kg: "tonnes",
  pct: "%",
  nombre: "nombre",
  jours: "jours",
  minutes: "minutes",
};

/** Valeur saisie → valeur stockée (95 % → 0,95 ; 25 t → 25 000 kg). */
export function versStockage(saisie: number, unite: UniteObjectif): number {
  return unite === "pct" ? saisie / 100 : unite === "kg" ? saisie * 1000 : saisie;
}

/** Valeur stockée → valeur affichée dans le champ de saisie. */
export function versSaisie(valeur: number, unite: UniteObjectif): number {
  return unite === "pct" ? Math.round(valeur * 100_000) / 1000 : unite === "kg" ? Math.round(valeur) / 1000 : valeur;
}
