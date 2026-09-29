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
  const { count } = await supabase.from("student_verifications").select("id", { count: "exact", head: true }).eq("status", "pending");

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
          <Link href="/admin" className="flex items-center gap-2">
            <Logo className="[&_span]:text-xl [&_svg]:size-7" />
            <span className="rounded-lg bg-ink px-2 py-0.5 text-xs font-bold text-white">Admin</span>
          </Link>
          <span className="ml-auto hidden truncate text-sm text-muted sm:block">
            {admin.first_name} {admin.last_name}
          </span>
          <Link href="/accueil" className="flex items-center gap-1 text-sm font-semibold text-brand-600">
            <ArrowLeft className="size-4" /> App
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-4 lg:grid lg:grid-cols-[14rem_1fr] lg:gap-8 lg:py-8">
        <aside className="lg:sticky lg:top-22 lg:self-start">
          <AdminNav pending={count ?? 0} />
        </aside>
        <main className="mt-4 min-w-0 lg:mt-0">{children}</main>
      </div>
    </div>
  );
}
