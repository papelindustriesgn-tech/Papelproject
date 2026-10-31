"use client";

import { useActionState, useState } from "react";
import { Check, Copy, ExternalLink, MessageCircle, Phone, Smartphone } from "lucide-react";
import { FormMessage } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { CONTACT_KINDS, type ContactKind } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { openOnlineOffer, type OnlineOfferState } from "../actions";

/** Lien d'action selon le contact : WhatsApp avec message prérempli (code inclus), appel, page ou site. */
function contactHref(kind: string, contact: string, message: string) {
  if (kind === "whatsapp") return `https://wa.me/${contact.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
  if (kind === "phone") return `tel:${contact}`;
  return contact;
}

/** Offre à distance : le contact (et le code) ne sont révélés qu'après contrôle du statut par la base. */
export function OnlinePanel({
  dealId,
  brand,
  title,
  mode,
  demo = false,
}: {
  dealId: string;
  brand: string;
  title: string;
  mode: string;
  demo?: boolean;
}) {
  const [state, action] = useActionState(openOnlineOffer.bind(null, dealId), {} as OnlineOfferState);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Offre de démonstration : marque fictive, aucun contact réel (la base refuse aussi l'ouverture)
  if (demo)
    return (
      <p className="bg-canvas text-muted ring-line rounded-2xl p-4 text-center text-sm ring-1" data-testid="online-panel-demo">
        <strong className="text-ink">Exemple de démonstration.</strong> Pour une vraie marque, tu obtiendrais ici ton code et le
        bouton pour commander sur WhatsApp ou appeler.
      </p>
    );

  if (!state.contact || !state.contactKind)
    return (
      <form action={action} className="space-y-2" data-testid="online-panel">
        {state.error && <FormMessage>{state.error}</FormMessage>}
        <SubmitButton size="lg" className="w-full" pendingLabel="Vérification…">
          <Smartphone className="size-5" /> Obtenir mon code et le contact
        </SubmitButton>
        <p className="text-muted text-center text-xs">
          {mode === "unique"
            ? "Code personnel, utilisable une fois : donne-le à la marque quand tu commandes."
            : "Code réservé aux étudiants vérifiés : donne-le à la marque quand tu commandes."}
        </p>
      </form>
    );

  const kind = state.contactKind as ContactKind;
  const info = CONTACT_KINDS[kind];
  // Lien de vérification : la marque l'ouvre dans son espace Uny et voit tout de suite si l'étudiant est vérifié
  const verifyLink = state.verifyToken ? `${window.location.origin}/p/${state.verifyToken}` : null;
  const message = `Bonjour ${brand}, je suis étudiant(e) vérifié(e) Uny. Je souhaite profiter de l'offre « ${title} »${
    state.code ? ` avec mon code ${state.code}` : ""
  }.${verifyLink ? ` Vérifie mon statut ici : ${verifyLink}` : ""}`;
  const href = contactHref(kind, state.contact, message);
  const external = kind !== "phone";
  const Icon = kind === "whatsapp" ? MessageCircle : kind === "phone" ? Phone : ExternalLink;

  const copy = async () => {
    if (!state.code) return;
    try {
      await navigator.clipboard.writeText(state.code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  const copyLink = async () => {
    if (!verifyLink) return;
    try {
      await navigator.clipboard.writeText(verifyLink);
      setLinkCopied(true);
    } catch {
      setLinkCopied(false);
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
      <p className="text-ink/80 text-sm">
        {kind === "whatsapp"
          ? `Le message est déjà prêt, avec ton code${verifyLink ? " et ton lien de vérification" : ""} : envoie-le et commande directement.`
          : `Donne ton code à ${brand} au moment de commander${verifyLink ? ", avec ton lien de vérification" : state.mode === "unique" ? " : la marque le valide dans son espace Uny" : ""}.`}
      </p>
      <a
        href={href}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className="bg-brand-600 hover:bg-brand-700 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 font-bold text-white"
        data-testid="online-link"
      >
        <Icon className="size-5" aria-hidden /> {info.action}
        {kind === "phone" ? ` ${brand}` : ""}
      </a>
      {info.phone && <p className="text-muted text-xs">{state.contact}</p>}
      {verifyLink && (
        <button
          type="button"
          onClick={copyLink}
          className="text-brand-600 inline-flex items-center gap-1 text-sm font-semibold"
          data-testid="verify-link"
          data-link={verifyLink}
        >
          {linkCopied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          {linkCopied ? "Lien copié" : "Copier mon lien de vérification"}
        </button>
      )}
    </div>
  );
}
