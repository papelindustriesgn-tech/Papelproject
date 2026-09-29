export function DemoBanner({ what = "offre" }: { what?: string }) {
  return (
    <div className="bg-ink rounded-2xl px-4 py-3 text-sm text-white">
      <strong>Contenu de démonstration.</strong> Cette {what} est un exemple fictif créé pour présenter Uny pendant la phase
      pilote. Elle ne correspond pas à un partenariat ou à une offre réelle.
    </div>
  );
}
