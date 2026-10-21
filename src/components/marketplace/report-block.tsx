"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { Ban, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { blockUser, reportListing, unblockUser } from "@/app/(app)/marketplace/moderation-actions";

const REASONS = {
  scam: "Arnaque ou demande de paiement suspecte",
  prohibited: "Article interdit",
  offensive: "Contenu choquant ou insultant",
  spam: "Publicité ou annonce en double",
  wrong_info: "Informations fausses",
  other: "Autre",
} as const;

/** Signaler l'annonce et bloquer le vendeur (ses annonces disparaissent pour toi, et les tiennes pour lui). */
export function ReportBlock({ itemId, sellerId }: { itemId: string; sellerId: string | null }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(reportListing.bind(null, itemId), {});
  const [pending, start] = useTransition();
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState<string>();

  return (
    <div className="mt-4 space-y-3 text-sm">
      <div className="flex flex-wrap gap-2">
        {!state.ok && (
          <Button size="sm" variant="ghost" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            <Flag className="size-4" aria-hidden /> Signaler l&apos;annonce
          </Button>
        )}
        {sellerId && !blocked && (
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => {
              if (!confirm("Bloquer ce vendeur ? Tu ne verras plus ses annonces et il ne verra plus les tiennes.")) return;
              start(async () => {
                const r = await blockUser(sellerId);
                if (r?.error) setError(r.error);
                else setBlocked(true);
              });
            }}
          >
            <Ban className="size-4" aria-hidden /> Bloquer le vendeur
          </Button>
        )}
      </div>
      {blocked && sellerId && (
        <FormMessage type="success">
          Vendeur bloqué. Ses annonces ne s&apos;affichent plus.{" "}
          <button
            type="button"
            className="font-bold underline"
            onClick={() => start(async () => void (await unblockUser(sellerId), setBlocked(false)))}
          >
            Annuler
          </button>
        </FormMessage>
      )}
      {error && <FormMessage>{error}</FormMessage>}
      {state.ok ? (
        <FormMessage type="success">{state.message}</FormMessage>
      ) : (
        open && (
          <form action={action} className="bg-canvas space-y-3 rounded-2xl p-4">
            <FormMessage>{state.error}</FormMessage>
            <Field label="Motif" htmlFor="report-reason">
              <Select id="report-reason" name="reason" required defaultValue="">
                <option value="" disabled>
                  Choisis un motif
                </option>
                {Object.entries(REASONS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Précisions" htmlFor="report-details" optional>
              <Textarea id="report-details" name="details" rows={2} maxLength={500} />
            </Field>
            <SubmitButton size="sm">Envoyer le signalement</SubmitButton>
            <p className="text-muted text-xs">
              <Link href="/regles-marketplace" className="underline">
                Règles de publication
              </Link>{" "}
              · En cas de danger, contacte d&apos;abord les autorités.
            </p>
          </form>
        )
      )}
    </div>
  );
}
