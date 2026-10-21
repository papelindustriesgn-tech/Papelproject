import "server-only";
import { cache } from "react";
import { clientServeur } from "@/lib/supabase/serveur";
import { estimerCoordination, type Brut, type Coordination } from "./estimer";

export type { BesoinProduction, CommandeAServir, Coordination, LigneCommandeClient } from "./estimer";

/**
 * Commandes clients à servir (fonction SQL `coordination_commandes`, lisible par le magasin, la production,
 * la logistique, les ventes et le commercial pour ses commandes) et estimation des délais de livraison.
 * null si l'utilisateur n'y a pas accès.
 */
export const chargerCoordination = cache(async (): Promise<Coordination | null> => {
  const supabase = await clientServeur();
  const { data, error } = await supabase.rpc("coordination_commandes");
  if (error || !data) return null;
  return estimerCoordination(data as unknown as Brut);
});
