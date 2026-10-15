"use client";

import { useState, useTransition } from "react";
import { Gift } from "lucide-react";
import { cn } from "@/lib/cn";
import type { LoyaltyStatus } from "@/lib/loyalty";
import { redeemReward } from "@/app/partenaire/fidelite/actions";

/** Carte de fidélité du client dans le résultat du scanner : tampons, récompense à utiliser. */
export function LoyaltyBlock({ initial }: { initial: LoyaltyStatus }) {
  const [status, setStatus] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (!status || !status.program || !status.required) return null;

  return (
    <div className="bg-brand-50 mt-3 rounded-2xl p-4 text-sm" data-testid="loyalty-block">
      <p className="flex items-center gap-2 font-bold">
        <Gift className="text-brand-600 size-4" aria-hidden /> Fidélité : {status.stamps}/{status.required} tampons
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5" aria-hidden>
        {Array.from({ length: status.required }).map((_, i) => (
          <span
            key={i}
            className={cn("size-5 rounded-full", i < status.stamps ? "bg-brand-600" : "ring-brand-100 bg-white ring-1")}
          />
        ))}
      </div>
      {status.unlocked && <p className="text-mint-700 mt-2 font-bold">🎉 Récompense débloquée à l&apos;instant !</p>}
      {status.rewards_available > 0 && status.card_id && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold">
            🎁 {status.rewards_available} récompense{status.rewards_available > 1 ? "s" : ""} : {status.reward}
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await redeemReward(status.card_id!);
                if (r.status !== undefined) setStatus(r.status);
                setMessage(r.message ?? r.error ?? null);
              })
            }
            className="bg-brand-600 rounded-full px-4 py-2 font-bold text-white disabled:opacity-60"
          >
            {pending ? "…" : "Utiliser la récompense"}
          </button>
        </div>
      )}
      {message && <p className="mt-2 font-semibold">{message}</p>}
    </div>
  );
}
