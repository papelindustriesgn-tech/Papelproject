import { formaterPoids, kg } from "@/lib/metier/unites";
import { minutes, pct } from "@/lib/production/affichage";
import { gnf, nombre } from "@/lib/stocks/libelles";
import type { UniteObjectif } from "./catalogue";

/** Mise en forme d'un réel ou d'un objectif dans son unité (« 1 234 567 GNF », « 25,0 t », « 95,0 % »…). */
export function formaterObjectif(v: number, unite: UniteObjectif): string {
  switch (unite) {
    case "gnf":
      return gnf(v);
    case "paquets":
      return `${nombre(v)} paquets`;
    case "kg":
      return formaterPoids(kg(v));
    case "pct":
      return pct(v);
    case "jours":
      return `${nombre(v, v < 10 ? 1 : 0)} j`;
    case "minutes":
      return minutes(v);
    default:
      return nombre(v, Number.isInteger(v) ? 0 : 1);
  }
}
