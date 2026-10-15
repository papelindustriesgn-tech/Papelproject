import type { Metadata } from "next";
import { BackLink } from "@/components/ui/back-link";
import { PageTitle } from "@/components/ui/section-header";
import { ItemForm } from "@/components/marketplace/item-form";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Publier une annonce" };

export default async function NewItemPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data: city } = await supabase
    .from("cities")
    .select("districts")
    .eq("id", profile.city_id ?? 0)
    .maybeSingle();
  return (
    <div className="animate-fade-up mx-auto max-w-2xl">
      <BackLink href="/marketplace" label="Marketplace" />
      <PageTitle title="Publier une annonce" subtitle="Vends ce dont tu n'as plus besoin à d'autres étudiants." />
      <div className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <ItemForm userId={profile.id} districts={city?.districts ?? []} defaults={{ contact_phone: profile.phone }} />
      </div>
    </div>
  );
}
