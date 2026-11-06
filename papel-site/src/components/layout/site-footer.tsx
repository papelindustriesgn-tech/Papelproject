import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { NAV } from "@/components/layout/nav";
import { FacebookIcon, InstagramIcon, LinkedinIcon } from "@/components/ui/icons";
import type { CompanySettings } from "@/lib/types";

export function SiteFooter({ company }: { company: CompanySettings }) {
  const socials = [
    { href: company.facebookUrl, label: "Facebook", Icon: FacebookIcon },
    { href: company.instagramUrl, label: "Instagram", Icon: InstagramIcon },
    { href: company.linkedinUrl, label: "LinkedIn", Icon: LinkedinIcon },
  ].filter((s) => s.href);

  return (
    <footer className="relative overflow-hidden bg-papel-950 text-white">
      <div className="pointer-events-none absolute inset-0 leaf-pattern opacity-40" aria-hidden />
      <div className="relative container-page grid gap-12 py-16 md:grid-cols-12">
        <div className="md:col-span-5">
          <Logo tone="white" className="h-10 w-auto" />
          <p className="mt-5 max-w-sm text-white/70">{company.signature}</p>
          <p className="mt-6 text-sm text-white/60">
            {company.factoryName} — {company.factoryArea}, {company.factoryCity}
            <br />
            {company.country}
          </p>
          {socials.length > 0 && (
            <ul className="mt-6 flex gap-3">
              {socials.map(({ href, label, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Papel sur ${label}`}
                    className="inline-flex size-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-anis hover:text-papel-950"
                  >
                    <Icon className="size-5" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
        <nav aria-label="Pied de page" className="md:col-span-3">
          <p className="text-sm font-semibold tracking-wide text-anis uppercase">Le site</p>
          <ul className="mt-4 space-y-3 text-white/80">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-white">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="md:col-span-4">
          <p className="text-sm font-semibold tracking-wide text-anis uppercase">Professionnels</p>
          <p className="mt-4 text-white/80">
            Grossistes, distributeurs, commerces, hôtels, restaurants et entreprises : développons ensemble la distribution Papel.
          </p>
          <Link
            href="/professionnels#demande"
            className="mt-5 inline-flex h-11 items-center rounded-full bg-anis px-5 font-semibold text-papel-950 transition hover:bg-white"
          >
            Faire une demande
          </Link>
        </div>
      </div>
      <div className="relative border-t border-white/10">
        <div className="container-page flex flex-col gap-3 py-6 text-sm text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {company.brandName}. Tous droits réservés.
          </p>
          <ul className="flex gap-5">
            <li>
              <Link href="/mentions-legales" className="hover:text-white">
                Mentions légales
              </Link>
            </li>
            <li>
              <Link href="/confidentialite" className="hover:text-white">
                Confidentialité
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
