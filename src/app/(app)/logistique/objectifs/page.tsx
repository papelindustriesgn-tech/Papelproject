import type { Metadata } from "next";
import { PageObjectifs } from "@/components/objectifs/page-objectifs";

export const metadata: Metadata = { title: "Objectifs mensuels" };

export default async function ObjectifsLogistique({ searchParams }: PageProps<"/logistique/objectifs">) {
  return <PageObjectifs espace="logistique" libelle="Logistique" sp={await searchParams} />;
}
