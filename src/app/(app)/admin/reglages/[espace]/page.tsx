import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageReglages } from "@/components/reglages/page-reglages";
import { exigerAdministrateur } from "@/lib/auth/session";
import { ESPACES_REGLABLES } from "@/lib/navigation/indicateurs";

export const metadata: Metadata = { title: "Réglages du service" };

export default async function Page({ params }: PageProps<"/admin/reglages/[espace]">) {
  await exigerAdministrateur();
  const { espace } = await params;
  if (!ESPACES_REGLABLES.includes(espace)) notFound();
  return <PageReglages espace={espace} />;
}
