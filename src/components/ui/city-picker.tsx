"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MapPin } from "lucide-react";

/** Choix de la ville affichée (toute la Guinée possible). Recharge la liste à la sélection. */
export function CityPicker({ cities, value }: { cities: { slug: string; name: string }[]; value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  return (
    <label className="border-line focus-within:ring-brand-500 relative flex h-11 items-center gap-2 rounded-2xl border bg-white pr-2 pl-3 focus-within:ring-2">
      <MapPin className="text-brand-600 size-4 shrink-0" aria-hidden />
      <span className="sr-only">Ville</span>
      <select
        value={value}
        onChange={(e) => {
          const params = new URLSearchParams(sp.toString());
          params.set("ville", e.target.value);
          params.delete("quartier");
          params.delete("page");
          router.push(`${pathname}?${params.toString()}`, { scroll: false });
        }}
        className="text-ink h-full min-w-0 flex-1 appearance-none bg-transparent text-sm font-semibold outline-none"
      >
        {cities.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.name}
          </option>
        ))}
        <option value="toutes">Toute la Guinée</option>
      </select>
    </label>
  );
}
