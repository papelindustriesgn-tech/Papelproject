import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, CalendarClock, MapPin, Wallet } from "lucide-react";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { FavoriteButton } from "@/components/content/favorite-button";
import { cn } from "@/lib/cn";
import {
  DEAL_CATEGORIES,
  HOUSING_TYPES,
  ITEM_CONDITIONS,
  JOB_TYPES,
  MARKET_CATEGORIES,
  type DealCategory,
  type HousingType,
  type ItemCondition,
  type JobType,
  type MarketCategory,
} from "@/lib/constants";
import { daysUntil, formatGNF, formatShortDate, timeAgo } from "@/lib/format";

const cardBase = "group relative block overflow-hidden rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-lg";

// ---------------------------------------------------------------------------
export type DealCardData = {
  id: string;
  title: string;
  discount_label: string;
  category: DealCategory;
  district: string | null;
  image_url: string | null;
  valid_until: string | null;
  is_demo: boolean;
  partner: { name: string; logo_url: string | null } | null;
};

export function DealCard({
  deal,
  favorite,
  href,
  compact = false,
  priority = false,
}: {
  deal: DealCardData;
  favorite?: boolean;
  href?: string;
  compact?: boolean;
  priority?: boolean;
}) {
  const cat = DEAL_CATEGORIES[deal.category];
  return (
    <div className={cn("relative", compact && "w-64 shrink-0 snap-start")}>
    <Link href={href ?? `/avantages/${deal.id}`} className={cn(cardBase, "h-full")}>
      <div className="relative aspect-[16/10] bg-brand-50">
        {deal.image_url && (
          <Image
            src={deal.image_url}
            alt=""
            fill
            priority={priority}
            sizes="(max-width: 768px) 70vw, 320px"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        )}
        <span className="absolute bottom-3 left-3 rounded-xl bg-coral-500 px-2.5 py-1 text-base font-extrabold text-white shadow-lg">
          {deal.discount_label}
        </span>
        <div className="absolute top-3 left-3 flex gap-1.5">{deal.is_demo && <DemoBadge />}</div>
      </div>
      <div className="p-3.5">
        <p className="flex items-center gap-1 truncate text-xs font-semibold text-muted">
          <span aria-hidden>{cat.emoji}</span> {deal.partner?.name ?? cat.label}
        </p>
        <h3 className="mt-1 line-clamp-2 leading-snug font-bold text-ink">{deal.title}</h3>
        <p className="mt-2 flex items-center gap-1 text-xs text-muted">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{deal.district ?? "Conakry"}</span>
          {deal.valid_until && <span className="ml-auto shrink-0">jusqu&apos;au {formatShortDate(deal.valid_until)}</span>}
        </p>
      </div>
    </Link>
    {favorite !== undefined && <FavoriteButton kind="deal" id={deal.id} initial={favorite} className="absolute top-3 right-3" />}
    </div>
  );
}

// ---------------------------------------------------------------------------
export type JobCardData = {
  id: string;
  title: string;
  company_name: string;
  type: JobType;
  location: string | null;
  is_remote: boolean;
  compensation: string | null;
  deadline: string | null;
  is_demo: boolean;
  created_at: string;
};

export function JobCard({ job, favorite, compact = false }: { job: JobCardData; favorite?: boolean; compact?: boolean }) {
  const t = JOB_TYPES[job.type];
  const left = daysUntil(job.deadline);
  return (
    <div className={cn("relative", compact && "w-72 shrink-0 snap-start")}>
    <Link href={`/jobs/${job.id}`} className={cn(cardBase, "h-full p-4")}>
      <div className="flex items-start gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-xl" aria-hidden>
          {t.emoji}
        </span>
        <div className="min-w-0 flex-1 pr-10">
          <h3 className="line-clamp-2 leading-snug font-bold text-ink">{job.title}</h3>
          <p className="mt-0.5 truncate text-sm text-muted">{job.company_name}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge>{t.label}</Badge>
        {job.is_remote && <Badge tone="mint">À distance</Badge>}
        {job.is_demo && <DemoBadge />}
      </div>
      <div className="mt-3 space-y-1 text-sm text-muted">
        <p className="flex items-center gap-1.5 truncate">
          <MapPin className="size-4 shrink-0" aria-hidden /> {job.location ?? "Conakry"}
        </p>
        {job.compensation && (
          <p className="flex items-center gap-1.5 truncate">
            <Wallet className="size-4 shrink-0" aria-hidden /> {job.compensation}
          </p>
        )}
        {left !== null && (
          <p className={cn("flex items-center gap-1.5", left <= 7 && left >= 0 && "font-semibold text-coral-600")}>
            <CalendarClock className="size-4 shrink-0" aria-hidden />
            {left < 0 ? "Candidatures closes" : left === 0 ? "Dernier jour !" : `Encore ${left} j · ${formatShortDate(job.deadline)}`}
          </p>
        )}
      </div>
    </Link>
    {favorite !== undefined && <FavoriteButton kind="job" id={job.id} initial={favorite} className="absolute top-3 right-3 shadow-none ring-1 ring-line" />}
    </div>
  );
}

