"use client";

import { LoyaltyBlock } from "@/components/partner/loyalty-block";
import { useActionState, useState } from "react";
import { BadgeCheck, Search, ShieldAlert, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDate, formatGNF } from "@/lib/format";
import { PAYMENT_METHODS } from "@/lib/orange-money";
import { cn } from "@/lib/cn";
import Image from "@/components/ui/safe-image";
import { redeemPromo, type PromoRedeemState } from "../actions";

const STATE_LABEL = {
  active: "Code valable",
  redeemed: "Code validé ✅",
  used: "Code déjà utilisé",
  expired: "Code expiré",
  cancelled: "Code annulé",
  blocked: "Réduction non applicable",
} as const;

/**
 * Validation d'un code promo étudiant (UNY-XXXX-XX), avec le paiement reçu. Avec `initial` et `partnerId`, la page
 * s'ouvre depuis un lien de vérification (commande à distance) : résultat affiché tout de suite, sans saisie.
 */
export function PromoRedeem({
  merchantCode,
  initial,
  partnerId,
}: {
  merchantCode: string | null;
  initial?: PromoRedeemState;
  partnerId?: string;
}) {
  const [state, action] = useActionState<PromoRedeemState, FormData>(redeemPromo, initial ?? {});
  const [code, setCode] = useState("");
  const r = state.result;
  const ok = r?.found && (r.state === "active" || r.state === "redeemed");

  return (
    <section className="space-y-4 rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2">
        <Ticket className="text-brand-600 size-5" aria-hidden />
        <h2 className="font-bold">Valider un code promo</h2>
      </div>
      {!partnerId && (
        <form action={action} className="flex gap-2">
          <Input
            name="promo_code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="UNY-XXXX-XX"
            aria-label="Code promo"
            autoComplete="off"
            autoCapitalize="characters"
            className="font-mono tracking-widest"
          />
          <SubmitButton className="shrink-0" aria-label="Vérifier le code">
            <Search className="size-4" /> Vérifier
          </SubmitButton>
        </form>
      )}
      {state.error && <FormMessage>{state.error}</FormMessage>}

      {r && !r.found && <FormMessage>Code introuvable pour ton établissement.</FormMessage>}

      {r?.found && r.state && (
        <div
          className={cn("overflow-hidden rounded-2xl", ok ? "ring-mint-500 ring-2" : "ring-coral-500 ring-2")}
          role="status"
          data-testid="promo-result"
        >
          <div
            className={cn(
              "flex items-center gap-2 p-4 font-extrabold",
              ok ? "bg-mint-500 text-white" : "bg-coral-500 text-white",
            )}
          >
            {ok ? <BadgeCheck className="size-6" aria-hidden /> : <ShieldAlert className="size-6" aria-hidden />}
            {STATE_LABEL[r.state]}
          </div>
          {r.state === "blocked" && r.reason && (
            <p className="bg-coral-50 text-ink px-4 py-2 text-sm font-semibold">{r.reason}</p>
          )}
          <dl className="space-y-1 p-4 text-sm">
            <dd className="flex items-center gap-3 text-lg font-extrabold">
              {/* Photo de l'étudiant : à comparer à la personne qui récupère la commande */}
              <span className="bg-brand-50 text-brand-700 relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full text-base">
                {r.avatar_url ? (
                  <Image src={r.avatar_url} alt="" fill sizes="56px" className="object-cover" data-testid="promo-photo" />
                ) : (
                  `${r.first_name?.[0] ?? ""}${r.last_name?.[0] ?? ""}`
                )}
              </span>
              <span className="min-w-0">
                {r.first_name} {r.last_name} <span className="text-muted block font-mono text-xs">{r.uny_id}</span>
              </span>
            </dd>
            {ok && (
              <dd className="text-mint-700 font-semibold" data-testid="promo-student-verified">
                ✅ Étudiant vérifié par Uny · carte valable
              </dd>
            )}
            <dd>
              <strong>{r.discount_label}</strong> · {r.deal_title}
            </dd>
            {r.promo_price_gnf != null && (
              <dd>
                Prix étudiant : <strong>{formatGNF(r.promo_price_gnf)}</strong>
                {r.price_gnf != null && <span className="text-muted ml-1 line-through">{formatGNF(r.price_gnf)}</span>}
              </dd>
            )}
            {r.payment_reference && (
              <dd>
                Référence Orange Money déclarée : <strong className="font-mono">{r.payment_reference}</strong>
                <span className="text-muted block text-xs">Vérifie-la sur ton relevé Orange Money avant de valider.</span>
              </dd>
            )}
            <dd className="text-muted text-xs">
              {r.state === "used" || r.state === "redeemed"
                ? `Utilisé le ${formatDate(r.used_at)}`
                : `Valable jusqu'au ${formatDate(r.expires_at)}`}
            </dd>
          </dl>

          {r.state === "active" && (
            <form action={action} className="border-line space-y-3 border-t p-4">
              <input type="hidden" name="promo_code" value={r.code} />
              <input type="hidden" name="redeem" value="1" />
              {partnerId && <input type="hidden" name="partner_id" value={partnerId} />}
              <Field label="Paiement reçu" htmlFor="pm">
                <Select id="pm" name="payment_method" defaultValue={merchantCode ? "orange_money" : "cash"}>
                  {Object.entries(PAYMENT_METHODS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Montant payé (GNF)" htmlFor="amount" optional>
                  <Input
                    id="amount"
                    name="amount"
                    inputMode="numeric"
                    defaultValue={r.promo_price_gnf ?? ""}
                    placeholder="40000"
                  />
                </Field>
                <Field label="Référence de transaction" htmlFor="ref" optional>
                  <Input id="ref" name="reference" defaultValue={r.payment_reference ?? ""} maxLength={60} />
                </Field>
              </div>
              <SubmitButton size="lg" className="h-auto min-h-13 w-full py-3 text-center whitespace-normal">
                <BadgeCheck className="size-5 shrink-0" /> Confirmer l&apos;utilisation et appliquer la réduction
              </SubmitButton>
            </form>
          )}
          {r.loyalty && (
            <div className="px-4 pb-1">
              <LoyaltyBlock key={`${r.code}-${r.state}`} initial={r.loyalty} />
            </div>
          )}
          {r.state === "redeemed" && !partnerId && (
            <div className="border-line border-t p-4">
              <Button variant="outline" className="w-full" onClick={() => setCode("")}>
                Code suivant
              </Button>
            </div>
          )}
        </div>
      )}
      {!merchantCode && (
        <p className="text-muted text-xs">
          Ajoute ton code marchand Orange Money dans « Fiche » : les étudiants pourront te payer directement depuis l&apos;app.
        </p>
      )}
    </section>
  );
}
