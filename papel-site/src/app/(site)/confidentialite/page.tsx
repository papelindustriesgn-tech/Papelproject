import type { Metadata } from "next";
import { PageIntro } from "@/components/ui/page-intro";
import { getCompany } from "@/lib/data";

export const revalidate = 300;
export const metadata: Metadata = { title: "Politique de confidentialité", alternates: { canonical: "/confidentialite" } };

export default async function PrivacyPage() {
  const c = await getCompany();
  return (
    <>
      <PageIntro title="Politique de confidentialité" crumbs={[{ href: "/confidentialite", label: "Confidentialité" }]} />
      <section className="py-16">
        <div className="container-page max-w-3xl space-y-8 text-lg leading-relaxed text-ink/85">
          <div>
            <h2 className="text-2xl font-bold text-papel-950">Données collectées</h2>
            <p className="mt-3">
              Lorsque vous remplissez un formulaire (demande professionnelle ou contact), nous enregistrons les informations que
              vous saisissez : nom, entreprise, ville, numéro de téléphone ou WhatsApp, adresse e-mail facultative et message. Une
              empreinte non réversible de votre adresse IP est conservée pour limiter les envois abusifs.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-papel-950">Utilisation</h2>
            <p className="mt-3">
              Ces données servent uniquement à répondre à votre demande et à assurer le suivi commercial par l&apos;équipe de{" "}
              {c.brandName}. Elles ne sont ni vendues ni cédées à des tiers.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-papel-950">Mesure d&apos;audience</h2>
            <p className="mt-3">
              Le site ne dépose pas de cookie publicitaire. Certains clics (WhatsApp, boutons d&apos;action) sont comptés de façon
              anonyme, sans identifiant personnel, pour améliorer le site.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-papel-950">Vos droits</h2>
            <p className="mt-3">
              Vous pouvez demander l&apos;accès, la rectification ou la suppression de vos données en nous écrivant depuis la page
              Contact.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