// ---------------------------------------------------------------------------
export type HousingCardData = {
  id: string;
  title: string;
  type: HousingType;
  district: string;
  price_gnf: number;
  rooms: number;
  images: string[];
  is_available: boolean;
  available_from: string | null;
  is_demo: boolean;
};

export function HousingCard({
  home,
  favorite,
  compact = false,
  href,
}: {
  home: HousingCardData;
  favorite?: boolean;
  compact?: boolean;
  href?: string;
}) {
  const t = HOUSING_TYPES[home.type];
  const availableNow = home.is_available && (!home.available_from || new Date(home.available_from) <= new Date());
  return (
    <div className={cn("relative", compact && "w-72 shrink-0 snap-start")}>
    <Link href={href ?? `/logement/${home.id}`} className={cn(cardBase, "h-full")}>
      <div className="relative aspect-[4/3] bg-brand-50">
        {home.images[0] && (
          <Image src={home.images[0]} alt="" fill sizes="(max-width: 768px) 80vw, 360px" className="object-cover transition duration-500 group-hover:scale-105" />
        )}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <Badge tone="dark">
            {t.emoji} {t.label}
          </Badge>
          {home.is_demo && <DemoBadge />}
        </div>
      </div>
      <div className="p-3.5">
        <p className="text-lg font-extrabold text-brand-700">
          {formatGNF(home.price_gnf)}
          <span className="text-sm font-semibold text-muted"> /mois</span>
        </p>
        <h3 className="mt-0.5 line-clamp-1 font-bold text-ink">{home.title}</h3>
        <div className="mt-2 flex items-center gap-2 text-xs text-muted">
          <span className="flex min-w-0 items-center gap-1">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{home.district}</span>
          </span>
          <span aria-hidden>·</span>
          <span className="shrink-0">
            {home.rooms} pièce{home.rooms > 1 ? "s" : ""}
          </span>
          <span
            className={cn(
              "ml-auto shrink-0 rounded-full px-2 py-0.5 font-semibold",
              !home.is_available ? "bg-canvas text-muted" : availableNow ? "bg-mint-50 text-mint-700" : "bg-mango-50 text-mango-700",
            )}
          >
            {!home.is_available ? "Loué" : availableNow ? "Disponible" : `Dès le ${formatShortDate(home.available_from)}`}
          </span>
        </div>
      </div>
    </Link>
    {favorite !== undefined && <FavoriteButton kind="housing" id={home.id} initial={favorite} className="absolute top-3 right-3" />}
    </div>
  );
}

// ---------------------------------------------------------------------------
export type ItemCardData = {
  id: string;
  title: string;
  category: MarketCategory;
  price_gnf: number;
  condition: ItemCondition;
  district: string | null;
  created_at: string;
  is_demo: boolean;
  status?: string;
  cover: string | null;
  verifiedSeller?: boolean;
};

export function ItemCard({ item, href, compact = false }: { item: ItemCardData; href?: string; compact?: boolean }) {
  const c = MARKET_CATEGORIES[item.category];
  return (
    <Link href={href ?? `/marketplace/${item.id}`} className={cn(cardBase, compact && "w-44 shrink-0 snap-start")}>
      <div className="relative aspect-square bg-canvas">
        {item.cover ? (
          <Image src={item.cover} alt="" fill sizes="(max-width: 768px) 50vw, 240px" className="object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <span className="flex h-full items-center justify-center text-5xl" aria-hidden>
            {c.emoji}
          </span>
        )}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          {item.is_demo && <DemoBadge />}
          {item.status === "sold" && <Badge tone="dark">Vendu</Badge>}
        </div>
      </div>
      <div className="p-3">
        <p className="truncate text-base font-extrabold text-ink">{formatGNF(item.price_gnf)}</p>
        <h3 className="line-clamp-1 text-sm font-semibold text-ink/90">{item.title}</h3>
        <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted">
          {item.verifiedSeller && <BadgeCheck className="size-3.5 shrink-0 text-mint-500" aria-label="Vendeur vérifié" />}
          <span className="truncate">
            {ITEM_CONDITIONS[item.condition]} · {item.district ?? "Conakry"}
          </span>
        </p>
        <p className="mt-0.5 text-[11px] text-muted/80">{timeAgo(item.created_at)}</p>
      </div>
    </Link>
  );
}
