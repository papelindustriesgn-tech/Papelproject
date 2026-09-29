import Image from "@/components/ui/safe-image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Eye, EyeOff, Pencil, Plus } from "lucide-react";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchBar } from "@/components/ui/filters";
import { createClient } from "@/lib/supabase/server";
import { ENTITIES, isEntity } from "@/lib/admin-entities";
import { DEAL_CATEGORIES, HOUSING_TYPES, JOB_TYPES } from "@/lib/constants";
import { formatDate, formatGNF } from "@/lib/format";
import { ilikePattern, param, type SearchParams } from "@/lib/url";
import { toggleEntity } from "../crud-actions";

type Row = Record<string, unknown> & { id: string; is_active: boolean; is_demo: boolean };

export async function generateMetadata({ params }: { params: Promise<{ entity: string }> }) {
  const { entity } = await params;
  return { title: isEntity(entity) ? ENTITIES[entity].plural : "Admin" };
}

export default async function EntityList({
  params,
  searchParams,
}: {
  params: Promise<{ entity: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { entity } = await params;
  if (!isEntity(entity)) notFound();
  const sp = await searchParams;
  const cfg = ENTITIES[entity];
  const q = param(sp, "q");
  const supabase = await createClient();
  let query = supabase.from(cfg.table).select(cfg.listSelect);
  if (q) query = query.ilike(cfg.titleField, ilikePattern(q));
  const { data } = await query.order("created_at", { ascending: false }).limit(200);
  const rows = (data ?? []) as unknown as Row[];

  function thumb(r: Row) {
    const src = (r.image_url ?? r.logo_url ?? (Array.isArray(r.images) ? r.images[0] : null)) as string | null;
    return src ? <Image src={src} alt="" fill sizes="56px" className="object-cover" /> : null;
  }
  function subtitle(r: Row) {
    if (entity === "partenaires")
      return `${DEAL_CATEGORIES[r.category as keyof typeof DEAL_CATEGORIES]?.label} · ${r.district ?? "—"}`;
    if (entity === "avantages")
      return `${(r.partner as { name: string } | null)?.name ?? "—"} · ${r.discount_label} · ${r.view_count} vues · ${r.valid_until ? `jusqu'au ${formatDate(r.valid_until as string)}` : "sans limite"}`;
    if (entity === "jobs")
      return `${r.company_name} · ${JOB_TYPES[r.type as keyof typeof JOB_TYPES]?.label} · ${r.view_count} vues · ${r.deadline ? `limite ${formatDate(r.deadline as string)}` : ""}`;
    return `${HOUSING_TYPES[r.type as keyof typeof HOUSING_TYPES]?.label} · ${r.district} · ${formatGNF(r.price_gnf as number)} · ${r.view_count} vues`;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">{cfg.plural}</h1>
        <LinkButton href={`/admin/${entity}/nouveau`} size="sm">
          <Plus className="size-4" /> Ajouter
        </LinkButton>
      </div>
      {param(sp, "enregistre") && <FormMessage type="success">Enregistré ✅</FormMessage>}
      {param(sp, "supprime") && <FormMessage type="success">Supprimé.</FormMessage>}
      <SearchBar pathname={`/admin/${entity}`} searchParams={sp} placeholder="Rechercher…" />
      {rows.length === 0 ? (
        <EmptyState
          emoji="📭"
          title="Rien pour le moment"
          action={<LinkButton href={`/admin/${entity}/nouveau`}>Ajouter</LinkButton>}
        />
      ) : (
        <ul className="divide-line divide-y overflow-hidden rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-card)]">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-4 py-3">
              <div className="bg-canvas relative size-14 shrink-0 overflow-hidden rounded-xl">{thumb(r)}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{r[cfg.titleField] as string}</p>
                <p className="text-muted truncate text-xs">{subtitle(r)}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {r.is_active ? <Badge tone="mint">Publié</Badge> : <Badge tone="neutral">Masqué</Badge>}
                  {r.is_demo && <DemoBadge />}
                  {r.is_featured === true && <Badge tone="mango">En avant</Badge>}
                  {r.is_available === false && <Badge tone="neutral">Loué</Badge>}
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <form action={toggleEntity.bind(null, entity, r.id, !r.is_active)}>
                  <button
                    className="ring-line hover:bg-canvas flex size-9 items-center justify-center rounded-xl ring-1"
                    aria-label={r.is_active ? "Masquer" : "Publier"}
                    title={r.is_active ? "Masquer" : "Publier"}
                  >
                    {r.is_active ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </form>
                <Link
                  href={`/admin/${entity}/${r.id}`}
                  className="bg-ink flex size-9 items-center justify-center rounded-xl text-white"
                  aria-label="Modifier"
                >
                  <Pencil className="size-4" />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
