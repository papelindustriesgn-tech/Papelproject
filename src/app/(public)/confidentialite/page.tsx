import type { Metadata } from "next";
import Link from "next/link";
import { Prose } from "@/components/landing/prose";
import { SUPPORT_EMAIL } from "@/lib/constants";
import { BACKUP_KEEP } from "@/lib/backup-config";

export const metadata: Metadata = { title: "Politique de confidentialité" };

export default function PrivacyPage() {
  return (
    <Prose title="Politique de confidentialité" updated="22 octobre 2026">
      <p>
        Cette page décrit les données réellement traitées par Uny (site et applications), qui peut les voir et combien de
        temps elles sont conservées. Responsable du traitement : Papel Industries, Conakry (Guinée) — contact :{" "}
        <a className="text-brand-600 font-semibold" href={`mailto:${SUPPORT_EMAIL}`}>
          {SUPPORT_EMAIL}
        </a>
        .
      </p>

      <h2>Données que tu nous donnes</h2>
      <ul>
        <li>Compte : prénom, nom, email, mot de passe (stocké chiffré, jamais lisible), établissement.</li>
        <li>Profil, demandé au moment de la vérification : téléphone, date de naissance, filière, niveau, photo (facultative).</li>
        <li>
          Vérification du statut étudiant : matricule et cursus déclarés, ou justificatif (carte d&apos;étudiant, attestation)
          envoyé en photo ou PDF.
        </li>
        <li>Annonces de la marketplace (texte et photos), candidatures aux offres d&apos;emploi, réponses aux questionnaires.</li>
      </ul>

      <h2>Données créées par l&apos;utilisation</h2>
      <ul>
        <li>Carte Uny : identifiant Uny, année universitaire, validité, statut.</li>
        <li>
          Codes promo : offre, date, utilisation, et le paiement déclaré par le commerçant (mode, montant, référence Orange
          Money). Uny ne reçoit et ne détient aucun paiement.
        </li>
        <li>Vérifications de carte en caisse : commerçant, date, résultat. Cartes de fidélité : passages, tampons, récompenses.</li>
        <li>Favoris, notifications, dernière connexion, consultations d&apos;offres (pour des statistiques).</li>
        <li>
          Sécurité : indicateurs automatiques sur les inscriptions suspectes (par exemple adresse email jetable), pour la
          validation des comptes.
        </li>
      </ul>

      <h2>Qui voit quoi</h2>
      <ul>
        <li>
          <strong>Commerçant partenaire</strong>, quand il vérifie ta carte ou ton code : ton nom, ta photo, ton établissement,
          ta filière, ton identifiant Uny et la validité de ta carte. Jamais ton email, ton téléphone ni ton justificatif.
        </li>
        <li>
          <strong>Ton établissement</strong>, uniquement s&apos;il est approuvé par Uny et seulement pour les étudiants qui
          déclarent y être inscrits : nom, date de naissance, matricule et cursus déclarés, photo, statut de la demande et de
          la carte. Chaque décision est enregistrée avec son responsable et son motif.
        </li>
        <li>
          <strong>Équipe Uny</strong> : les justificatifs, pour les vérifier. Ils sont stockés dans un espace privé, jamais
          publics.
        </li>
        <li>Les autres étudiants voient seulement ce que tu publies sur la marketplace (prénom et annonce).</li>
      </ul>

      <h2>Listes d&apos;inscrits fournies par les établissements</h2>
      <p>
        Pour confirmer automatiquement les inscriptions, un établissement peut importer la liste de ses inscrits. Uny n&apos;en
        conserve que des empreintes chiffrées (matricule, nom, date de naissance transformés de façon irréversible), jamais
        les données en clair. Ces empreintes sont effacées à la fin de l&apos;année universitaire.
      </p>

      <h2>Durées de conservation</h2>
      <ul>
        <li>Compte, carte, codes, fidélité, favoris, notifications : tant que ton compte existe.</li>
        <li>
          Justificatif : jusqu&apos;à son remplacement ou à la suppression de ton compte. Inscription confirmée : valable jusqu&apos;au
          30 septembre de la fin de l&apos;année universitaire, puis marquée expirée.
        </li>
        <li>
          Sauvegardes : une copie de la base est faite chaque nuit et les {BACKUP_KEEP} dernières sont gardées dans un espace
          privé. Après la suppression d&apos;un compte, ses données disparaissent donc des sauvegardes au plus tard{" "}
          {BACKUP_KEEP} jours plus tard. Les fichiers (photos, justificatifs) ne sont pas copiés dans ces sauvegardes.
        </li>
        <li>
          Historique des établissements : la trace d&apos;une décision (date, action, motif) est conservée sans ton nom après la
          suppression de ton compte.
        </li>
      </ul>

      <h2>Prestataires techniques</h2>
      <ul>
        <li>Supabase : base de données, comptes et fichiers, hébergés à Paris (France).</li>
        <li>Vercel : hébergement du site (Paris) et mesure d&apos;audience et de performance sans cookie publicitaire.</li>
        <li>Un service d&apos;envoi d&apos;emails pour les messages liés à ton compte.</li>
        <li>
          Anthropic (États-Unis), uniquement si tu utilises l&apos;assistant de la page Aide et qu&apos;il est activé : ta
          question, l&apos;état de ton compte (statut de validation, de vérification et de carte) et des extraits de
          l&apos;aide de Uny lui sont transmis pour formuler la réponse. Ni ton nom, ni ton email, ni tes justificatifs ne
          sont ajoutés par Uny. Les conversations sont conservées dans Uny et supprimées avec ton compte.
        </li>
      </ul>
      <p>Uny ne vend pas tes données et n&apos;affiche pas de publicité ciblée.</p>

      <h2>Tes droits</h2>
      <p>
        Tu peux consulter et modifier tes informations depuis ton profil. Tu peux supprimer ton compte à tout moment dans
        l&apos;application : <strong>Profil → Sécurité → Supprimer mon compte</strong>. La suppression est immédiate (compte,
        fichiers et données liées) ; seules les sauvegardes la reflètent avec le délai indiqué ci-dessus. Si tu n&apos;as plus
        accès à ton compte, suis la procédure de la page{" "}
        <Link className="text-brand-600 font-semibold" href="/supprimer-mon-compte" id="suppression-du-compte">
          Supprimer mon compte
        </Link>
        .
      </p>
    </Prose>
  );
}
