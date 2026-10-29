import type { Metadata } from "next";
import { Carte, TitrePage } from "@/components/ui";
import { LEXIQUE, type Mot } from "@/lib/aide/lexique";
import { exigerConnexion } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Les mots expliqués" };

const RUBRIQUES: Mot["rubrique"][] = ["Ventes et clients", "Argent", "Production", "Stock", "Livraison", "Qualité et entretien"];

/** Lexique de l'ERP en mots simples, ouvert à tous les comptes (même contenu que les bulles « ? »). */
export default async function PageLexique() {
  await exigerConnexion();
  const mots: Mot[] = Object.values(LEXIQUE);
  return (
    <div className="mx-auto max-w-4xl">
      <TitrePage
        fil={[{ libelle: "Applications", href: "/applications" }]}
        titre="Les mots expliqués"
        sousTitre="Un mot de l'écran n'est pas clair ? Il est expliqué ici. Sur les tuiles, touchez aussi le petit « ? »."
      />
      <div className="flex flex-col gap-4">
        {RUBRIQUES.map((r) => (
          <Carte key={r} titre={r}>
            <dl className="divide-y divide-gray-100">
              {mots
                .filter((m) => m.rubrique === r)
                .map((m) => (
                  <div key={m.mot} className="py-2.5 sm:grid sm:grid-cols-[14rem_1fr] sm:gap-4">
                    <dt className="font-semibold text-gray-900">{m.mot}</dt>
                    <dd className="text-gray-700">{m.explication}</dd>
                  </div>
                ))}
            </dl>
          </Carte>
        ))}
      </div>
    </div>
  );
}
