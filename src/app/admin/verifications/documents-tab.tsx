import Image from "next/image";
import Link from "next/link";
import { FileText } from "lucide-react";
import { ReviewForm } from "@/components/admin/review-form";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChips } from "@/components/ui/filters";
import { FormMessage } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/server";
import { DOCUMENT_TYPES } from "@/lib/constants";
import { formatDate, timeAgo } from "@/lib/format";
import { param, type SearchParams } from "@/lib/url";

/** Justificatifs envoyés par les étudiants (vérification manuelle par l'équipe Uny). */
export async function DocumentsTab({ sp }: { sp: SearchParams }) {
  const status = (param(sp, "statut") ?? "pending") as "pending" | "approved" | "rejected";
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_verifications")
    .select(
      "*, profile:profiles!student_verifications_user_id_fkey(id, university_id, first_name, last_name, email, phone, birth_date, field_of_study, study_level, uny_id, university_other, avatar_url, university:universities!profiles_university_id_fkey(name))",
    )
    .eq("status", status)
    .order("created_at", { ascending: status === "pending" })
    .limit(50);
  const rows = data ?? [];

  // Signaux bloquants (la base refuse aussi la validation) : document déjà envoyé par un autre compte,
  // étudiant d'un établissement partenaire (confirmation par l'établissement)
  const hashes = rows.map((r) => r.file_sha256).filter((h): h is string => !!h);
  const [{ data: year }, { data: dupes }, { data: partners }] = await Promise.all([
    supabase.rpc("current_academic_year"),
    hashes.length
      ? supabase.from("student_verifications").select("user_id, file_sha256").in("file_sha256", hashes)
      : Promise.resolve({ data: [] as { user_id: string; file_sha256: string | null }[] }),
    supabase.from("universities").select("id, university_members(user_id)").eq("partner_status", "partner"),
  ]);
  const partnerIds = new Set((partners ?? []).filter((u) => (u.university_members ?? []).length > 0).map((u) => u.id));
  const blockedReason = (r: (typeof rows)[number]) => {
    if (r.file_sha256 && (dupes ?? []).some((d) => d.file_sha256 === r.file_sha256 && d.user_id !== r.user_id))
      return "⚠ Ce document a déjà été envoyé par un autre compte : validation impossible.";
    const uni = (r.profile as { university_id?: number | null } | null)?.university_id;
    if (uni && partnerIds.has(uni))
      return "Établissement partenaire : l'inscription doit être confirmée par l'établissement dans son portail.";
    return null;
  };

  // URLs signées temporaires (5 min) : les justificatifs restent privés
  const signed = new Map<string, string>();
  if (rows.length) {
    const { data: urls } = await supabase.storage.from("verification-docs").createSignedUrls(
      rows.map((r) => r.document_path),
      300,
    );
    urls?.forEach((u) => u.path && u.signedUrl && signed.set(u.path, u.signedUrl));
  }

  return (
    <div className="space-y-5">
      {param(sp, "traite") === "approve" && (
        <FormMessage type="success">Étudiant vérifié ✅ {param(sp, "nom") ?? ""} a été notifié par email.</FormMessage>
      )}
      {param(sp, "traite") === "reject" && (
        <FormMessage type="info">
          Justificatif refusé. {param(sp, "nom") ?? "L'étudiant"} a été notifié avec le motif.
        </FormMessage>
      )}
      <FilterChips
        pathname="/admin/verifications"
        searchParams={{ statut: status === "pending" ? undefined : status, type: param(sp, "type") }}
        name="statut"
        allLabel="En attente"
        options={[
          { value: "approved", label: "Validées" },
          { value: "rejected", label: "Refusées" },
        ]}
      />
      {rows.length === 0 ? (
        <EmptyState emoji="🎉" title={status === "pending" ? "Aucun justificatif en attente" : "Rien à afficher"} />
      ) : (
        <ul className="grid gap-4 xl:grid-cols-2">
          {rows.map((r) => {
            const p = r.profile;
            const url = signed.get(r.document_path);
            const isPdf = r.document_path.endsWith(".pdf");
            return (
              <li key={r.id} className="overflow-hidden rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-card)]">
                <div className="bg-canvas relative aspect-[4/3]">
                  {url && !isPdf ? (
                    <a href={url} target="_blank" rel="noopener noreferrer" aria-label="Ouvrir le justificatif en grand">
                      <Image src={url} alt="Justificatif" fill unoptimized className="object-contain" />
                    </a>
                  ) : url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-600 flex h-full flex-col items-center justify-center gap-2 font-semibold"
                    >
                      <FileText className="size-10" /> Ouvrir le PDF
                    </a>
                  ) : (
                    <p className="text-muted flex h-full items-center justify-center text-sm">Document indisponible</p>
                  )}
                </div>
                <div className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link href={`/admin/utilisateurs/${p?.id}`} className="font-bold hover:underline">
                        {p?.first_name} {p?.last_name}
                      </Link>
                      <p className="text-muted truncate text-sm">{p?.university?.name ?? p?.university_other ?? "—"}</p>
                      <p className="text-muted text-sm">
                        {p?.field_of_study} · {p?.study_level} · né(e) le {formatDate(p?.birth_date)}
                      </p>
                    </div>
                    <Badge tone="neutral">{DOCUMENT_TYPES[r.document_type]}</Badge>
                  </div>
                  <p className="text-muted text-xs">
                    <span className="font-mono">{p?.uny_id}</span> · envoyé {timeAgo(r.created_at)}
                  </p>
                  {r.note && <p className="bg-canvas rounded-xl p-2 text-sm">« {r.note} »</p>}
                  {status === "pending" ? (
                    <ReviewForm id={r.id} academicYear={(year as string | null) ?? ""} blocked={blockedReason(r)} />
                  ) : (
                    <p className="text-sm">
                      {status === "approved" ? "✅ Validé" : `❌ Refusé${r.rejection_reason ? ` — ${r.rejection_reason}` : ""}`}{" "}
                      le {formatDate(r.reviewed_at)}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
