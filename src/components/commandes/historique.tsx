import { Carte } from "@/components/ui";
import { formaterDateHeure } from "@/lib/formulaires/dates";

export interface EvenementDocument {
  /** Horodatage ISO (ou date seule). */
  quand: string;
  quoi: string;
  qui?: string | null;
}

/**
 * Historique d'un document, reconstitué à partir des documents eux-mêmes (création, validation, livraisons,
 * factures, paiements…) : rien n'est effacé, chaque étape garde sa date et son auteur. Plus récent en premier.
 */
export function HistoriqueDocument({ evenements }: { evenements: EvenementDocument[] }) {
  const liste = evenements.filter((e) => e.quand).sort((a, b) => b.quand.localeCompare(a.quand));
  if (!liste.length) return null;
  return (
    <Carte titre="Historique">
      <ol className="flex flex-col gap-2 border-l-2 border-gray-200 pl-4">
        {liste.map((e, i) => (
          <li key={`${e.quand}-${i}`} className="relative">
            <span className="absolute -left-[1.4rem] top-1.5 size-2.5 rounded-full bg-papel-600" aria-hidden />
            <span className="block text-sm text-gray-500">{e.quand.length > 10 ? formaterDateHeure(e.quand) : e.quand.split("-").reverse().join("/")}</span>
            <span className="block text-gray-900">
              {e.quoi}
              {e.qui ? <span className="text-gray-600"> — {e.qui}</span> : null}
            </span>
          </li>
        ))}
      </ol>
    </Carte>
  );
}
