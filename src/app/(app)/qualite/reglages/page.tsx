import type { Metadata } from "next";
import { PageReglages } from "@/components/reglages/page-reglages";

export const metadata: Metadata = { title: "Réglages du service" };

export default function Page() {
  return <PageReglages espace="qualite" />;
}
