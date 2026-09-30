import { requireAdmin } from "@/lib/auth";
import { labelOf, SURVEY_MODULES, SURVEY_SOURCES, SURVEY_WOULD_PAY } from "@/lib/survey";
import { getSurveyResponses, universityOf } from "@/lib/survey-results";

/** Export CSV des réponses (séparateur « ; » et BOM UTF-8 pour une ouverture directe dans Excel). */
export async function GET() {
  await requireAdmin();
  const rows = await getSurveyResponses();
  const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const header = [
    "Date",
    "Prénom",
    "Nom",
    "Uny ID",
    "Établissement",
    "Connu via",
    "Note (1-5)",
    "Recommandation (0-10)",
    "Services intéressants",
    "Paierait un abonnement",
    "Ce qui manque",
    "Enseignes souhaitées",
    "Accepte d'être contacté",
    "Téléphone",
    "Email",
  ];
  const lines = rows.map((r) =>
    [
      new Date(r.updated_at).toLocaleString("fr-FR", { timeZone: "Africa/Conakry" }),
      r.profile.first_name,
      r.profile.last_name,
      r.profile.uny_id,
      universityOf(r),
      labelOf(SURVEY_SOURCES, r.source),
      r.rating,
      r.nps,
      r.modules.map((m) => labelOf(SURVEY_MODULES, m).replace(/^\S+\s/, "")).join(", "),
      labelOf(SURVEY_WOULD_PAY, r.would_pay),
      r.missing,
      r.partners,
      r.contact_ok ? "Oui" : "Non",
      r.contact_ok ? r.profile.phone : "",
      r.contact_ok ? r.profile.email : "",
    ]
      .map(cell)
      .join(";"),
  );
  const csv = "﻿" + [header.map(cell).join(";"), ...lines].join("\r\n");
  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="uny-avis-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
