import Link from "next/link";
import { Carte } from "@/components/ui";

export default function AccesRefuse() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4">
      <Carte titre="Accès refusé">
        <p className="mb-4">Cette page n&apos;est pas accessible avec vos droits. Si vous pensez que c&apos;est une erreur, contactez l&apos;administrateur.</p>
        <Link href="/" className="font-semibold text-papel-700 underline">
          Retour à mon espace
        </Link>
      </Carte>
    </main>
  );
}
