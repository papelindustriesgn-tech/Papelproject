"use client";

import { useState } from "react";
import { Check, Copy, Smartphone } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { formatGNF } from "@/lib/format";
import { ORANGE_MONEY_DIAL, ORANGE_MONEY_USSD } from "@/lib/orange-money";

function CopyValue({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="bg-canvas flex items-center justify-between gap-3 rounded-2xl px-4 py-3">
      <div className="min-w-0">
        <p className="text-muted text-xs font-semibold">{label}</p>
        <p className="truncate font-mono text-lg font-extrabold tracking-wide">{value}</p>
      </div>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
        className="text-brand-700 ring-line flex shrink-0 items-center gap-1 rounded-xl bg-white px-3 py-2 text-xs font-bold ring-1"
        aria-label={`Copier ${label}`}
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? "Copié" : "Copier"}
      </button>
    </div>
  );
}

/** Instructions de paiement sur le code marchand Orange Money d'un partenaire. */
export function OrangeMoneyPay({
  merchantCode,
  merchantName,
  amount,
  children,
}: {
  merchantCode: string;
  merchantName: string;
  amount?: number | null;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span
          className="flex size-9 items-center justify-center rounded-xl bg-[#ff7900] text-sm font-black text-white"
          aria-hidden
        >
          OM
        </span>
        <div>
          <h3 className="font-bold">Payer avec Orange Money</h3>
          <p className="text-muted text-xs">Paiement direct à {merchantName}. Uny ne prend aucun frais.</p>
        </div>
      </div>
      <CopyValue label="Code marchand" value={merchantCode} />
      {amount != null && <CopyValue label="Montant à payer" value={formatGNF(amount)} />}
      <ol className="text-ink/80 list-decimal space-y-1 pl-5 text-sm">
        <li>
          Compose <strong>{ORANGE_MONEY_USSD}</strong> (ou ouvre l&apos;application Orange Money).
        </li>
        <li>
          Choisis <strong>Paiement marchand</strong>, saisis le code marchand <strong>{merchantCode}</strong>
          {amount != null && (
            <>
              {" "}
              et le montant <strong>{formatGNF(amount)}</strong>
            </>
          )}
          .
        </li>
        <li>Vérifie le nom du marchand, puis valide avec ton code secret. Ne le donne jamais à personne.</li>
      </ol>
      <a href={ORANGE_MONEY_DIAL} className={buttonClass("primary", "lg", "w-full bg-[#ff7900] hover:bg-[#e56d00]")}>
        <Smartphone className="size-5" /> Ouvrir Orange Money ({ORANGE_MONEY_USSD})
      </a>
      {children}
    </div>
  );
}
