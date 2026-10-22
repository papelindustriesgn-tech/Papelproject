/**
 * Prix étudiant d'une offre : calculé à partir du prix normal et de la réduction (même formule que la base,
 * fonction SQL `deal_student_price`). Arrondi à la centaine de GNF inférieure, en faveur de l'étudiant.
 */
export type DiscountKind = "percent" | "amount";

export function studentPrice(price: number | null | undefined, kind: DiscountKind | null | undefined, value: number | null | undefined) {
  if (!price || !kind || !value) return null;
  if (kind === "percent") return Math.floor((price * (100 - value)) / 100 / 100) * 100;
  return Math.max(price - value, 0);
}

export function discountLabel(kind: DiscountKind, value: number) {
  return kind === "percent" ? `-${value} %` : `-${value.toLocaleString("fr-FR").replace(/ | /g, " ")} GNF`;
}
