/**
 * Écritures comptables (SYSCOHADA) pour l'export vers le logiciel du comptable. Fonctions pures, testées :
 * chaque pièce est équilibrée (Σ débit = Σ crédit). Montants en GNF entiers.
 * Les numéros de comptes viennent des paramètres et des listes (catégories de charges, comptes de trésorerie) :
 * rien n'est figé dans le code.
 */

export interface Ecriture {
  journal: "VT" | "AC" | "TR";
  date: string; // AAAA-MM-JJ
  piece: string;
  compte: string;
  tiers: string;
  libelle: string;
  debit: number;
  credit: number;
}

export interface ComptesParametres {
  clients: string;
  ventes: string;
  tvaCollectee: string;
  fournisseurs: string;
  tvaDeductible: string;
  virements: string;
  attente: string;
}

export interface PieceVente {
  type: "facture" | "avoir";
  numero: string;
  date: string;
  clientCode: string;
  clientNom: string;
  htGnf: number;
  tvaGnf: number;
  ttcGnf: number;
}

/** Facture : D clients TTC / C ventes HT / C TVA collectée. Avoir : écriture inverse. */
export function ecrituresVente(p: PieceVente, c: ComptesParametres): Ecriture[] {
  const sens = p.type === "avoir" ? -1 : 1;
  const ligne = (compte: string, tiers: string, montant: number): Ecriture => ({
    journal: "VT",
    date: p.date,
    piece: p.numero,
    compte,
    tiers,
    libelle: `${p.type === "avoir" ? "Avoir" : "Facture"} ${p.numero} – ${p.clientNom}`,
    debit: montant > 0 ? montant : 0,
    credit: montant < 0 ? -montant : 0,
  });
  const lignes = [ligne(c.clients, p.clientCode, sens * p.ttcGnf), ligne(c.ventes, "", -sens * p.htGnf)];
  if (p.tvaGnf) lignes.push(ligne(c.tvaCollectee, "", -sens * p.tvaGnf));
  return lignes;
}

export interface PieceAchat {
  numero: string;
  date: string;
  tiers: string;
  libelle: string;
  compteCharge: string;
  htGnf: number;
  tvaGnf: number;
}

/** Facture fournisseur : D charge (ou achat stocké) HT / D TVA déductible / C fournisseurs TTC. */
export function ecrituresAchat(p: PieceAchat, c: ComptesParametres): Ecriture[] {
  const base = { journal: "AC" as const, date: p.date, piece: p.numero, libelle: `${p.numero} – ${p.tiers} – ${p.libelle}` };
  const lignes: Ecriture[] = [{ ...base, compte: p.compteCharge || c.attente, tiers: "", debit: p.htGnf, credit: 0 }];
  if (p.tvaGnf) lignes.push({ ...base, compte: c.tvaDeductible, tiers: "", debit: p.tvaGnf, credit: 0 });
  lignes.push({ ...base, compte: c.fournisseurs, tiers: p.tiers, debit: 0, credit: p.htGnf + p.tvaGnf });
  return lignes;
}

export interface MouvementTresorerie {
  id: string;
  date: string;
  sens: "entree" | "sortie";
  montantGnf: number;
  origine: "client" | "fournisseur" | "virement" | "autre";
  compteTresorerie: string;
  compteCharge: string | null;
  tiers: string;
  libelle: string;
  reference: string;
}

/**
 * Trésorerie : le compte de classe 5 contre la contrepartie — clients (encaissement), fournisseurs (règlement),
 * compte de virements internes (585), ou compte de charge / compte d'attente (mouvement divers).
 */
export function ecrituresTresorerie(m: MouvementTresorerie, c: ComptesParametres): Ecriture[] {
  const contrepartie =
    m.origine === "client" ? c.clients : m.origine === "fournisseur" ? c.fournisseurs : m.origine === "virement" ? c.virements : m.compteCharge || c.attente;
  const tiers = m.origine === "client" || m.origine === "fournisseur" ? m.tiers : "";
  const base = { journal: "TR" as const, date: m.date, piece: m.reference || m.id.slice(0, 8), libelle: m.libelle };
  const entree = m.sens === "entree";
  return [
    { ...base, compte: m.compteTresorerie, tiers: "", debit: entree ? m.montantGnf : 0, credit: entree ? 0 : m.montantGnf },
    { ...base, compte: contrepartie, tiers, debit: entree ? 0 : m.montantGnf, credit: entree ? m.montantGnf : 0 },
  ];
}

/** Contrôle : pièces déséquilibrées (doit toujours être vide). */
export function piecesDesequilibrees(ecritures: Ecriture[]): string[] {
  const soldes = new Map<string, number>();
  for (const e of ecritures) soldes.set(`${e.journal}|${e.piece}`, (soldes.get(`${e.journal}|${e.piece}`) ?? 0) + e.debit - e.credit);
  return [...soldes.entries()].filter(([, s]) => s !== 0).map(([k]) => k);
}

/** Lignes CSV (date au format JJ/MM/AAAA attendu par Excel et la plupart des logiciels comptables). */
export function lignesExport(ecritures: Ecriture[]): (string | number)[][] {
  return ecritures.map((e) => [e.journal, e.date.split("-").reverse().join("/"), e.piece, e.compte, e.tiers, e.libelle, e.debit, e.credit]);
}

export const ENTETES_EXPORT = ["Journal", "Date", "N° pièce", "Compte", "Compte tiers", "Libellé", "Débit", "Crédit"];
