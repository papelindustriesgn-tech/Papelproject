import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  BENEFIT_TYPES,
  labelOf,
  PARTNER_DISCOUNT,
  PARTNER_EXPECTATIONS,
  PARTNER_EXPECTED_STUDENTS,
  PARTNER_PAYMENT_METHODS,
  SURVEY_BUDGET,
  SURVEY_CATEGORIES,
  SURVEY_MIN_DISCOUNT,
  SURVEY_PAYMENT,
  SURVEY_WOULD_PAY,
  type Option,
} from "@/lib/survey";
import { getPartnerSurveyResponses, getSurveyResponses, universityOf } from "@/lib/survey-results";

const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const date = (d: string) => new Date(d).toLocaleString("fr-FR", { timeZone: "Africa/Conakry" });
/** Libellés sans emoji, séparés par des virgules. */
const many = (list: readonly Option[], values: string[] | null) =>
  (values ?? []).map((v) => labelOf(list, v).replace(/^\p{Extended_Pictographic}\S*\s/u, "")).join(", ");

function csv(name: string, header: string[], lines: unknown[][]) {
  const body = "﻿" + [header, ...lines].map((l) => l.map(cell).join(";")).join("\r\n");
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="uny-avis-${name}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

/** Export CSV des réponses (séparateur « ; » et BOM UTF-8 pour une ouverture directe dans Excel). */
export async function GET(req: NextRequest) {
  await requireAdmin();

  if (req.nextUrl.searchParams.get("type") === "partenaires") {
    const rows = await getPartnerSurveyResponses();
    return csv(
      "partenaires",
      [
        "Date",
        "Partenaire",
        "Répondant",
        "Téléphone",
        "Email",
        "Avantages proposés",
        "Réduction possible",
        "Attentes envers Uny",
        "Clients étudiants espérés / mois",
        "Paiements acceptés",
        "Paierait une mise en avant",
        "Remarques",
      ],
      rows.map((r) => [
        date(r.updated_at),
        r.partner?.name,
        r.author ? `${r.author.first_name} ${r.author.last_name}` : "",
        r.author?.phone ?? r.partner?.phone,
        r.author?.email,
        many(BENEFIT_TYPES, r.offer_types),
        labelOf(PARTNER_DISCOUNT, r.discount_range),
        many(PARTNER_EXPECTATIONS, r.expectations),
        labelOf(PARTNER_EXPECTED_STUDENTS, r.expected_students),
        many(PARTNER_PAYMENT_METHODS, r.payment_methods),
        labelOf(SURVEY_WOULD_PAY, r.would_pay),
        r.comments,
      ]),
    );
  }

  const rows = await getSurveyResponses();
  return csv(
    "etudiants",
    [
      "Date",
      "Questionnaire",
      "Prénom",
      "Nom",
      "Uny ID",
      "Établissement",
      "Domaines souhaités",
      "Types d'avantages",
      "Réduction attendue",
      "Budget mensuel",
      "Paiement préféré",
      "Avantage souhaité / ce qui manque",
      "Enseignes souhaitées",
      "Note (v1)",
      "Recommandation (v1)",
      "Accepte d'être contacté",
      "Téléphone",
      "Email",
    ],
    rows.map((r) => [
      date(r.updated_at),
      `v${r.version}`,
      r.profile.first_name,
      r.profile.last_name,
      r.profile.uny_id,
      universityOf(r),
      many(SURVEY_CATEGORIES, r.categories),
      many(BENEFIT_TYPES, r.benefit_types),
      r.min_discount ? labelOf(SURVEY_MIN_DISCOUNT, r.min_discount) : "",
      r.monthly_budget ? labelOf(SURVEY_BUDGET, r.monthly_budget) : "",
      r.payment_pref ? many(SURVEY_PAYMENT, [r.payment_pref]) : "",
      r.missing,
      r.partners,
      r.rating,
      r.nps,
      r.contact_ok ? "Oui" : "Non",
      r.contact_ok ? r.profile.phone : "",
      r.contact_ok ? r.profile.email : "",
    ]),
  );
}
