import type { Metadata } from "next";
import Link from "next/link";
import { Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { PageTitle } from "@/components/ui/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatGNF, timeAgo } from "@/lib/format";
import { ITEM_COLUMNS, toItemCard } from "@/lib/queries";
import { deleteItem, setItemStatus } from "../actions";
import { param, type SearchParams } from "@/lib/url";
import Image from "@/components/ui/safe-image";

export const metadata: Metadata = { title: "Mes annonces" };

const STATUS: Record<string, { label: string; tone: "mint" | "neutral" | "dark" | "coral" }> = {
  active: { label: "En ligne", tone: "mint" },
  sold: { label: "Vendu", tone: "dark" },
  hidden: { label: "Masquée", tone: "neutral" },
  removed: { label: "Retirée", tone: "coral" },
};

export default async function MyItemsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data } = await supabase
    .from("marketplace_items")
    .select(`${ITEM_COLUMNS}, view_count`)
    .eq("seller_id", profile.id)
    .order("created_at", { ascending: false });
  const items = (data ?? []).map((r) => ({ ...toItemCard(r as Parameters<typeof toItemCard>[0]), views: r.view_count }));
  const btn =
    "inline-flex h-9 items-center gap-1.5 rounded-xl border border-line bg-white px-3 text-sm font-semibold hover:border-brand-300";

  return (
    <div className="animate-fade-up">
      <PageTitle
        title="Mes annonces"
        subtitle={`${items.length} annonce${items.length > 1 ? "s" : ""}`}
        action={
          <LinkButton href="/marketplace/nouveau" size="sm">
            <Plus className="size-4" /> Publier
          </LinkButton>
        }
      />
      {param(sp, "supprime") && (
        <div className="mb-4">
          <FormMessage type="success">Annonce supprimée.</FormMessage>
        </div>
      )}
      {items.length === 0 ? (
        <EmptyState
          emoji="📦"
          title="Tu n'as encore rien publié"
          text="Un livre, un téléphone, un meuble dont tu n'as plus besoin ? Vends-le en 1 minute."
          action={<LinkButton href="/marketplace/nouveau">Publier ma première annonce</LinkButton>}
        />
      ) : (
        <ul className="space-y-3">
          {items.map((it) => (
            <li key={it.id} className="rounded-[var(--radius-card)] bg-white p-3 shadow-[var(--shadow-card)]">
              <Link href={`/marketplace/${it.id}`} className="flex gap-3">
                <div className="bg-canvas relative size-20 shrink-0 overflow-hidden rounded-2xl">
                  {it.cover && <Image src={it.cover} alt="" fill sizes="80px" className="object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{it.title}</p>
                  <p className="text-brand-700 font-extrabold">{formatGNF(it.price_gnf)}</p>
                  <div className="text-muted mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <Badge tone={STATUS[it.status ?? "active"].tone}>{STATUS[it.status ?? "active"].label}</Badge>
                    <span>
                      {it.views} vue{it.views > 1 ? "s" : ""}
                    </span>
                    <span>· {timeAgo(it.created_at)}</span>
                  </div>
                </div>
              </Link>
              {it.status !== "removed" && (
                <div className="border-line mt-3 flex flex-wrap gap-2 border-t pt-3">
                  <Link href={`/marketplace/${it.id}/modifier`} className={btn}>
                    <Pencil className="size-4" /> Modifier
                  </Link>
                  {it.status === "active" && (
                    <form action={setItemStatus.bind(null, it.id, "sold")}>
                      <button className={btn}>✅ Vendu</button>
                    </form>
                  )}
                  {it.status === "active" ? (
                    <form action={setItemStatus.bind(null, it.id, "hidden")}>
                      <button className={btn}>
                        <EyeOff className="size-4" /> Masquer
                      </button>
                    </form>
                  ) : (
                    <form action={setItemStatus.bind(null, it.id, "active")}>
                      <button className={btn}>
                        <Eye className="size-4" /> Remettre en ligne
                      </button>
                    </form>
                  )}
                  <form action={deleteItem.bind(null, it.id)} className="ml-auto">
                    <ConfirmButton
                      message="Supprimer définitivement cette annonce ?"
                      className={`${btn} text-coral-600 hover:border-coral-500`}
                    >
                      <Trash2 className="size-4" /> Supprimer
                    </ConfirmButton>
                  </form>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
