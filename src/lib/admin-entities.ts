import { DEAL_CATEGORIES, HOUSING_TYPES, JOB_TYPES } from "@/lib/constants";

export type FieldSpec =
  | {
      name: string;
      label: string;
      type: "text" | "textarea" | "url" | "email" | "tel";
      required?: boolean;
      max?: number;
      placeholder?: string;
      hint?: string;
    }
  | { name: string; label: string; type: "number"; required?: boolean; min?: number; max?: number; step?: number }
  | { name: string; label: string; type: "date"; required?: boolean }
  | { name: string; label: string; type: "checkbox"; hint?: string; defaultValue?: boolean }
  | {
      name: string;
      label: string;
      type: "select";
      required?: boolean;
      options: { value: string; label: string }[] | "partners" | "districts";
    }
  | { name: string; label: string; type: "tags"; hint?: string }
  | { name: string; label: string; type: "image" }
  | { name: string; label: string; type: "images"; max?: number };

export type EntityKey = "partenaires" | "avantages" | "jobs" | "logements";

type EntityConfig = {
  table: "partners" | "deals" | "jobs" | "housing";
  singular: string;
  plural: string;
  titleField: string;
  listSelect: string;
  fields: FieldSpec[];
};

const opts = (rec: Record<string, { label: string; emoji: string }>) =>
  Object.entries(rec).map(([value, v]) => ({ value, label: `${v.emoji} ${v.label}` }));

const flags: FieldSpec[] = [
  { name: "is_active", label: "Publié (visible par les étudiants)", type: "checkbox", defaultValue: true },
  {
    name: "is_demo",
    label: "Contenu de démonstration (badge « Démo »)",
    type: "checkbox",
    hint: "À décocher uniquement pour un partenaire ou une annonce réels.",
    defaultValue: false,
  },
];

export const ENTITIES: Record<EntityKey, EntityConfig> = {
  partenaires: {
    table: "partners",
    singular: "partenaire",
    plural: "Partenaires",
    titleField: "name",
    listSelect: "id, name, category, district, is_active, is_demo, logo_url, created_at",
    fields: [
      { name: "name", label: "Nom", type: "text", required: true, max: 120 },
      { name: "category", label: "Catégorie", type: "select", required: true, options: opts(DEAL_CATEGORIES) },
      { name: "logo_url", label: "Logo ou photo", type: "image" },
      { name: "description", label: "Description", type: "textarea", max: 1000 },
      { name: "district", label: "Quartier", type: "select", options: "districts" },
      { name: "address", label: "Adresse", type: "text", max: 200 },
      { name: "phone", label: "Téléphone", type: "tel", max: 30 },
      { name: "website", label: "Site web", type: "url", max: 200 },
      ...flags,
    ],
  },
  avantages: {
    table: "deals",
    singular: "avantage",
    plural: "Avantages",
    titleField: "title",
    listSelect:
      "id, title, discount_label, category, is_active, is_demo, is_featured, view_count, valid_until, image_url, created_at, partner:partners(name)",
    fields: [
      { name: "partner_id", label: "Partenaire", type: "select", required: true, options: "partners" },
      {
        name: "title",
        label: "Titre de l'offre",
        type: "text",
        required: true,
        max: 140,
        placeholder: "-20 % sur tous les plats",
      },
      { name: "discount_label", label: "Réduction affichée", type: "text", required: true, max: 40, placeholder: "-20 %" },
      { name: "category", label: "Catégorie", type: "select", required: true, options: opts(DEAL_CATEGORIES) },
      { name: "image_url", label: "Photo", type: "image" },
      { name: "description", label: "Description", type: "textarea", max: 2000 },
      { name: "conditions", label: "Conditions", type: "textarea", max: 2000 },
      { name: "district", label: "Quartier", type: "select", options: "districts" },
      { name: "valid_from", label: "Valable à partir du", type: "date", required: true },
      { name: "valid_until", label: "Valable jusqu'au", type: "date" },
      { name: "is_featured", label: "Mettre en avant (« Meilleures réductions »)", type: "checkbox" },
      { name: "requires_verification", label: "Réservée aux étudiants vérifiés", type: "checkbox", defaultValue: true },
      ...flags,
    ],
  },
  jobs: {
    table: "jobs",
    singular: "annonce",
    plural: "Jobs & opportunités",
    titleField: "title",
    listSelect: "id, title, company_name, type, is_active, is_demo, view_count, deadline, created_at",
    fields: [
      { name: "title", label: "Intitulé", type: "text", required: true, max: 140 },
      { name: "company_name", label: "Entreprise / organisme", type: "text", required: true, max: 120 },
      { name: "partner_id", label: "Partenaire lié (facultatif)", type: "select", options: "partners" },
      { name: "type", label: "Type", type: "select", required: true, options: opts(JOB_TYPES) },
      { name: "location", label: "Lieu", type: "text", max: 120, placeholder: "Kaloum" },
      { name: "is_remote", label: "Possible à distance", type: "checkbox" },
      { name: "compensation", label: "Rémunération", type: "text", max: 120, placeholder: "1 500 000 GNF/mois" },
      { name: "description", label: "Description", type: "textarea", max: 5000 },
      { name: "skills", label: "Compétences", type: "tags", hint: "Séparées par des virgules" },
      { name: "deadline", label: "Date limite", type: "date" },
      { name: "apply_url", label: "Lien de candidature externe", type: "url", max: 300 },
      { name: "apply_email", label: "Email de candidature", type: "email", max: 200 },
      ...flags,
    ],
  },
  logements: {
    table: "housing",
    singular: "logement",
    plural: "Logements",
    titleField: "title",
    listSelect: "id, title, type, district, price_gnf, is_active, is_available, is_demo, view_count, images, created_at",
    fields: [
      { name: "title", label: "Titre", type: "text", required: true, max: 140 },
      { name: "type", label: "Type", type: "select", required: true, options: opts(HOUSING_TYPES) },
      { name: "images", label: "Photos", type: "images", max: 8 },
      { name: "district", label: "Quartier", type: "select", required: true, options: "districts" },
      { name: "price_gnf", label: "Loyer mensuel (GNF)", type: "number", required: true, min: 0, step: 1000 },
      { name: "rooms", label: "Nombre de pièces", type: "number", required: true, min: 0, max: 20 },
      { name: "description", label: "Description", type: "textarea", max: 3000 },
      { name: "amenities", label: "Équipements", type: "tags", hint: "Séparés par des virgules : Meublé, Wi-Fi, Gardien…" },
      { name: "available_from", label: "Disponible à partir du", type: "date" },
      { name: "is_available", label: "Disponible (non loué)", type: "checkbox", defaultValue: true },
      { name: "contact_name", label: "Nom du contact", type: "text", max: 120 },
      { name: "contact_phone", label: "Téléphone du contact", type: "tel", max: 30 },
      ...flags,
    ],
  },
};

export function isEntity(k: string): k is EntityKey {
  return k in ENTITIES;
}
