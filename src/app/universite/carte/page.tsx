import { createClient } from "@/lib/supabase/server";
import { requireUniversity } from "@/lib/university";
import { qrSvg } from "@/lib/qr";
import { formatDate } from "@/lib/format";
import { CARD_LAYOUTS, normalizeTemplate, type CardBranding } from "@/lib/card-template";
import { CardEditor } from "./card-editor";

export const metadata = { title: "Carte de l'université" };

export default async function UniversityCardPage() {
  const { profile, university } = await requireUniversity();
  const supabase = await createClient();
  const [{ data: branding }, { data: versions }] = await Promise.all([
    supabase.from("university_branding").select("*").eq("university_id", university.id).maybeSingle(),
    supabase
      .from("university_card_templates")
      .select("id, version, layout, fields, labels, is_active, created_at")
      .eq("university_id", university.id)
      .order("version", { ascending: false })
      .limit(10),
  ]);
  const active = versions?.find((v) => v.is_active) ?? null;
  const initial: CardBranding = {
    name: branding?.official_name ?? university.name,
    logoUrl: branding?.logo_url ?? null,
    primary: branding?.primary_color ?? "#1e3a8a",
    secondary: branding?.secondary_color ?? "#2563eb",
    accent: branding?.accent_color ?? "#f59e0b",
  };
  const year = new Date().getMonth() >= 9 ? new Date().getFullYear() : new Date().getFullYear() - 1;

  return (
    <div className="animate-fade-up space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Carte de l&apos;université</h1>
        <p className="text-muted mt-1 text-sm">
          Personnalisez la carte Uny de vos étudiants. Chaque publication crée une nouvelle version, appliquée immédiatement à
          toutes les cartes confirmées par l&apos;établissement.
        </p>
      </div>
      <CardEditor
        universityId={university.id}
        initial={initial}
        template={normalizeTemplate(active)}
        uploadPrefix={profile.id}
        sample={{
          firstName: "Aïssatou",
          lastName: "Bah",
          photoUrl: null,
          university: university.name,
          fieldOfStudy: null,
          unyId: "UNY-GN-2026-7K3QXN",
          academicYear: `${year}-${year + 1}`,
          status: "verified",
          countryCode: "GN",
          qrSvg: await qrSvg("https://unyafrica.com/v/exemple"),
          details: {
            faculty: university.short_name ? `Faculté des Sciences · ${university.short_name}` : "Faculté des Sciences",
            department: "Informatique",
            program: "Licence Génie logiciel",
            study_level: "Licence 2",
            student_number: "2024-INF-0457",
            academic_year: `${year}-${year + 1}`,
            expires_at: formatDate(`${year + 1}-09-30`),
          },
        }}
      />
      {versions && versions.length > 0 && (
        <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
          <h2 className="mb-3 font-bold">Historique des versions</h2>
          <ul className="divide-line divide-y text-sm">
            {versions.map((v) => (
              <li key={v.id} className="flex justify-between gap-3 py-2">
                <span>
                  Version {v.version} · {CARD_LAYOUTS[v.layout as keyof typeof CARD_LAYOUTS]?.label ?? v.layout} ·{" "}
                  {v.fields.length} champ{v.fields.length > 1 ? "s" : ""}
                  {v.is_active && <span className="text-mint-700 ml-2 font-bold">En ligne</span>}
                </span>
                <span className="text-muted">{formatDate(v.created_at)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
