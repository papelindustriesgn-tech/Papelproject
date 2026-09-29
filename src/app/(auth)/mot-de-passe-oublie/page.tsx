import type { Metadata } from "next";
import Link from "next/link";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight">Mot de passe oublié ?</h1>
      <p className="text-muted mt-2">
        Indique ton email ou ton numéro : nous t&apos;envoyons un lien pour en choisir un nouveau.
      </p>
      <div className="mt-6">
        <ForgotForm />
      </div>
      <p className="mt-8 text-center text-sm">
        <Link href="/connexion" className="text-brand-600 font-bold hover:underline">
          ← Retour à la connexion
        </Link>
      </p>
    </>
  );
}
