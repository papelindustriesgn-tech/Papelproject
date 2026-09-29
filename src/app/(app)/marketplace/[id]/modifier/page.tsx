import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { BackLink } from "@/components/ui/back-link";
import { PageTitle } from "@/components/ui/section-header";
import { ItemForm } from "@/components/marketplace/item-form";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Modifier l'annonce" };

export default async function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const profile = await requireProfile();
  const supabase = await createClient();
  const [{ data: item }, { data: city }] = await Promise.all([
    supabase
      .from("marketplace_items")
      .select("*, images:marketplace_images(url, storage_path, position)")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("cities").select("districts").eq("slug", "conakry").single(),
  ]);
  if (!item || item.seller_id !== profile.id) notFound();
  if (item.status === "removed") {
    return (
      <p className="bg-coral-50 text-coral-600 rounded-2xl p-4">
        Cette annonce a été retirée par la modération et ne peut plus être modifiée.
      </p>
    );
  }
  const images = [...(item.images ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((i) => ({ url: i.url, path: i.storage_path }));
  return (
    <div className="animate-fade-up mx-auto max-w-2xl">
      <BackLink href="/marketplace/mes-annonces" label="Mes annonces" />
      <PageTitle title="Modifier l'annonce" />
      <div className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <ItemForm
          userId={profile.id}
          districts={city?.districts ?? []}
          defaults={{
            id: item.id,
            title: item.title,
            category: item.category,
            condition: item.condition,
            price_gnf: item.price_gnf,
            is_negotiable: item.is_negotiable,
            description: item.description,
            district: item.district,
            contact_phone: item.contact_phone,
            images,
          }}
        />
      </div>
    </div>
  );
}
