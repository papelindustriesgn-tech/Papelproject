import type { Metadata } from "next";
import { PageTaches } from "@/components/taches/page-taches";

export const metadata: Metadata = { title: "Tâches" };

export default function TachesQualite() {
  return <PageTaches espace="qualite" />;
}
