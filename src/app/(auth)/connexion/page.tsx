import type { Metadata } from "next";
import Link from "next/link";
import { FormMessage } from "@/components/ui/field";
import { LoginForm } from "./login-form";
import { ClearPageCache } from "@/components/pwa/clear-cache";
import { param, type SearchParams } from "@/lib/url";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const next = param(sp, "next") ?? "/accueil";
  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight">Content de te revoir 👋</h1>
      <p className="text-muted mt-2">Connecte-toi avec ton email ou ton numéro de téléphone.</p>
      <div className="mt-6 space-y-4">
        {param(sp, "deconnecte") && (
          <>
            <ClearPageCache />
            <FormMessage type="info">Tu es bien déconnecté. À bientôt !</FormMessage>
          </>
        )}
        {param(sp, "supprime") && (
          <>
            <ClearPageCache />
            <FormMessage type="info">Ton compte et tes données ont été supprimés. Merci d&apos;avoir utilisé Uny.</FormMessage>
          </>
        )}
        {param(sp, "confirme") && <FormMessage type="success">Email confirmé ! Tu peux te connecter.</FormMessage>}
        {param(sp, "erreur") === "lien" && (
          <FormMessage>Ce lien est invalide ou a expiré. Réessaie ou demande un nouveau lien.</FormMessage>
        )}
        <LoginForm next={next} />
      </div>
      <p className="text-muted mt-8 text-center text-sm">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="text-brand-600 font-bold hover:underline">
          Créer mon compte gratuitement
        </Link>
      </p>
    </>
  );
}
