const nf = new Intl.NumberFormat("fr-FR");

/** 1500000 → « 1 500 000 GNF » (espaces normales pour éviter les soucis de rendu). */
export function formatGNF(value: number | null | undefined) {
  if (value == null) return "—";
  return `${nf.format(value).replace(/ | /g, " ")} GNF`;
}

export function formatDate(value: string | Date | null | undefined, opts: Intl.DateTimeFormatOptions = {}) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value.length === 10 ? `${value}T12:00:00` : value) : value;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", ...opts });
}

export function formatShortDate(value: string | Date | null | undefined) {
  return formatDate(value, { day: "numeric", month: "short", year: undefined });
}

export function timeAgo(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  const diff = Math.round((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "à l'instant";
  const m = Math.round(diff / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const days = Math.round(h / 24);
  if (days < 7) return `il y a ${days} j`;
  return formatShortDate(d);
}

export function daysUntil(value: string | null | undefined) {
  if (!value) return null;
  const end = new Date(`${value}T23:59:59`);
  return Math.ceil((end.getTime() - Date.now()) / 86_400_000);
}

/** Normalise un numéro guinéen : « 620 12 34 56 » → « +224620123456 ». */
export function normalizePhone(raw: string, defaultPrefix = "+224") {
  let v = raw.replace(/[^\d+]/g, "");
  if (v.startsWith("00")) v = `+${v.slice(2)}`;
  if (v.startsWith("+")) return v;
  const prefixDigits = defaultPrefix.replace("+", "");
  if (v.startsWith(prefixDigits) && v.length > 9) return `+${v}`;
  return `${defaultPrefix}${v}`;
}

export function isValidPhone(phone: string) {
  return /^\+\d{9,15}$/.test(phone);
}

export function initials(first?: string | null, last?: string | null) {
  return `${(first ?? "").charAt(0)}${(last ?? "").charAt(0)}`.toUpperCase() || "U";
}

export function whatsappLink(phone: string, text?: string) {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
