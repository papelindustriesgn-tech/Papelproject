import "server-only";
import { createClient } from "@/lib/supabase/server";
import { cardVerificationUrl, qrSvg } from "@/lib/qr";
import { universityLabel, type Profile } from "@/lib/auth";
import { getUniversityCardConfig } from "@/lib/university";
import { formatDate } from "@/lib/format";
import type { CardDisplayStatus, UnyCardData } from "@/components/card/uny-card";

export async function getCardData(profile: Profile) {
  const supabase = await createClient();
  const { data: card } = await supabase
    .from("student_cards")
    .select(
      "uny_id, academic_year, qr_token, status, expires_at, enrollment:student_enrollments(university_id, student_number, faculty, department, program, study_level, academic_year, status)",
    )
    .eq("user_id", profile.id)
    .single();

  const url = card ? cardVerificationUrl(card.qr_token) : null;
  const svg = url ? await qrSvg(url) : null;

  // Carte aux couleurs de l'université pour un étudiant vérifié (inscription confirmée ou justificatif validé)
  const enrollment = card?.enrollment?.status === "verified" ? card.enrollment : null;
  const universityId =
    enrollment?.university_id ?? (profile.verification_status === "verified" ? profile.university_id : null);
  const config = await getUniversityCardConfig(universityId);

  const status: CardDisplayStatus =
    card?.status === "revoked"
      ? "revoked"
      : card?.status === "expired" || (card && card.expires_at < new Date().toISOString().slice(0, 10))
        ? "expired"
        : profile.verification_status;

  const data: UnyCardData = {
    firstName: profile.first_name,
    lastName: profile.last_name,
    photoUrl: profile.avatar_url,
    university: universityLabel(profile),
    fieldOfStudy: enrollment?.program ?? profile.field_of_study,
    unyId: card?.uny_id ?? profile.uny_id,
    academicYear: card?.academic_year ?? "—",
    status,
    countryCode: profile.country_code,
    qrSvg: svg,
    branding: config?.branding ?? null,
    template: config?.template ?? null,
    details: {
      faculty: enrollment?.faculty ?? null,
      department: enrollment?.department ?? null,
      program: enrollment?.program ?? profile.field_of_study,
      study_level: enrollment?.study_level ?? profile.study_level,
      student_number: enrollment?.student_number ?? null,
      academic_year: enrollment?.academic_year ?? card?.academic_year ?? null,
      expires_at: card ? formatDate(card.expires_at) : null,
    },
  };
  return { data, card, url, svg };
}
