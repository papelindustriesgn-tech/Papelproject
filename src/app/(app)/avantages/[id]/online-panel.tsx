"use client";

import { useActionState, useState } from "react";
import { Check, Copy, ExternalLink, Globe } from "lucide-react";
import { FormMessage } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDate } from "@/lib/format";
import { openOnlineOffer, type OnlineOfferState } from "../actions";

const HOW: Record<string, string> = {
  unique: "Ton code personnel, utilisable une fois sur le site de la marque.",
  shared: "Code réservé aux étudiants vérifiés : saisis-le au moment de payer sur le site.",
  link: "La réduction s'applique automatiquement depuis ce lien réservé.",
};

/** Offre en ligne : le lien (et le code) ne sont révélés qu'après contrôle du statut par la base. */
export function OnlinePanel({ dealId, brand, mode }: { dealId: string; brand: string; mode: string }) {
  const [state, action] = useActionState(openOnlineOffer.bind(null, dealId), {} as OnlineOfferState);
  const [copied, setCopied] = useState(false);

  if (!state.url)
    return (
      <form action={action} className="space-y-2" data-testid="online-panel">
        {state.error && <FormMessage>{state.error}</FormMessage>}
        <SubmitButton size="lg" className="w-full" pendingLabel="Vérification…">
          <Globe className="size-5" /> {mode === "link" ? "Accéder à l'offre en ligne" : "Obtenir mon code en ligne"}
        </SubmitButton>
        <p className="text-muted text-center text-xs">{HOW[mode]}</p>
      </form>
    );

  const copy = async () => {
    if (!state.code) return;
    try {
      await navigator.clipboard.writeText(state.code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      className="space-y-4 rounded-[var(--radius-card)] bg-white p-5 text-center shadow-[var(--shadow-float)]"
      data-testid="online-panel"
    >
      {state.code && (
        <div>
          <p className="text-muted text-sm font-semibold">Ton code pour {brand}</p>
          <button
            type="button"
            onClick={copy}
            className="text-brand-700 mt-1 inline-flex items-center gap-2 font-mono text-3xl font-black tracking-widest"
            data-testid="online-code"
            aria-label={`Copier le code ${state.code}`}
          >
            {state.code}
            {copied ? <Check className="text-mint-600 size-5" aria-hidden /> : <Copy className="text-muted size-5" aria-hidden />}
          </button>
          {state.expiresAt && <p className="text-muted mt-1 text-xs">Valable jusqu&apos;au {formatDate(state.expiresAt)}</p>}
        </div>
      )}
      <p className="text-ink/80 text-sm">{HOW[state.mode ?? mode]}</p>
      <a
        href={state.url}
        target="_blank"
        rel="noopener noreferrer"
        className="bg-brand-600 hover:bg-brand-700 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 font-bold text-white"
        data-testid="online-link"
      >
        Aller sur le site de {brand} <ExternalLink className="size-4" aria-hidden />
      </a>
    </div>
  );
}
