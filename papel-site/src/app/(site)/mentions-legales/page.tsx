import type { Metadata } from "next";
import { PageIntro } from "@/components/ui/page-intro";
import { getCompany } from "@/lib/data";

export const revalidate = 300;
export const metadata: Metadata = { title: "Mentions légales", alternates: { canonical: "/mentions-legales" } };

export default async function LegalPage() {
  const c = await getCompany();
  const rows: [string, string][] = [
    ["Raison sociale", c.legalName],
    ["Nom commercial", c.brandName],
    ["Forme juridique", c.legalForm],
    ["RCCM", c.rccm],
    ["NIF", c.nif],
    ["Siège", c.headOffice],
    ["Site industriel", `${c.factoryArea}, ${c.factoryCity} — ${c.country}`],
    ...(c.email ? ([["Contact", c.email]] as [string, string][]) : []),
    ...(c.phone ? ([["Téléphone", c.phone]] as [string, string][]) : []),
  ].filter(([, v]) => Boolean(v)) as [string, string][];
  return (
    <>
      <PageIntro title="Mentions légales" crumbs={[{ href: "/mentions-legales", label: "Mentions légales" }]} />
      <section className="py-16">
        <div className="container-page max-w-3xl space-y-10 text-ink/85">
          <div>
            <h2 className="text-2xl font-bold text-papel-950">Éditeur du site</h2>
            <dl className="mt-4 divide-y divide-line rounded-card ring-1 ring-line">
              {rows.map(([k, v]) => (
                <div key={k} className="grid gap-1 px-5 py-3 sm:grid-cols-[12rem_1fr]">
                  <dt className="text-muted">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-papel-950">Hébergement</h2>
            <p className="mt-3">Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis — vercel.com.</p>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-papel-950">Propriété intellectuelle</h2>
            <p className="mt-3">
              Les marques Papel et Papel Doux, les logos, textes et photographies présents sur ce site sont la propriété de{" "}
              {c.legalName} ou utilisés avec autorisation. Toute reproduction sans accord préalable est interdite.
            </p>
            <p className="mt-3">
              Les vues du projet de site industriel de {c.factoryCity} sont des rendus d&apos;architecte, non contractuels.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
