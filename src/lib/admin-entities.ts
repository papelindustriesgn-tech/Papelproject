import { DEAL_CATEGORIES } from "@/lib/constants";

export type FieldSpec =
  | {
      name: string;
      label: string;
      type: "text" | "textarea" | "url" | "email" | "tel";
      required?: boolean;
      max?: number;
      placeholder?: string;
      hint?: string;
      /** Chiffres uniquement (espaces ignorés), entre min et max chiffres. */
      digits?: { min: number; max: number };
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
  | { name: string; label: string; type: "images"; max?: number }
  /** Ville (city_id) + quartier (district, si `district` ≠ false). */
  | {
      name: string;
      label: string;
      type: "location";
      required?: boolean;
      district?: boolean;
      districtRequired?: boolean;
      hint?: string;
    };

export type EntityKey = "partenaires" | "avantages";

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

export const ORANGE_MONEY_FIELD: FieldSpec = {
  name: "orange_money_merchant_code",
  label: "Code marchand Orange Money",
  type: "text",
  max: 16,
  digits: { min: 4, max: 12 },
  placeholder: "123456",
  hint: "Les étudiants paient directement sur ce code marchand. Uny ne touche jamais à l'argent.",
};

/** Prix facultatifs d'une offre : affichés aux étudiants et proposés pour le paiement Orange Money. */
export const DEAL_PRICE_FIELDS: FieldSpec[] = [
  { name: "price_gnf", label: "Prix normal (GNF)", type: "number", min: 500, max: 1000000000, step: 500 },
  { name: "promo_price_gnf", label: "Prix étudiant (GNF)", type: "number", min: 0, max: 1000000000, step: 500 },
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
      { name: "location", label: "Ville et quartier", type: "location", required: true },
      { name: "address", label: "Adresse", type: "text", max: 200 },
      { name: "phone", label: "Téléphone", type: "tel", max: 30 },
      { name: "website", label: "Site web", type: "url", max: 200 },
      ORANGE_MONEY_FIELD,
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
      { name: "location", label: "Ville et quartier", type: "location", hint: "Sans ville : offre valable partout en Guinée." },
      ...DEAL_PRICE_FIELDS,
      { name: "valid_from", label: "Valable à partir du", type: "date", required: true },
      { name: "valid_until", label: "Valable jusqu'au", type: "date" },
      { name: "is_featured", label: "Mettre en avant (« Meilleures réductions »)", type: "checkbox" },
      { name: "requires_verification", label: "Réservée aux étudiants vérifiés", type: "checkbox", defaultValue: true },
      ...flags,
    ],
  },
};

export function isEntity(k: string): k is EntityKey {
  return k in ENTITIES;
}
