/**
 * Lexique de l'ERP en mots simples : chaque terme technique qui reste affiché a une explication d'une ou deux phrases,
 * montrée par la bulle « ? » (`Aide`) et rassemblée sur la page « Les mots de l'ERP » (`/applications/lexique`).
 * Écrire pour quelqu'un qui découvre l'outil : pas de sigle, un exemple quand c'est utile.
 */

export interface Mot {
  /** Mot affiché à l'écran. */
  mot: string;
  /** Explication courte, en langage courant. */
  explication: string;
  /** Rubrique de la page lexique. */
  rubrique: "Ventes et clients" | "Argent" | "Production" | "Stock" | "Livraison" | "Qualité et entretien";
}

export const LEXIQUE = {
  ht: { mot: "Hors taxes (HT)", rubrique: "Ventes et clients", explication: "Le montant sans la TVA. C'est ce que Papel garde réellement sur une vente." },
  ttc: { mot: "Taxes comprises (TTC)", rubrique: "Ventes et clients", explication: "Le montant que le client paie, TVA de 18 % incluse." },
  ventes: { mot: "Ventes (chiffre d'affaires)", rubrique: "Ventes et clients", explication: "Le total des factures de la période, hors taxes, moins les factures annulées (avoirs)." },
  reste_a_payer: { mot: "Reste à payer", rubrique: "Ventes et clients", explication: "Ce que le client doit encore à Papel sur ses factures." },
  en_retard: { mot: "En retard de paiement", rubrique: "Ventes et clients", explication: "La partie du reste à payer dont la date limite de paiement est dépassée." },
  delai_paiement: { mot: "Délai moyen de paiement", rubrique: "Ventes et clients", explication: "En combien de jours, en moyenne, les clients paient leurs factures. Plus c'est court, mieux c'est." },
  avoir: { mot: "Avoir", rubrique: "Ventes et clients", explication: "Une facture « à l'envers » qui annule tout ou partie d'une facture (erreur, retour de marchandise). On ne supprime jamais une facture : on fait un avoir." },
  paquets_offerts: { mot: "Paquets offerts", rubrique: "Ventes et clients", explication: "Les grossistes reçoivent 4 paquets gratuits pour 100 paquets PAYÉS (pas seulement facturés), du même produit." },
  devis: { mot: "Devis", rubrique: "Ventes et clients", explication: "Une proposition de prix. Il n'engage ni le client ni le stock." },
  commande: { mot: "Commande", rubrique: "Ventes et clients", explication: "Le client a dit oui : il reste à livrer puis à facturer." },
  facture: { mot: "Facture", rubrique: "Ventes et clients", explication: "La demande de paiement envoyée au client. Une fois validée, elle ne se modifie plus." },
  point_de_vente: { mot: "Point de vente", rubrique: "Ventes et clients", explication: "Une boutique ou un étal visité par un commercial (client ou pas encore client)." },
  rupture: { mot: "Rupture", rubrique: "Ventes et clients", explication: "Le point de vente n'avait plus nos mouchoirs le jour de la visite : une vente perdue." },
  pas_encore_client: { mot: "Pas encore client", rubrique: "Ventes et clients", explication: "Un point de vente visité qui n'a pas encore de fiche client (il n'a jamais acheté)." },
  brouillon: { mot: "En cours de saisie", rubrique: "Ventes et clients", explication: "Le document peut encore être modifié. Il ne compte nulle part tant qu'il n'est pas validé." },

  marge: { mot: "Marge sur les ventes", rubrique: "Argent", explication: "Ventes hors taxes moins le coût des matières des paquets vendus (papier, emballages)." },
  benefice: { mot: "Bénéfice (ou perte)", rubrique: "Argent", explication: "La marge sur les ventes moins toutes les autres dépenses (salaires, électricité, carburant…). Négatif = perte." },
  argent_disponible: { mot: "Argent disponible", rubrique: "Argent", explication: "Le total des caisses, comptes bancaires et comptes mobiles à cet instant." },
  argent_bloque: { mot: "Argent bloqué", rubrique: "Argent", explication: "Le stock plus ce que les clients nous doivent, moins ce que nous devons aux fournisseurs : l'argent immobilisé pour faire tourner l'usine." },
  cout_complet: { mot: "Coût complet d'un paquet", rubrique: "Argent", explication: "Tout ce qu'a coûté l'usine sur la période (matières + toutes les dépenses) divisé par le nombre de paquets produits." },
  cout_moyen: { mot: "Coût moyen", rubrique: "Stock", explication: "Le prix moyen payé pour un article en stock, recalculé à chaque arrivée. Les sorties sont comptées à ce prix." },
  cout_reel: { mot: "Coût réel", rubrique: "Stock", explication: "Le prix d'achat plus tous les frais pour amener la marchandise jusqu'à l'usine (transport, douane, transit)." },
  frais_arrivee: { mot: "Frais d'arrivée", rubrique: "Stock", explication: "Fret, transit, douane, transport jusqu'à Coyah : tout ce qui s'ajoute au prix du fournisseur." },

  rendement: { mot: "Rendement", rubrique: "Production", explication: "Combien de paquets on obtient avec une tonne de papier, comparé à ce qui est prévu (100 % = exactement le prévu). En dessous de 95 %, on perd du papier." },
  pertes: { mot: "Pertes", rubrique: "Production", explication: "Le papier jeté (déchets, mauvais paquets) par rapport au papier utilisé. Au-dessus de 5 %, c'est trop." },
  efficacite_machines: { mot: "Efficacité des machines", rubrique: "Production", explication: "Sur 100 % du temps où la machine aurait pu produire à pleine vitesse des paquets bons, la part réellement obtenue. Tient compte des arrêts, de la vitesse et des déchets." },
  ordre_production: { mot: "Ordre de production", rubrique: "Production", explication: "Une quantité à produire, décidée à l'avance (ex. 500 colis de Petit 100). Les saisies de production s'y rattachent." },
  saisie_production: { mot: "Saisie de production", rubrique: "Production", explication: "Ce qu'une équipe a fait pendant son poste sur une ligne : paquets produits, bobines utilisées, arrêts, personnes présentes." },
  lot: { mot: "Numéro de lot", rubrique: "Production", explication: "Le code imprimé sur les colis d'un poste (ex. PF261029-2). Il permet de retrouver d'où vient un colis en cas de problème." },
  dechets: { mot: "Déchets (kg)", rubrique: "Production", explication: "Le papier abîmé ou jeté pendant le poste, pesé en kilos." },
  format_colis: { mot: "Format de colis", rubrique: "Production", explication: "Le nombre de paquets dans un colis (ex. colis de 100 paquets ou de 30 paquets)." },
  arret_prevu: { mot: "Arrêt prévu", rubrique: "Production", explication: "Pause, nettoyage programmé… Il ne compte pas comme une panne." },

  jours_stock: { mot: "Jours de stock", rubrique: "Stock", explication: "Pendant combien de jours le stock actuel tiendra au rythme de consommation des dernières semaines." },
  seuil_mini: { mot: "Stock minimum", rubrique: "Stock", explication: "En dessous de cette quantité, l'ERP prévient qu'il faut commander." },
  inventaire: { mot: "Inventaire", rubrique: "Stock", explication: "Compter ce qu'il y a vraiment dans le magasin. Les écarts avec l'ERP sont corrigés à la validation." },
  bobine: { mot: "Bobine", rubrique: "Stock", explication: "Le gros rouleau de papier (bobine jumbo) qui alimente la machine. Chacune a son numéro et son poids." },

  livre_a_temps: { mot: "Livrées à temps et complètes", rubrique: "Livraison", explication: "Sur 100 commandes qui devaient être livrées, combien l'ont été entièrement et à la date promise." },
  bon_livraison: { mot: "Bon de livraison", rubrique: "Livraison", explication: "Le document qui accompagne la marchandise chez le client. Le client signe à la réception." },
  tournee: { mot: "Tournée", rubrique: "Livraison", explication: "Un trajet du camion avec plusieurs livraisons." },

  probleme_qualite: { mot: "Problème qualité", rubrique: "Qualité et entretien", explication: "Un défaut constaté (bobine abîmée, paquet mal fermé, réclamation d'un client) qu'il faut analyser et corriger." },
  intervention: { mot: "Intervention", rubrique: "Qualité et entretien", explication: "Un travail de la maintenance : réparation d'une panne ou entretien prévu." },
  entretien_prevu: { mot: "Entretien prévu", rubrique: "Qualité et entretien", explication: "Un entretien fait à date fixe (graissage, changement de pièce) pour éviter les pannes." },
  temps_entre_pannes: { mot: "Temps moyen entre deux pannes", rubrique: "Qualité et entretien", explication: "Combien d'heures la machine tourne, en moyenne, avant de tomber en panne. Plus c'est long, mieux c'est." },
  temps_reparation: { mot: "Temps moyen de réparation", rubrique: "Qualité et entretien", explication: "Combien de temps dure une panne, en moyenne, avant que la machine reparte." },
} satisfies Record<string, Mot>;

