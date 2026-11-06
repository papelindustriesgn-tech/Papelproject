import type { Metadata } from "next";
import { Logo } from "@/components/layout/logo";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Connexion administration", robots: { index: false } };

const ERRORS: Record<string, string> = {
  acces: "Ce compte n'a pas accès à l'administration.",
  config: "Supabase n'est pas encore configuré : l'administration est indisponible.",
};

export default async function LoginPage({ searchParams }: PageProps<"/admin/connexion">) {
  const { erreur } = await searchParams;
  const message = typeof erreur === "string" ? ERRORS[erreur] : undefined;
  return (
    <main className="flex min-h-screen items-center justify-center bg-sable px-4 py-12">
      <div className="w-full max-w-sm">
        <Logo className="mx-auto h-10 w-auto" />
        <div className="mt-8 rounded-2xl bg-white p-6 shadow-card ring-1 ring-line sm:p-8">
          <h1 className="text-xl font-bold text-papel-950">Administration</h1>
          <p className="mt-1 text-sm text-muted">Accès réservé à l&apos;équipe Papel Industries.</p>
          {message && (
            <p role="alert" className="mt-4 rounded-xl bg-corail/10 p-3 text-sm font-medium text-corail">
              {message}
            </p>
          )}
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
