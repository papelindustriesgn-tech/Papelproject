import type { FieldSpec } from "@/lib/admin-entities";
import { DEAL_CATEGORIES, HOUSING_TYPES, ITEM_CONDITIONS, JOB_TYPES, MARKET_CATEGORIES } from "@/lib/constants";

export type PartnerKind = "offres" | "boutique" | "logements" | "jobs";

type Config = {
  table: "deals" | "marketplace_items" | "housing" | "jobs";
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
  logements: {
    table: "housing",
    singular: "logement",
    plural: "Logements",
    emoji: "🏠",
    intro: "Chambres, studios, colocations et appartements proposés aux étudiants.",
    fields: [
      {
        name: "title",
        label: "Titre",
        type: "text",
        required: true,
        max: 140,
        placeholder: "Studio meublé proche de l'université",
      },
      { name: "type", label: "Type", type: "select", required: true, options: opts(HOUSING_TYPES) },
      { name: "images", label: "Photos", type: "images", max: 8 },
      { name: "location", label: "Ville et quartier", type: "location", required: true, districtRequired: true },
      { name: "price_gnf", label: "Loyer mensuel (GNF)", type: "number", required: true, min: 0, step: 1000 },
      { name: "rooms", label: "Nombre de pièces", type: "number", required: true, min: 0, max: 20 },
      { name: "description", label: "Description", type: "textarea", max: 3000 },
      { name: "amenities", label: "Équipements", type: "tags", hint: "Séparés par des virgules : Meublé, Wi-Fi, Gardien…" },
      { name: "available_from", label: "Disponible à partir du", type: "date" },
      { name: "is_available", label: "Disponible (non loué)", type: "checkbox", defaultValue: true },
      { name: "contact_name", label: "Nom du contact", type: "text", max: 120 },
      { name: "contact_phone", label: "Téléphone du contact", type: "tel", max: 30 },
      published,
    ],
  },
  jobs: {
    table: "jobs",
    singular: "offre d'emploi",
    plural: "Jobs & stages",
    emoji: "💼",
    intro: "Jobs étudiants, stages, alternances, missions freelance… Les étudiants postulent directement dans Uny.",
    fields: [
      { name: "title", label: "Intitulé du poste", type: "text", required: true, max: 140 },
      { name: "type", label: "Type", type: "select", required: true, options: opts(JOB_TYPES) },
      { name: "city", label: "Ville", type: "location", district: false },
      { name: "location", label: "Lieu précis", type: "text", max: 120, placeholder: "Kaloum, Immeuble …" },
      { name: "is_remote", label: "Possible à distance", type: "checkbox" },
      { name: "compensation", label: "Rémunération", type: "text", max: 120, placeholder: "1 500 000 GNF/mois" },
      { name: "description", label: "Description", type: "textarea", max: 5000 },
      { name: "skills", label: "Compétences recherchées", type: "tags", hint: "Séparées par des virgules" },
      { name: "deadline", label: "Date limite de candidature", type: "date" },
      { name: "apply_url", label: "Lien de candidature externe (facultatif)", type: "url", max: 300 },
      { name: "apply_email", label: "Email pour recevoir les candidatures (facultatif)", type: "email", max: 200 },
      published,
    ],
  },
};

export function isPartnerKind(k: string): k is PartnerKind {
  return k in PARTNER_ENTITIES;
}
