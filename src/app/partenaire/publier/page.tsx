import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PARTNER_ENTITIES, type PartnerKind } from "@/lib/partner-entities";

export const metadata = { title: "Publier" };

export default function PublishHub() {
  return (
    <div className="animate-fade-up mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Publier pour les étudiants</h1>
        <p className="text-muted text-sm">Choisis ce que tu veux proposer.</p>
      </div>
      <ul className="space-y-3">
        {(Object.keys(PARTNER_ENTITIES) as PartnerKind[]).map((k) => (
          <li key={k}>
            <Link
              href={`/partenaire/${k}`}
              className="hover:ring-brand-200 flex items-center gap-4 rounded-[var(--radius-card)] bg-white p-4 shadow-[var(--shadow-card)] ring-1 ring-transparent transition"
            >
              <span className="bg-brand-50 flex size-12 shrink-0 items-center justify-center rounded-2xl text-2xl" aria-hidden>
                {PARTNER_ENTITIES[k].emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{PARTNER_ENTITIES[k].plural}</span>
                <span className="text-muted line-clamp-2 block text-sm">{PARTNER_ENTITIES[k].intro}</span>
              </span>
              <ChevronRight className="text-muted size-5 shrink-0" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
