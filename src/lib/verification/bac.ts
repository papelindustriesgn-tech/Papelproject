/**
 * Vérification du baccalauréat guinéen.
 *
 * Uny n'interroge une source officielle QUE si un accès légal et autorisé existe (convention avec
 * le ministère ou l'organisme gestionnaire des résultats). Aucun scraping, aucun contournement.
 * Tant qu'aucun fournisseur officiel n'est raccordé, la vérification est manuelle : l'étudiant
 * envoie son relevé, l'équipe Uny contrôle, puis le document est supprimé. Seule une preuve
 * minimale est conservée : source, méthode, date, statut, année, numéro masqué + empreinte.
 */

export type BacInput = {
  candidateNumber: string;
  examYear: number;
  lastName: string;
  firstName: string;
  birthDate: string | null;
};

export type BacProviderResult =
  | { kind: "answer"; found: boolean; admitted: boolean; identityMatch: boolean; reference: string | null }
  | { kind: "error"; message: string };

export type BacVerificationProvider = {
  key: "official_api";
  label: string;
  /** Vrai seulement quand un accès officiel est contractualisé ET configuré côté serveur. */
  isConnected(): boolean;
  verify(input: BacInput): Promise<BacProviderResult>;
};

/**
 * Emplacement du connecteur officiel. Il reste « non connecté » tant que le format d'échange
 * n'a pas été fourni par la source officielle : il ne doit jamais être déclaré fonctionnel avant.
 */
export const officialBacProvider: BacVerificationProvider = {
  key: "official_api",
  label: "Source officielle des résultats du BAC (Guinée)",
  isConnected: () => false,
  async verify() {
    return { kind: "error", message: "Aucun accès officiel aux résultats du BAC n'est raccordé à Uny." };
  },
};

export const BAC_METHODS = {
  official_api: "API officielle",
  official_exchange: "Échange de données officiel",
  document: "Relevé contrôlé par Uny",
} as const;

/** « 20231234567 » → « ••••4567 » */
export const maskCandidate = (n: string) => `••••${n.slice(-4)}`;
