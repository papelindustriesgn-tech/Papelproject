/**
 * État d'une commande client en mots simples : où elle en est, la prochaine étape et qui doit agir.
 * Même règle sur le téléphone du commercial et au bureau (fonction pure, testée).
 * Chaîne : envoi → date confirmée → préparation et livraison (partielle possible) → facture → paiement.
 */

export type EquipeAction = "telephone" | "commercial" | "ventes" | "magasin" | "logistique" | "comptabilite" | "client" | null;

export interface FaitsCommande {
  /** Sur le téléphone : pas encore envoyée, refusée par le serveur, ou reçue. Au bureau : toujours « recue ». */
  envoi: "en_attente" | "refusee" | "recue";
  annulee?: boolean;
  dateSouhaitee?: string | null;
  dateConfirmee?: string | null;
  paquetsCommandes: number;
  /** Paquets remis au client (livrés moins rapportés). */
  paquetsLivres: number;
  /** Un bon de livraison est parti et attend sa remise. */
  livraisonEnRoute?: boolean;
  /** Montant TTC facturé (factures validées liées à la commande, avoirs déduits) ; 0 = pas encore facturée. */
  factureTtcGnf?: number;
  /** Reste à payer sur ces factures. */
  resteAPayerGnf?: number;
  /** Stock insuffisant pour servir le reste à livrer. */
  attenteStock?: boolean;
}

export interface EtatCommande {
  code: "a_envoyer" | "refusee" | "annulee" | "recue" | "planifiee" | "attente_stock" | "en_livraison" | "partielle" | "livree" | "facturee" | "payee";
  libelle: string;
  /** Prochaine étape, phrase courte ; null quand tout est terminé. */
  prochaine: string | null;
  qui: EquipeAction;
  ton: "attente" | "info" | "succes" | "erreur";
}

const QUI: Record<Exclude<EquipeAction, null>, string> = {
  telephone: "Ce téléphone",
  commercial: "Le commercial",
  ventes: "Les ventes",
  magasin: "Le magasin",
  logistique: "La logistique",
  comptabilite: "La comptabilité",
  client: "Le client",
};

/** Nom lisible de l'équipe qui doit agir. */
export function libelleQui(qui: EquipeAction): string {
  return qui ? QUI[qui] : "";
}

const dateFr = (iso: string) => iso.split("-").reverse().join("/");

export function etatCommande(f: FaitsCommande): EtatCommande {
  if (f.envoi === "refusee") {
    return { code: "refusee", libelle: "Refusée par le bureau", prochaine: "Voir le motif et corriger avec votre responsable.", qui: "commercial", ton: "erreur" };
  }
  if (f.envoi === "en_attente") {
    return {
      code: "a_envoyer",
      libelle: "Pas encore envoyée",
      prochaine: "Elle est gardée sur ce téléphone et partira dès que le réseau revient.",
      qui: "telephone",
      ton: "attente",
    };
  }
  if (f.annulee) return { code: "annulee", libelle: "Annulée", prochaine: null, qui: null, ton: "info" };

  const livree = f.paquetsCommandes > 0 && f.paquetsLivres >= f.paquetsCommandes;
  const facture = (f.factureTtcGnf ?? 0) > 0;
  if (facture && (f.resteAPayerGnf ?? 0) <= 0) return { code: "payee", libelle: livree ? "Livrée et payée" : "Payée", prochaine: livree ? null : "Livrer le reste.", qui: livree ? null : "magasin", ton: "succes" };
  if (livree && facture) {
    return { code: "facturee", libelle: "Livrée et facturée", prochaine: "Le client paie au bureau.", qui: "comptabilite", ton: "info" };
  }
  if (livree) return { code: "livree", libelle: "Livrée", prochaine: "Établir la facture des colis livrés.", qui: "comptabilite", ton: "info" };
  if (f.livraisonEnRoute) return { code: "en_livraison", libelle: "En livraison", prochaine: "Le chauffeur remet les colis au client.", qui: "logistique", ton: "info" };
  if (f.paquetsLivres > 0) {
    return { code: "partielle", libelle: "Livrée en partie", prochaine: f.attenteStock ? "Le reste attend du stock." : "Préparer et livrer le reste.", qui: "magasin", ton: "attente" };
  }
  if (f.attenteStock) {
    return { code: "attente_stock", libelle: "En attente de stock", prochaine: "Les colis seront préparés dès que le stock arrive.", qui: "magasin", ton: "attente" };
  }
  if (f.dateConfirmee) {
    return { code: "planifiee", libelle: `Livraison prévue le ${dateFr(f.dateConfirmee)}`, prochaine: "Préparer les colis.", qui: "magasin", ton: "info" };
  }
  return {
    code: "recue",
    libelle: "Reçue par l'usine",
    prochaine: f.dateSouhaitee ? `Confirmer la date de livraison (souhaitée : ${dateFr(f.dateSouhaitee)}).` : "Confirmer la date de livraison.",
    qui: "ventes",
    ton: "attente",
  };
}

/** État d'une facture validée : payée, à payer, en retard (relancer), crédit client après avoir. */
export function etatFacture(f: { brouillon: boolean; annulee?: boolean; resteAPayerGnf: number; creditClientGnf: number; echeance: string | null; aujourdhui: string; payeGnf: number }): EtatCommande {
  if (f.brouillon) return { code: "recue", libelle: "Facture en préparation", prochaine: "Vérifier les lignes puis valider la facture.", qui: "comptabilite", ton: "attente" };
  if (f.creditClientGnf > 0) return { code: "payee", libelle: "Soldée, avec un crédit au client", prochaine: "Rembourser le client ou déduire ce crédit d'une prochaine facture.", qui: "comptabilite", ton: "info" };
  if (f.resteAPayerGnf <= 0) return { code: "payee", libelle: "Payée", prochaine: null, qui: null, ton: "succes" };
  const enRetard = !!f.echeance && f.echeance < f.aujourdhui;
  if (enRetard) return { code: "facturee", libelle: f.payeGnf > 0 ? "Payée en partie, en retard" : "En retard de paiement", prochaine: "Relancer le client, puis enregistrer son paiement.", qui: "comptabilite", ton: "erreur" };
  return {
    code: "facturee",
    libelle: f.payeGnf > 0 ? "Payée en partie" : "À payer",
    prochaine: `Enregistrer le paiement quand le client paie${f.echeance ? ` (avant le ${f.echeance.split("-").reverse().join("/")})` : ""}.`,
    qui: "comptabilite",
    ton: "attente",
  };
}
