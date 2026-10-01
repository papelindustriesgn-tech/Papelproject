import Link from "next/link";
import { EntityForm } from "@/components/admin/entity-form";
import { createClient } from "@/lib/supabase/server";
import { getCities } from "@/lib/cities";
import { requirePartner } from "@/lib/partner";
import { ENTITIES } from "@/lib/admin-entities";
import { SUPPORT_EMAIL } from "@/lib/constants";
import { DeleteAccountForm, SecurityForms } from "@/app/(app)/profil/securite/security-forms";
import { updatePartnerProfile } from "../actions";

export const metadata = { title: "Ma fiche partenaire" };

const FIELDS = ENTITIES.partenaires.fields.filter((f) => !["is_active", "is_demo"].includes(f.name));

export default async function PartnerProfile() {
  const { profile, partner } = await requirePartner();
  const supabase = await createClient();
  const { data } = await supabase.from("partners").select("*").eq("id", partner.id).single();

  return (
    <div className="animate-fade-up mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Ma fiche partenaire</h1>
        <p className="text-muted text-sm">Ces informations apparaissent sur tes offres, ta boutique et tes annonces.</p>
      </div>
      <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <EntityForm
          fields={FIELDS}
          initial={(data ?? {}) as Record<string, unknown>}
          action={updatePartnerProfile}
          cities={await getCities()}
          uploadTo={{ bucket: "marketplace", prefix: profile.id }}
          submitLabel="Enregistrer la fiche"
        />
      </section>

      <section className="rounded-[var(--radius-card)] bg-white p-5 text-sm shadow-[var(--shadow-card)]">
        <h2 className="font-bold">Mon compte</h2>
        <p className="text-muted mt-1">
          Connecté en tant que {profile.first_name} {profile.last_name} ({profile.email}). Pour ajouter un collègue ou changer
          d&apos;établissement, écris-nous à{" "}
          <a className="text-brand-600 font-semibold" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
        <p className="mt-2">
          <Link href="/conditions" className="text-brand-600 font-semibold">
            Conditions d&apos;utilisation
          </Link>
          {" · "}
          <Link href="/confidentialite" className="text-brand-600 font-semibold">
            Confidentialité
          </Link>
        </p>
      </section>
      <SecurityForms email={profile.email ?? ""} />
      <DeleteAccountForm />
    </div>
  );
}
