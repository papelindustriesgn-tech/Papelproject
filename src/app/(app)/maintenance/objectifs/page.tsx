import type { Metadata } from "next";
import { PageObjectifs } from "@/components/objectifs/page-objectifs";

export const metadata: Metadata = { title: "Objectifs mensuels" };

export default async function ObjectifsMaintenance({ searchParams }: PageProps<"/maintenance/objectifs">) {
  return <PageObjectifs espace="maintenance" libelle="Maintenance" sp={await searchParams} />;
}
