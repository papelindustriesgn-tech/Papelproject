"use client";

import { useTransition } from "react";
import { Store } from "lucide-react";
import { switchPartner } from "@/app/partenaire/actions";

/** Nom du partenaire courant ; menu de choix si la personne gère plusieurs établissements. */
export function PartnerSwitcher({ partners, current }: { partners: { id: string; name: string }[]; current: string }) {
  const [pending, start] = useTransition();
  const name = partners.find((p) => p.id === current)?.name;
  if (partners.length < 2)
    return (
      <p className="text-ink ml-auto flex min-w-0 items-center gap-2 text-sm font-bold lg:ml-0">
        <Store className="text-brand-600 size-4 shrink-0" aria-hidden />
        <span className="truncate">{name}</span>
      </p>
    );
  return (
    <label className="ml-auto flex min-w-0 items-center gap-2 text-sm font-bold lg:ml-0">
      <Store className="text-brand-600 size-4 shrink-0" aria-hidden />
      <span className="sr-only">Établissement</span>
      <select
        value={current}
        disabled={pending}
        onChange={(e) => start(() => switchPartner(e.target.value))}
        className="min-w-0 truncate bg-transparent font-bold outline-none"
      >
        {partners.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </label>
  );
}
