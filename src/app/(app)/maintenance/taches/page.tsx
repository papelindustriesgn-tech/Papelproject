import type { Metadata } from "next";
import { PageTaches } from "@/components/taches/page-taches";

export const metadata: Metadata = { title: "Tâches" };

export default function TachesMaintenance() {
  return <PageTaches espace="maintenance" />;
}
