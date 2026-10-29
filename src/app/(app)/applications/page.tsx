import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { APPARENCE_APPLI, IconeAppli } from "@/components/coque/applications";
import { espacesAccessibles } from "@/lib/auth/espaces";
import { exigerConnexion } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Applications" };

/** Accueil : bannière de bienvenue et une carte par application accessible (couleur du service). */
export default async function PageApplications() {
  const u = await exigerConnexion();
  const applis = espacesAccessibles(u.roles);
  const date = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Conakry" }).format(new Date());
  return (
    <div className="mx-auto max-w-6xl">
      <section className="relative mb-6 overflow-hidden rounded-3xl bg-linear-to-br from-[#063f3b] via-[#07524d] to-[#1f8a7d] p-6 text-white shadow-[0_18px_40px_-20px_#07524d] md:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 size-80 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 size-64 rounded-full bg-white/5 blur-2xl" aria-hidden />
        <p className="relative text-sm capitalize text-white/75">{date}</p>
        <h1 className="relative mt-1 text-[1.9rem] font-bold leading-tight md:text-[2.3rem]">Bonjour {u.prenom || u.nom} 👋</h1>
        <p className="relative mt-2 max-w-xl text-white/85">
          Touchez votre application pour commencer. Un mot n&apos;est pas clair ?{" "}
          <Link href="/applications/lexique" className="font-semibold text-white underline underline-offset-2">
            Les mots expliqués
          </Link>
        </p>
        {(u.roles.includes("admin") || u.roles.includes("direction")) && (
          <Link href="/admin/mise-en-route" className="relative mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 font-semibold text-papel-800 hover:bg-white/90">
            Mise en route : saisir vos données <ArrowUpRight size={16} aria-hidden />
          </Link>
        )}
      </section>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {applis.map((a) => (
          <li key={a.code}>
            <Link
              href={`/${a.code}`}
              className="ombre-carte group relative flex h-full flex-col gap-3 overflow-hidden rounded-2xl bg-white p-4 transition hover:-translate-y-1 hover:shadow-lg"
            >
              <span className="pointer-events-none absolute inset-x-0 top-0 h-1" style={{ background: APPARENCE_APPLI[a.code]?.couleur }} aria-hidden />
              <span className="flex items-start justify-between">
                <IconeAppli code={a.code} taille={52} />
                <ArrowUpRight size={18} className="text-gray-300 transition group-hover:text-gray-600" aria-hidden />
              </span>
              <span>
                <span className="block font-semibold leading-tight text-gray-900">{a.libelle}</span>
                <span className="mt-1 block text-sm leading-snug text-gray-500">{a.description}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
