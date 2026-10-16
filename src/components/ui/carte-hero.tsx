import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { CourbeHero, type FormatGraphique } from "@/components/graphiques/hero";

export interface StatHero {
  libelle: string;
  valeur: ReactNode;
  detail?: ReactNode;
}

/**
 * Carte héros d'une vue d'ensemble (inspirée des tableaux de bord modernes) : fond dégradé à la couleur du service,
 * l'indicateur principal en grand, sa courbe jour par jour, et trois chiffres clés en bas.
 */
export function CarteHero({
  titre,
  valeur,
  sousTitre,
  points,
  format,
  stats,
  lien,
  className = "mb-4",
}: {
  titre: string;
  valeur: ReactNode;
  sousTitre?: ReactNode;
  points: { date: string; valeur: number | null; axe?: string; libelle?: string }[];
  format: FormatGraphique;
  stats: StatHero[];
  lien?: string;
  className?: string;
}) {
  return (
    <section className={`relative overflow-hidden rounded-3xl ${className} bg-linear-to-br from-papel-800 via-papel-700 to-papel-500 p-5 text-white shadow-[0_18px_40px_-20px_var(--color-papel-700)] md:p-6`}>
      {/* Halo décoratif */}
      <div className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full bg-white/10 blur-2xl" aria-hidden />
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white/75">{titre}</h2>
          <div className="mt-1 text-[2.1rem] font-bold leading-tight tracking-tight md:text-[2.5rem]">{valeur}</div>
          {sousTitre && <div className="mt-1 text-sm text-white/80">{sousTitre}</div>}
        </div>
        {lien && (
          <Link href={lien} className="flex min-h-10 items-center gap-1 rounded-full bg-white/15 px-4 text-sm font-semibold backdrop-blur hover:bg-white/25">
            Détail <ArrowUpRight size={16} aria-hidden />
          </Link>
        )}
      </div>
      <div className="relative -mx-2 mt-2">
        <CourbeHero points={points} format={format} />
      </div>
      <div className="relative mt-3 grid gap-2 sm:grid-cols-3">
        {stats.map((s, i) => (
          <div key={s.libelle} className={`rounded-2xl px-4 py-3 ${i === 1 ? "bg-white/20 ring-1 ring-white/30" : "bg-white/10"}`}>
            <div className="text-xs font-medium uppercase tracking-wide text-white/70">{s.libelle}</div>
            <div className="mt-0.5 text-xl font-bold">{s.valeur}</div>
            {s.detail && <div className="text-xs text-white/75">{s.detail}</div>}
          </div>
        ))}
      </div>
    </section>
  );
}
