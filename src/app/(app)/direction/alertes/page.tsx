import type { Metadata } from "next";
import { ListeAlertes } from "@/components/direction/sections";
import { TitrePage } from "@/components/ui";
import { chargerAlertes } from "@/lib/direction/alertes";

export const metadata: Metadata = { title: "Alertes" };

/** Toutes les alertes de l'entreprise, critiques d'abord ; chaque carte ouvre l'écran où agir. */
export default async function PageAlertes() {
  const alertes = await chargerAlertes();
  return (
    <>
      <TitrePage titre="Alertes" sousTitre="Ce qui demande une action aujourd'hui, dans tous les services" fil={[{ libelle: "Tableau de bord", href: "/direction" }]} />
      <ListeAlertes alertes={alertes} tout />
    </>
  );
}
