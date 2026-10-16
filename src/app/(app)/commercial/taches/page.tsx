import type { Metadata } from "next";
import { PageTaches } from "@/components/taches/page-taches";

export const metadata: Metadata = { title: "Tâches" };

export default function TachesCommercial() {
  return <PageTaches espace="commercial" />;
}
