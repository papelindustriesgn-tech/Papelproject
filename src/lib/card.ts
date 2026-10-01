import "server-only";
import { createClient } from "@/lib/supabase/server";
import { cardVerificationUrl, qrSvg } from "@/lib/qr";
import { universityLabel, type Profile } from "@/lib/auth";
import type { UnyCardData } from "@/components/card/uny-card";

export async function getCardData(profile: Profile) {
  const supabase = await createClient();
  const { data: card } = await supabase
    .from("student_cards")
    .select("uny_id, academic_year, qr_token, status, expires_at")
    .eq("user_id", profile.id)
    .single();

  const url = card ? cardVerificationUrl(card.qr_token) : null;
  const svg = url ? await qrSvg(url) : null;

  const data: UnyCardData = {
    firstName: profile.first_name,
    lastName: profile.last_name,
    photoUrl: profile.avatar_url,
    university: universityLabel(profile),
    fieldOfStudy: profile.field_of_study,
    unyId: card?.uny_id ?? profile.uny_id,
    academicYear: card?.academic_year ?? "—",
    status: card?.status === "revoked" ? "unverified" : profile.verification_status,
    countryCode: profile.country_code,
    qrSvg: svg,
  };
  return { data, card, url, svg };
}
