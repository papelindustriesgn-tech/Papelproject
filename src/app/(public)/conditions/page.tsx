import type { Metadata } from "next";
import { Prose } from "@/components/landing/prose";
import { SUPPORT_EMAIL } from "@/lib/constants";

export const metadata: Metadata = { title: "Conditions d'utilisation" };

export default function TermsPage() {
  return (
    <Prose title="Conditions d'utilisation" updated="29 septembre 2026">
      <p>
        Uny est une plateforme numérique destinée aux étudiants, actuellement en <strong>disponible dans toute la Guinée</strong>.
        En créant un compte, tu acceptes les présentes conditions.
      </p>
      <h2>1. Compte</h2>
      <ul>
        <li>L&apos;inscription est gratuite et réservée aux personnes inscrites dans un établissement d&apos;enseignement.</li>
        <li>Tu t&apos;engages à fournir des informations exactes et à garder ton mot de passe confidentiel.</li>
        <li>Un compte est strictement personnel. La carte Uny ne peut pas être prêtée.</li>
      </ul>
      <h2>2. Vérification du statut étudiant</h2>
      <p>
        Le statut « Étudiant vérifié » est attribué après contrôle d&apos;un justificatif. Tout document falsifié entraîne la
        suppression du compte. Uny peut retirer le statut vérifié si la situation change ou en cas d&apos;abus.
      </p>
      <h2>3. Avantages et annonces</h2>
      <ul>
        <li>Les avantages sont proposés par les partenaires, selon leurs conditions propres.</li>
        <li>Pendant la phase pilote, les contenus marqués « Démo » sont fictifs et servent uniquement à la démonstration.</li>
        <li>
          Uny met en relation les étudiants, les entreprises, les propriétaires et les vendeurs mais n&apos;est pas partie aux
          transactions.
        </li>
      </ul>
      <h2>4. Marketplace</h2>
      <p>
        Sont interdits : produits illégaux, contrefaçons, armes, médicaments, contenus choquants, annonces trompeuses. Les
        annonces non conformes sont retirées par la modération. Rencontre toujours les vendeurs dans un lieu public.
      </p>
      <h2>5. Contact</h2>
      <p>
        Pour toute question :{" "}
        <a className="text-brand-600 font-semibold" href={`mailto:${SUPPORT_EMAIL}`}>
          {SUPPORT_EMAIL}
        </a>
        .
      </p>
    </Prose>
  );
}
