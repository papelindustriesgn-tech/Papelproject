import "server-only";
import { clientServeur } from "@/lib/supabase/serveur";

/**
 * Lit des paramètres numériques (seuils d'alerte…) réglés par les services.
 * La valeur par défaut ne sert que si le paramètre n'existe pas encore en base.
 */
export async function lireSeuils<T extends Record<string, number>>(defauts: T): Promise<T> {
  const supabase = await clientServeur();
  const { data } = await supabase.from("parametres").select("cle, valeur").in("cle", Object.keys(defauts));
  const lus = new Map((data ?? []).map((p) => [p.cle, Number(p.valeur)]));
  return Object.fromEntries(Object.entries(defauts).map(([cle, defaut]) => [cle, Number.isFinite(lus.get(cle)) ? lus.get(cle)! : defaut])) as T;
}
