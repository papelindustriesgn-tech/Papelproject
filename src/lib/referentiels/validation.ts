import type { Referentiel } from "./definitions";
import { lireNombre } from "@/lib/formulaires/nombres";

export type Donnees = Record<string, string | number | boolean | null>;

/**
 * Valide une saisie selon la définition de la liste. Renvoie les données à enregistrer
 * (uniquement les champs déclarés) ou des erreurs en français par champ.
 */
export function validerSaisie(
  def: Referentiel,
  valeurs: Record<string, string | undefined>,
  creation: boolean,
): { donnees: Donnees } | { erreurs: Record<string, string> } {
  const donnees: Donnees = {};
  const erreurs: Record<string, string> = {};

  for (const c of def.champs) {
    if (!creation && c.figeApresCreation) continue;
    const brut = (valeurs[c.nom] ?? "").trim();
    // Case à cocher : absente du formulaire = non cochée.
    if (c.type === "booleen") {
      donnees[c.nom] = brut === "on" || brut === "true";
      continue;
    }

    if (brut === "") {
      if (c.requis) erreurs[c.nom] = `${c.libelle} : champ obligatoire.`;
      // Texte vide → chaîne vide ; nombre vide → non envoyé (la base applique sa valeur par défaut).
      else if (c.type === "texte" || c.type === "texte_long") donnees[c.nom] = "";
      else if (c.type !== "entier" && c.type !== "decimal") donnees[c.nom] = null;
      continue;
    }
    switch (c.type) {
      case "entier": {
        const n = lireNombre(brut);
        if (n === null || !Number.isInteger(n)) erreurs[c.nom] = `${c.libelle} : nombre entier attendu.`;
        else donnees[c.nom] = n;
        break;
      }
      case "decimal": {
        const n = lireNombre(brut);
        if (n === null) erreurs[c.nom] = `${c.libelle} : nombre attendu.`;
        else donnees[c.nom] = n;
        break;
      }
      case "date":
        if (!/^\d{4}-\d{2}-\d{2}$/.test(brut)) erreurs[c.nom] = `${c.libelle} : date invalide.`;
        else donnees[c.nom] = brut;
        break;
      case "heure":
        if (!/^([01]\d|2[0-3]):[0-5]\d(:\d\d)?$/.test(brut)) erreurs[c.nom] = `${c.libelle} : heure invalide (ex. 06:00).`;
        else donnees[c.nom] = brut.slice(0, 5);
        break;
      case "choix":
        if (!c.options?.some((o) => o.valeur === brut)) erreurs[c.nom] = `${c.libelle} : choix invalide.`;
        else donnees[c.nom] = brut;
        break;
      case "reference":
        if (!(c.reference?.cle && c.reference.cle !== "id" ? /^[a-z0-9_]{1,40}$/.test(brut) : /^[0-9a-f-]{36}$/i.test(brut)))
          erreurs[c.nom] = `${c.libelle} : sélection invalide.`;
        else donnees[c.nom] = brut;
        break;
      default:
        if (c.max && brut.length > c.max) erreurs[c.nom] = `${c.libelle} : ${c.max} caractères maximum.`;
        else if (c.regex && !new RegExp(c.regex.motif).test(brut)) erreurs[c.nom] = c.regex.message;
        else donnees[c.nom] = brut;
    }
  }
  return Object.keys(erreurs).length ? { erreurs } : { donnees };
}
