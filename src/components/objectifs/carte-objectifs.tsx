import { Target } from "lucide-react";
import Link from "next/link";
import { Carte } from "@/components/ui";
import { etatObjectif } from "@/lib/metier/objectifs";
import { OBJECTIFS } from "@/lib/objectifs/catalogue";
import { chargerObjectifsEspace } from "@/lib/objectifs/charger";
import { formaterObjectif } from "@/lib/objectifs/format";
import { nombre } from "@/lib/stocks/libelles";

/**
 * Carte « Objectifs mensuels » d'une application : le réel de la période (fourni par la vue d'ensemble)
 * comparé aux objectifs du service (mois au prorata des jours). Barre, pourcentage et statut écrits.
 * Les objectifs portent sur toute l'entreprise : avec un filtre gamme ou commercial, on invite à le retirer.
 */
export async function CarteObjectifs({
  espace,
  du,
  au,
  reels,
  filtre = false,
}: {
  espace: string;
  du: string;
  au: string;
  /** Réel de la période par code d'indicateur (null : non mesurable sur la période). */
  reels: Record<string, number | null>;
  filtre?: boolean;
}) {
  const objectifs = await chargerObjectifsEspace(espace, du, au);
  const lignes = (OBJECTIFS[espace] ?? []).filter((d) => objectifs.has(d.code) && d.code in reels);
  const titre = (
    <span className="flex items-center gap-2">
      <Target size={18} className="text-papel-700" aria-hidden /> Objectifs mensuels
    </span>
  );
  const action = (
    <Link href={`/${espace}/objectifs`} className="text-sm font-semibold text-papel-700 hover:underline">
      Voir les objectifs
    </Link>
  );
  // Objectifs globaux : avec un filtre gamme ou commercial, la comparaison n'aurait pas de sens.
  if (filtre) return null;
  // Pas d'objectif fixé pour la période : rien à montrer (on ne charge pas la page d'une carte vide).
  if (!lignes.length) return null;
  const couverture = Math.min(...lignes.map((d) => objectifs.get(d.code)!.couverture));

  return (
    <Carte titre={titre} action={action} className="mb-4">
      <ul className="grid gap-x-6 gap-y-4 md:grid-cols-2 xl:grid-cols-3">
        {lignes.map((d) => {
          const objectif = objectifs.get(d.code)!.valeur;
          const reel = reels[d.code] ?? null;
          const e = etatObjectif(reel, objectif, d.hausseBonne);
          const pctTexte = d.hausseBonne && reel !== null && objectif > 0 ? `${Math.round((reel / objectif) * 100)} %` : null;
          return (
            <li key={d.code}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="font-semibold text-gray-900">{d.libelle}</span>
                <span className="text-sm text-gray-600">
                  <strong className="text-gray-900">{reel === null ? "—" : formaterObjectif(reel, d.unite)}</strong> {d.hausseBonne ? "sur" : "pour un maximum de"}{" "}
                  {formaterObjectif(objectif, d.unite)}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-3">
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100" role="progressbar" aria-label={d.libelle} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(e.part * 100)}>
                  <div className={`h-full rounded-full ${e.atteint ? "bg-papel-700" : "bg-papel-500"}`} style={{ width: `${Math.round(e.part * 100)}%` }} />
                </div>
                {pctTexte && <span className="shrink-0 text-right text-sm font-bold text-gray-900">{pctTexte}</span>}
                <span className={`shrink-0 whitespace-nowrap text-xs font-semibold ${e.atteint ? "text-papel-800" : e.statut === "Presque atteint" || e.statut === "Non mesuré" ? "text-gray-600" : "text-amber-800"}`}>{e.statut}</span>
              </div>
            </li>
          );
        })}
      </ul>
      {couverture < 1 && <p className="mt-3 text-sm text-gray-600">Objectifs connus pour {nombre(couverture * 100, 0)} % des jours de la période.</p>}
    </Carte>
  );
}
