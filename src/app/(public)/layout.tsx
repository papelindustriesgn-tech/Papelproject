import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { LinkButton } from "@/components/ui/button";
import { SUPPORT_EMAIL } from "@/lib/constants";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <header className="sticky top-0 z-40 border-b border-line/60 bg-white/85 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <Link href="/" aria-label="Uny — accueil" className="mr-auto">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-semibold text-ink/75 md:flex" aria-label="Sections">
            <Link href="/#avantages" className="hover:text-ink">Avantages</Link>
            <Link href="/#carte" className="hover:text-ink">Uny Card</Link>
            <Link href="/#jobs" className="hover:text-ink">Jobs</Link>
            <Link href="/#logement" className="hover:text-ink">Logement</Link>
            <Link href="/#marketplace" className="hover:text-ink">Marketplace</Link>
          </nav>
          <Link href="/connexion" className="px-2 text-sm font-semibold text-ink hover:text-brand-600">
            Connexion
          </Link>
          <LinkButton href="/inscription" size="sm" className="hidden sm:inline-flex">
            Créer mon compte
          </LinkButton>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-line bg-canvas">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[2fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-muted">Le passeport étudiant africain. Être étudiant a ses avantages.</p>
            <p className="mt-3 text-xs text-muted">Version pilote — Conakry, Guinée 🇬🇳</p>
          </div>
          <div className="text-sm">
            <p className="font-bold">Uny</p>
            <ul className="mt-3 space-y-2 text-muted">
              <li><Link href="/inscription" className="hover:text-ink">Créer un compte</Link></li>
              <li><Link href="/connexion" className="hover:text-ink">Se connecter</Link></li>
              <li><a href={`mailto:${SUPPORT_EMAIL}?subject=Devenir%20partenaire%20Uny`} className="hover:text-ink">Devenir partenaire</a></li>
            </ul>
          </div>
          <div className="text-sm">
            <p className="font-bold">Légal</p>
            <ul className="mt-3 space-y-2 text-muted">
              <li><Link href="/conditions" className="hover:text-ink">Conditions d&apos;utilisation</Link></li>
              <li><Link href="/confidentialite" className="hover:text-ink">Confidentialité</Link></li>
              <li><a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-ink">{SUPPORT_EMAIL}</a></li>
            </ul>
          </div>
        </div>
        <p className="border-t border-line py-5 text-center text-xs text-muted">© {new Date().getFullYear()} Uny. Tous droits réservés.</p>
      </footer>
    </div>
  );
}
