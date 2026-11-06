import type { Metadata } from "next";
import { Suspense } from "react";
import { BarChart3, Boxes, Briefcase, Handshake, Hotel, PackageCheck, Store, Truck, UtensilsCrossed } from "lucide-react";
import { LeadForm } from "@/components/forms/lead-form";
import { PageIntro } from "@/components/ui/page-intro";
import { SectionHeader } from "@/components/ui/section-header";
import { WhatsAppButton } from "@/components/ui/whatsapp-link";
import { getCompany, getProducts } from "@/lib/data";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Professionnels et distributeurs",
  description:
    "Grossistes, distributeurs, commerces, hôtels, restaurants et entreprises : devenez partenaire Papel et demandez les conditions de distribution des mouchoirs Papel Doux en Guinée.",
  alternates: { canonical: "/professionnels" },
};

const AUDIENCES = [
  {
    id: "distributeurs",
    eyebrow: "Grossistes et distributeurs",
    title: "Développez votre activité avec une marque du quotidien",
    intro:
      "Les produits d'hygiène se consomment et se renouvellent toute l'année. Papel Industries recherche des partenaires capables de les rendre disponibles dans leur zone.",
    points: [
      { Icon: PackageCheck, text: "Une marque identifiable, à l'emballage reconnaissable en rayon." },
      { Icon: Truck, text: "Un interlocuteur commercial dédié pour organiser vos approvisionnements." },
      { Icon: BarChart3, text: "Des conditions de distribution définies selon vos volumes et votre zone." },
    ],
  },
  {
    id: "chr",
    eyebrow: "Hôtels, restaurants et entreprises",
    title: "Des solutions d'hygiène pour vos clients et vos équipes",
    intro:
      "Chambres, salles de restaurant, comptoirs, bureaux et salles de réunion : équipez vos espaces avec des produits pratiques et soignés.",
    points: [
      { Icon: Hotel, text: "Hôtels : un produit d'accueil pour les chambres et les espaces communs." },
      { Icon: UtensilsCrossed, text: "Restaurants et maquis : un geste d'hygiène à disposition de vos clients." },
      { Icon: Briefcase, text: "Entreprises et institutions : un approvisionnement simple pour vos locaux." },
    ],
  },
  {
    id: "revendeurs",
    eyebrow: "Revendeurs et commerces",
    title: "Proposez Papel dans votre commerce",
    intro:
      "Boutiques, supérettes, pharmacies, stations-service : renseignez-vous sur nos produits et sur les conditions pour les proposer à vos clients.",
    points: [
      { Icon: Store, text: "Un produit simple à présenter et à vendre au quotidien." },
      { Icon: Boxes, text: "Des informations claires sur les formats et conditionnements disponibles." },
      { Icon: Handshake, text: "Une mise en relation avec le distributeur le plus proche de chez vous." },
    ],
  },
];

export default async function ProfessionalsPage() {
  const [company, products] = await Promise.all([getCompany(), getProducts()]);
  const productOptions = products.map((p) => p.name);

  return (
    <>
      <PageIntro
        eyebrow="Professionnels et distributeurs"
        title="Construisons ensemble le réseau Papel"
        intro="Grossistes, distributeurs, commerces, hôtels, restaurants et entreprises : parlons de vos besoins et des conditions de distribution."
        crumbs={[{ href: "/professionnels", label: "Professionnels" }]}
      >
        <nav aria-label="Sections de la page" className="mt-8 flex flex-wrap gap-2">
          {[
            ...AUDIENCES.map((a) => ({ href: `#${a.id}`, label: a.eyebrow })),
            { href: "#demande", label: "Faire une demande" },
          ].map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="inline-flex min-h-10 items-center rounded-full bg-white px-4 text-sm font-medium text-papel-800 ring-1 ring-line hover:ring-papel-300"
            >
              {l.label}
            </a>
          ))}
        </nav>
      </PageIntro>

      {AUDIENCES.map((a, i) => (
        <section key={a.id} id={a.id} className={`scroll-mt-24 py-16 sm:py-20 ${i % 2 === 1 ? "bg-sable" : ""}`}>
          <div className="container-page grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <SectionHeader eyebrow={a.eyebrow} title={a.title} intro={a.intro} />
            </div>
            <ul className="grid gap-4 lg:col-span-7">
              {a.points.map(({ Icon, text }) => (
                <li key={text} className="flex items-start gap-4 rounded-card bg-white p-5 shadow-card ring-1 ring-line">
                  <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-papel-50 text-papel-700">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <p className="pt-2 leading-relaxed">{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}

      <section id="demande" aria-labelledby="demande-titre" className="scroll-mt-20 bg-papel-800 py-16 sm:py-24">
        <div className="container-page grid gap-10 lg:grid-cols-12">
          <div className="text-white lg:col-span-4">
            <p className="text-xs font-semibold tracking-[0.14em] text-anis uppercase">Formulaire professionnel</p>
            <h2 id="demande-titre" className="mt-3 text-3xl font-bold sm:text-4xl">
              Faire une demande
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-white/75">
              Partenariat, devis ou informations : remplissez ce formulaire, notre équipe commerciale vous recontacte.
            </p>
            <WhatsAppButton
              number={company.whatsapp}
              context="distributeur"
              label="Ou écrivez-nous sur WhatsApp"
              className="mt-8 w-full sm:w-auto"
            />
          </div>
          <div className="rounded-[1.75rem] bg-sable p-5 sm:p-8 lg:col-span-8">
            <Suspense fallback={<div className="h-[40rem]" aria-hidden />}>
              <LeadForm productOptions={productOptions} />
            </Suspense>
          </div>
        </div>
      </section>
    </>
  );
}
