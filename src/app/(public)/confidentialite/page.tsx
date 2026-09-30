import type { Metadata } from "next";
import { Prose } from "@/components/landing/prose";
import { SUPPORT_EMAIL } from "@/lib/constants";

export const metadata: Metadata = { title: "Politique de confidentialité" };

export default function PrivacyPage() {
  return (
    <Prose title="Politique de confidentialité" updated="29 septembre 2026">
      <p>
        Uny accorde une grande importance à la protection de tes données personnelles. Voici ce que nous collectons et pourquoi.
      </p>
      <h2>Données collectées</h2>
      <ul>
        <li>Identité : prénom, nom, date de naissance, genre (facultatif), photo.</li>
        <li>Contact : email et numéro de téléphone.</li>
        <li>Études : établissement, filière, niveau, ville.</li>
        <li>Justificatifs étudiants que tu envoies pour la vérification.</li>
        <li>Utilisation : favoris, candidatures, annonces publiées, consultations (statistiques agrégées).</li>
      </ul>
      <h2>Utilisation</h2>
      <ul>
        <li>Créer ta carte Uny et vérifier ton statut étudiant.</li>
        <li>Te donner accès aux avantages, jobs, logements et à la marketplace.</li>
        <li>T&apos;envoyer des emails liés à ton compte (confirmation, sécurité, vérification).</li>
      </ul>
      <h2>Protection</h2>
      <ul>
        <li>
          Les justificatifs sont stockés dans un espace privé : seuls toi et l&apos;équipe de vérification y ont accès. Ils ne
          sont jamais publics.
        </li>
        <li>Les accès aux données sont protégés par des règles de sécurité au niveau de la base de données.</li>
        <li>
          Lorsqu&apos;un partenaire scanne ta carte, il voit uniquement ton nom, ta photo, ton établissement, ta filière et la
          validité de ta carte.
        </li>
        <li>Nous ne vendons pas tes données.</li>
      </ul>
      <h2>Tes droits</h2>
      <p>
        Tu peux consulter et modifier tes informations depuis ton profil. Tu peux supprimer ton compte et toutes
        tes données à tout moment, dans l&apos;application : <strong>Profil → Sécurité → Supprimer mon compte</strong>{" "}
        (<span id="suppression-du-compte">effacement immédiat et définitif</span>). Si tu n&apos;as plus accès à ton
        compte, écris-nous à{" "}
        <a className="text-brand-600 font-semibold" href={`mailto:${SUPPORT_EMAIL}`}>
          {SUPPORT_EMAIL}
        </a>
        .
      </p>
    </Prose>
  );
}
