import { distanceMetres } from "./geo";

/**
 * Détection d'un point de vente déjà suivi par un collègue (même règle que le trigger `controler_doublon_pva`) :
 * même téléphone (9 derniers chiffres), ou même nom (l'un contient l'autre) à moins de `rayonM` mètres.
 */
export interface PvaCollegue {
  nom: string;
  latitude: number | null;
  longitude: number | null;
  telephone: string | null;
  commercial: string;
}

export const telephoneNormalise = (t: string) => {
  const chiffres = t.replace(/\D/g, "").slice(-9);
  return chiffres || null;
};

export const nomNormalise = (n: string) =>
  n
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

export function trouverDoublon(
  pva: { nom: string; telephone: string; latitude: number | null; longitude: number | null },
  collegues: PvaCollegue[],
  rayonM: number,
): PvaCollegue | null {
  const tel = telephoneNormalise(pva.telephone);
  const nom = nomNormalise(pva.nom);
  return (
    collegues.find((c) => {
      if (tel && c.telephone === tel) return true;
      if (pva.latitude === null || pva.longitude === null || c.latitude === null || c.longitude === null) return false;
      const autre = nomNormalise(c.nom);
      if (!autre || !nom || !(autre.includes(nom) || nom.includes(autre))) return false;
      return distanceMetres({ latitude: pva.latitude, longitude: pva.longitude }, { latitude: c.latitude, longitude: c.longitude }) <= rayonM;
    }) ?? null
  );
}
