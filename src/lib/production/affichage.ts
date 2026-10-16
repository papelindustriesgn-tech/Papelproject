/** Formatage des indicateurs de production. */
import type { AlerteProduction } from "@/lib/metier/rendement";

const nf = (dec: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: dec, minimumFractionDigits: dec });
const espaces = (t: string) => t.replace(/[  ]/g, " ");

export const pct = (v: number | null | undefined, dec = 1) => (v === null || v === undefined ? "—" : espaces(`${nf(dec).format(v * 100)} %`));
export const minutes = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h ${String(Math.round(m % 60)).padStart(2, "0")}` : `${Math.round(m)} min`);

export function libelleAlerte(a: AlerteProduction): string {
  switch (a.type) {
    case "rendement_faible":
      return `Rendement ${pct(a.ratio, 2)} du théorique`;
    case "perte_elevee":
      return `Perte ${pct(a.taux, 2)}`;
    case "arret_long":
      return `Arrêt de ${minutes(a.minutes)}`;
  }
}
