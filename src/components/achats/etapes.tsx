import { ETAPES_CONTENEUR } from "@/lib/achats/libelles";
import { formaterDate } from "@/lib/formulaires/dates";

type Dates = { [cle: string]: unknown };

/** Frise du conteneur : commandé → en mer → au port → dédouané → livré, avec dates prévues et réelles. */
export function EtapesConteneur({ conteneur, aujourdhui }: { conteneur: Dates & { statut: string }; aujourdhui: string }) {
  const rang = ETAPES_CONTENEUR.findIndex((e) => e.statut === conteneur.statut);
  return (
    <ol className="grid grid-cols-5 gap-1 text-center text-xs sm:text-sm" aria-label="Avancement du conteneur">
      {ETAPES_CONTENEUR.map((e, i) => {
        const fait = i <= rang;
        const prevue = e.prevue ? (conteneur[e.prevue] as string | null) : null;
        const reelle = e.reelle ? (conteneur[e.reelle] as string | null) : null;
        const enRetard = !reelle && prevue && prevue < aujourdhui;
        return (
          <li key={e.statut} aria-current={i === rang ? "step" : undefined}>
            <div className={`mx-auto mb-1 h-2 rounded-full ${fait ? "bg-papel-600" : enRetard ? "bg-red-500" : "bg-gray-200"}`} />
            <div className={`font-semibold ${fait ? "text-papel-900" : "text-gray-600"}`}>{e.libelle}</div>
            {reelle && <div className="text-green-800">✓ {formaterDate(reelle)}</div>}
            {!reelle && prevue && <div className={enRetard ? "font-bold text-red-700" : "text-gray-600"}>{enRetard ? "En retard : " : "Prévu "}{formaterDate(prevue)}</div>}
          </li>
        );
      })}
    </ol>
  );
}