export type CodeMot = keyof typeof LEXIQUE;

/**
 * Explication déduite du libellé d'une tuile ou d'une colonne (comme les icônes : rien à régler écran par écran).
 * Première règle qui correspond ; null si le libellé est assez clair tout seul.
 */
const REGLES: [RegExp, CodeMot][] = [
  [/bénéfice/i, "benefice"],
  [/livrées à temps/i, "livre_a_temps"],
  [/efficacité des machines/i, "efficacite_machines"],
  [/rendement/i, "rendement"],
  [/pertes?\b|taux de perte/i, "pertes"],
  [/déchets/i, "dechets"],
  [/coût complet/i, "cout_complet"],
  [/coût moyen/i, "cout_moyen"],
  [/coût réel/i, "cout_reel"],
  [/frais d'arrivée/i, "frais_arrivee"],
  [/marge/i, "marge"],
  [/argent disponible/i, "argent_disponible"],
  [/argent bloqué/i, "argent_bloque"],
  [/délai moyen de paiement/i, "delai_paiement"],
  [/en retard de paiement|impayés? (en retard|échus?)/i, "en_retard"],
  [/reste à payer|nous doivent/i, "reste_a_payer"],
  [/jours de stock/i, "jours_stock"],
  [/paquets offerts/i, "paquets_offerts"],
  [/ruptures?/i, "rupture"],
  [/pas encore client/i, "pas_encore_client"],
  [/temps moyen entre/i, "temps_entre_pannes"],
  [/temps moyen de réparation/i, "temps_reparation"],
  [/problèmes? qualité/i, "probleme_qualite"],
  [/entretiens? prévus?/i, "entretien_prevu"],
  [/^ventes\b/i, "ventes"],
];

export function aideDuLibelle(libelle: string): Mot | null {
  const r = REGLES.find(([motif]) => motif.test(libelle));
  return r ? LEXIQUE[r[1]] : null;
}
