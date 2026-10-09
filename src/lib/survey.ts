import { DEAL_CATEGORIES } from "@/lib/constants";

/**
 * Enquêtes d'avis : attentes des étudiants et des partenaires en matière d'avantages.
 * Mêmes valeurs que les contraintes SQL de survey_responses et partner_survey_responses.
 */
export type Option = { value: string; label: string };

/** Version du questionnaire étudiant enregistrée avec chaque réponse. */
export const SURVEY_VERSION = 3;
/** Les inscrits qui ont répondu avant cette version sont réinvités (v2 et v3 portent sur les avantages). */
export const SURVEY_MIN_VERSION = 2;

export const SURVEY_UNDERSTOOD: Option[] = [
  { value: "oui", label: "Oui, c'est clair" },
  { value: "un_peu", label: "Un peu" },
  { value: "non", label: "Pas vraiment" },
];

export const SURVEY_WOULD_USE: Option[] = [
  { value: "oui", label: "Oui, sûrement" },
  { value: "peut-etre", label: "Peut-être" },
  { value: "non", label: "Non" },
];

// -----------------------------------------------------------------------------
// Étudiants
// -----------------------------------------------------------------------------
export const SURVEY_CATEGORIES: Option[] = Object.entries(DEAL_CATEGORIES).map(([value, c]) => ({
  value,
  label: `${c.emoji} ${c.label}`,
}));

/** Types d'avantages : préférés par les étudiants, proposés par les partenaires. */
export const BENEFIT_TYPES: Option[] = [
  { value: "pourcentage", label: "🏷️ Réduction en %" },
  { value: "prix_fixe", label: "💰 Prix étudiant fixe" },
  { value: "offert", label: "🎁 Produit ou service offert" },
  { value: "fidelite", label: "⭐ Carte de fidélité (ex. 10e repas offert)" },
  { value: "heures_creuses", label: "⏰ Tarif spécial aux heures creuses" },
  { value: "livraison", label: "🛵 Livraison offerte" },
];

export const SURVEY_MIN_DISCOUNT: Option[] = [
  { value: "10", label: "10 %" },
  { value: "20", label: "20 %" },
  { value: "30", label: "30 %" },
  { value: "50", label: "50 % ou plus" },
];

export const SURVEY_BUDGET: Option[] = [
  { value: "moins_100k", label: "Moins de 100 000 GNF" },
  { value: "100_300k", label: "100 000 à 300 000 GNF" },
  { value: "300_600k", label: "300 000 à 600 000 GNF" },
  { value: "plus_600k", label: "Plus de 600 000 GNF" },
];

export const SURVEY_PAYMENT: Option[] = [
  { value: "orange_money", label: "🟠 Orange Money" },
  { value: "autre_mobile", label: "📱 Autre mobile money (MTN MoMo…)" },
  { value: "especes", label: "💵 Espèces" },
];

// -----------------------------------------------------------------------------
// Partenaires
// -----------------------------------------------------------------------------
export const PARTNER_DISCOUNT: Option[] = [
  { value: "5_10", label: "5 à 10 %" },
  { value: "10_20", label: "10 à 20 %" },
  { value: "20_30", label: "20 à 30 %" },
  { value: "plus_30", label: "Plus de 30 %" },
];

export const PARTNER_EXPECTATIONS: Option[] = [
  { value: "clients", label: "👥 Plus de clients étudiants" },
  { value: "heures_creuses", label: "⏰ Remplir les heures creuses" },
  { value: "visibilite", label: "📣 Être visible dans l'app" },
  { value: "fidelisation", label: "🔁 Fidéliser les étudiants" },
  { value: "paiement", label: "🟠 Être payé facilement (Orange Money)" },
];
/** Attentes proposées dans les versions précédentes (affichées dans les résultats). */
export const PARTNER_EXPECTATION_LABELS: Option[] = [
  ...PARTNER_EXPECTATIONS,
  { value: "zero_fraude", label: "✅ Être sûr que le client est étudiant" },
  { value: "statistiques", label: "📊 Suivre mes résultats" },
];

export const PARTNER_EXPECTED_STUDENTS: Option[] = [
  { value: "moins_20", label: "Moins de 20" },
  { value: "20_50", label: "20 à 50" },
  { value: "50_100", label: "50 à 100" },
  { value: "plus_100", label: "Plus de 100" },
];

export const PARTNER_PAYMENT_METHODS: Option[] = [...SURVEY_PAYMENT, { value: "carte", label: "💳 Carte bancaire" }];

export const SURVEY_WOULD_PAY: Option[] = [
  { value: "oui", label: "Oui" },
  { value: "peut-etre", label: "Peut-être" },
  { value: "non", label: "Non" },
];

export const labelOf = (list: readonly Option[], v: string | null | undefined) =>
  v ? (list.find((o) => o.value === v)?.label ?? v) : "—";
