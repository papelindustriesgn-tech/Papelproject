import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { LinkButton } from "@/components/ui/button";
import { SUPPORT_EMAIL } from "@/lib/constants";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <header className="border-line/60 sticky top-0 z-40 border-b bg-white/85 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <Link href="/" aria-label="Uny — accueil" className="mr-auto">
            <Logo />
          </Link>
          <nav className="text-ink/75 hidden items-center gap-6 text-sm font-semibold md:flex" aria-label="Sections">
            <Link href="/#pourquoi" className="hover:text-ink">
              Pourquoi Uny
            </Link>
            <Link href="/#avantages" className="hover:text-ink">
              Avantages
            </Link>
            <Link href="/partenaires" className="hover:text-ink">
              Commerçants
            </Link>
            <Link href="/universites" className="hover:text-ink">
              Universités
            </Link>
          </nav>
          <Link href="/connexion" className="text-ink hover:text-brand-600 px-2 text-sm font-semibold">
            Connexion
          </Link>
          <LinkButton href="/inscription" size="sm" className="hidden sm:inline-flex">
            Créer mon compte
          </LinkButton>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-line bg-canvas border-t">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[2fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="text-muted mt-3 max-w-xs text-sm">Le passeport étudiant africain. Être étudiant a ses avantages.</p>
            <p className="text-muted mt-3 text-xs">Disponible dans toute la Guinée 🇬🇳</p>
          </div>
          <div className="text-sm">
            <p className="font-bold">Uny</p>
            <ul className="text-muted mt-3 space-y-2">
              <li>
                <Link href="/inscription" className="hover:text-ink">
                  Créer un compte
                </Link>
              </li>
              <li>
                <Link href="/connexion" className="hover:text-ink">
                  Se connecter
                </Link>
              </li>
              <li>
                <Link href="/partenaires" className="hover:text-ink">
                  Devenir partenaire
                </Link>
              </li>
              <li>
                <Link href="/universites" className="hover:text-ink">
                  Universités partenaires
                </Link>
              </li>
            </ul>
          </div>
          <div className="text-sm">
            <p className="font-bold">Légal</p>
            <ul className="text-muted mt-3 space-y-2">
              <li>
                <Link href="/conditions" className="hover:text-ink">
                  Conditions d&apos;utilisation
                </Link>
              </li>
              <li>
                <Link href="/confidentialite" className="hover:text-ink">
                  Confidentialité
                </Link>
              </li>
              <li>
                <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-ink">
                  {SUPPORT_EMAIL}
                </a>
              </li>
            </ul>
          </div>
        </div>
        <p className="border-line text-muted border-t py-5 text-center text-xs">
          © {new Date().getFullYear()} Uny. Tous droits réservés.
        </p>
      </footer>
    </div>
  );
}
