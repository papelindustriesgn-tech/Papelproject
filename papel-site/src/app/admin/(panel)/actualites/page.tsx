import Link from "next/link";
import { AdminHeader, EmptyRow, NewButton, StatusPill, td, th } from "@/components/admin/shared";
import { requireAdmin } from "@/lib/admin";
import { formatDate, NEWS_CATEGORY_LABEL, PUBLICATION_LABEL } from "@/lib/labels";
import type { NewsPost } from "@/lib/types";

export const metadata = { title: "Actualités" };

export default async function AdminNews() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("news_posts").select("*").order("created_at", { ascending: false });
  const list = (data ?? []) as NewsPost[];
  return (
    <>
      <AdminHeader title="Actualités" action={<NewButton href="/admin/actualites/nouveau">Nouvel article</NewButton>} />
      <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-line">
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="border-b border-line bg-sable/60">
            <tr>
              <th className={th}>Titre</th>
              <th className={th}>Catégorie</th>
              <th className={th}>Publication</th>
              <th className={th}>Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {list.length === 0 && <EmptyRow colSpan={4}>Aucun article.</EmptyRow>}
            {list.map((n) => (
              <tr key={n.id} className="hover:bg-sable/50">
                <td className={td}>
                  <Link href={`/admin/actualites/${n.id}`} className="font-semibold text-papel-800 hover:underline">
                    {n.title}
                  </Link>
                </td>
                <td className={td}>{NEWS_CATEGORY_LABEL[n.category]}</td>
                <td className={`${td} text-muted`}>{formatDate(n.published_at) || "—"}</td>
                <td className={td}>
                  <StatusPill value={n.status} label={PUBLICATION_LABEL[n.status]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
