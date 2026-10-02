import type { Metadata } from "next";
import { MesDemandes } from "@/components/achats/mes-demandes";

export const metadata: Metadata = { title: "Demandes d'achat" };

export default function PageDemandes() {
  return <MesDemandes espace="magasin" />;
}
