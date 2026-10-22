/**
 * Lecture sûre d'un résultat Supabase : une requête qui a échoué ne doit JAMAIS s'afficher comme « 0 »,
 * une liste vide ou « aucun résultat ». On lève une erreur, rattrapée par `src/app/(app)/error.tsx`
 * (message clair + bouton « Réessayer »). Le détail technique reste dans les journaux du serveur.
 */
export class ErreurChargement extends Error {
  constructor(quoi: string) {
    super(`Chargement impossible : ${quoi}.`);
    this.name = "ErreurChargement";
  }
}

export function exigerDonnees<T>(resultat: { data: T; error?: unknown }, quoi: string): T {
  if (resultat.error) {
    console.error(`[chargement] ${quoi}`, resultat.error);
    throw new ErreurChargement(quoi);
  }
  return resultat.data;
}
