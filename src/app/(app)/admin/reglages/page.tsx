import { Settings } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { IconeAppli } from "@/components/coque/applications";
import { Message, TitrePage } from "@/components/ui";
import { estAdministrateur } from "@/lib/auth/session";
import { ESPACES_REGLABLES } from "@/lib/navigation/indicateurs";
import { ESPACES } from "@/lib/auth/espaces";

export const metadata: Metadata = { title: "Réglages des services" };

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

/** Choix du service à régler (réservé à l'administrateur). */
export default async function PageReglagesServices() {
  if (!(await estAdministrateur())) return <ReserveAdministrateur />;
  const services = ESPACES.filter((e) => ESPACES_REGLABLES.includes(e.code));
  return (
    <>
      <TitrePage titre="Réglages des services" sousTitre="Pour chaque application : phrase d'accueil, boutons, étapes, « À faire aujourd'hui » et seuils de calcul. Vous seul pouvez les modifier." />
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((e) => (
          <li key={e.code}>
            <Link href={`/admin/reglages/${e.code}`} className="flex min-h-16 items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 hover:border-papel-500 hover:bg-papel-50">
              <IconeAppli code={e.code} taille={44} />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-gray-900">{e.libelle}</span>
                <span className="block text-sm text-gray-500">{e.description}</span>
              </span>
              <Settings size={18} className="shrink-0 text-gray-400" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
