import type { Metadata } from "next";
import Link from "next/link";
import { Prose } from "@/components/landing/prose";
import { SUPPORT_EMAIL } from "@/lib/constants";
import { ORANGE_MONEY_USSD } from "@/lib/orange-money";

export const metadata: Metadata = {
  title: "Conditions générales d'utilisation",
  description:
    "Règles d'utilisation d'Uny : compte, carte étudiante, codes promo, paiements Orange Money, marketplace et partenaires.",
};

const mail = (
  <a className="text-brand-600 font-semibold" href={`mailto:${SUPPORT_EMAIL}`}>
    {SUPPORT_EMAIL}
  </a>
);

export default function TermsPage() {
  return (
    <Prose title="Conditions générales d'utilisation" updated="8 octobre 2026">
      <p>
        Les présentes conditions générales d&apos;utilisation (les « Conditions ») encadrent l&apos;utilisation de la plateforme{" "}
        <strong>Uny</strong> : site unyafrica.com, application mobile et espaces partenaires et universités. En créant un compte
        ou en utilisant Uny, tu acceptes ces Conditions. Si tu ne les acceptes pas, n&apos;utilise pas le service.
      </p>

      <h2>1. Définitions</h2>
      <ul>
        <li>
          <strong>Étudiant</strong> : toute personne inscrite sur Uny avec un compte étudiant.
        </li>
        <li>
          <strong>Partenaire</strong> : commerce, entreprise ou organisme qui propose des offres, des promotions ou des produits
          aux étudiants via Uny.
        </li>
        <li>
          <strong>Université</strong> : établissement d&apos;enseignement qui utilise le portail Uny pour confirmer les
          inscriptions de ses étudiants.
        </li>
        <li>
          <strong>Carte Uny</strong> : carte étudiante numérique, avec QR code et identifiant Uny, affichée dans
          l&apos;application.
        </li>
        <li>
          <strong>Code promo</strong> : code personnel au format UNY-XXXX-XX, généré dans l&apos;application pour profiter
          d&apos;une offre d&apos;un partenaire.
        </li>
      </ul>

      <h2>2. Le service Uny</h2>
      <p>
        Uny est une plateforme numérique, disponible dans toute la Guinée, qui permet aux étudiants de prouver leur statut
        étudiant et de profiter d&apos;offres chez des partenaires. Uny <strong>met en relation</strong> les étudiants, les
        partenaires et les universités. Uny n&apos;est ni le vendeur des produits, ni le prestataire des services proposés par les
        partenaires, ni un établissement de paiement.
      </p>

      <h2>3. Compte</h2>
      <ul>
        <li>L&apos;inscription est gratuite pour les étudiants.</li>
        <li>Tu t&apos;engages à fournir des informations exactes (nom, établissement, filière…) et à les tenir à jour.</li>
        <li>Si tu as moins de 18 ans, tu dois avoir l&apos;accord d&apos;un parent ou d&apos;un tuteur pour utiliser Uny.</li>
        <li>
          Ton compte est strictement personnel. Garde ton mot de passe confidentiel : toute action faite depuis ton compte est
          réputée faite par toi.
        </li>
        <li>Tu peux supprimer ton compte à tout moment depuis ton profil.</li>
      </ul>

      <h2>4. Statut étudiant et carte Uny</h2>
      <ul>
        <li>
          Le statut « Étudiant vérifié » est attribué après confirmation par ton université (portail, liste officielle) ou après
          contrôle d&apos;un justificatif par l&apos;équipe Uny.
        </li>
        <li>
          La carte Uny est valable pour l&apos;année universitaire indiquée. Elle peut être expirée par ton université (fin
          d&apos;inscription) ou révoquée en cas de fraude.
        </li>
        <li>
          La carte ne se prête pas et ne se partage pas. Une capture d&apos;écran de la carte d&apos;une autre personne, un
          document falsifié ou une fausse déclaration entraînent la suppression du compte, sans préjudice de poursuites.
        </li>
        <li>
          La personnalisation de la carte (modèle, couleurs) est purement visuelle : le QR code, l&apos;identifiant Uny et le
          statut restent toujours affichés.
        </li>
      </ul>

      <h2>5. Offres et codes promo</h2>
      <ul>
        <li>
          Les offres sont définies par chaque partenaire, qui en fixe le contenu, le prix, la durée et les conditions. Le
          partenaire est seul responsable de les honorer.
        </li>
        <li>
          Pour profiter d&apos;une offre, tu obtiens un <strong>code promo personnel</strong> dans l&apos;application. Il est{" "}
          <strong>valable 7 jours</strong> (ou jusqu&apos;à la fin de l&apos;offre si elle se termine avant), pour{" "}
          <strong>une seule utilisation</strong>, et uniquement chez le partenaire concerné.
        </li>
        <li>
          Le code est nominatif et ne peut être ni revendu, ni cédé, ni échangé contre de l&apos;argent. Le partenaire peut
          demander à voir ta carte Uny pour vérifier ton identité.
        </li>
        <li>
          Certaines offres sont réservées aux étudiants vérifiés avec une carte valide. Le partenaire peut refuser une réduction
          si le code est expiré, déjà utilisé ou présenté par une autre personne.
        </li>
        <li>Uny peut annuler un code ou limiter le nombre de codes obtenus en cas d&apos;abus ou de fraude.</li>
        <li>Les contenus marqués « Démo » ou « Exemple » sont fictifs et ne constituent pas des offres réelles.</li>
      </ul>

      <h2>6. Paiement avec Orange Money</h2>
      <ul>
        <li>
          Quand un partenaire a renseigné son <strong>code marchand Orange Money</strong>, l&apos;application te l&apos;affiche
          avec le montant à payer. Tu paies <strong>directement le partenaire</strong>, depuis ton propre compte Orange Money
          (menu {ORANGE_MONEY_USSD} ou application Orange Money).
        </li>
        <li>
          <strong>Uny n&apos;encaisse, ne détient et ne transfère aucun fonds</strong> et ne prélève aucune commission sur ces
          paiements. Le paiement est soumis aux conditions d&apos;Orange Money.
        </li>
        <li>
          Avant de valider, vérifie toujours le nom du marchand affiché par Orange Money et le montant.{" "}
          <strong>
            Uny ne te demandera jamais ton code secret Orange Money, ni par téléphone, ni par SMS, ni dans l&apos;application.
          </strong>
        </li>
        <li>
          Tu peux transmettre au partenaire la référence de ta transaction (reçue par SMS) pour l&apos;aider à retrouver ton
          paiement. Le partenaire confirme la réception sur son relevé avant de valider ton code.
        </li>
        <li>
          Les remboursements, échanges et réclamations sur un achat se règlent avec le partenaire. En cas de difficulté,
          écris-nous : Uny peut faciliter le dialogue, sans être partie à la transaction.
        </li>
      </ul>

      <h2>7. Marketplace</h2>
      <ul>
        <li>
          La marketplace présente d&apos;abord les <strong>promotions des partenaires</strong>, puis les annonces publiées entre
          étudiants.
        </li>
        <li>
          Un prix « avant promo » doit être un prix réellement pratiqué par le partenaire. Les prix barrés fictifs sont interdits
          et entraînent le retrait de l&apos;article.
        </li>
        <li>
          Sont interdits : produits illégaux, contrefaçons, armes, médicaments, alcool vendu à des mineurs, contenus choquants,
          annonces trompeuses ou en double. Les annonces non conformes sont retirées par la modération.
        </li>
        <li>
          Pour les ventes entre étudiants, Uny ne garantit ni l&apos;état ni la conformité des articles. Rencontre le vendeur dans
          un lieu public, vérifie l&apos;article avant de payer et ne paie jamais d&apos;avance un inconnu.
        </li>
      </ul>

      <h2>8. Engagements des partenaires</h2>
      <p>En publiant sur Uny, chaque partenaire s&apos;engage à :</p>
      <ul>
        <li>honorer les offres et codes promo publiés tant qu&apos;ils sont valables ;</li>
        <li>
          renseigner un code marchand Orange Money qui lui appartient, à son nom ou au nom de son commerce, et le tenir à jour ;
        </li>
        <li>afficher des prix exacts, toutes taxes comprises, en francs guinéens ;</li>
        <li>
          vérifier la réception d&apos;un paiement avant de valider un code, et rembourser l&apos;étudiant si la prestation
          n&apos;est pas fournie ;
        </li>
        <li>
          utiliser les informations des étudiants (nom, identifiant Uny, photo) uniquement pour vérifier leur statut, sans les
          copier, les conserver ailleurs ni les utiliser pour du démarchage ;
        </li>
        <li>respecter la réglementation guinéenne applicable à son activité.</li>
      </ul>
      <p>
        La publication est gratuite pendant la phase de lancement. Toute évolution tarifaire sera annoncée à l&apos;avance et
        devra être acceptée par le partenaire. Uny peut suspendre un partenaire qui ne respecte pas ces engagements.
      </p>

      <h2>9. Universités</h2>
      <p>
        Les universités partenaires confirment les inscriptions de leurs étudiants via le portail Uny ou par l&apos;import de
        listes. Elles ne voient que les étudiants qui ont déclaré une inscription chez elles. Les engagements détaillés (sécurité,
        durée de conservation, raccordement API) font l&apos;objet d&apos;un accord écrit avec chaque établissement.
      </p>

      <h2>10. Comportements interdits</h2>
      <ul>
        <li>Usurper l&apos;identité d&apos;un étudiant, d&apos;un partenaire ou d&apos;une université.</li>
        <li>Créer plusieurs comptes, générer des codes pour les revendre ou contourner les limites d&apos;utilisation.</li>
        <li>Tenter d&apos;accéder aux données d&apos;autres utilisateurs ou de perturber le fonctionnement d&apos;Uny.</li>
        <li>Publier des contenus haineux, diffamatoires, frauduleux ou contraires à la loi.</li>
      </ul>

      <h2>11. Données personnelles</h2>
      <p>
        Uny collecte uniquement les données nécessaires au service et vérifie le statut étudiant à la source, en ne conservant que
        la preuve minimale. Le détail figure dans la{" "}
        <Link href="/confidentialite" className="text-brand-600 font-semibold">
          politique de confidentialité
        </Link>
        .
      </p>

      <h2>12. Propriété intellectuelle</h2>
      <p>
        La marque Uny, le logo, la carte et l&apos;application sont protégés. Les partenaires et les utilisateurs restent
        propriétaires des contenus qu&apos;ils publient (photos, textes, logos) et autorisent Uny à les afficher dans le service
        le temps de leur publication.
      </p>

      <h2>13. Responsabilité</h2>
      <ul>
        <li>
          Uny fait ses meilleurs efforts pour que le service soit disponible et fiable, sans pouvoir garantir une disponibilité
          continue (réseau, maintenance, cas de force majeure).
        </li>
        <li>
          Uny n&apos;est pas responsable de la qualité des produits et services des partenaires ou des vendeurs, ni des paiements
          réalisés directement entre utilisateurs et partenaires.
        </li>
        <li>
          Chaque utilisateur est responsable des contenus qu&apos;il publie et de l&apos;usage qu&apos;il fait de son compte.
        </li>
      </ul>

      <h2>14. Suspension et résiliation</h2>
      <p>
        Uny peut suspendre ou supprimer un compte, retirer un contenu ou annuler des codes promo en cas de non-respect de ces
        Conditions, de fraude ou de demande d&apos;une autorité compétente. Tu peux contester une décision en écrivant à {mail}.
      </p>

      <h2>15. Modification des Conditions</h2>
      <p>
        Uny peut faire évoluer ces Conditions, notamment pour suivre l&apos;évolution du service ou de la loi. En cas de
        changement important, tu seras prévenu dans l&apos;application ou par email avant son entrée en vigueur. Continuer à
        utiliser Uny après cette date vaut acceptation.
      </p>

      <h2>16. Droit applicable et litiges</h2>
      <p>
        Ces Conditions sont régies par le droit de la République de Guinée. En cas de désaccord, nous chercherons d&apos;abord une
        solution amiable : écris-nous. À défaut d&apos;accord, le litige sera porté devant les juridictions compétentes de
        Conakry.
      </p>

      <h2>17. Contact</h2>
      <p>Pour toute question sur ces Conditions : {mail}.</p>
    </Prose>
  );
}
