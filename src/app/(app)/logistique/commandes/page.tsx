import type { Metadata } from "next";
import { PageCommandes } from "@/components/coordination/page-commandes";

export const metadata: Metadata = { title: "Commandes clients" };

export default function CommandesLogistique() {
  return <PageCommandes espace="logistique" />;
}
