import { createClient } from "@/lib/supabase/server";
import { requireUniversity } from "@/lib/university";
import type { EnrollmentRow } from "@/components/university/enrollment-item";

export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = {
  pending: "En attente",
  manual_review: "À vérifier",
  verified: "Confirmée",
  rejected: "Refusée",
  expired: "Expirée",
};
const CARD: Record<string, string> = { active: "Active", expired: "Expirée", revoked: "Révoquée" };

const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Export Excel (CSV ; séparateur point-virgule) de toutes les inscriptions de l'établissement. */
export async function GET() {
  const { university } = await requireUniversity();
  const supabase = await createClient();
  const rows: EnrollmentRow[] = [];
  for (let offset = 0; offset < 20000; offset += 200) {
    const { data, error } = await supabase.rpc("university_enrollments", {
      p_university: university.id,
      p_limit: 200,
      p_offset: offset,
    });
    if (error) return new Response("Export impossible", { status: 500 });
    rows.push(...((data ?? []) as EnrollmentRow[]));
    if (!data || data.length < 200) break;
  }
  const header = [
    "Nom",
    "Prénom",
    "Matricule",
    "Identifiant Uny",
    "Faculté",
    "Filière",
    "Niveau",
    "Année",
    "Statut",
    "Carte",
    "Demandée le",
    "Décidée le",
  ];
  const lines = rows.map((r) =>
    [
      r.last_name,
      r.first_name,
      r.student_number,
      r.uny_id,
      r.faculty,
      r.program,
      r.study_level,
      r.academic_year,
      STATUS[r.status] ?? r.status,
      r.card_status ? (CARD[r.card_status] ?? r.card_status) : "",
      r.created_at?.slice(0, 10),
      r.decided_at?.slice(0, 10) ?? "",
    ]
      .map(cell)
      .join(";"),
  );
  const csv = "﻿" + [header.join(";"), ...lines].join("\r\n");
  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="etudiants-uny-${date}.csv"`,
    },
  });
}
