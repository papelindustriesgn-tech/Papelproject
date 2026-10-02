"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface LienNav {
  href: string;
  libelle: string;
}

/** Menu des espaces : barre horizontale défilante sur mobile, colonne sur grand écran. */
export function Navigation({ liens }: { liens: LienNav[] }) {
  const chemin = usePathname();
  return (
    <nav aria-label="Espaces" className="overflow-x-auto">
      <ul className="flex gap-1 md:flex-col">
        {liens.map((l) => {
          const actif = chemin === l.href || chemin.startsWith(`${l.href}/`);
          return (
            <li key={l.href} className="shrink-0">
              <Link
                href={l.href}
                aria-current={actif ? "page" : undefined}
                className={`block rounded-lg px-3 py-2 font-medium ${
                  actif ? "bg-papel-700 text-white" : "text-papel-900 hover:bg-papel-100"
                }`}
              >
                {l.libelle}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
