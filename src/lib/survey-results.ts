import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Réponses à l'enquête (comptes de test exclus), avec l'identité du répondant — réservé aux admins (RLS). */
export async function getSurveyResponses() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("survey_responses")
    .select(
      "*, profile:profiles!inner(first_name, last_name, email, phone, uny_id, is_test_account, university_other, university:universities(short_name, name))",
    )
    .eq("profile.is_test_account", false)
    .order("updated_at", { ascending: false })
    .limit(5000);
  return data ?? [];
}

export type SurveyResponse = Awaited<ReturnType<typeof getSurveyResponses>>[number];

export const universityOf = (r: SurveyResponse) =>
  r.profile.university?.short_name ?? r.profile.university?.name ?? r.profile.university_other ?? "—";
