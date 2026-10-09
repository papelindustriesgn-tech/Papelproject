import type { Metadata } from "next";
import { BackLink } from "@/components/ui/back-link";
import { PageTitle } from "@/components/ui/section-header";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EditProfileForm } from "./edit-form";

export const metadata: Metadata = { title: "Modifier mon profil" };

export default async function EditProfilePage() {
  const p = await requireProfile();
  const supabase = await createClient();
  const [{ data: universities }, { data: cities }] = await Promise.all([
    supabase.from("universities").select("id, name, short_name").eq("is_active", true).order("name"),
    supabase.from("cities").select("id, name").eq("country_code", p.country_code).order("name"),
  ]);
  return (
    <div className="animate-fade-up mx-auto max-w-2xl">
      <BackLink href="/profil" label="Profil" />
      <PageTitle title="Mes informations" />
      <div className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <EditProfileForm
          locked={p.verification_status === "verified"}
          universities={universities ?? []}
          cities={cities ?? []}
          defaults={{
            first_name: p.first_name,
            last_name: p.last_name,
            birth_date: p.birth_date ?? "",
            gender: p.gender ?? "",
            phone: p.phone ?? "",
            university_id: p.university_id ? String(p.university_id) : p.university_other ? "other" : "",
            university_other: p.university_other ?? "",
            field_of_study: p.field_of_study ?? "",
            study_level: p.study_level ?? "",
            city_id: p.city_id ? String(p.city_id) : "",
          }}
        />
      </div>
    </div>
  );
}
