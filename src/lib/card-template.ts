/**
 * Moteur de templates de carte : chaque université configure son identité visuelle et les
 * champs affichés, sans code spécifique. Les éléments Uny (nom, photo, identifiant Uny,
 * QR code, statut de vérification) restent toujours présents.
 */

export const CARD_FIELDS = [
  "faculty",
  "department",
  "program",
  "study_level",
  "student_number",
  "academic_year",
  "expires_at",
] as const;
export type CardField = (typeof CARD_FIELDS)[number];

export const CARD_FIELD_LABELS: Record<CardField, string> = {
  faculty: "Faculté",
  department: "Département",
  program: "Filière",
  study_level: "Niveau",
  student_number: "Matricule",
  academic_year: "Année",
  expires_at: "Valide jusqu'au",
};

export const CARD_LAYOUTS = {
  classic: { label: "Classique", hint: "Fond aux couleurs de l'université" },
  band: { label: "Bandeau", hint: "Carte claire avec bandeau de couleur" },
  minimal: { label: "Sobre", hint: "Fond Uny, liseré aux couleurs de l'université" },
} as const;
export type CardLayout = keyof typeof CARD_LAYOUTS;

export const DEFAULT_CARD_FIELDS: CardField[] = [
  "faculty",
  "program",
  "study_level",
  "student_number",
  "academic_year",
  "expires_at",
];

export type CardBranding = {
  name: string;
  logoUrl: string | null;
  primary: string;
  secondary: string;
  accent: string;
};

export type CardTemplate = {
  layout: CardLayout;
  fields: CardField[];
  labels: Partial<Record<CardField, string>>;
};

export type CardDetails = Partial<Record<CardField, string | null>>;

export const isCardField = (v: unknown): v is CardField => CARD_FIELDS.includes(v as CardField);
export const isCardLayout = (v: unknown): v is CardLayout => typeof v === "string" && v in CARD_LAYOUTS;

export function normalizeTemplate(row: { layout: string; fields: string[]; labels: unknown } | null | undefined): CardTemplate {
  if (!row) return { layout: "classic", fields: DEFAULT_CARD_FIELDS, labels: {} };
  const labels: CardTemplate["labels"] = {};
  if (row.labels && typeof row.labels === "object") {
    for (const [k, v] of Object.entries(row.labels as Record<string, unknown>)) {
      if (isCardField(k) && typeof v === "string" && v.trim()) labels[k] = v.trim().slice(0, 30);
    }
  }
  return {
    layout: isCardLayout(row.layout) ? row.layout : "classic",
    fields: row.fields.filter(isCardField),
    labels,
  };
}

export const fieldLabel = (t: CardTemplate, f: CardField) => t.labels[f] || CARD_FIELD_LABELS[f];

/** Texte clair ou foncé selon la luminance de la couleur de fond (WCAG). */
export function isLightColor(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const l = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return l > 0.45;
}

export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
