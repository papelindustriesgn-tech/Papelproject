/**
 * Emails étudiants Uny. Les boîtes sont hébergées chez un fournisseur professionnel
 * (Google Workspace for Education, Microsoft 365 A1, Zoho Mail…) : Uny ne fait tourner
 * aucun serveur de messagerie et ne stocke jamais de mot de passe.
 *
 * Fournisseur « manual » : Uny réserve l'adresse (gestion des homonymes, jamais réattribuée),
 * l'administrateur crée la boîte dans la console du fournisseur puis la marque « active ».
 * Les connecteurs automatiques (création/suspension par API) s'ajoutent ici une fois le domaine
 * acheté et le compte fournisseur ouvert ; ils restent « non connectés » d'ici là.
 */

export const EMAIL_PROVIDERS = {
  manual: {
    label: "Création manuelle dans la console du fournisseur",
    connected: true,
    dkimSelector: null,
    console: null,
  },
  google_workspace: {
    label: "Google Workspace for Education",
    connected: false,
    dkimSelector: "google",
    console: "https://admin.google.com",
  },
  microsoft_365: {
    label: "Microsoft 365 A1 (Éducation)",
    connected: false,
    dkimSelector: "selector1",
    console: "https://admin.microsoft.com",
  },
  zoho: { label: "Zoho Mail", connected: false, dkimSelector: "zmail", console: "https://mailadmin.zoho.com" },
} as const;
export type EmailProviderKey = keyof typeof EMAIL_PROVIDERS;

export const EMAIL_STATUS = {
  pending: { label: "À créer", tone: "mango" },
  active: { label: "Active", tone: "mint" },
  suspended: { label: "Suspendue", tone: "coral" },
  alumni: { label: "Alumni", tone: "brand" },
  disabled: { label: "Désactivée", tone: "neutral" },
} as const;
export type EmailStatus = keyof typeof EMAIL_STATUS;

export type StudentEmailSettings = {
  domain: string | null;
  provider: EmailProviderKey;
  auto_allocate: boolean;
  expiry_policy: "suspend" | "alumni";
  grace_days: number;
};

export function parseEmailSettings(v: unknown): StudentEmailSettings {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  return {
    domain: typeof o.domain === "string" && o.domain ? o.domain : null,
    provider: typeof o.provider === "string" && o.provider in EMAIL_PROVIDERS ? (o.provider as EmailProviderKey) : "manual",
    auto_allocate: o.auto_allocate === true,
    expiry_policy: o.expiry_policy === "alumni" ? "alumni" : "suspend",
    grace_days: typeof o.grace_days === "number" ? o.grace_days : 30,
  };
}
