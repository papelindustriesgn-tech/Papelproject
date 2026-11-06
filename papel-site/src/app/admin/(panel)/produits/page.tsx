import Image from "next/image";
import Link from "next/link";
import { AdminHeader, EmptyRow, NewButton, StatusPill, td, th } from "@/components/admin/shared";
import { requireAdmin } from "@/lib/admin";
import { AVAILABILITY_LABEL, PUBLICATION_LABEL } from "@/lib/labels";
import type { Product, ProductRange } from "@/lib/types";

export const metadata = { title: "Produits" };

export default async function AdminProducts() {
  const { supabase } = await requireAdmin();
  const [{ data: products }, { data: ranges }] = await Promise.all([
    supabase.from("products").select("*").order("sort_order"),
    supabase.from("product_ranges").select("id, name"),
  ]);
  const rangeName = new Map(((ranges ?? []) as Pick<ProductRange, "id" | "name">[]).map((r) => [r.id, r.name]));
  const list = (products ?? []) as Product[];
  return (
    <>
      <AdminHeader
        title="Produits"
        intro="Catalogue publié sur le site. Un produit n'est visible que s'il est publié et que sa gamme l'est aussi."
        action={<NewButton href="/admin/produits/nouveau">Nouveau produit</NewButton>}
      />
      <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-line">
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="border-b border-line bg-sable/60">
            <tr>
              <th className={th}>Produit</th>
              <th className={th}>Gamme</th>
              <th className={th}>Disponibilité</th>
              <th className={th}>Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {list.length === 0 && <EmptyRow colSpan={4}>Aucun produit.</EmptyRow>}
            {list.map((p) => (
              <tr key={p.id} className="hover:bg-sable/50">
                <td className={td}>
                  <Link
                    href={`/admin/produits/${p.id}`}
                    className="flex items-center gap-3 font-semibold text-papel-800 hover:underline"
                  >
                    <span className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-sable">
                      {p.images[0] && <Image src={p.images[0]} alt="" fill sizes="44px" className="object-cover" />}
                    </span>
                    {p.name}
                  </Link>
                </td>
                <td className={td}>{rangeName.get(p.range_id) ?? "—"}</td>
                <td className={td}>{AVAILABILITY_LABEL[p.availability]}</td>
                <td className={td}>
                  <StatusPill value={p.status} label={PUBLICATION_LABEL[p.status]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
