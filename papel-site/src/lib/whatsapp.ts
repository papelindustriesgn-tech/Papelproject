export type WhatsAppContext = "information" | "devis" | "distributeur";

const MESSAGES: Record<WhatsAppContext, string> = {
  information: "Bonjour Papel Industries, je souhaite avoir des informations sur vos produits.",
  devis: "Bonjour Papel Industries, je souhaite recevoir un devis pour vos produits.",
  distributeur: "Bonjour Papel Industries, je souhaite devenir distributeur des produits Papel.",
};

/** Lien wa.me avec message prérempli. Renvoie null si aucun numéro n'est configuré. */
export function whatsappLink(number: string | null | undefined, context: WhatsAppContext = "information", extra?: string) {
  const digits = (number ?? "").replace(/\D/g, "");
  if (digits.length < 8) return null;
  const text = extra ? `${MESSAGES[context]} ${extra}` : MESSAGES[context];
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function telLink(number: string | null | undefined) {
  const cleaned = (number ?? "").replace(/[^\d+]/g, "");
  return cleaned.length >= 8 ? `tel:${cleaned}` : null;
}
