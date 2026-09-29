import { Info } from "lucide-react";

export function DemoNotice({ className }: { className?: string }) {
  return (
    <p className={`flex items-start gap-2 rounded-2xl bg-white px-4 py-3 text-xs text-muted ring-1 ring-line ${className ?? ""}`}>
      <Info className="mt-px size-4 shrink-0 text-brand-500" aria-hidden />
      <span>
        <strong className="text-ink">Version pilote.</strong> Les contenus marqués « Démo » sont des exemples fictifs destinés à la
        démonstration : il ne s&apos;agit pas d&apos;offres ou de partenariats réels.
      </span>
    </p>
  );
}
