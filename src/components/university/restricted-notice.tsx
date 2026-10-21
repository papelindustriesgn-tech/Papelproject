import { Lock } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import type { UniversitySummary } from "@/lib/university";
import { UNIVERSITY_ROLES } from "@/lib/university";

/** Page réservée : établissement pas encore approuvé, ou rôle sans accès aux dossiers d'étudiants. */
export function RestrictedNotice({ university, title }: { university: UniversitySummary; title: string }) {
  const pending = university.partner_status !== "partner";
  return (
    <div className="animate-fade-up space-y-5">
      <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
      <EmptyState
        emoji="🔒"
        title={pending ? "Disponible après l'approbation de l'établissement" : "Accès non inclus dans votre rôle"}
        text={
          pending
            ? "Pour protéger les données des étudiants, les dossiers ne sont visibles qu'une fois l'établissement vérifié par Uny (sous 48 h en général). Vous pouvez déjà préparer la fiche et la carte."
            : `Votre rôle « ${UNIVERSITY_ROLES[university.role].label} » ne donne pas accès aux dossiers. Demandez à un administrateur de l'établissement de modifier vos droits.`
        }
      />
      <p className="text-muted flex items-center gap-2 text-xs">
        <Lock className="size-3.5" aria-hidden /> Contrôle appliqué par le serveur et la base de données.
      </p>
    </div>
  );
}
