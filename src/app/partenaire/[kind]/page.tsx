import { notFound } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Plus } from "lucide-react";
import Image from "@/components/ui/safe-image";
import { LinkButton } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { requirePartner } from "@/lib/partner";
import { isPartnerKind, PARTNER_ENTITIES, type PartnerKind } from "@/lib/partner-entities";
import { formatGNF, formatDate } from "@/lib/format";
import { param, type SearchParams } from "@/lib/url";
import { togglePartnerEntity } from "../actions";

type Row = { id: string; title: string; active: boolean; sub: string; image: string | null; badge?: string };

async function load(kind: PartnerKind, partnerId: string): Promise<Row[]> {
  const supabase = await createClient();
  switch (kind) {
    case "offres": {
      const { data } = await supabase
        .from("deals")
        .select("id, title, discount_label, is_active, view_count, valid_until, image_url")
        .eq("partner_id", partnerId)
        .order("created_at", { ascending: false });
      return (data ?? []).map((d) => ({
        id: d.id,
        title: d.title,
        active: d.is_active,
        image: d.image_url,
        badge: d.discount_label,
        sub: `${d.view_count} vues${d.valid_until ? ` · jusqu'au ${formatDate(d.valid_until)}` : ""}`,
      }));
    }
    case "boutique": {
      const { data } = await supabase
        .from("marketplace_items")
        .select("id, title, price_gnf, status, view_count, images:marketplace_images(url, position)")
        .eq("partner_id", partnerId)
        .order("created_at", { ascending: false });
      return (data ?? []).map((i) => ({
        id: i.id,
        title: i.title,
        active: i.status === "active",
        image: [...(i.images ?? [])].sort((a, b) => a.position - b.position)[0]?.url ?? null,
        badge: i.status === "sold" ? "Vendu" : i.status === "removed" ? "Retiré par Uny" : undefined,
        sub: `${formatGNF(i.price_gnf)} · ${i.view_count} vues`,
      }));
    }
    case "logements": {
      const { data } = await supabase
        .from("housing")
        .select("id, title, price_gnf, district, is_active, is_available, view_count, images")
        .eq("partner_id", partnerId)
        .order("created_at", { ascending: false });
      return (data ?? []).map((h) => ({
        id: h.id,
        title: h.title,
        active: h.is_active,
        image: h.images?.[0] ?? null,
        badge: h.is_available ? undefined : "Loué",
        sub: `${formatGNF(h.price_gnf)}/mois · ${h.district} · ${h.view_count} vues`,
      }));
    }
    case "jobs": {
      const { data } = await supabase
        .from("jobs")
        .select("id, title, type, is_active, view_count, deadline, applications:job_applications(count)")
        .eq("partner_id", partnerId)
        .order("created_at", { ascending: false });
      return (data ?? []).map((j) => {
        const n = (j.applications as unknown as { count: number }[] | null)?.[0]?.count ?? 0;
        return {
          id: j.id,
          title: j.title,
          active: j.is_active,
          image: null,
          badge: n ? `${n} candidature${n > 1 ? "s" : ""}` : undefined,
          sub: `${j.view_count} vues${j.deadline ? ` · jusqu'au ${formatDate(j.deadline)}` : ""}`,
        };
      });
    }
  }
}

export async function generateMetadata({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  return { title: isPartnerKind(kind) ? PARTNER_ENTITIES[kind].plural : "Espace partenaire" };
}

export default async function PartnerList({
  params,
  searchParams,
}: {
  params: Promise<{ kind: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { kind } = await params;
  if (!isPartnerKind(kind)) notFound();
  const sp = await searchParams;
  const { partner } = await requirePartner();
  const cfg = PARTNER_ENTITIES[kind];
  const rows = await load(kind, partner.id);

  return (
    <div className="animate-fade-up space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight">
            <span aria-hidden>{cfg.emoji}</span> {cfg.plural}
          </h1>
          <p className="text-muted text-sm">{cfg.intro}</p>
        </div>
        <LinkButton href={`/partenaire/${kind}/nouveau`} className="w-full sm:w-auto">
          <Plus className="size-4" /> Ajouter
        </LinkButton>
      </div>
      {param(sp, "enregistre") && <FormMessage type="success">Enregistré ✅ C&apos;est en ligne pour les étudiants.</FormMessage>}
      {param(sp, "supprime") && <FormMessage type="info">Supprimé.</FormMessage>}

      {rows.length === 0 ? (
        <div className="rounded-[var(--radius-card)] bg-white p-8 text-center shadow-[var(--shadow-card)]">
          <p className="text-4xl" aria-hidden>
            {cfg.emoji}
          </p>
          <p className="mt-2 font-bold">Rien pour l&apos;instant</p>
          <p className="text-muted text-sm">
            Publie ton premier {cfg.singular} : il sera visible tout de suite par les étudiants.
          </p>
          <LinkButton href={`/partenaire/${kind}/nouveau`} className="mt-4">
            <Plus className="size-4" /> Ajouter
          </LinkButton>
        </div>
      ) : (
        <ul className="divide-line divide-y overflow-hidden rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-card)]">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center gap-3 p-3">
              <div className="bg-canvas relative size-14 shrink-0 overflow-hidden rounded-xl">
                {r.image ? (
                  <Image src={r.image} alt="" fill sizes="56px" className="object-cover" />
                ) : (
                  <span className="flex h-full items-center justify-center text-2xl" aria-hidden>
                    {cfg.emoji}
                  </span>
                )}
              </div>
              <Link href={`/partenaire/${kind}/${r.id}`} className="min-w-0 flex-1">
                <span className="block truncate font-semibold hover:underline">{r.title}</span>
                <span className="text-muted block truncate text-xs">{r.sub}</span>
                <span className="mt-1 flex flex-wrap gap-1">
                  {!r.active && <Badge tone="dark">Masqué</Badge>}
                  {r.badge && <Badge tone="brand">{r.badge}</Badge>}
                </span>
              </Link>
              <form action={togglePartnerEntity.bind(null, kind, r.id, !r.active)}>
                <button
                  className="text-muted hover:bg-canvas hover:text-ink flex size-10 items-center justify-center rounded-xl"
                  aria-label={r.active ? "Masquer" : "Publier"}
                  title={r.active ? "Masquer" : "Publier"}
                >
                  {r.active ? <Eye className="size-5" /> : <EyeOff className="size-5" />}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
