import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { normalizeTemplate } from "@/lib/card-template";
import { qrSvg } from "@/lib/qr";
import { CardEditor } from "@/app/universite/carte/card-editor";

export const metadata = { title: "Carte de l'université" };

export default async function AdminUniversityCard({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const supabase = await createClient();
  const [{ data: uni }, { data: b }, { data: tpl }] = await Promise.all([
    supabase.from("universities").select("name").eq("id", id).maybeSingle(),
    supabase.from("university_branding").select("*").eq("university_id", id).maybeSingle(),
    supabase
      .from("university_card_templates")
      .select("layout, fields, labels")
      .eq("university_id", id)
      .eq("is_active", true)
      .maybeSingle(),
  ]);
  if (!uni) notFound();
  return (
    <div className="space-y-5">
      <Link href={`/admin/universites/${id}`} className="text-brand-600 inline-flex items-center gap-1 text-sm font-semibold">
        <ArrowLeft className="size-4" /> {uni.name}
      </Link>
      <h1 className="text-2xl font-extrabold tracking-tight">Carte — {uni.name}</h1>
      <CardEditor
        universityId={id}
        uploadPrefix={admin.id}
        initial={{
          name: b?.official_name ?? uni.name,
          logoUrl: b?.logo_url ?? null,
          primary: b?.primary_color ?? "#1e3a8a",
          secondary: b?.secondary_color ?? "#2563eb",
          accent: b?.accent_color ?? "#f59e0b",
        }}
        template={normalizeTemplate(tpl)}
        sample={{
          firstName: "Aïssatou",
          lastName: "Bah",
          photoUrl: null,
          university: uni.name,
          fieldOfStudy: null,
          unyId: "UNY-GN-2026-7K3QXN",
          academicYear: "2026-2027",
          status: "verified",
          countryCode: "GN",
          qrSvg: await qrSvg("https://unyafrica.com/v/exemple"),
          details: {
            faculty: "Faculté des Sciences",
            department: "Informatique",
            program: "Licence Génie logiciel",
            study_level: "Licence 2",
            student_number: "2024-INF-0457",
            academic_year: "2026-2027",
            expires_at: "30 septembre 2027",
          },
        }}
      />
    </div>
  );
}
