import type { Metadata } from "next";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { PartnerBottomNav, PartnerSidebar } from "@/components/partner/partner-nav";
import { PartnerSwitcher } from "@/components/partner/partner-switcher";
import { requirePartner } from "@/lib/partner";

export const metadata: Metadata = {
  title: { default: "Espace partenaire", template: "%s · Partenaire Uny" },
  robots: { index: false },
};

export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  const { profile, partners, partner } = await requirePartner();
  return (
    <div className="flex min-h-dvh">
      <aside className="border-line sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r bg-white px-4 py-6 lg:flex">
        <Link href="/partenaire" className="mb-2 px-2">
          <Logo />
        </Link>
        <p className="text-brand-700 mb-6 px-2 text-xs font-bold tracking-wide uppercase">Espace partenaire</p>
        <PartnerSidebar />
        <div className="mt-auto space-y-2 px-1">
          {profile.role !== "partner" && (
            <Link href="/accueil" className="text-muted hover:text-ink block px-2 text-sm font-semibold">
              ← Retour à l&apos;espace étudiant
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
            <Link href="/partenaire" className="lg:hidden" aria-label="Accueil partenaire">
              <Logo className="[&_span]:text-xl [&_svg]:size-7" />
            </Link>
            <PartnerSwitcher partners={partners.map((p) => ({ id: p.id, name: p.name }))} current={partner.id} />
            {!partner.is_active && (
              <span className="bg-mango-100 text-mango-700 hidden rounded-full px-2.5 py-1 text-xs font-bold sm:inline">
                Fiche masquée par Uny
              </span>
            )}
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-4 pb-28 lg:pb-12">{children}</main>
      </div>
      <PartnerBottomNav />
    </div>
  );
}
