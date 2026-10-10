import type { Metadata } from "next";
import Link from "next/link";
import { IconeAppli } from "@/components/coque/applications";
import { espacesAccessibles } from "@/lib/auth/espaces";
import { exigerConnexion } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Applications" };

/** Écran d'accueil à la Odoo : une icône par application accessible. */
export default async function PageApplications() {
  const u = await exigerConnexion();
  const applis = espacesAccessibles(u.roles);
  return (
    <div className="-mx-3 -mt-3 min-h-[calc(100vh-3rem)] bg-gradient-to-b from-papel-50 to-[#eef1f0] px-4 py-8 md:-mx-5 md:py-14">
      <div className="mx-auto max-w-4xl">
        <p className="mb-8 text-center text-gray-600">
          Bonjour <span className="font-semibold text-gray-900">{u.prenom || u.nom}</span>, choisissez une application.
        </p>
        <ul className="grid grid-cols-3 gap-x-2 gap-y-8 sm:grid-cols-4 md:grid-cols-6">
          {applis.map((a) => (
            <li key={a.code}>
              <Link href={`/${a.code}`} className="group flex flex-col items-center gap-2 rounded-md p-2 text-center hover:bg-white/60" title={a.description}>
                <span className="transition group-hover:-translate-y-0.5 group-hover:shadow-md">
                  <IconeAppli code={a.code} taille={64} />
                </span>
                <span className="text-sm font-medium leading-tight text-gray-800">{a.libelle}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
