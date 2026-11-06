import Link from "next/link";

export default function RootNotFound() {
  return (
    <main className="container-page flex min-h-screen flex-col items-start justify-center">
      <p className="eyebrow">Erreur 404</p>
      <h1 className="mt-3 text-4xl font-bold text-papel-950">Page introuvable</h1>
      <Link href="/" className="mt-6 font-semibold text-papel-700 underline underline-offset-4">
        Retour à l&apos;accueil
      </Link>
    </main>
  );
}
