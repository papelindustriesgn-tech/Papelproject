import { EmptyState } from "@/components/ui/empty-state";
import { FormMessage } from "@/components/ui/field";
import { EnrollmentItem, type EnrollmentRow } from "@/components/university/enrollment-item";
import { createClient } from "@/lib/supabase/server";
import { requireUniversity } from "@/lib/university";

export const metadata = { title: "Demandes à traiter" };

export default async function RequestsPage() {
  const { university } = await requireUniversity();
  const supabase = await createClient();
  const { data } = await supabase.rpc("university_enrollments", {
    p_university: university.id,
    p_status: ["manual_review", "pending"],
    p_limit: 100,
  });
  const rows = (data ?? []) as EnrollmentRow[];
  const canDecide = university.partner_status === "partner";

  return (
    <div className="animate-fade-up space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Demandes à traiter</h1>
        <p className="text-muted mt-1 text-sm">
          Étudiants qui déclarent être inscrits chez vous. Vérifiez le matricule et l&apos;identité dans votre système avant de
          confirmer : la confirmation active leur carte Uny aux couleurs de l&apos;établissement.
        </p>
      </div>
      {!canDecide && (
        <FormMessage type="info">
          Les décisions seront possibles dès l&apos;approbation de l&apos;établissement par Uny.
        </FormMessage>
      )}
      {rows.length === 0 ? (
        <EmptyState emoji="🎉" title="Aucune demande en attente" text="Les nouvelles demandes apparaîtront ici." />
      ) : (
        <>
          <p className="text-muted text-sm">
            « À examiner » : le rapprochement automatique a trouvé le matricule mais certaines informations diffèrent. Ne
            confirmez qu&apos;après vérification.
          </p>
          <ul className="grid gap-4 xl:grid-cols-2">
            {rows.map((e) => (
              <EnrollmentItem key={e.id} e={e} canDecide={canDecide} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
