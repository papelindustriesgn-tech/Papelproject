import type { Metadata } from "next";
import { PageObjectifs } from "@/components/objectifs/page-objectifs";

export const metadata: Metadata = { title: "Objectifs mensuels" };

export default async function ObjectifsRh({ searchParams }: PageProps<"/rh/objectifs">) {
  return <PageObjectifs espace="rh" libelle="Ressources humaines" sp={await searchParams} />;
}
