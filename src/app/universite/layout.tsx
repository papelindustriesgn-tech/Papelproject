import type { Metadata } from "next";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { UniversityBottomNav, UniversitySidebar } from "@/components/university/university-nav";
import { UniversitySwitcher } from "@/components/university/university-switcher";
import { createClient } from "@/lib/supabase/server";
import { requireUniversity } from "@/lib/university";

export const metadata: Metadata = {
  title: { default: "Portail université", template: "%s · Université · Uny" },
  robots: { index: false },
};

export default async function UniversityLayout({ children }: { children: React.ReactNode }) {
  const { profile, universities, university } = await requireUniversity();
  const supabase = await createClient();
  const { count } = await supabase
    .from("student_enrollments")
    .select("id", { count: "exact", head: true })
    .eq("university_id", university.id)
    .in("status", ["pending", "manual_review"]);
  const pending = count ?? 0;

  return (
    <div className="flex min-h-dvh">
      <aside className="border-line sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r bg-white px-4 py-6 lg:flex">
        <Link href="/universite" className="mb-2 px-2">
          <Logo />
        </Link>
        <p className="text-brand-700 mb-6 px-2 text-xs font-bold tracking-wide uppercase">Portail université</p>
        <UniversitySidebar pending={pending} />
        <div className="mt-auto space-y-2 px-1">
          {profile.role !== "university" && (
            <Link
              href={profile.role === "admin" ? "/admin" : "/accueil"}
              className="text-muted hover:text-ink block px-2 text-sm font-semibold"
            >
              ← Quitter le portail
            </Link>
          )}
          <form action="/auth/deconnexion" method="post">
            <button className="text-muted hover:text-ink flex items-center gap-2 px-2 text-sm font-semibold">
              <LogOut className="size-4" aria-hidden /> Se déconnecter
            </button>
          </form>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-line sticky top-0 z-30 border-b bg-white/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
            <Link href="/universite" className="lg:hidden" aria-label="Accueil du portail">
              <Logo className="[&_span]:text-xl [&_svg]:size-7" />
            </Link>
            <UniversitySwitcher
              universities={universities.map((u) => ({ id: u.id, name: u.short_name ?? u.name }))}
              current={university.id}
            />
            {university.partner_status === "pending" && (
              <span className="bg-mango-100 text-mango-700 hidden rounded-full px-2.5 py-1 text-xs font-bold sm:inline">
                En attente d&apos;approbation Uny
              </span>
            )}
            <Link href="/universite/etablissement" className="text-muted ml-auto text-xs font-semibold lg:hidden">
              Fiche
            </Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-4 pb-28 lg:pb-12">{children}</main>
      </div>
      <UniversityBottomNav pending={pending} />
    </div>
  );
}
