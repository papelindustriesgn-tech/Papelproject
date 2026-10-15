import { ShieldCheck, Trash2 } from "lucide-react";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { FormMessage } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/server";
import { requireUniversity } from "@/lib/university";
import { formatDate } from "@/lib/format";
import { deleteImport } from "../actions";
import { ImportForm } from "./import-form";

export const metadata = { title: "Listes d'étudiants" };

function academicYears() {
  const now = new Date();
  const start = now.getMonth() >= 9 ? now.getFullYear() : now.getFullYear() - 1;
  return [`${start}-${start + 1}`, `${start + 1}-${start + 2}`];
}

export default async function ImportsPage() {
  const { university } = await requireUniversity();
  const supabase = await createClient();
  const { data: imports } = await supabase
    .from("university_imports")
    .select("id, academic_year, file_name, row_count, skipped_count, matched_count, created_at, purge_after")
    .eq("university_id", university.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="animate-fade-up space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Listes d&apos;étudiants</h1>
        <p className="text-muted mt-1 text-sm">
          Importez la liste officielle de vos inscrits : chaque demande d&apos;étudiant dont le matricule, le nom et la date de
          naissance (ou le prénom) correspondent est confirmée automatiquement. Les autres restent à examiner dans « Demandes ».
        </p>
      </div>

      <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <h2 className="mb-1 font-bold">Importer une liste</h2>
        <p className="text-muted mb-4 text-sm">
          Colonnes reconnues automatiquement : <strong>Matricule</strong>, <strong>Nom</strong>, Prénom(s), Date de naissance,
          Faculté, Département, Filière, Niveau. Une nouvelle liste remplace la précédente pour la même année.
        </p>
        {university.partner_status === "partner" ? (
          <ImportForm years={academicYears()} />
        ) : (
          <FormMessage type="info">Disponible dès l&apos;approbation de l&apos;établissement par Uny.</FormMessage>
        )}
      </section>

      <div className="bg-brand-50 text-brand-800 flex gap-3 rounded-2xl p-4 text-sm">
        <ShieldCheck className="size-5 shrink-0" aria-hidden />
        <p>
          Uny ne conserve <strong>aucun nom, matricule ni date de naissance en clair</strong> : chaque valeur est transformée en
          empreinte chiffrée irréversible (HMAC-SHA256), uniquement utilisable pour comparer. Seuls la faculté, la filière et le
          niveau sont gardés pour la carte. Les listes sont supprimées automatiquement après l&apos;année universitaire.
        </p>
      </div>

      <section>
        <h2 className="mb-3 font-bold">Listes importées</h2>
        {!imports?.length ? (
          <EmptyState emoji="📄" title="Aucune liste importée" />
        ) : (
          <ul className="divide-line divide-y rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-card)]">
            {imports.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-3 p-4 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{i.file_name ?? "Liste"}</p>
                  <p className="text-muted text-xs">
                    {i.academic_year} · importée le {formatDate(i.created_at)} · {i.row_count.toLocaleString("fr-FR")} étudiants ·{" "}
                    {i.matched_count} confirmation{i.matched_count > 1 ? "s" : ""} automatique{i.matched_count > 1 ? "s" : ""} ·
                    supprimée le {formatDate(i.purge_after)}
                  </p>
                </div>
                <form action={deleteImport.bind(null, i.id)}>
                  <ConfirmButton
                    message="Supprimer cette liste ? Les inscriptions déjà confirmées restent valables."
                    className="text-coral-600 hover:bg-coral-50 flex items-center gap-1 rounded-xl px-3 py-2 font-semibold"
                  >
                    <Trash2 className="size-4" aria-hidden /> Supprimer
                  </ConfirmButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
