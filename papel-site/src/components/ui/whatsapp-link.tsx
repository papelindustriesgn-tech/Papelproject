"use client";

import { WhatsAppIcon } from "@/components/ui/icons";
import { buttonClass } from "@/components/ui/button";
import { track } from "@/lib/track";
import { whatsappLink, type WhatsAppContext } from "@/lib/whatsapp";

/** Bouton WhatsApp contextuel ; rien n'est affiché tant qu'aucun numéro officiel n'est configuré. */
export function WhatsAppButton({
  number,
  context,
  extra,
  label = "Écrire sur WhatsApp",
  size = "lg",
  className,
}: {
  number: string;
  context: WhatsAppContext;
  extra?: string;
  label?: string;
  size?: "md" | "lg";
  className?: string;
}) {
  const href = whatsappLink(number, context, extra);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track("whatsapp_click", context)}
      className={buttonClass("whatsapp", size, className)}
    >
      <WhatsAppIcon className="size-5" />
      {label}
    </a>
  );
}
