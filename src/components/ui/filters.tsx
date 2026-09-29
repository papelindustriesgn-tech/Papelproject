import Link from "next/link";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { withParams, type SearchParams } from "@/lib/url";

export function FilterChips({
  pathname,
  searchParams,
  name,
  options,
  allLabel = "Tout",
}: {
  pathname: string;
  searchParams: SearchParams;
  name: string;
  options: { value: string; label: string; emoji?: string }[];
  allLabel?: string;
}) {
  const current = typeof searchParams[name] === "string" ? (searchParams[name] as string) : undefined;
  const chip = (active: boolean) =>
    cn(
      "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition",
      active ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:border-brand-300",
    );
  return (
    <nav aria-label="Filtres" className="-mx-4 overflow-x-auto px-4 scrollbar-none md:mx-0 md:px-0">
      <ul className="flex gap-2 pb-1">
        <li>
          <Link href={withParams(pathname, searchParams, { [name]: null })} className={chip(!current)} scroll={false}>
            {allLabel}
          </Link>
        </li>
        {options.map((o) => (
          <li key={o.value}>
            <Link
              href={withParams(pathname, searchParams, { [name]: current === o.value ? null : o.value })}
              className={chip(current === o.value)}
              aria-current={current === o.value ? "true" : undefined}
              scroll={false}
            >
              {o.emoji && <span aria-hidden>{o.emoji}</span>}
              {o.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Barre de recherche en GET : fonctionne sans JavaScript, conserve les autres filtres. */
export function SearchBar({
  pathname,
  searchParams,
  placeholder,
  keep = [],
}: {
  pathname: string;
  searchParams: SearchParams;
  placeholder: string;
  keep?: string[];
}) {
  const q = typeof searchParams.q === "string" ? searchParams.q : "";
  return (
    <form action={pathname} method="get" role="search" className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" aria-hidden />
      <input
        type="search"
        name="q"
        defaultValue={q}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-12 w-full rounded-2xl border border-line bg-white pr-12 pl-12 text-[16px] shadow-[var(--shadow-card)] placeholder:text-muted/70 focus:border-brand-500 focus:ring-4 focus:ring-brand-100 focus:outline-none"
      />
      {keep.map((k) =>
        typeof searchParams[k] === "string" ? <input key={k} type="hidden" name={k} value={searchParams[k] as string} /> : null,
      )}
      {q && (
        <Link
          href={withParams(pathname, searchParams, { q: null })}
          aria-label="Effacer la recherche"
          className="absolute top-1/2 right-3 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-canvas"
        >
          <X className="size-4" />
        </Link>
      )}
    </form>
  );
}

export function Pagination({
  pathname,
  searchParams,
  page,
  hasMore,
}: {
  pathname: string;
  searchParams: SearchParams;
  page: number;
  hasMore: boolean;
}) {
  if (page <= 1 && !hasMore) return null;
  const btn = "inline-flex h-11 items-center rounded-2xl border border-line bg-white px-5 text-sm font-semibold hover:border-brand-300";
  return (
    <nav className="mt-6 flex items-center justify-center gap-3" aria-label="Pagination">
      {page > 1 && (
        <Link className={btn} href={withParams(pathname, searchParams, { page: page - 1 > 1 ? String(page - 1) : null })}>
          ← Précédent
        </Link>
      )}
      <span className="text-sm text-muted">Page {page}</span>
      {hasMore && (
        <Link className={btn} href={withParams(pathname, searchParams, { page: String(page + 1) })}>
          Suivant →
        </Link>
      )}
    </nav>
  );
}
