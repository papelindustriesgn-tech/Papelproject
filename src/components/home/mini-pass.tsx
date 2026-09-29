import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import type { VerificationStatus } from "@/lib/constants";
import { VERIFICATION_LABELS } from "@/lib/constants";
import { cn } from "@/lib/cn";

/** Aperçu compact de la carte Uny sur le dashboard (ne prend pas tout l'écran). */
export function MiniPass({
  first,
  last,
  avatar,
  unyId,
  status,
  university,
}: {
  first: string;
  last: string;
  avatar: string | null;
  unyId: string;
  status: VerificationStatus;
  university: string;
}) {
  return (
    <Link
      href="/carte"
      className="uny-pattern group from-brand-800 via-brand-700 to-brand-500 relative flex items-center gap-3 overflow-hidden rounded-[var(--radius-card)] bg-gradient-to-br p-4 text-white shadow-[var(--shadow-float)] transition active:scale-[0.99]"
    >
      <Avatar src={avatar} first={first} last={last} size={52} className="bg-white/20 text-white ring-2 ring-white/40" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-white/70 uppercase">Ma carte Uny</p>
        <p className="truncate font-extrabold">
          {first} {last}
        </p>
        <p className="truncate text-xs text-white/75">{university}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs font-bold tracking-wide">{unyId}</span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-bold",
              status === "verified" ? "bg-mint-500" : status === "pending" ? "bg-mango-400 text-ink" : "bg-white/20",
            )}
          >
            {VERIFICATION_LABELS[status]}
          </span>
        </div>
      </div>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/15 transition group-hover:bg-white/25">
        <ChevronRight className="size-5" aria-hidden />
      </span>
    </Link>
  );
}
