import type { Metadata } from "next";
import { PageObjectifs } from "@/components/objectifs/page-objectifs";

export const metadata: Metadata = { title: "Objectifs mensuels" };

export default async function ObjectifsProduction({ searchParams }: PageProps<"/production/objectifs">) {
  return <PageObjectifs espace="production" libelle="Production" sp={await searchParams} />;
}
