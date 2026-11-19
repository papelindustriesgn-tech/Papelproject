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

/** Taille d'une page : la base ne renvoie jamais plus de lignes par requête (`max_rows` de l'API, 1 000). */
export const TAILLE_PAGE = 1000;

type PageLue<T> = PromiseLike<{ data: T[] | null; error: unknown }>;

/**
 * Lit TOUTES les lignes d'une requête, page par page. Sans cela, l'API coupe à 1 000 lignes sans prévenir
 * (un `.limit(50000)` ne change rien) et un total ou un indicateur serait faux en silence.
 * `fabrique` recrée la requête à chaque page (un constructeur Supabase ne s'exécute qu'une fois) et doit trier
 * sur une colonne unique (`.order("id")`) pour qu'aucune ligne ne soit sautée ni lue deux fois.
 * Une page en échec rend l'erreur (à passer à `exigerDonnees`), jamais une liste partielle.
 */
export async function lireTout<T>(fabrique: () => { range: (de: number, a: number) => PageLue<T> }, plafond = 500_000): Promise<{ data: T[] | null; error: unknown }> {
  const lignes: T[] = [];
  for (let debut = 0; debut < plafond; debut += TAILLE_PAGE) {
    const { data, error } = await fabrique().range(debut, debut + TAILLE_PAGE - 1);
    if (error) return { data: null, error };
    lignes.push(...(data ?? []));
    if (!data || data.length < TAILLE_PAGE) return { data: lignes, error: null };
  }
  return { data: null, error: new Error(`Plus de ${plafond} lignes : période trop longue.`) };
}
