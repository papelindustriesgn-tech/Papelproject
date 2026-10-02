import type { Metadata } from "next";
import Image from "next/image";
import { FormulaireConnexion } from "./formulaire";

export const metadata: Metadata = { title: "Connexion" };

export default function PageConnexion() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-papel-700 px-4 py-8">
      <Image src="/logo-papel.png" alt="Papel" width={200} height={113} priority />
      <div className="mt-6 w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg">
        <h1 className="mb-4 text-xl font-bold text-papel-900">Connexion à Papel ERP</h1>
        <FormulaireConnexion />
        <p className="mt-4 text-sm text-gray-600">Mot de passe oublié ? Demandez à l&apos;administrateur de le réinitialiser.</p>
      </div>
    </main>
  );
}
