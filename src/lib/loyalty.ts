/** État de la carte de fidélité d'un étudiant chez un partenaire (renvoyé par les fonctions SQL). */
export type LoyaltyStatus = {
  card_id: string | null;
  program: boolean;
  stamps: number;
  required: number | null;
  reward: string | null;
  rewards_available: number;
  total_visits: number;
  unlocked: boolean;
} | null;
