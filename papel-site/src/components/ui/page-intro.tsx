import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function PageIntro({
  eyebrow,
  title,
  intro,
  crumbs,
  children,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  crumbs?: { href: string; label: string }[];
  children?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden bg-sable">
      <div className="pointer-events-none absolute inset-0 leaf-pattern opacity-70" aria-hidden />
      <div className="relative container-page pt-8 pb-12 sm:pt-12 sm:pb-16">
        {crumbs && (
          <nav aria-label="Fil d'Ariane" className="mb-6 text-sm text-muted">
            <ol className="flex flex-wrap items-center gap-1">
              <li>
                <Link href="/" className="hover:text-papel-700">
                  Accueil
                </Link>
              </li>
              {crumbs.map((c, i) => (
                <li key={c.href} className="flex items-center gap-1">
                  <ChevronRight className="size-3.5" aria-hidden />
                  {i === crumbs.length - 1 ? (
                    <span aria-current="page" className="text-ink">
                      {c.label}
                    </span>
                  ) : (
                    <Link href={c.href} className="hover:text-papel-700">
                      {c.label}
                    </Link>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
        <div className="max-w-3xl animate-rise">
          {eyebrow && <p className="mb-3 eyebrow">{eyebrow}</p>}
          <h1 className="text-4xl font-bold text-papel-950 sm:text-5xl">{title}</h1>
          {intro && <p className="mt-5 text-lg leading-relaxed text-muted">{intro}</p>}
          {children}
        </div>
      </div>
    </section>
  );
}
