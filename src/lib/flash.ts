/** Offres flash : durée limitée (et parfois quantité limitée), annoncées à tous les étudiants. */
export const FLASH_HOURS = [2, 4, 8, 24, 48] as const;

export function isFlashActive(endsAt: string | null | undefined, now = Date.now()) {
  return !!endsAt && new Date(endsAt).getTime() > now;
}

export function isFlashOver(endsAt: string | null | undefined, now = Date.now()) {
  return !!endsAt && new Date(endsAt).getTime() <= now;
}

/** « jusqu'à 14h30 » aujourd'hui, sinon « jusqu'au 16/10 à 14h30 » (heure de Conakry). */
export function flashUntil(endsAt: string) {
  const d = new Date(endsAt);
  const tz = { timeZone: "Africa/Conakry" } as const;
  const time = d.toLocaleTimeString("fr-FR", { ...tz, hour: "2-digit", minute: "2-digit" }).replace(":", "h");
  const day = d.toLocaleDateString("fr-FR", { ...tz, day: "2-digit", month: "2-digit" });
  const today = new Date().toLocaleDateString("fr-FR", { ...tz, day: "2-digit", month: "2-digit" });
  return day === today ? `jusqu'à ${time}` : `jusqu'au ${day} à ${time}`;
}
