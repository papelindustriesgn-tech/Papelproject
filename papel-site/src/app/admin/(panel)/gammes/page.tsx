import Link from "next/link";
import { AdminHeader, EmptyRow, NewButton, StatusPill, td, th } from "@/components/admin/shared";
import { requireAdmin } from "@/lib/admin";
import { PUBLICATION_LABEL } from "@/lib/labels";
import type { ProductRange } from "@/lib/types";

export const metadata = { title: "Gammes" };

export default async function AdminRanges() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("product_ranges").select("*").order("sort_order");
  const list = (data ?? []) as ProductRange[];
  return (
    <>
      <AdminHeader
        title="Gammes"
        intro="Les gammes futures restent en brouillon tant qu'elles ne sont pas commercialisées."
        action={<NewButton href="/admin/gammes/nouveau">Nouvelle gamme</NewButton>}
      />
      <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-line">
        <table className="w-full min-w-[36rem] text-sm">
          <thead className="border-b border-line bg-sable/60">
            <tr>
              <th className={th}>Gamme</th>
              <th className={th}>Commercialisée</th>
              <th className={th}>Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {list.length === 0 && <EmptyRow colSpan={3}>Aucune gamme.</EmptyRow>}
            {list.map((r) => (
              <tr key={r.id} className="hover:bg-sable/50">
                <td className={td}>
                  <Link href={`/admin/gammes/${r.id}`} className="font-semibold text-papel-800 hover:underline">
                    {r.name}
                  </Link>
                </td>
                <td className={td}>{r.is_commercialized ? "Oui" : "Non"}</td>
                <td className={td}>
                  <StatusPill value={r.status} label={PUBLICATION_LABEL[r.status]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
