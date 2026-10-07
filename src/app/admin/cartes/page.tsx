import Link from "next/link";
import { Paintbrush } from "lucide-react";
import { UnyCard } from "@/components/card/uny-card";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { normalizeTemplate } from "@/lib/card-template";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Cartes personnalisées" };

export default async function CardsAdmin() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: unis }, { data: brandings }, { data: templates }, { data: counts }] = await Promise.all([
    supabase.from("universities").select("id, name, short_name, partner_status").eq("is_active", true).order("name"),
    supabase.from("university_branding").select("*"),
    supabase
      .from("university_card_templates")
      .select("university_id, version, layout, fields, labels, created_at")
      .eq("is_active", true),
    supabase
      .from("profiles")
      .select("university_id")
      .eq("verification_status", "verified")
      .not("university_id", "is", null)
      .limit(10000),
  ]);
  const branding = new Map((brandings ?? []).map((b) => [b.university_id, b]));
  const template = new Map((templates ?? []).map((t) => [t.university_id, t]));
  const students = new Map<number, number>();
  (counts ?? []).forEach((p) => p.university_id && students.set(p.university_id, (students.get(p.university_id) ?? 0) + 1));
  const list = [...(unis ?? [])].sort((a, b) => Number(template.has(b.id)) - Number(template.has(a.id)));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Cartes personnalisées</h1>
        <p className="text-muted text-sm">
          Choisis une université et personnalise sa carte Uny : logo, couleurs, modèle et informations affichées. Dès la
          publication, tous les étudiants <strong>vérifiés</strong> de cet établissement voient la nouvelle carte. Les universités
          partenaires peuvent aussi la modifier elles-mêmes depuis leur portail.
        </p>
      </div>
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {list.map((u) => {
          const b = branding.get(u.id);
          const t = template.get(u.id);
          const n = students.get(u.id) ?? 0;
          return (
            <li key={u.id} className="flex min-w-0 flex-col gap-3 rounded-[var(--radius-card)] bg-white p-4 shadow-[var(--shadow-card)]">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-bold">{u.short_name ?? u.name}</p>
                  <p className="text-muted truncate text-xs">{u.name}</p>
                </div>
                {t ? <Badge tone="mint">Version {t.version}</Badge> : <Badge tone="neutral">Carte standard</Badge>}
              </div>
              <UnyCard
                sample
                data={{
                  firstName: "Aïssatou",
                  lastName: "Bah",
                  photoUrl: null,
                  university: u.name,
                  fieldOfStudy: "Licence Informatique",
                  unyId: "UNY-GN-2026-7K3QXN",
                  academicYear: "2026-2027",
                  status: "verified",
                  countryCode: "GN",
                  branding:
                    b && t
                      ? {
                          name: b.official_name || u.name,
                          logoUrl: b.logo_url,
                          primary: b.primary_color,
                          secondary: b.secondary_color,
                          accent: b.accent_color,
                        }
                      : null,
                  template: t ? normalizeTemplate(t) : null,
                  details: {
                    faculty: "Faculté des Sciences",
                    program: "Licence Informatique",
                    study_level: "Licence 2",
                    academic_year: "2026-2027",
                  },
                }}
              />
              <p className="text-muted text-xs">
                {n} étudiant{n > 1 ? "s" : ""} vérifié{n > 1 ? "s" : ""}
                {t && <> · publiée le {formatDate(t.created_at)}</>}
                {u.partner_status === "suspended" && " · établissement suspendu (carte standard)"}
              </p>
              <Link
                href={`/admin/universites/${u.id}/carte`}
                className="bg-brand-600 hover:bg-brand-700 mt-auto inline-flex h-10 items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-white"
              >
                <Paintbrush className="size-4" aria-hidden /> {t ? "Modifier la carte" : "Personnaliser la carte"}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
