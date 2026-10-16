import type { Metadata } from "next";
import { PageObjectifs } from "@/components/objectifs/page-objectifs";

export const metadata: Metadata = { title: "Objectifs mensuels" };

export default async function ObjectifsAchats({ searchParams }: PageProps<"/achats/objectifs">) {
  return <PageObjectifs espace="achats" libelle="Achats" sp={await searchParams} />;
}
