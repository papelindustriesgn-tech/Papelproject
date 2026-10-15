import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, surveyEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

/**
 * Tâche quotidienne (Vercel Cron) : crée les relances du jour puis envoie par email les invitations
 * aux questionnaires pas encore envoyées. Sans SMTP, seules les notifications dans l'app partent.
 * Protégée par CRON_SECRET (en-tête Authorization: Bearer …) quand il est défini.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authorized = secret
    ? req.headers.get("authorization") === `Bearer ${secret}`
    : (req.headers.get("user-agent") ?? "").startsWith("vercel-cron/");
  if (!authorized) return new Response("Non autorisé", { status: 401 });

  const db = createAdminClient();
  // Relances du jour (idempotent : une seule relance tous les 4 jours au plus par personne)
  const { data: created } = await db.rpc("send_survey_reminders");

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
    const ok = await sendEmail({ to: n.user.email, ...surveyEmail(n.user.first_name, n.type === "partner_survey" ? "partner" : "student") });
    if (!ok) break; // SMTP absent ou en panne : on réessaiera au prochain passage
    await db.from("notifications").update({ emailed_at: new Date().toISOString() }).eq("id", n.id);
    sent++;
  }
  return Response.json({ reminders: created ?? 0, emails: sent });
}
