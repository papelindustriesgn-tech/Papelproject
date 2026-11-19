import { ArrowRight } from "lucide-react";
import { libelleQui, type EtatCommande } from "@/lib/metier/commandes";

const TON = {
  attente: "border-amber-300 bg-amber-50 text-amber-950",
  info: "border-sky-300 bg-sky-50 text-sky-950",
  succes: "border-green-300 bg-green-50 text-green-950",
  erreur: "border-red-300 bg-red-50 text-red-950",
} as const;

/** Bandeau d'un document : où il en est, la prochaine étape et qui doit agir (écrit, pas seulement en couleur). */
export function ProchaineEtape({ etat, details }: { etat: EtatCommande; details?: React.ReactNode }) {
  return (
    <section className={`mb-4 rounded-2xl border p-4 ${TON[etat.ton]}`} aria-label="Où en est ce document">
      <div className="text-lg font-bold">{etat.libelle}</div>
      {etat.prochaine ? (
        <p className="mt-1 flex flex-wrap items-center gap-x-1">
          <ArrowRight size={16} aria-hidden /> Prochaine étape : <strong>{etat.prochaine}</strong>
          {etat.qui && <span>— à faire par : {libelleQui(etat.qui).toLowerCase()}</span>}
        </p>
      ) : (
        <p className="mt-1">Plus rien à faire.</p>
      )}
      {details && <div className="mt-2 text-sm">{details}</div>}
    </section>
  );
}
