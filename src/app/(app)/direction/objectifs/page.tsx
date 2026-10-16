import type { Metadata } from "next";
import { PageObjectifs } from "@/components/objectifs/page-objectifs";

export const metadata: Metadata = { title: "Objectifs mensuels" };

export default async function ObjectifsDirection({ searchParams }: PageProps<"/direction/objectifs">) {
  return <PageObjectifs espace="direction" libelle="Tableau de bord" sp={await searchParams} />;
}
