import type { NextRequest } from "next/server";
import { isAuthorizedCron } from "@/lib/cron/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, surveyEmail } from "@/lib/email";
import { runJob } from "@/lib/ops/jobs";

export const dynamic = "force-dynamic";

/**
 * Tâche quotidienne (Vercel Cron) : crée les relances du jour puis envoie par email les invitations
 * aux questionnaires pas encore envoyées. Sans SMTP, seules les notifications dans l'app partent.
 * Protégée par CRON_SECRET (en-tête Authorization: Bearer …) : sans secret, la tâche est refusée.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req.headers.get("authorization"))) return new Response("Non autorisé", { status: 401 });

  // Clé par passage : l'idempotence est assurée par les données (une relance tous les 4 jours au plus,
  // emailed_at par notification) ; le journal des exécutions sert au suivi et aux alertes d'échec.
  const out = await runJob("questionnaires", `questionnaires:${new Date().toISOString()}`, sendSurveys, 1);
  if (out.status !== "succeeded") return Response.json({ ok: false }, { status: 500 });
  return Response.json({ ok: true, ...out.result });
}

async function sendSurveys() {
  const db = createAdminClient();
  // Relances du jour (idempotent : une seule relance tous les 4 jours au plus par personne)
  const { data: created, error } = await db.rpc("send_survey_reminders");
  if (error) throw new Error(`Relances : ${error.message}`);

  const { data: pending } = await db
    .from("notifications")
    .select("id, type, user:profiles!notifications_user_id_fkey(first_name, email, is_test_account)")
    .in("type", ["survey", "partner_survey"])
    .is("emailed_at", null)
    .gt("created_at", new Date(Date.now() - 3 * 86400_000).toISOString())
    .limit(300);

  let sent = 0;
  for (const n of pending ?? []) {
    if (!n.user?.email || n.user.is_test_account) continue;
    const ok = await sendEmail({
      to: n.user.email,
      ...surveyEmail(n.user.first_name, n.type === "partner_survey" ? "partner" : "student"),
    });
    if (!ok) break; // SMTP absent ou en panne : on réessaiera au prochain passage
    await db.from("notifications").update({ emailed_at: new Date().toISOString() }).eq("id", n.id);
    sent++;
  }
  return { reminders: created ?? 0, emails: sent };
}
