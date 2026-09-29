import type { ReactNode } from "react";
import { BadgeCheck, Clock3, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/cn";
import { VERIFICATION_LABELS, type VerificationStatus } from "@/lib/constants";

type Tone = "brand" | "mango" | "coral" | "mint" | "neutral" | "dark";
const tones: Record<Tone, string> = {
  brand: "bg-brand-50 text-brand-700",
  mango: "bg-mango-50 text-mango-700",
  coral: "bg-coral-50 text-coral-600",
  mint: "bg-mint-50 text-mint-700",
  neutral: "bg-canvas text-muted border border-line",
  dark: "bg-ink/80 text-white backdrop-blur",
};

export function Badge({ tone = "brand", className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold leading-none", tones[tone], className)}>
      {children}
    </span>
  );
}

/** Badge signalant un contenu de démonstration (jamais présenté comme une vraie offre). */
export function DemoBadge({ className }: { className?: string }) {
  return (
    <Badge tone="dark" className={className}>
      Démo
    </Badge>
  );
}

export function VerificationBadge({ status, className }: { status: VerificationStatus; className?: string }) {
  if (status === "verified")
    return (
      <Badge tone="mint" className={className}>
        <BadgeCheck className="size-3.5" aria-hidden /> {VERIFICATION_LABELS.verified}
      </Badge>
    );
  if (status === "pending")
    return (
      <Badge tone="mango" className={className}>
        <Clock3 className="size-3.5" aria-hidden /> {VERIFICATION_LABELS.pending}
      </Badge>
    );
  return (
    <Badge tone="neutral" className={className}>
      <ShieldAlert className="size-3.5" aria-hidden /> {VERIFICATION_LABELS.unverified}
    </Badge>
  );
}
