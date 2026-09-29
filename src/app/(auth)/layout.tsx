import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <aside className="uny-pattern bg-brand-700 relative hidden w-[44%] max-w-xl flex-col justify-between overflow-hidden p-10 text-white lg:flex">
        <Link href="/" aria-label="Accueil Uny">
          <Logo light />
        </Link>
        <div>
          <p className="text-4xl leading-tight font-extrabold tracking-tight">
            Ton statut étudiant devient un <span className="text-mango-400">avantage</span>.
          </p>
          <ul className="text-brand-100 mt-8 space-y-3">
            <li>🎫 Carte étudiante digitale avec QR code</li>
            <li>🔥 Réductions chez les partenaires</li>
            <li>💼 Jobs, stages et opportunités</li>
            <li>🏠 Logements étudiants à Conakry</li>
            <li>🛍 Marketplace entre étudiants</li>
          </ul>
        </div>
        <p className="text-brand-200 text-sm">Version pilote — Conakry, Guinée</p>
      </aside>
      <main className="flex flex-1 flex-col">
        <div className="flex h-16 items-center px-4 lg:hidden">
          <Link href="/" aria-label="Accueil Uny">
            <Logo />
          </Link>
        </div>
        <div className="flex flex-1 items-start justify-center px-4 pt-2 pb-12 lg:items-center lg:pt-12">
          <div className="animate-fade-up w-full max-w-md">{children}</div>
        </div>
      </main>
    </div>
  );
}
