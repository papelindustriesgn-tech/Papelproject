import type { FieldSpec } from "@/lib/admin-entities";
import { DEAL_CATEGORIES, ITEM_CONDITIONS, MARKET_CATEGORIES } from "@/lib/constants";

export type PartnerKind = "offres" | "boutique";

type Config = {
  table: "deals" | "marketplace_items";
  singular: string;
  plural: string;
  emoji: string;
  intro: string;
  fields: FieldSpec[];
};

const opts = (rec: Record<string, { label: string; emoji: string }>) =>
  Object.entries(rec).map(([value, v]) => ({ value, label: `${v.emoji} ${v.label}` }));

const published: FieldSpec = {
  name: "is_active",
  label: "Publié (visible par les étudiants)",
  type: "checkbox",
  defaultValue: true,
};

export const PARTNER_ENTITIES: Record<PartnerKind, Config> = {
  offres: {
    table: "deals",
    singular: "offre",
    plural: "Offres étudiantes",
    emoji: "🏷️",
    intro: "Réductions et avantages réservés aux étudiants Uny. Ils les présentent avec leur carte, que tu scannes.",
    fields: [
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
      {
        name: "conditions",
        label: "Conditions",
        type: "textarea",
        max: 2000,
        placeholder: "Sur présentation de la carte Uny, du lundi au vendredi…",
      },
      {
        name: "location",
        label: "Ville et quartier",
        type: "location",
        hint: "Laisse « Toute la Guinée » si l'offre est valable partout.",
      },
      { name: "valid_from", label: "Valable à partir du", type: "date", required: true },
      { name: "valid_until", label: "Valable jusqu'au", type: "date" },
      {
        name: "requires_verification",
        label: "Réservée aux étudiants vérifiés",
        type: "checkbox",
        defaultValue: true,
        hint: "Décoche pour l'ouvrir à tous les inscrits Uny.",
      },
      published,
    ],
  },
  boutique: {
    table: "marketplace_items",
    singular: "article",
    plural: "Boutique (marketplace)",
    emoji: "🛍️",
    intro: "Vends tes produits aux étudiants : ils apparaissent dans la marketplace avec le badge « Partenaire Uny ».",
    fields: [
      { name: "images", label: "Photos", type: "images", max: 6 },
      { name: "title", label: "Nom du produit", type: "text", required: true, max: 100 },
      { name: "category", label: "Catégorie", type: "select", required: true, options: opts(MARKET_CATEGORIES) },
      { name: "price_gnf", label: "Prix (GNF)", type: "number", required: true, min: 0, max: 1000000000, step: 500 },
      { name: "is_negotiable", label: "Prix négociable", type: "checkbox" },
      {
        name: "condition",
        label: "État",
        type: "select",
        required: true,
        options: Object.entries(ITEM_CONDITIONS).map(([value, label]) => ({ value, label })),
      },
      { name: "description", label: "Description", type: "textarea", max: 2000 },
      { name: "location", label: "Ville et quartier", type: "location", required: true },
      { name: "contact_phone", label: "Téléphone / WhatsApp", type: "tel", max: 30 },
      {
        name: "status",
        label: "Statut",
        type: "select",
        required: true,
        options: [
          { value: "active", label: "En vente" },
          { value: "sold", label: "Vendu / épuisé" },
          { value: "hidden", label: "Masqué" },
        ],
      },
    ],
  },
};

export function isPartnerKind(k: string): k is PartnerKind {
  return k in PARTNER_ENTITIES;
}
