import type { Metadata } from "next";
import { BonLivraison } from "@/components/livraisons/bon-livraison";

export const metadata: Metadata = { title: "Préparer une commande" };

/** Préparation d'une commande par le magasin : colis préparés, sortie de stock, bon à imprimer. */
export default async function PreparerCommande({ params }: PageProps<"/magasin/livraisons/[id]">) {
  const { id } = await params;
  return <BonLivraison id={id} espace="magasin" />;
}
