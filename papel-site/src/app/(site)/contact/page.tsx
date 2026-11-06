import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Mail, MapPin, Phone, Store } from "lucide-react";
import { ContactForm } from "@/components/forms/contact-form";
import { ContactLink } from "@/components/ui/contact-link";
import { FacebookIcon, InstagramIcon, LinkedinIcon } from "@/components/ui/icons";
import { PageIntro } from "@/components/ui/page-intro";
import { WhatsAppButton } from "@/components/ui/whatsapp-link";
import { getCompany } from "@/lib/data";
import { telLink } from "@/lib/whatsapp";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Contact",
  description: "Contactez Papel Industries : formulaire de contact, WhatsApp et localisation de notre site de Coyah, en Guinée.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const company = await getCompany();
  const socials = [
    { href: company.facebookUrl, label: "Facebook", Icon: FacebookIcon },
    { href: company.instagramUrl, label: "Instagram", Icon: InstagramIcon },
    { href: company.linkedinUrl, label: "LinkedIn", Icon: LinkedinIcon },
  ].filter((s) => s.href);
  const tel = telLink(company.phone);
  const hasMap = company.factoryLat != null && company.factoryLng != null;
  const bbox = hasMap
    ? [company.factoryLng! - 0.01, company.factoryLat! - 0.006, company.factoryLng! + 0.01, company.factoryLat! + 0.006].join(",")
    : "";

  return (
    <>
      <PageIntro
        eyebrow="Contact"
        title="Parlons-en"
        intro="Une question sur nos produits, une demande commerciale ou une remarque ? Notre équipe vous répond."
        crumbs={[{ href: "/contact", label: "Contact" }]}
      />

      <section className="py-16 sm:py-20">
        <div className="container-page grid gap-12 lg:grid-cols-12">
          <div className="space-y-8 lg:col-span-5">
            <div>
              <h2 className="text-2xl font-bold text-papel-950">Nos moyens de contact</h2>
              <ul className="mt-6 space-y-5">
                {tel && (
                  <li className="flex gap-4">
                    <Phone className="mt-0.5 size-5 shrink-0 text-papel-600" aria-hidden />
                    <ContactLink href={tel} kind="phone_click" className="font-semibold text-ink hover:text-papel-700">
                      {company.phone}
                    </ContactLink>
                  </li>
                )}
                {company.email && (
                  <li className="flex gap-4">
                    <Mail className="mt-0.5 size-5 shrink-0 text-papel-600" aria-hidden />
                    <ContactLink
                      href={`mailto:${company.email}`}
                      kind="email_click"
                      className="font-semibold break-all text-ink hover:text-papel-700"
                    >
                      {company.email}
                    </ContactLink>
                  </li>
                )}
                <li className="flex gap-4">
                  <MapPin className="mt-0.5 size-5 shrink-0 text-papel-600" aria-hidden />
                  <span>
                    <span className="font-semibold">{company.factoryName}</span>
                    <br />
                    <span className="text-muted">
                      {company.factoryArea}, {company.factoryCity} — {company.country}
                    </span>
                  </span>
                </li>
                {company.openingHours && (
                  <li className="flex gap-4">
                    <Clock className="mt-0.5 size-5 shrink-0 text-papel-600" aria-hidden />
                    <span className="text-muted">{company.openingHours}</span>
                  </li>
                )}
              </ul>
              <WhatsAppButton number={company.whatsapp} context="information" className="mt-8 w-full sm:w-auto" />
            </div>

            {socials.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-papel-950">Suivez Papel</h2>
                <ul className="mt-4 flex gap-3">
                  {socials.map(({ href, label, Icon }) => (
                    <li key={label}>
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-11 items-center gap-2 rounded-full bg-papel-50 px-4 font-medium text-papel-800 hover:bg-papel-100"
                      >
                        <Icon className="size-5" /> {label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div id="distributeur" className="scroll-mt-24 rounded-card bg-sable p-6">
              <Store className="size-6 text-papel-700" aria-hidden />
              <h2 className="mt-3 text-lg font-bold text-papel-950">Trouver un distributeur</h2>
              <p className="mt-2 text-muted">
                Indiquez votre ville dans le formulaire ou sur WhatsApp : nous vous orientons vers le point de vente ou le
                distributeur Papel le plus proche.
              </p>
              <Link href="/professionnels#demande" className="mt-4 inline-flex font-semibold text-papel-700 hover:text-papel-900">
                Vous êtes professionnel ? Faites une demande →
              </Link>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="rounded-[1.75rem] bg-white p-5 shadow-card ring-1 ring-line sm:p-8">
              <h2 className="mb-6 text-2xl font-bold text-papel-950">Envoyer un message</h2>
              <ContactForm />
            </div>
          </div>
        </div>
      </section>

      {hasMap && (
        <section aria-label="Localisation du site de Coyah" className="pb-20">
          <div className="container-page">
            <div className="overflow-hidden rounded-card ring-1 ring-line">
              <iframe
                title={`Carte — ${company.factoryName}`}
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${company.factoryLat},${company.factoryLng}`}
                className="h-80 w-full sm:h-[28rem]"
                loading="lazy"
              />
            </div>
          </div>
        </section>
      )}
    </>
  );
}
