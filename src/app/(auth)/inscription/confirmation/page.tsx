import type { Metadata } from "next";
import { MailCheck } from "lucide-react";
import { ResendForm } from "./resend-form";
import { param, type SearchParams } from "@/lib/url";

export const metadata: Metadata = { title: "Confirme ton email" };

export default async function ConfirmationPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const email = param(await searchParams, "email") ?? "";
  return (
    <div className="rounded-[var(--radius-card)] bg-white p-6 text-center shadow-[var(--shadow-card)]">
      <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        <MailCheck className="size-8" aria-hidden />
      </div>
      <h1 className="text-2xl font-extrabold tracking-tight">Vérifie ta boîte mail 📬</h1>
      <p className="mt-3 text-muted">
        Nous avons envoyé un lien de confirmation à <strong className="break-all text-ink">{email || "ton adresse"}</strong>.
        Clique dessus pour activer ton compte Uny.
      </p>
      <p className="mt-2 text-sm text-muted">Pense à regarder dans les spams.</p>
      <ResendForm email={email} />
    </div>
  );
}
