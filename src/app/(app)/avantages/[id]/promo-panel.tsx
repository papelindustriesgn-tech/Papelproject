"use client";

import { useActionState } from "react";
import { Clock, CreditCard, Ticket } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { OrangeMoneyPay } from "@/components/payment/orange-money-pay";
import { formatDate } from "@/lib/format";
import { claimPromoCode, declarePromoPayment, type PromoState } from "../actions";

type Props = {
  dealId: string;
  initial: PromoState;
  partnerName: string;
  merchantCode: string | null;
  amount: number | null;
};

export function PromoPanel({ dealId, initial, partnerName, merchantCode, amount }: Props) {
  const [claim, claimAction] = useActionState(claimPromoCode.bind(null, dealId), initial);
  const [pay, payAction] = useActionState(declarePromoPayment, initial);
  const code = claim.code ?? initial.code;
  const expiresAt = claim.expiresAt ?? initial.expiresAt;
  const reference = pay.reference ?? initial.reference;

  if (!code)
    return (
      <form action={claimAction} className="space-y-2">
        {claim.error && <FormMessage>{claim.error}</FormMessage>}
        <SubmitButton size="lg" className="w-full" pendingLabel="Création du code…">
          <Ticket className="size-5" /> Obtenir mon code promo
        </SubmitButton>
        <p className="text-muted text-center text-xs">Code personnel, valable 7 jours et utilisable une fois.</p>
      </form>
    );

  return (
    <div className="space-y-4 rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-float)]">
      <div className="text-center">
        <p className="text-muted text-sm font-semibold">Ton code promo</p>
        <p className="text-brand-700 mt-1 font-mono text-3xl font-black tracking-widest" data-testid="promo-code">
          {code}
        </p>
        {expiresAt && (
          <p className="text-muted mt-1 flex items-center justify-center gap-1 text-xs">
            <Clock className="size-3.5" aria-hidden /> Valable jusqu&apos;au {formatDate(expiresAt)}
          </p>
        )}
        <p className="text-ink/80 mt-2 text-sm">
          Montre ce code à {partnerName} : il le valide dans son espace Uny et applique la réduction.
        </p>
      </div>

      {merchantCode ? (
        <OrangeMoneyPay merchantCode={merchantCode} merchantName={partnerName} amount={amount}>
          {reference ? (
            <FormMessage type="success">Référence Orange Money notée : {reference}</FormMessage>
          ) : (
            <form action={payAction} className="space-y-2">
              <input type="hidden" name="code" value={code} />
              <Field
                label="Référence de la transaction (SMS Orange Money)"
                htmlFor="om-ref"
                optional
                hint="Après paiement, copie la référence reçue par SMS : le partenaire retrouvera ton paiement plus vite."
              >
                <Input id="om-ref" name="reference" maxLength={60} placeholder="PP2610.1234.A56789" autoComplete="off" />
              </Field>
              {pay.error && <FormMessage>{pay.error}</FormMessage>}
              <SubmitButton variant="outline" className="w-full">
                J&apos;ai payé, envoyer la référence
              </SubmitButton>
            </form>
          )}
          {pay.message && <FormMessage type="success">{pay.message}</FormMessage>}
        </OrangeMoneyPay>
      ) : (
        <p className="text-muted bg-canvas rounded-2xl p-3 text-center text-sm">
          Paiement sur place auprès de {partnerName} (le partenaire n&apos;a pas encore ajouté son code marchand Orange Money).
        </p>
      )}

      <LinkButton href="/carte" variant="outline" className="w-full">
        <CreditCard className="size-5" /> Présenter aussi ma carte
      </LinkButton>
    </div>
  );
}
