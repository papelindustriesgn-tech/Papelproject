import type { Metadata } from "next";
import { PageObjectifs } from "@/components/objectifs/page-objectifs";

export const metadata: Metadata = { title: "Objectifs mensuels" };

export default async function ObjectifsFinance({ searchParams }: PageProps<"/finance/objectifs">) {
  return <PageObjectifs espace="finance" libelle="Finance" sp={await searchParams} />;
}
