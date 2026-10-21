import type { Metadata } from "next";
import { PageObjectifs } from "@/components/objectifs/page-objectifs";

export const metadata: Metadata = { title: "Objectifs mensuels" };

export default async function ObjectifsQualite({ searchParams }: PageProps<"/qualite/objectifs">) {
  return <PageObjectifs espace="qualite" libelle="Qualité" sp={await searchParams} />;
}
