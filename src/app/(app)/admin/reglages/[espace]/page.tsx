import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageReglages } from "@/components/reglages/page-reglages";
import { Message, TitrePage } from "@/components/ui";
import { estAdministrateur } from "@/lib/auth/session";
import { ESPACES_REGLABLES } from "@/lib/navigation/indicateurs";

export const metadata: Metadata = { title: "Réglages du service" };

function ReserveAdministrateur() {
  return (
    <>
      <TitrePage titre="Réglages des services" />
      <Message ton="info">
        Les réglages des services sont réservés au compte <strong>Administrateur</strong>. Connectez-vous avec ce compte (ou demandez qu&apos;on lui ajoute le rôle
        Administrateur) pour régler les applications.
      </Message>
    </>
  );
}

export default async function Page({ params }: PageProps<"/admin/reglages/[espace]">) {
  if (!(await estAdministrateur())) return <ReserveAdministrateur />;
  const { espace } = await params;
  if (!ESPACES_REGLABLES.includes(espace)) notFound();
  return <PageReglages espace={espace} />;
}
