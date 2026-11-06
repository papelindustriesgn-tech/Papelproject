import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteProduct } from "@/app/admin/actions";
import { ProductForm } from "@/components/admin/product-form";
import { AdminHeader } from "@/components/admin/shared";
import { ConfirmButton } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin";
import type { Product, ProductRange } from "@/lib/types";

export const metadata = { title: "Modifier le produit" };

export default async function EditProduct({ params, searchParams }: PageProps<"/admin/produits/[id]">) {
  const { id } = await params;
  const { enregistre } = await searchParams;
  const { supabase } = await requireAdmin();
  const [{ data: product }, { data: ranges }] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).maybeSingle(),
    supabase.from("product_ranges").select("*").order("sort_order"),
  ]);
  if (!product) notFound();
  const p = product as Product;
  return (
    <>
      <AdminHeader
        title={p.name}
        intro={enregistre ? "✓ Modifications enregistrées." : undefined}
        action={
          <div className="flex items-center gap-2">
            {p.status === "published" && (
              <Link href={`/produits/${p.slug}`} target="_blank" className="text-sm font-semibold text-papel-700">
                Voir sur le site ↗
              </Link>
            )}
            <form action={deleteProduct}>
              <input type="hidden" name="id" value={p.id} />
              <ConfirmButton message="Supprimer définitivement ce produit ? Pour le retirer du site sans le supprimer, passez-le en « Archivé ».">
                Supprimer
              </ConfirmButton>
            </form>
          </div>
        }
      />
      <ProductForm key={p.updated_at} product={p} ranges={(ranges ?? []) as ProductRange[]} />
    </>
  );
}
