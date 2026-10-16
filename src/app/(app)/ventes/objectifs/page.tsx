import type { Metadata } from "next";
import { PageObjectifs } from "@/components/objectifs/page-objectifs";

export const metadata: Metadata = { title: "Objectifs mensuels" };

export default async function ObjectifsVentes({ searchParams }: PageProps<"/ventes/objectifs">) {
  return <PageObjectifs espace="ventes" libelle="Ventes" sp={await searchParams} />;
}
