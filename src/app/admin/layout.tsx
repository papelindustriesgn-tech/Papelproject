import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: { default: "Administration", template: "%s · Admin Uny" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const supabase = await createClient();
  // Les demandes d'inscription sont traitées par les universités elles-mêmes : pas dans le badge admin
  const [{ count }, { count: bac }, { count: applications }, { count: universities }] = await Promise.all([
    supabase.from("student_verifications").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("bac_verifications").select("id", { count: "exact", head: true }).in("status", ["pending", "manual_review"]),
    supabase.from("partner_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("university_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  return (
    <div className="bg-canvas min-h-dvh">
      <header className="border-line sticky top-0 z-30 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
          <Link href="/admin" className="flex items-center gap-2">
            <Logo className="[&_span]:text-xl [&_svg]:size-7" />
            <span className="bg-ink rounded-lg px-2 py-0.5 text-xs font-bold text-white">Admin</span>
          </Link>
          <span className="text-muted ml-auto hidden truncate text-sm sm:block">
            {admin.first_name} {admin.last_name}
          </span>
          <Link href="/accueil" className="text-brand-600 flex items-center gap-1 text-sm font-semibold">
            <ArrowLeft className="size-4" /> App
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-4 lg:grid lg:grid-cols-[14rem_1fr] lg:gap-8 lg:py-8">
        <aside className="lg:sticky lg:top-22 lg:self-start">
          <AdminNav pending={(count ?? 0) + (bac ?? 0)} applications={applications ?? 0} universities={universities ?? 0} />
        </aside>
        <main className="mt-4 min-w-0 lg:mt-0">{children}</main>
      </div>
    </div>
  );
}
