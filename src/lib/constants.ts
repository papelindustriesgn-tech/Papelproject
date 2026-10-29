import type { Database } from "@/lib/database.types";

type Enums = Database["public"]["Enums"];
export type DealCategory = Enums["deal_category"];
export type JobType = Enums["job_type"];
export type HousingType = Enums["housing_type"];
export type MarketCategory = Enums["market_category"];
export type ItemCondition = Enums["item_condition"];
export type VerificationStatus = Enums["verification_status"];
export type DocumentType = Enums["document_type"];
export type ListingStatus = Enums["listing_status"];

export const SITE_NAME = "Uny";
export const SITE_TAGLINE = "Être étudiant a ses avantages.";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const SUPPORT_EMAIL = "bonjour@unyafrica.com";
export const PAGE_SIZE = 20;

export const DEAL_CATEGORIES: Record<DealCategory, { label: string; emoji: string }> = {
  restauration: { label: "Restauration", emoji: "🍔" },
  shopping: { label: "Mode & shopping", emoji: "👕" },
  sport: { label: "Sport", emoji: "🏋️" },
  tech: { label: "Tech", emoji: "💻" },
  formation: { label: "Formation", emoji: "🎓" },
  loisirs: { label: "Loisirs", emoji: "🎬" },
  transport: { label: "Mobilité", emoji: "🚕" },
  sante: { label: "Santé & bien-être", emoji: "💊" },
};

export type DealChannel = "in_store" | "online" | "both";
/** « online » = à distance : commande par WhatsApp, appel, réseaux sociaux ou site (rare en Guinée). */
export const DEAL_CHANNELS: Record<DealChannel, { label: string; emoji: string }> = {
  in_store: { label: "En magasin", emoji: "🏬" },
  online: { label: "À distance (WhatsApp, appel, réseaux)", emoji: "📱" },
  both: { label: "À distance et en magasin", emoji: "🛍️" },
};

export type OnlineCodeMode = "unique" | "shared";
export const ONLINE_CODE_MODES: Record<OnlineCodeMode, string> = {
  unique: "Code personnel Uny par étudiant (recommandé : tu le valides dans ton espace Uny)",
  shared: "Un code fixe que je choisis (montré seulement aux étudiants vérifiés)",
};

export type ContactKind = "whatsapp" | "phone" | "facebook" | "instagram" | "website";
export const CONTACT_KINDS: Record<ContactKind, { label: string; action: string; phone: boolean }> = {
  whatsapp: { label: "WhatsApp", action: "Commander sur WhatsApp", phone: true },
  phone: { label: "Appel téléphonique", action: "Appeler", phone: true },
  facebook: { label: "Page Facebook", action: "Ouvrir la page Facebook", phone: false },
  instagram: { label: "Page Instagram", action: "Ouvrir la page Instagram", phone: false },
  website: { label: "Site internet", action: "Aller sur le site", phone: false },
};

export const JOB_TYPES: Record<JobType, { label: string; emoji: string }> = {
  job: { label: "Job étudiant", emoji: "💼" },
  stage: { label: "Stage", emoji: "🎯" },
  alternance: { label: "Alternance", emoji: "🔁" },
  freelance: { label: "Freelance", emoji: "🧑‍💻" },
  benevolat: { label: "Bénévolat", emoji: "🤝" },
  concours: { label: "Concours", emoji: "🏆" },
  bourse: { label: "Bourse", emoji: "🎓" },
  formation: { label: "Formation", emoji: "📚" },
};

export const HOUSING_TYPES: Record<HousingType, { label: string; emoji: string }> = {
  chambre: { label: "Chambre", emoji: "🛏️" },
  studio: { label: "Studio", emoji: "🏠" },
  colocation: { label: "Colocation", emoji: "👥" },
  appartement: { label: "Appartement", emoji: "🏢" },
};

export const MARKET_CATEGORIES: Record<MarketCategory, { label: string; emoji: string }> = {
  smartphones: { label: "Smartphones", emoji: "📱" },
  informatique: { label: "Informatique", emoji: "💻" },
  livres: { label: "Livres", emoji: "📚" },
  fournitures: { label: "Fournitures", emoji: "✏️" },
  mode: { label: "Mode", emoji: "👕" },
  maison: { label: "Maison", emoji: "🛋️" },
  transport: { label: "Transport", emoji: "🚲" },
  autres: { label: "Autres", emoji: "📦" },
};

export const ITEM_CONDITIONS: Record<ItemCondition, string> = {
  neuf: "Neuf",
  comme_neuf: "Comme neuf",
  bon_etat: "Bon état",
  usage: "Usagé",
};

export const VERIFICATION_LABELS: Record<VerificationStatus, string> = {
  unverified: "Non vérifié",
  pending: "Vérification en cours",
  verified: "Étudiant vérifié",
};

export const DOCUMENT_TYPES: Record<DocumentType, string> = {
  student_card: "Carte étudiante",
  enrollment_certificate: "Certificat de scolarité",
  registration_certificate: "Attestation d'inscription",
  other: "Autre justificatif reconnu",
};

export const STUDY_LEVELS = [
  "Licence 1",
  "Licence 2",
  "Licence 3",
  "Master 1",
  "Master 2",
  "Doctorat",
  "BTS / DUT",
  "École professionnelle",
  "Autre",
];

export const GENDERS = [
  { value: "female", label: "Femme" },
  { value: "male", label: "Homme" },
  { value: "other", label: "Autre" },
] as const;

export const HOUSING_BUDGETS = [
  { value: "500000", label: "≤ 500 000 GNF" },
  { value: "1000000", label: "≤ 1 000 000 GNF" },
  { value: "2000000", label: "≤ 2 000 000 GNF" },
  { value: "4000000", label: "≤ 4 000 000 GNF" },
];
