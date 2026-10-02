/** Lecture des nombres saisis « à la française » : « 9 450 », « 0,05 », « 12,5 ». */
export function lireNombre(texte: unknown): number | null {
  if (typeof texte !== "string") return null;
  const nettoye = texte.replace(/[\s  ]/g, "").replace(",", ".");
  if (nettoye === "" || !/^-?\d+(\.\d+)?$/.test(nettoye)) return null;
  return Number(nettoye);
}

/** Affiche un taux (0,05) en pourcentage lisible (« 5 »). */
export function versPourcentage(taux: number): string {
  return String(Math.round(taux * 10000) / 100).replace(".", ",");
}
