import { notFound } from "next/navigation";
import { AdminHeader } from "@/components/admin/shared";
import { RangeForm } from "@/components/admin/range-form";
import { requireAdmin } from "@/lib/admin";
import type { ProductRange } from "@/lib/types";

export const metadata = { title: "Modifier la gamme" };

export default async function EditRange({ params, searchParams }: PageProps<"/admin/gammes/[id]">) {
  const { id } = await params;
  const { enregistre } = await searchParams;
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("product_ranges").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const range = data as ProductRange & { updated_at: string };
  return (
    <>
      <AdminHeader title={range.name} intro={enregistre ? "✓ Modifications enregistrées." : undefined} />
      <RangeForm key={range.updated_at} range={range} />
    </>
  );
}
