import { BonLivraison } from "@/components/livraisons/bon-livraison";

/** Bon de livraison vu des Ventes (même écran que le Magasin). */
export default async function PageLivraison({ params }: PageProps<"/ventes/livraisons/[id]">) {
  const { id } = await params;
  return <BonLivraison id={id} espace="ventes" />;
}
