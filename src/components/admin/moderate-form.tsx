"use client";

import { useActionState } from "react";
import { moderateItem } from "@/app/admin/actions";

export function ModerateForm({ id, status }: { id: string; status: string }) {
  const [state, action, pending] = useActionState(moderateItem, {});
  const btn = "h-9 rounded-xl px-3 text-sm font-semibold ring-1 ring-line bg-white hover:ring-brand-300 disabled:opacity-50";
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      {status !== "removed" ? (
        <>
          <input
            name="note"
            placeholder="Motif du retrait"
            aria-label="Motif du retrait"
            className="border-line h-9 min-w-0 flex-1 rounded-xl border px-3 text-sm"
          />
          <button name="action" value="remove" className={`${btn} text-coral-600`} disabled={pending}>
            Retirer
          </button>
        </>
      ) : (
        <button name="action" value="restore" className={btn} disabled={pending}>
          Rétablir
        </button>
      )}
      <button
        name="action"
        value="delete"
        className={`${btn} text-coral-600`}
        disabled={pending}
        onClick={(e) => {
          if (!confirm("Supprimer définitivement cette annonce ?")) e.preventDefault();
        }}
      >
        Supprimer
      </button>
      {state.error && <p className="text-coral-600 w-full text-sm">{state.error}</p>}
    </form>
  );
}
