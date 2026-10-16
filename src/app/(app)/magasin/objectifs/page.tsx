import type { Metadata } from "next";
import { PageObjectifs } from "@/components/objectifs/page-objectifs";

export const metadata: Metadata = { title: "Objectifs mensuels" };

export default async function ObjectifsMagasin({ searchParams }: PageProps<"/magasin/objectifs">) {
  return <PageObjectifs espace="magasin" libelle="Stocks" sp={await searchParams} />;
}
