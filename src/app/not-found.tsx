import { LinkButton } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <Logo />
      <p className="text-brand-600 mt-8 text-6xl font-extrabold">404</p>
      <h1 className="mt-2 text-2xl font-extrabold">Page introuvable</h1>
      <p className="text-muted mt-2 max-w-sm">Cette page n&apos;existe pas ou a été supprimée.</p>
      <LinkButton href="/" className="mt-6">
        Retour à l&apos;accueil
      </LinkButton>
    </main>
  );
}
