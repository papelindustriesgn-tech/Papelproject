import type { Metadata } from "next";
import Link from "next/link";
import { Prose } from "@/components/landing/prose";
import { SUPPORT_EMAIL } from "@/lib/constants";
import { BACKUP_KEEP } from "@/lib/backup-config";

export const metadata: Metadata = {
  title: "Supprimer mon compte",
  description: "Comment supprimer ton compte Uny et les données associées, depuis l'application ou sans y avoir accès.",
};

/** Page publique exigée par les boutons d'applications : demander la suppression sans passer par l'application. */
export default function DeleteAccountPage() {
  const subject = encodeURIComponent("Suppression de mon compte Uny");
  const body = encodeURIComponent(
    "Bonjour,\n\nJe demande la suppression de mon compte Uny et des données associées.\n\nEmail du compte : \nIdentifiant Uny (si connu) : \n",
  );
  return (
    <Prose title="Supprimer mon compte Uny" updated="21 octobre 2026">
      <h2>Depuis l&apos;application (immédiat)</h2>
      <ol>
        <li>
          Connecte-toi, puis ouvre <strong>Profil → Sécurité</strong>.
        </li>
        <li>
          Dans « Supprimer mon compte », tape <strong>SUPPRIMER</strong> et ton mot de passe, puis confirme.
        </li>
      </ol>
      <p>
        <Link className="text-brand-600 font-semibold" href="/profil/securite">
          Ouvrir Profil → Sécurité
        </Link>
      </p>

      <h2>Sans accès à ton compte</h2>
      <p>
        Écris-nous depuis l&apos;adresse email de ton compte à{" "}
        <a className="text-brand-600 font-semibold" href={`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`}>
          {SUPPORT_EMAIL}
        </a>
        . Pour éviter qu&apos;une autre personne supprime ton compte, nous vérifions que la demande vient bien de toi avant
        d&apos;agir, puis nous confirmons la suppression par email.
      </p>

      <h2>Ce qui est supprimé</h2>
      <ul>
        <li>Ton compte, ton profil et ta carte Uny.</li>
        <li>Tes fichiers : photo, justificatifs étudiants, photos d&apos;annonces.</li>
        <li>
          Tes demandes de vérification, codes promo, cartes de fidélité, favoris, annonces, candidatures et notifications.
        </li>
      </ul>
      <h2>Ce qui est conservé, et combien de temps</h2>
      <ul>
        <li>
          Les sauvegardes de la base sont gardées {BACKUP_KEEP} jours : tes données en disparaissent au plus tard{" "}
          {BACKUP_KEEP} jours après la suppression.
        </li>
        <li>
          L&apos;historique d&apos;un établissement garde la trace de ses décisions (date, action, motif), sans ton nom.
        </li>
      </ul>
      <p>
        Détails : <Link className="text-brand-600 font-semibold" href="/confidentialite">politique de confidentialité</Link>.
      </p>
    </Prose>
  );
}
