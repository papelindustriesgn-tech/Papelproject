import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import { LinkButton } from "@/components/ui/button";

export const metadata: Metadata = { title: "Hors ligne" };

export default function OfflinePage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
      <WifiOff className="text-brand-600 size-14" aria-hidden />
      <h1 className="mt-4 text-2xl font-extrabold">Pas de connexion</h1>
      <p className="text-muted mt-2">Vérifie ton réseau puis réessaie. Les pages déjà consultées restent disponibles.</p>
      <LinkButton href="/accueil" className="mt-6">
        Réessayer
      </LinkButton>
    </div>
  );
}
