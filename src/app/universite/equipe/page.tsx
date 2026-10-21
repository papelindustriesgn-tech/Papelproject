import { RestrictedNotice } from "@/components/university/restricted-notice";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUniversity, universityCan, UNIVERSITY_ROLES } from "@/lib/university";
import { AddMemberForm, MemberRow } from "./forms";

export const metadata = { title: "Équipe" };

/** Membres du portail et leurs droits (administration, validation, consultation, annonces). */
export default async function TeamPage() {
  const { profile, university } = await requireUniversity();
  if (!universityCan(university, "manage")) return <RestrictedNotice university={university} title="Équipe" />;
  const { data } = await createAdminClient()
    .from("university_members")
    .select("user_id, role, created_at, user:profiles!university_members_user_id_fkey(first_name, last_name, email)")
    .eq("university_id", university.id)
    .order("created_at");

  return (
    <div className="animate-fade-up mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Équipe</h1>
        <p className="text-muted mt-1 text-sm">Chaque personne n&apos;a que les droits nécessaires à son travail.</p>
      </div>
      <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <h2 className="mb-3 font-bold">Rôles</h2>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          {Object.values(UNIVERSITY_ROLES).map((r) => (
            <div key={r.label}>
              <dt className="font-semibold">{r.label}</dt>
              <dd className="text-muted">{r.description}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <h2 className="mb-3 font-bold">Membres</h2>
        <ul className="divide-line divide-y">
          {(data ?? []).map((m) => (
            <MemberRow
              key={m.user_id}
              userId={m.user_id}
              name={m.user ? `${m.user.first_name} ${m.user.last_name}` : "Compte supprimé"}
              email={m.user?.email ?? ""}
              role={m.role}
              self={m.user_id === profile.id}
            />
          ))}
        </ul>
      </section>
      <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <h2 className="mb-1 font-bold">Ajouter une personne</h2>
        <p className="text-muted mb-4 text-sm">
          La personne doit d&apos;abord créer son compte Uny avec son adresse professionnelle.
        </p>
        <AddMemberForm />
      </section>
    </div>
  );
}
