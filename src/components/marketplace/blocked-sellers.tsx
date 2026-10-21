"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { unblockUser } from "@/app/(app)/marketplace/moderation-actions";

/** Vendeurs bloqués par l'étudiant, avec possibilité de les débloquer. */
export function BlockedSellers({ sellers }: { sellers: { id: string; name: string }[] }) {
  const [list, setList] = useState(sellers);
  const [pending, start] = useTransition();
  if (!list.length) return null;
  return (
    <section className="mt-8 rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
      <h2 className="font-bold">Vendeurs bloqués</h2>
      <p className="text-muted mb-3 text-sm">Vous ne voyez plus les annonces l&apos;un de l&apos;autre.</p>
      <ul className="divide-line divide-y">
        {list.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span className="font-semibold">{s.name}</span>
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await unblockUser(s.id);
                  setList((l) => l.filter((x) => x.id !== s.id));
                })
              }
            >
              Débloquer
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
