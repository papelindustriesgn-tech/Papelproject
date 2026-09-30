/** Questions de l'enquête d'avis (mêmes valeurs que les contraintes SQL de survey_responses). */
export const SURVEY_SOURCES = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "ami", label: "Un(e) ami(e)" },
  { value: "reseaux", label: "Facebook, TikTok, Instagram…" },
  { value: "universite", label: "À l'université" },
  { value: "affiche", label: "Affiche / flyer" },
  { value: "autre", label: "Autre" },
] as const;

export const SURVEY_MODULES = [
  { value: "carte", label: "🪪 Carte étudiante digitale" },
  { value: "avantages", label: "🏷️ Réductions & avantages" },
  { value: "jobs", label: "💼 Jobs & stages" },
  { value: "logement", label: "🏠 Logement" },
  { value: "marketplace", label: "🛍️ Marketplace" },
] as const;

export const SURVEY_WOULD_PAY = [
  { value: "oui", label: "Oui" },
  { value: "peut-etre", label: "Peut-être" },
  { value: "non", label: "Non" },
] as const;

export const labelOf = (list: readonly { value: string; label: string }[], v: string) =>
  list.find((o) => o.value === v)?.label ?? v;
