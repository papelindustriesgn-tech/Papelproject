import { createAdminClient } from "@/lib/supabase/admin";
import { requirePartner } from "@/lib/partner";
import { AddPartnerMemberForm, PartnerMemberRow } from "./forms";

export const metadata = { title: "Équipe" };

/** Responsables (offres, fiche, fidélité, équipe) et caissiers (scanner et valider uniquement). */
export default async function PartnerTeamPage() {
  const { partner, profile } = await requirePartner({ manager: true });
  const { data } = await createAdminClient()
    .from("partner_members")
    .select("user_id, role, user:profiles(first_name, last_name, email)")
    .eq("partner_id", partner.id)
    .order("created_at");
  return (
    <div className="animate-fade-up mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Équipe</h1>
        <p className="text-muted mt-1 text-sm">
          <strong>Responsable</strong> : offres, fiche, fidélité et équipe. <strong>Caissier</strong> : scanne les cartes et
          valide les codes, sans voir les statistiques ni modifier les offres.
        </p>
      </div>
      <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <ul className="divide-line divide-y">
          {(data ?? []).map((m) => (
            <PartnerMemberRow
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
        <h2 className="mb-3 font-bold">Ajouter une personne</h2>
        <AddPartnerMemberForm />
      </section>
    </div>
  );
}
