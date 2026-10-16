/**
 * Filtres communs des vues d'ensemble : gamme de produits et commercial (la période est dans `periode.ts`).
 * Ils vivent dans l'adresse (`?produit=…&commercial=…`) : on peut partager ou mettre en favori une vue filtrée.
 */
export interface FiltresAnalyse {
  /** Identifiant du produit (gamme : Petit 100, Grand 100…), ou null pour toutes les gammes. */
  produit: string | null;
  /** Identifiant du commercial (profil), ou null pour tous les commerciaux. */
  commercial: string | null;
}

export const SANS_FILTRE: FiltresAnalyse = { produit: null, commercial: null };

/** Paramètres d'adresse conservés d'un filtre à l'autre. */
export const PARAMETRES_ANALYSE = ["periode", "du", "au", "produit", "commercial"] as const;

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Lit les filtres de l'adresse ; une valeur mal formée est ignorée (aucune erreur côté base). */
export function lireFiltresAnalyse(sp: Record<string, string | string[] | undefined>): FiltresAnalyse {
  const lire = (cle: string) => {
    const v = sp[cle];
    const s = Array.isArray(v) ? v[0] : v;
    return s && uuid.test(s) ? s : null;
  };
  return { produit: lire("produit"), commercial: lire("commercial") };
}

/**
 * Adresse (« ?… ») des filtres actuels modifiés par `changements` (null ou "" retire le paramètre).
 * Seuls les paramètres d'analyse sont gardés : changer de période ne garde pas une page de liste, par exemple.
 */
export function adresseFiltres(actuels: Record<string, string | undefined>, changements: Record<string, string | null | undefined>): string {
  const q = new URLSearchParams();
  for (const cle of PARAMETRES_ANALYSE) {
    const v = cle in changements ? changements[cle] : actuels[cle];
    if (v) q.set(cle, v);
  }
  const s = q.toString();
  return s ? `?${s}` : "?";
}
