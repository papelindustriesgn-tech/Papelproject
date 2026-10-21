"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Bandeau de confirmation après une action qui fige la page (validation d'une facture, d'une livraison…).
 * L'action redirige vers la page avec « ?succes=… » ; le bandeau s'affiche et peut être fermé.
 */
export function BandeauSucces() {
  const params = useSearchParams();
  const router = useRouter();
  const chemin = usePathname();
  const message = params.get("succes");
  if (!message) return null;
  const fermer = () => {
    const suite = new URLSearchParams(params);
    suite.delete("succes");
    router.replace(suite.size ? `${chemin}?${suite}` : chemin, { scroll: false });
  };
  return (
    <div role="status" className="mb-4 flex items-start justify-between gap-3 rounded border border-green-300 bg-green-50 px-3 py-2 text-green-900 print:hidden">
      <span>✓ {message}</span>
      <button type="button" onClick={fermer} className="min-h-11 px-2 font-semibold underline" aria-label="Fermer le message">
        Fermer
      </button>
    </div>
  );
}

