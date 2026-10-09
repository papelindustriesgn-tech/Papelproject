import { SURVEY_MIN_VERSION } from "@/lib/survey";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/constants";
import { ContactList, type Contact } from "./contact-list";

export const metadata = { title: "Contacter les inscrits" };

export default async function ContactsPage() {
  await requireAdmin(); // le layout et la page sont rendus en parallèle
  const supabase = await createClient();
  const [{ data: profiles }, { data: answered }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, first_name, last_name, phone, verification_status, created_at")
      .eq("is_test_account", false)
      .in("role", ["student", "admin"])
      .not("phone", "is", null)
      .order("created_at", { ascending: false })
      .limit(5000),
    // Seules les réponses au questionnaire actuel comptent : les autres sont réinvités
    supabase.from("survey_responses").select("user_id").gte("version", SURVEY_MIN_VERSION).limit(5000),
  ]);
  const done = new Set((answered ?? []).map((r) => r.user_id));
  const contacts: Contact[] = (profiles ?? [])
    .filter((p) => p.phone)
    .map((p) => ({
      id: p.id,
      first: p.first_name,
      last: p.last_name,
      phone: p.phone!,
      verified: p.verification_status === "verified",
      answered: done.has(p.id),
      createdAt: p.created_at,
    }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Contacter les inscrits</h1>
        <p className="text-muted text-sm">
          Écris ton message une fois : il est personnalisé avec le prénom de chaque étudiant et s&apos;ouvre dans WhatsApp ou dans
          les SMS de ton téléphone, prêt à envoyer.
        </p>
      </div>
      <ContactList contacts={contacts} surveyUrl={`${SITE_URL}/avis`} />
    </div>
  );
}
