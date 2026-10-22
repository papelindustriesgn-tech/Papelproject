import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Dictionnaire des indicateurs. Chaque chiffre est calculé par la fonction SQL `ops_metrics(p_days)`
 * (réservée aux administrateurs et à la clé de service) : jamais par l'IA, qui ne fait que les expliquer.
 * Période : glissante sur `days` jours jusqu'à l'heure de calcul ; fuseau Africa/Conakry (UTC+0).
 * Exclusions communes : comptes de test (`is_test_account`), contenus et commerçants de démonstration (`is_demo`).
 */
export type MetricKey =
  | "signups"
  | "active_students"
  | "verified_students_total"
  | "enrollments_submitted"
  | "enrollments_decided"
  | "enrollments_pending"
  | "decision_hours_median"
  | "deal_views"
  | "coupons_generated"
  | "coupons_used"
  | "purchases_confirmed"
  | "declared_amount_gnf"
  | "card_scans"
  | "card_scans_refused"
  | "reports_open"
  | "alerts_open"
  | "ai_cost_usd_month";

export type MetricDef = {
  key: MetricKey;
  label: string;
  definition: string;
  source: string;
  formula: string;
  /** « période » = fenêtre glissante choisie ; « instantané » = état à l'heure du calcul ; « mois » = mois civil en cours. */
  window: "période" | "instantané" | "mois";
  exclusions: string;
};

export const METRICS: MetricDef[] = [
  { key: "signups", label: "Inscriptions étudiantes", definition: "Comptes étudiants créés sur la période.", source: "profiles", formula: "count(*) où role = student et created_at ≥ début", window: "période", exclusions: "Comptes de test" },
  { key: "active_students", label: "Étudiants actifs", definition: "Étudiants ayant ouvert l'application sur la période.", source: "profiles.last_seen_at", formula: "count(*) où role = student et last_seen_at ≥ début", window: "période", exclusions: "Comptes de test" },
  { key: "verified_students_total", label: "Étudiants vérifiés (total)", definition: "Étudiants dont le statut est vérifié.", source: "profiles.verification_status", formula: "count(*) où verification_status = verified", window: "instantané", exclusions: "Comptes de test" },
  { key: "enrollments_submitted", label: "Demandes d'inscription reçues", definition: "Demandes déposées auprès d'établissements approuvés.", source: "student_enrollments", formula: "count(*) où created_at ≥ début et établissement partenaire", window: "période", exclusions: "Établissements non approuvés" },
  { key: "enrollments_decided", label: "Décisions d'établissement", definition: "Demandes validées, refusées ou à compléter sur la période.", source: "student_enrollments.decided_at", formula: "count(*) où decided_at ≥ début et statut ∈ {verified, rejected, incomplete}", window: "période", exclusions: "—" },
  { key: "enrollments_pending", label: "Demandes en attente", definition: "Demandes soumises ou à vérifier, non décidées.", source: "student_enrollments", formula: "count(*) où statut ∈ {pending, manual_review}", window: "instantané", exclusions: "—" },
  { key: "decision_hours_median", label: "Délai médian de décision (h)", definition: "Temps médian entre le dépôt et la décision.", source: "student_enrollments", formula: "médiane(decided_at − created_at) en heures, décisions de la période", window: "période", exclusions: "—" },
  { key: "deal_views", label: "Vues d'offres", definition: "Ouvertures d'une fiche d'offre par un utilisateur connecté.", source: "content_views (entity_type = deal)", formula: "count(*) où created_at ≥ début", window: "période", exclusions: "Offres et commerçants de démonstration" },
  { key: "coupons_generated", label: "Coupons générés", definition: "Codes promo demandés par des étudiants.", source: "promo_codes.created_at", formula: "count(*) où created_at ≥ début", window: "période", exclusions: "Comptes de test, commerçants de démonstration" },
  { key: "coupons_used", label: "Coupons utilisés", definition: "Codes validés en caisse.", source: "promo_codes.used_at", formula: "count(*) où status = used et used_at ≥ début", window: "période", exclusions: "Comptes de test, commerçants de démonstration" },
  { key: "purchases_confirmed", label: "Achats confirmés", definition: "Coupons utilisés avec un mode de paiement déclaré par le commerce (déclaratif, non vérifié par Uny).", source: "promo_codes.payment_method", formula: "count(*) où status = used, payment_method renseigné, used_at ≥ début", window: "période", exclusions: "Comptes de test, commerçants de démonstration" },
  { key: "declared_amount_gnf", label: "Montants déclarés (GNF)", definition: "Somme des montants saisis en caisse. Uny n'encaisse rien : ce n'est pas un chiffre d'affaires vérifié.", source: "promo_codes.amount_gnf", formula: "sum(amount_gnf) des achats confirmés de la période", window: "période", exclusions: "Comptes de test, commerçants de démonstration" },
  { key: "card_scans", label: "Vérifications de carte", definition: "Scans ou saisies de carte par les commerçants (un scan n'est pas une vente).", source: "card_validations", formula: "count(*) où created_at ≥ début", window: "période", exclusions: "Commerçants de démonstration" },
  { key: "card_scans_refused", label: "Vérifications refusées", definition: "Scans dont la carte n'était pas valable pour l'offre.", source: "card_validations.eligible", formula: "count(*) où eligible = false et created_at ≥ début", window: "période", exclusions: "Commerçants de démonstration" },
  { key: "reports_open", label: "Signalements ouverts", definition: "Signalements marketplace non traités.", source: "content_reports", formula: "count(*) où status = open", window: "instantané", exclusions: "—" },
  { key: "alerts_open", label: "Alertes ouvertes", definition: "Alertes de surveillance non résolues.", source: "ops_alerts", formula: "count(*) où status ≠ resolved", window: "instantané", exclusions: "—" },
  { key: "ai_cost_usd_month", label: "Coût IA du mois (USD)", definition: "Coût des appels IA du mois civil (coût réel, ou estimé tant que l'appel n'est pas terminé).", source: "ai_runs", formula: "sum(coalesce(cost_usd, estimated_cost_usd)) hors refus", window: "mois", exclusions: "Appels refusés (non facturés)" },
];

/** Indicateurs demandés mais sans source fiable : affichés « Non disponible » avec la raison. */
export const UNAVAILABLE_METRICS = [
  { label: "Chiffre d'affaires attribuable à Uny", why: "Uny n'encaisse aucun paiement ; seuls existent des montants déclarés en caisse, non vérifiés." },
  { label: "Revenus récurrents (MRR)", why: "Aucun abonnement payant n'est facturé dans l'application à ce jour." },
  { label: "Conversion vue → achat", why: "Les vues et les achats ne sont pas reliés de façon fiable (achats déclaratifs, vues anonymes non suivies)." },
  { label: "Disponibilité du site (uptime)", why: "Aucune sonde externe n'est configurée ; à brancher sur un service de surveillance (voir docs/PILOTAGE.md)." },
  { label: "Échecs de connexion inhabituels", why: "Les journaux d'authentification Supabase ne sont pas exportés vers l'application." },
];

export type Metrics = Record<MetricKey, number | null> & {
  computed_at: string;
  period_start: string;
  period_end: string;
  days: number;
  timezone: string;
};

/** Indicateurs calculés pour l'administrateur connecté (contrôle d'accès dans la fonction SQL). */
export async function getMetrics(days = 7): Promise<Metrics> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("ops_metrics", { p_days: days });
  if (error) throw error;
  return data as unknown as Metrics;
}
