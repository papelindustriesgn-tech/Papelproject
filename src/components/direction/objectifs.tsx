import { Target } from "lucide-react";
import Link from "next/link";
import { Carte } from "@/components/ui";
import { avancement, type ObjectifPeriode } from "@/lib/metier/objectifs";
import { gnf, nombre } from "@/lib/stocks/libelles";

export interface LigneObjectif {
  libelle: string;
  reel: number;
  objectif: number;
  /** Mise en forme d'un montant ou d'une quantité (« 1 234 567 GNF », « 25,0 t »…). */
  format: (v: number) => string;
}

/** Une barre d'avancement : réel / objectif, pourcentage et statut écrits (jamais la couleur seule). */
export function BarreObjectif({ ligne }: { ligne: LigneObjectif }) {
  const a = avancement(ligne.reel, ligne.objectif);
  const pct = a === null ? 0 : Math.round(a * 100);
  const statut = a === null ? "Pas d'objectif" : a >= 1 ? "Atteint" : a >= 0.9 ? "Presque atteint" : "En retard";
  return (
    <li>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="font-semibold text-gray-900">{ligne.libelle}</span>
        <span className="text-sm text-gray-600">
          <strong className="text-gray-900">{ligne.format(ligne.reel)}</strong> sur {ligne.format(ligne.objectif)}
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-3">
        <div
          className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100"
          role="progressbar"
          aria-label={ligne.libelle}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.min(pct, 100)}
        >
          <div className={`h-full rounded-full ${a !== null && a >= 1 ? "bg-papel-700" : "bg-papel-500"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
        <span className="shrink-0 text-right text-sm font-bold text-gray-900">{pct} %</span>
        <span className={`shrink-0 whitespace-nowrap text-xs font-semibold ${a !== null && a >= 1 ? "text-papel-800" : a !== null && a < 0.9 ? "text-amber-800" : "text-gray-600"}`}>{statut}</span>
      </div>
    </li>
  );
}

/**
 * Carte « Objectifs du business plan » : le réel de la période comparé à l'objectif (mois au prorata des jours).
 * Les objectifs sont globaux : avec un filtre gamme ou commercial, on invite à retirer le filtre.
 */
export function CarteObjectifs({
  objectif,
  lignes,
  filtre,
  lienReglage,
}: {
  objectif: ObjectifPeriode | null;
  lignes: LigneObjectif[];
  filtre: boolean;
  lienReglage?: string;
}) {
  const titre = (
    <span className="flex items-center gap-2">
      <Target size={18} className="text-papel-700" aria-hidden /> Objectifs du business plan
    </span>
  );
  const action = lienReglage ? (
    <Link href={lienReglage} className="text-sm font-semibold text-papel-700 hover:underline">
      Modifier les objectifs
    </Link>
  ) : undefined;
  if (filtre)
    return (
      <Carte titre={titre} action={action} className="mb-4">
        <p className="text-gray-600">Les objectifs portent sur toute l&apos;entreprise : retirez le filtre gamme ou commercial pour comparer le réel à l&apos;objectif.</p>
      </Carte>
    );
  if (!objectif)
    return (
      <Carte titre={titre} action={action} className="mb-4">
        <p className="text-gray-600">Aucun objectif pour cette période. Les objectifs du business plan commencent au mois 1 du lancement.</p>
      </Carte>
    );
  return (
    <Carte titre={titre} action={action} className="mb-4">
      <ul className="grid gap-4 lg:grid-cols-3">
        {lignes.map((l) => (
          <BarreObjectif key={l.libelle} ligne={l} />
        ))}
      </ul>
      <p className="mt-3 text-sm text-gray-600">
        Résultat visé sur la période : <strong className="text-gray-900">{gnf(objectif.resultatGnf)}</strong> (CA HT − coûts variables − charges fixes).
        {objectif.couverture < 1 && ` Objectif connu pour ${nombre(objectif.couverture * 100, 0)} % des jours de la période.`}
      </p>
    </Carte>
  );
}
