"use client";

import { useActionState, useState } from "react";
import { Check, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormMessage, Input } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { SIGNUP_FLAGS } from "@/lib/signup-review";
import { reviewSignups, type ReviewState } from "./actions";

export type SignupRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  university: string;
  details: string;
  created: string;
  status: "pending" | "approved" | "rejected";
  flags: string[];
};

const STATUS = {
  pending: { label: "En attente", tone: "bg-mango-50 text-mango-700" },
  approved: { label: "Validé", tone: "bg-mint-50 text-mint-700" },
  rejected: { label: "Refusé", tone: "bg-coral-50 text-coral-600" },
} as const;

export function ReviewList({ rows }: { rows: SignupRow[] }) {
  const [state, action, pending] = useActionState<ReviewState, FormData>(reviewSignups, {});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  // Après une décision, la liste est rechargée : seuls les comptes encore affichés restent sélectionnés
  const visible = rows.filter((r) => selected.has(r.id)).map((r) => r.id);
  const all = rows.length > 0 && visible.length === rows.length;

  return (
    <form action={action} className="space-y-3">
      {visible.map((id) => (
        <input key={id} type="hidden" name="ids" value={id} />
      ))}
      {state.error && <FormMessage>{state.error}</FormMessage>}
      {state.ok && <FormMessage type="success">{state.message}</FormMessage>}

      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-2xl bg-white p-3 shadow-[var(--shadow-card)]">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={all}
            onChange={() => setSelected(all ? new Set() : new Set(rows.map((r) => r.id)))}
            className="accent-brand-600 size-5"
          />
          {visible.length
            ? `${visible.length} sélectionné${visible.length > 1 ? "s" : ""}`
            : `Tout sélectionner (${rows.length})`}
        </label>
        <Input name="note" placeholder="Motif (facultatif, envoyé en cas de refus)" className="h-10 min-w-0 flex-1 basis-48" maxLength={300} />
        <div className="flex gap-2">
          <Button type="submit" name="decision" value="approved" size="sm" disabled={!visible.length || pending}>
            <Check className="size-4" /> Valider
          </Button>
          <Button type="submit" name="decision" value="rejected" size="sm" variant="danger" disabled={!visible.length || pending}>
            <X className="size-4" /> Refuser
          </Button>
          <Button type="submit" name="decision" value="pending" size="sm" variant="outline" disabled={!visible.length || pending}>
            <RotateCcw className="size-4" /> En attente
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted rounded-[var(--radius-card)] bg-white p-8 text-center shadow-[var(--shadow-card)]">
          Aucune inscription dans cette liste.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id}>
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-2xl bg-white p-4 shadow-[var(--shadow-card)] ring-2 transition",
                  selected.has(r.id) ? "ring-brand-500" : "ring-transparent",
                )}
              >
                <input
                  type="checkbox"
                  checked={selected.has(r.id)}
                  onChange={() => toggle(r.id)}
                  className="accent-brand-600 mt-1 size-5 shrink-0"
                  aria-label={`Sélectionner ${r.name}`}
                />
                <div className="min-w-0 flex-1 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold">{r.name}</span>
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", STATUS[r.status].tone)}>
                      {STATUS[r.status].label}
                    </span>
                    {r.flags.map((f) => (
                      <span
                        key={f}
                        title={SIGNUP_FLAGS[f]?.hint}
                        className="bg-coral-500 rounded-full px-2 py-0.5 text-xs font-bold text-white"
                      >
                        ⚠ {SIGNUP_FLAGS[f]?.label ?? f}
                      </span>
                    ))}
                  </div>
                  <p className="text-muted mt-0.5 break-all">
                    {r.email ?? "—"} · {r.phone ?? "—"}
                  </p>
                  <p className="text-muted">
                    {r.university} · {r.details}
                  </p>
                  <p className="text-muted/80 text-xs">Inscrit {r.created}</p>
                </div>
              </label>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
