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

/** Thèmes proposés aux étudiants pour personnaliser leur carte (quand l'université n'impose pas les siens). */
export const CARD_THEMES = {
  uny: { label: "Uny", primary: "#3b1fd1", secondary: "#6a4cff", accent: "#ffb020" },
  ocean: { label: "Océan", primary: "#0b4f6c", secondary: "#01baef", accent: "#fbfbff" },
  forest: { label: "Forêt", primary: "#14532d", secondary: "#22c55e", accent: "#fde047" },
  sunset: { label: "Coucher de soleil", primary: "#b4232c", secondary: "#f97316", accent: "#fde68a" },
  night: { label: "Nuit", primary: "#0f172a", secondary: "#334155", accent: "#38bdf8" },
  gold: { label: "Or", primary: "#f5c542", secondary: "#e7a020", accent: "#111827" },
  rose: { label: "Rose", primary: "#be185d", secondary: "#f472b6", accent: "#fff1f2" },
  sky: { label: "Ciel", primary: "#bae6fd", secondary: "#e0f2fe", accent: "#0369a1" },
} as const;
export type CardTheme = keyof typeof CARD_THEMES;
export const isCardTheme = (v: unknown): v is CardTheme => typeof v === "string" && v in CARD_THEMES;

/** « uny » = carte Uny standard ; les autres reprennent les modèles proposés aux universités. */
export type StudentCardLayout = "uny" | CardLayout;
export const STUDENT_CARD_LAYOUTS: Record<StudentCardLayout, { label: string; hint: string }> = {
  uny: { label: "Uny", hint: "La carte Uny d'origine" },
  ...CARD_LAYOUTS,
};
export const isStudentCardLayout = (v: unknown): v is StudentCardLayout => typeof v === "string" && v in STUDENT_CARD_LAYOUTS;

/** Champs affichés sur une carte personnalisée par l'étudiant (sans template d'université). */
export const STUDENT_CARD_FIELDS: CardField[] = ["program", "study_level", "academic_year", "expires_at"];

/**
 * Style final de la carte d'un étudiant.
 * - Carte publiée par l'université : couleurs et logo officiels, l'étudiant choisit seulement le modèle.
 * - Sinon : thème et modèle choisis par l'étudiant (rien choisi = carte Uny standard).
 */
export function resolveStudentCardStyle(opts: {
  university: { branding: CardBranding; template: CardTemplate } | null;
  universityName: string;
  layout: string | null | undefined;
  theme: string | null | undefined;
}): { branding: CardBranding | null; template: CardTemplate | null } {
  const layout = isStudentCardLayout(opts.layout) ? opts.layout : null;
  const theme = isCardTheme(opts.theme) ? opts.theme : null;
  if (opts.university) {
    const { branding, template } = opts.university;
    return { branding, template: layout && layout !== "uny" ? { ...template, layout } : template };
  }
  if ((!layout || layout === "uny") && (!theme || theme === "uny")) return { branding: null, template: null };
  const t = CARD_THEMES[theme ?? "uny"];
  return {
    branding: { name: opts.universityName, logoUrl: null, primary: t.primary, secondary: t.secondary, accent: t.accent },
    template: { layout: !layout || layout === "uny" ? "classic" : layout, fields: STUDENT_CARD_FIELDS, labels: {} },
  };
}
