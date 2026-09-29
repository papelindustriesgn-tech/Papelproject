import { Info } from "lucide-react";

export function DemoNotice({ className }: { className?: string }) {
  return (
    <p className={`text-muted ring-line flex items-start gap-2 rounded-2xl bg-white px-4 py-3 text-xs ring-1 ${className ?? ""}`}>
      <Info className="text-brand-500 mt-px size-4 shrink-0" aria-hidden />
      <span>
        <strong className="text-ink">Version pilote.</strong> Les contenus marqués « Démo » sont des exemples fictifs destinés à
        la démonstration : il ne s&apos;agit pas d&apos;offres ou de partenariats réels.
      </span>
    </p>
  );
}
