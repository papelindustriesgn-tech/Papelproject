/**
 * Base locale du téléphone (IndexedDB via Dexie) : l'application terrain fonctionne SANS réseau.
 * - Référentiels (produits, prix, types de clients, quartiers, marques) : copiés à chaque synchronisation.
 * - Données du commercial (PVA, clients, visites, pièces) : copie serveur + saisies locales en attente.
 * - « operations » : file d'attente des saisies à envoyer (outbox), rejouable sans doublon.
 * - « photos » : photos compressées en attente d'envoi.
 */
import Dexie, { type EntityTable } from "dexie";

export interface Meta {
  cle: string;
  valeur: unknown;
}

export interface ProduitLocal {
  id: string;
  libelle: string;
  ordre: number;
}

export interface ConditionnementLocal {
  id: string;
  produitId: string;
  libelle: string;
  paquetsParColis: number;
  parDefaut: boolean;
}

export interface PrixLocal {
  /** `${produitId}|${niveau}` */
  cle: string;
  produitId: string;
  niveau: string;
  prixPaquetGnf: number;
}

export interface TypeClientLocal {
  id: string;
  libelle: string;
  niveauPrix: string;
}

export interface LibelleLocal {
  id: string;
  libelle: string;
}

export interface PvaLocal {
  id: string;
  nom: string;
  typeClientId: string;
  responsable: string;
  telephone: string;
  quartierId: string | null;
  repere: string;
  latitude: number | null;
  longitude: number | null;
  precisionM: number | null;
  potentielColisMois: number | null;
  clientId: string | null;
  notes: string;
  derniereVisite: string | null;
  derniereRupture: boolean | null;
  /** Saisi sur le téléphone et pas encore confirmé par le serveur. */
  enAttente: boolean;
}

export interface ClientLocal {
  id: string;
  nom: string;
  typeClientId: string;
  conditionPaiement: string;
  plafondCreditGnf: number;
  encoursGnf: number;
  enAttente: boolean;
}

export interface VisiteLocale {
  id: string;
  pvaId: string;
  checkinAt: string;
  latitude: number | null;
  longitude: number | null;
  precisionM: number | null;
  dansZone: boolean | null;
  distanceM: number | null;
  stockPapelColis: number | null;
  rupture: boolean;
  notes: string;
  enAttente: boolean;
}

export interface LignePieceLocale {
  conditionnementId: string;
  quantiteColis: number;
  paquetsVrac: number;
  paquets: number;
  prixPaquetGnf: number;
  montantHtGnf: number;
}

export interface PieceLocale {
  id: string;
  typePiece: "devis" | "facture";
  numero: string;
  clientId: string;
  datePiece: string;
  lignes: LignePieceLocale[];
  totalHtGnf: number;
  tvaGnf: number;
  totalTtcGnf: number;
  tauxTva: number;
  notes: string;
  /** en_attente → synchronisee ; rejetee si le serveur a refusé (message dans « erreur »). */
  etat: "en_attente" | "synchronisee" | "rejetee";
  erreur?: string;
}

export type TypeOperation = "pva" | "visite" | "photo" | "client" | "piece";

export interface Operation {
  id: string;
  type: TypeOperation;
  donnees: Record<string, unknown>;
  creeLe: string;
  essais: number;
  erreur?: string;
}

export interface PhotoLocale {
  id: string;
  pvaId: string;
  visiteId: string | null;
  blob: Blob;
  creeLe: string;
  envoyee: boolean;
}

export class BaseTerrain extends Dexie {
  meta!: EntityTable<Meta, "cle">;
  produits!: EntityTable<ProduitLocal, "id">;
  conditionnements!: EntityTable<ConditionnementLocal, "id">;
  prix!: EntityTable<PrixLocal, "cle">;
  typesClients!: EntityTable<TypeClientLocal, "id">;
  quartiers!: EntityTable<LibelleLocal, "id">;
  marques!: EntityTable<LibelleLocal, "id">;
  pva!: EntityTable<PvaLocal, "id">;
  clients!: EntityTable<ClientLocal, "id">;
  visites!: EntityTable<VisiteLocale, "id">;
  pieces!: EntityTable<PieceLocale, "id">;
  operations!: EntityTable<Operation, "id">;
  photos!: EntityTable<PhotoLocale, "id">;

  constructor(utilisateurId: string) {
    // Une base par utilisateur : deux commerciaux sur le même téléphone ne mélangent pas leurs données.
    super(`papel-terrain-${utilisateurId}`);
    this.version(1).stores({
      meta: "cle",
      produits: "id",
      conditionnements: "id, produitId",
      prix: "cle",
      typesClients: "id",
      quartiers: "id",
      marques: "id",
      // (IndexedDB n'indexe pas les booléens : « enAttente » et « envoyee » se filtrent.)
      pva: "id, nom",
      clients: "id, nom",
      visites: "id, pvaId, checkinAt",
      pieces: "id, numero, clientId, datePiece, etat",
      operations: "id, creeLe",
      photos: "id, pvaId",
    });
  }
}

let instance: { id: string; base: BaseTerrain } | null = null;

export function baseTerrain(utilisateurId: string): BaseTerrain {
  if (!instance || instance.id !== utilisateurId) instance = { id: utilisateurId, base: new BaseTerrain(utilisateurId) };
  return instance.base;
}

export async function lireMeta<T>(base: BaseTerrain, cle: string, defaut: T): Promise<T> {
  const m = await base.meta.get(cle);
  return (m?.valeur as T) ?? defaut;
}

export async function ecrireMeta(base: BaseTerrain, cle: string, valeur: unknown): Promise<void> {
  await base.meta.put({ cle, valeur });
}

/** Ajoute une saisie à la file d'envoi (identifiant unique : renvoi sans doublon). */
export async function mettreEnFile(base: BaseTerrain, type: TypeOperation, donnees: Record<string, unknown>): Promise<void> {
  await base.operations.add({ id: crypto.randomUUID(), type, donnees, creeLe: new Date().toISOString(), essais: 0 });
}
