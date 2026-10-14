"use client";

import { useState, useTransition } from "react";
import { Users } from "lucide-react";
import { inviteDeclared } from "@/app/universite/annonces/actions";

/** « N de vos étudiants sont déjà sur Uny » + demande de matricule en un clic. */
export function DeclaredStudents({ total, withoutRequest }: { total: number; withoutRequest: number }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]" data-testid="declared-students">
      <h2 className="flex items-center gap-2 font-bold">
        <Users className="text-brand-600 size-5" aria-hidden />
        {total} de vos étudiants {total > 1 ? "sont" : "est"} déjà sur Uny
      </h2>
      <p className="text-muted mt-1 text-sm">
        {withoutRequest > 0
          ? `${withoutRequest} n'${withoutRequest > 1 ? "ont" : "a"} pas encore envoyé de demande de confirmation. Demandez-leur leur matricule : leurs demandes arriveront dans « Demandes à traiter ».`
          : "Tous ont déjà envoyé leur demande de confirmation."}
      </p>
      {withoutRequest > 0 && (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await inviteDeclared();
              setMessage(r.message ?? r.error ?? null);
            })
          }
          className="bg-brand-600 mt-3 rounded-full px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
        >
          {pending ? "Envoi…" : "Leur demander leur matricule"}
        </button>
      )}
      {message && <p className="mt-2 text-sm font-semibold">{message}</p>}
    </section>
  );
}
