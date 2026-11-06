import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { WhatsAppFab } from "@/components/layout/whatsapp-fab";
import { JsonLd } from "@/components/ui/json-ld";
import { getCompany } from "@/lib/data";
import { siteUrl } from "@/lib/env";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const company = await getCompany();
  const sameAs = [company.facebookUrl, company.instagramUrl, company.linkedinUrl].filter(Boolean);
  return (
    <>
      <SiteHeader />
      <main id="contenu">{children}</main>
      <SiteFooter company={company} />
      <WhatsAppFab number={company.whatsapp} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: company.brandName,
          legalName: company.legalName,
          url: siteUrl(),
          logo: `${siteUrl()}/brand/papel-industrie-green.png`,
          slogan: company.signature,
          address: {
            "@type": "PostalAddress",
            addressLocality: company.factoryCity,
            addressRegion: company.factoryArea,
            addressCountry: "GN",
          },
          ...(company.email ? { email: company.email } : {}),
          ...(company.phone ? { telephone: company.phone } : {}),
          ...(sameAs.length ? { sameAs } : {}),
        }}
      />
    </>
  );
}
