import { AdminHeader } from "@/components/admin/shared";
import { ProductForm } from "@/components/admin/product-form";
import { requireAdmin } from "@/lib/admin";
import type { ProductRange } from "@/lib/types";

export const metadata = { title: "Nouveau produit" };

export default async function NewProduct() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("product_ranges").select("*").order("sort_order");
  return (
    <>
      <AdminHeader title="Nouveau produit" />
      <ProductForm ranges={(data ?? []) as ProductRange[]} />
    </>
  );
}
