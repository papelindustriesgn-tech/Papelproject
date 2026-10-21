import type { Metadata } from "next";
import { PageObjectifs } from "@/components/objectifs/page-objectifs";

export const metadata: Metadata = { title: "Objectifs mensuels" };

export default async function ObjectifsCommercial({ searchParams }: PageProps<"/commercial/objectifs">) {
  return <PageObjectifs espace="commercial" libelle="Équipe commerciale" sp={await searchParams} />;
}
