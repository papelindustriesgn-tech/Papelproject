"use client";

import { usePathname } from "next/navigation";
import { track } from "@/lib/track";
import { whatsappLink, type WhatsAppContext } from "@/lib/whatsapp";
import { WhatsAppIcon } from "@/components/ui/icons";

/** Bouton WhatsApp flottant : message adapté à la page consultée. Masqué si aucun numéro n'est configuré. */
export function WhatsAppFab({ number }: { number: string }) {
  const pathname = usePathname();
  const context: WhatsAppContext = pathname.startsWith("/professionnels")
    ? "distributeur"
    : pathname.startsWith("/produits/")
      ? "devis"
      : "information";
  const href = whatsappLink(number, context);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track("whatsapp_click", `flottant_${context}`)}
      aria-label="Écrire à Papel Industries sur WhatsApp"
      className="fixed right-4 bottom-4 z-30 inline-flex size-14 items-center justify-center rounded-full bg-[#1f9d55] text-white shadow-lift transition hover:scale-105 hover:bg-[#178347] sm:right-6 sm:bottom-6"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <WhatsAppIcon className="size-7" />
    </a>
  );
}
