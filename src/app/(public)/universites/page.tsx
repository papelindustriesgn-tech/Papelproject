import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, CreditCard, FileSpreadsheet, ShieldCheck } from "lucide-react";
import { getCities } from "@/lib/cities";
import { createPublicClient } from "@/lib/supabase/public";
import { UniversityApplicationForm } from "./application-form";

export const metadata: Metadata = {
  title: "Universités partenaires",
  description:
    "Universités et instituts de Guinée : confirmez les inscriptions de vos étudiants et offrez-leur une carte Uny aux couleurs de votre établissement.",
};

const POINTS = [
  {
    icon: BadgeCheck,
    t: "Confirmez les inscriptions",
    d: "En un clic depuis le portail, par import de votre liste ou via votre API.",
  },
  {
    icon: CreditCard,
    t: "Une carte à vos couleurs",
    d: "Logo, couleurs, faculté, matricule : la carte Uny de vos étudiants porte votre identité.",
  },
  {
    icon: FileSpreadsheet,
    t: "Aucune ressaisie",
    d: "Importez votre liste Excel ou CSV : les étudiants qui correspondent sont confirmés automatiquement.",
  },
  {
    icon: ShieldCheck,
    t: "Données protégées",
    d: "Uny ne garde que des empreintes chiffrées et la preuve de vérification. Vous voyez uniquement vos étudiants.",
  },
];

export default async function UniversitiesLanding() {
  const [cities, { data: universities }] = await Promise.all([
    getCities(),
    createPublicClient().from("universities").select("id, name").eq("is_active", true).order("name"),
  ]);
  return (
    <div className="bg-canvas">
      <section className="bg-brand-800 uny-pattern text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 md:py-20">
          <p className="text-brand-100 text-sm font-semibold">Universités partenaires</p>
          <h1 className="mt-2 max-w-3xl text-4xl font-extrabold tracking-tight md:text-5xl">
            La carte étudiante numérique <span className="text-mango-400">de votre établissement</span>.
          </h1>
          <p className="text-brand-100 mt-4 max-w-2xl text-lg">
            Vos étudiants prouvent leur statut partout en Guinée avec une carte vérifiée par vous. Gratuit pour les
            établissements.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#demande"
              className="bg-mango-400 text-ink inline-flex h-12 w-full items-center justify-center rounded-2xl px-6 font-bold sm:w-auto"
            >
              Devenir université partenaire
            </a>
            <Link
              href="/connexion?next=/universite"
              className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-white/15 px-6 font-semibold sm:w-auto"
            >
              Accéder au portail université
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        {POINTS.map(({ icon: Icon, t, d }) => (
          <div key={t} className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
            <span className="bg-brand-50 text-brand-600 flex size-11 items-center justify-center rounded-2xl">
              <Icon className="size-6" aria-hidden />
            </span>
            <h2 className="mt-3 font-bold">{t}</h2>
            <p className="text-muted mt-1 text-sm">{d}</p>
          </div>
        ))}
      </section>

      <section id="demande" className="mx-auto grid max-w-6xl gap-8 px-4 pb-16 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Comment ça marche ?</h2>
          <ol className="text-ink/80 mt-5 space-y-4">
            {[
              "Vous envoyez la demande (2 minutes).",
              "L'équipe Uny vérifie votre identité auprès de l'établissement et ouvre le portail.",
              "Vous personnalisez la carte et importez votre liste d'inscrits (ou confirmez au cas par cas).",
              "Vos étudiants reçoivent une carte Uny vérifiée, reconnue par tous les partenaires.",
            ].map((s, i) => (
              <li key={s} className="flex gap-3">
                <span className="bg-brand-600 flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white">
                  {i + 1}
                </span>
                <span className="pt-1">{s}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
          <h2 className="mb-4 text-xl font-extrabold">Demande d&apos;ouverture du portail</h2>
          <UniversityApplicationForm universities={universities ?? []} cities={cities} />
        </div>
      </section>
    </div>
  );
}
