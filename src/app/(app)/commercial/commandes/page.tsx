import type { Metadata } from "next";
import { PageCommandes } from "@/components/coordination/page-commandes";

export const metadata: Metadata = { title: "Commandes clients" };

export default function CommandesCommercial() {
  return <PageCommandes espace="commercial" />;
}
