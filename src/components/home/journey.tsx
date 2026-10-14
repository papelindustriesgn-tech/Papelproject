import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatGNF } from "@/lib/format";
import { JOURNEY_STEPS, type Journey } from "@/lib/journey";

const TONES = {
  brand: "bg-brand-600 text-white",
  mango: "bg-mango-50 text-ink ring-1 ring-mango-100",
  mint: "bg-mint-50 text-ink ring-1 ring-mint-100",
} as const;

/** Barre de progression du parcours étudiant. */
export function JourneyProgress({ current }: { current: number }) {
  return (
    <ol aria-label="Ton parcours Uny" className="grid grid-cols-4 gap-1.5">
      {JOURNEY_STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="min-w-0" aria-current={active ? "step" : undefined}>
            <div className={cn("h-1.5 rounded-full", done ? "bg-mint-500" : active ? "bg-brand-600" : "bg-line")} />
            <p
              className={cn(
                "mt-1.5 flex items-center gap-1 truncate text-[11px] font-semibold sm:text-xs",
                done ? "text-mint-700" : active ? "text-brand-700" : "text-muted",
              )}
            >
              {done && <Check className="size-3 shrink-0" aria-hidden />}
              {label}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

/** Une seule action principale : la prochaine étape du parcours. */
export function NextStepCard({ journey }: { journey: Journey }) {
  const { next } = journey;
  const primary = next.tone === "brand";
  const content = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-extrabold">{next.title}</span>
        <span className={cn("mt-0.5 block text-sm", primary ? "text-white/85" : "text-muted")}>{next.body}</span>
        {journey.savedGnf > 0 && (
          <span className={cn("mt-2 block text-sm font-bold", primary ? "text-white" : "text-mint-700")}>
            💰 Tu as économisé {formatGNF(journey.savedGnf)} avec Uny
          </span>
        )}
      </span>
      {next.cta && (
        <span
          className={cn(
            "flex shrink-0 items-center gap-1 rounded-full px-4 py-2.5 text-sm font-bold",
            primary ? "text-brand-700 bg-white" : "bg-brand-600 text-white",
          )}
        >
          {next.cta} <ArrowRight className="size-4" aria-hidden />
        </span>
      )}
    </>
  );
  const className = cn(
    "flex flex-col gap-3 rounded-[var(--radius-card)] p-5 sm:flex-row sm:items-center",
    TONES[next.tone],
    next.href && "transition hover:brightness-[0.98] active:scale-[0.99]",
  );
  return next.href ? (
    <Link href={next.href} className={className} data-testid="next-step">
      {content}
    </Link>
  ) : (
    <div className={className} data-testid="next-step">
      {content}
    </div>
  );
}
