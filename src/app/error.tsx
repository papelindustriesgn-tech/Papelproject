"use client";

import { useEffect } from "react";
import { Button, LinkButton } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="flex min-h-[60dvh] flex-col items-center justify-center px-4 text-center">
      <p className="text-5xl" aria-hidden>
        😕
      </p>
      <h1 className="mt-4 text-2xl font-extrabold">Oups, un souci est survenu</h1>
      <p className="text-muted mt-2 max-w-sm">Vérifie ta connexion internet puis réessaie.</p>
      <div className="mt-6 flex gap-3">
        <Button onClick={reset}>Réessayer</Button>
        <LinkButton href="/accueil" variant="outline">
          Accueil
        </LinkButton>
      </div>
    </main>
  );
}
