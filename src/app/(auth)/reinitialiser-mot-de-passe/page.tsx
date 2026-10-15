import type { Metadata } from "next";
import { LinkButton } from "@/components/ui/button";
import { getUser } from "@/lib/auth";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Nouveau mot de passe" };

export default async function ResetPasswordPage() {
  const user = await getUser();
  if (!user) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-extrabold">Lien expiré</h1>
        <p className="text-muted mt-2">Ce lien de réinitialisation n&apos;est plus valide. Fais une nouvelle demande.</p>
        <LinkButton href="/mot-de-passe-oublie" className="mt-6">
          Nouvelle demande
        </LinkButton>
      </div>
    );
  }
  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight">Nouveau mot de passe 🔐</h1>
      <p className="text-muted mt-2">Choisis un mot de passe que tu n&apos;utilises nulle part ailleurs.</p>
      <div className="mt-6">
        <ResetForm />
      </div>
    </>
  );
}
