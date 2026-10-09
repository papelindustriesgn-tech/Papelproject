import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Megaphone, ScanLine, Store } from "lucide-react";
import { getCities } from "@/lib/cities";
import { ApplicationForm } from "./application-form";

export const metadata: Metadata = {
  title: "Devenir partenaire",
  description:
    "Commerçants et entreprises : touchez les étudiants de toute la Guinée avec Uny. Offres, boutique et vérification des cartes étudiantes.",
};

const POINTS = [
  {
    icon: Megaphone,
    t: "Fais-toi connaître",
    d: "Tes offres et produits apparaissent dans l'app de milliers d'étudiants.",
  },
  {
    icon: ScanLine,
    t: "Vérifie en 2 secondes",
    d: "Scanne le QR code de la carte Uny : tu sais tout de suite si le client est un étudiant vérifié.",
  },
  { icon: Store, t: "Vends sur la marketplace", d: "Ta boutique avec le badge « Partenaire Uny », contact direct par WhatsApp." },
  {
    icon: BarChart3,
    t: "Mesure tes résultats",
    d: "Vues de tes offres, cartes validées, étudiants servis : tout est dans ton tableau de bord.",
  },
];

export default async function PartnersLanding() {
  const cities = await getCities();
  return (
    <div className="bg-canvas">
      <section className="bg-brand-700 uny-pattern text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 md:py-20">
          <p className="text-brand-100 text-sm font-semibold">Espace partenaires</p>
          <h1 className="mt-2 max-w-3xl text-4xl font-extrabold tracking-tight md:text-5xl">
            Les étudiants de toute la Guinée, <span className="text-mango-400">à ta porte</span>.
          </h1>
          <p className="text-brand-100 mt-4 max-w-2xl text-lg">
            Restaurants, boutiques, salles de sport, entreprises : rejoins Uny gratuitement pendant le lancement.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#demande"
              className="bg-mango-400 text-ink inline-flex h-12 w-full items-center justify-center rounded-2xl px-6 font-bold sm:w-auto"
            >
              Devenir partenaire
            </a>
            <Link
              href="/connexion?next=/partenaire"
              className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-white/15 px-6 font-semibold sm:w-auto"
            >
              J&apos;ai déjà un espace partenaire
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
              "Tu remplis la demande (2 minutes).",
              "L'équipe Uny te contacte et active ton espace partenaire.",
              "Tu publies tes offres depuis ton téléphone, dans l'app Uny.",
              "Les étudiants viennent avec leur carte : tu scannes, tu appliques la réduction.",
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
          <h2 className="mb-4 text-xl font-extrabold">Demande de partenariat</h2>
          <ApplicationForm cities={cities} />
        </div>
      </section>
    </div>
  );
}
