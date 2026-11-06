import type { Availability, LeadStatus, MessageStatus, NewsCategory, PublicationStatus } from "@/lib/types";

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  available: "Disponible",
  limited: "Disponibilité limitée",
  coming_soon: "Bientôt disponible",
  unavailable: "Momentanément indisponible",
};

export const PUBLICATION_LABEL: Record<PublicationStatus, string> = {
  draft: "Brouillon",
  published: "Publié",
  archived: "Archivé",
};

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  nouveau: "Nouveau",
  a_contacter: "À contacter",
  en_discussion: "En discussion",
  converti: "Converti",
  cloture: "Clôturé",
};
export const LEAD_STATUSES = Object.keys(LEAD_STATUS_LABEL) as LeadStatus[];

export const MESSAGE_STATUS_LABEL: Record<MessageStatus, string> = {
  nouveau: "Nouveau",
  traite: "Traité",
  archive: "Archivé",
};

export const NEWS_CATEGORY_LABEL: Record<NewsCategory, string> = {
  nouveautes: "Nouveautés",
  lancements: "Lancements",
  industrie: "Industrie",
  partenariats: "Partenariats",
  evenements: "Événements",
};

export const ACTIVITY_TYPES = [
  { value: "grossiste", label: "Grossiste" },
  { value: "distributeur", label: "Distributeur" },
  { value: "revendeur", label: "Commerce / revendeur" },
  { value: "hotel", label: "Hôtel" },
  { value: "restaurant", label: "Restaurant / maquis" },
  { value: "entreprise", label: "Entreprise / bureau" },
  { value: "administration", label: "Administration / institution" },
  { value: "autre", label: "Autre" },
] as const;

export const ACTIVITY_LABEL: Record<string, string> = Object.fromEntries(ACTIVITY_TYPES.map((a) => [a.value, a.label]));

export const REQUEST_TYPE_LABEL: Record<string, string> = {
  partenariat: "Devenir distributeur",
  devis: "Demande de devis",
  information: "Demande d'informations",
};

export const VOLUME_OPTIONS = [
  "Moins de 10 cartons / mois",
  "10 à 50 cartons / mois",
  "50 à 200 cartons / mois",
  "Plus de 200 cartons / mois",
  "Je ne sais pas encore",
];

export function formatDate(iso: string | null | undefined, withTime = false) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    timeZone: "Africa/Conakry",
  }).format(new Date(iso));
}

export function daysAgoIso(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}
