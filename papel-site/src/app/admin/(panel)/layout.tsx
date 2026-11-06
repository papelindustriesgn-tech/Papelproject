import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, LogOut } from "lucide-react";
import { signOut } from "@/app/admin/actions";
import { AdminNav } from "@/components/admin/admin-nav";
import { Logo } from "@/components/layout/logo";
import { requireAdmin } from "@/lib/admin";

// Toujours rendu à la demande : contenu privé, jamais mis en cache.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Administration", template: "%s | Admin Papel" },
  robots: { index: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { email } = await requireAdmin();
  return (
    <div className="min-h-screen bg-sable lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="bg-papel-950 px-4 py-4 text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:py-6">
        <div className="mb-4 flex items-center justify-between lg:mb-8 lg:block">
          <Link href="/admin" aria-label="Tableau de bord">
            <Logo tone="white" className="h-7 w-auto" />
          </Link>
          <form action={signOut} className="lg:hidden">
            <button className="inline-flex items-center gap-2 text-sm text-white/75 hover:text-white">
              <LogOut className="size-4" aria-hidden /> Déconnexion
            </button>
          </form>
        </div>
        <AdminNav />
        <div className="mt-auto hidden space-y-3 border-t border-white/10 pt-4 text-sm lg:block">
          <p className="truncate text-white/55" title={email}>
            {email}
          </p>
          <Link href="/" target="_blank" className="flex items-center gap-2 text-white/75 hover:text-white">
            <ExternalLink className="size-4" aria-hidden /> Voir le site
          </Link>
          <form action={signOut}>
            <button className="flex items-center gap-2 text-white/75 hover:text-white">
              <LogOut className="size-4" aria-hidden /> Déconnexion
            </button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 px-4 py-8 sm:px-8 lg:px-10">{children}</main>
    </div>
  );
}
