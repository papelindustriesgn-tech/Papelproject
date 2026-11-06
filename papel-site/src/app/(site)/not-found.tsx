import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="container-page flex min-h-[60vh] flex-col items-start justify-center py-20">
      <p className="eyebrow">Erreur 404</p>
      <h1 className="mt-3 text-4xl font-bold text-papel-950 sm:text-5xl">Cette page est introuvable</h1>
      <p className="mt-4 max-w-xl text-lg text-muted">Elle a peut-être été déplacée ou n&apos;existe plus.</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <ButtonLink href="/" size="lg">
          Retour à l&apos;accueil
        </ButtonLink>
        <ButtonLink href="/produits" size="lg" variant="secondary">
          Nos produits
        </ButtonLink>
      </div>
    </section>
  );
}
