"use client";

import { useTransition } from "react";
import { Landmark } from "lucide-react";
import { switchUniversity } from "@/app/universite/actions";

/** Établissement courant ; menu de choix si la personne gère plusieurs établissements. */
export function UniversitySwitcher({ universities, current }: { universities: { id: number; name: string }[]; current: number }) {
  const [pending, start] = useTransition();
  const name = universities.find((u) => u.id === current)?.name;
  if (universities.length < 2)
    return (
      <p className="text-ink ml-auto flex min-w-0 items-center gap-2 text-sm font-bold lg:ml-0">
        <Landmark className="text-brand-600 size-4 shrink-0" aria-hidden />
        <span className="truncate">{name}</span>
      </p>
    );
  return (
    <label className="ml-auto flex min-w-0 items-center gap-2 text-sm font-bold lg:ml-0">
      <Landmark className="text-brand-600 size-4 shrink-0" aria-hidden />
      <span className="sr-only">Établissement</span>
      <select
        value={current}
        disabled={pending}
        onChange={(e) => start(() => switchUniversity(Number(e.target.value)))}
        className="min-w-0 truncate bg-transparent font-bold outline-none"
      >
        {universities.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
    </label>
  );
}
