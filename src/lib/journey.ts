import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { Profile } from "@/lib/auth";

/** Parcours étudiant affiché sur l'accueil : Inscription → Vérification → Carte → Utilisation. */
export const JOURNEY_STEPS = ["Inscription", "Vérification", "Carte", "Utilisation"] as const;

export type NextStep = {
  title: string;
  body: string;
  href: string | null;
  cta: string | null;
  tone: "brand" | "mango" | "mint";
};

export type Journey = {
  /** Index de l'étape en cours (0 à 3) ; 4 quand tout est fait. */
  current: number;
  next: NextStep;
  /** Total économisé avec les codes promo validés, en GNF. */
  savedGnf: number;
  usedCodes: number;
};

/** Informations demandées au moment de la vérification (et plus à l'inscription). */
export function missingProfileFields(p: Pick<Profile, "phone" | "birth_date" | "field_of_study" | "study_level">) {
  return (["phone", "birth_date", "field_of_study", "study_level"] as const).filter((k) => !p[k]);
}

export async function getJourney(supabase: SupabaseClient<Database>, profile: Profile): Promise<Journey> {
  const [{ data: codes }, { count: waitingEnrollments }] = await Promise.all([
    supabase
      .from("promo_codes")
      .select("status, amount_gnf, deal:deals(price_gnf, promo_price_gnf)")
      .eq("student_id", profile.id)
      .limit(500),
    supabase
      .from("student_enrollments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .in("status", ["pending", "manual_review"]),
  ]);

  const used = (codes ?? []).filter((c) => c.status === "used");
  const savedGnf = used.reduce((sum, c) => {
    const normal = c.deal?.price_gnf;
    const paid = c.amount_gnf ?? c.deal?.promo_price_gnf;
    return normal != null && paid != null && normal > paid ? sum + (normal - paid) : sum;
  }, 0);

  const verified = profile.verification_status === "verified";
  const waiting = profile.verification_status === "pending" || (waitingEnrollments ?? 0) > 0;
  const hasCodes = (codes ?? []).length > 0;

  let current: number;
  let next: NextStep;
  if (!verified && waiting) {
    current = 1;
    next = {
      title: "Vérification en cours ⏳",
      body: "Nous examinons ta demande, en général sous 48 h. Tu recevras une notification.",
      href: "/avantages",
      cta: "Voir les offres en attendant",
      tone: "mango",
    };
  } else if (!verified) {
    current = 1;
    const incomplete = missingProfileFields(profile).length > 0;
    next = {
      title: "Fais vérifier ton statut étudiant",
      body: incomplete
        ? "2 minutes : complète ton profil puis envoie ta carte d'étudiant ou ton attestation."
        : "Envoie ta carte d'étudiant ou ton attestation pour débloquer les réductions.",
      href: "/profil/verification",
      cta: "Commencer",
      tone: "brand",
    };
  } else if (!hasCodes) {
    current = 3;
    next = {
      title: "Obtiens ton premier code promo 🎉",
      body: "Ta carte est prête. Choisis une offre et montre ton code au partenaire.",
      href: "/avantages",
      cta: "Voir les offres",
      tone: "mint",
    };
  } else {
    current = 4;
    next = {
      title: "Présente ta carte Uny",
      body: "Chez un partenaire, ouvre ta carte ou ton code promo et montre-le à la caisse.",
      href: "/carte",
      cta: "Ouvrir ma carte",
      tone: "mint",
    };
  }
  return { current, next, savedGnf, usedCodes: used.length };
}
