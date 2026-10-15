import { Clock, LogOut, Mail, ShieldX } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { SUPPORT_EMAIL } from "@/lib/constants";

/** Écran affiché aux étudiants tant que leur inscription n'est pas validée par l'équipe Uny. */
export function PendingAccount({
  firstName,
  status,
  note,
}: {
  firstName: string;
  status: "pending" | "rejected";
  note: string | null;
}) {
  const rejected = status === "rejected";
  return (
    <div className="bg-canvas flex min-h-dvh flex-col items-center px-4 py-10">
      <Logo />
      <section className="mt-8 w-full max-w-md rounded-[var(--radius-card)] bg-white p-6 text-center shadow-[var(--shadow-card)]">
        <span
          className={`mx-auto flex size-14 items-center justify-center rounded-2xl ${rejected ? "bg-coral-50 text-coral-600" : "bg-mango-50 text-mango-700"}`}
        >
          {rejected ? <ShieldX className="size-7" aria-hidden /> : <Clock className="size-7" aria-hidden />}
        </span>
        <h1 className="mt-4 text-xl font-extrabold">
          {rejected ? "Inscription non validée" : `Merci ${firstName}, ton inscription est bien reçue !`}
        </h1>
        <p className="text-muted mt-2 text-sm leading-relaxed">
          {rejected
            ? (note ?? "Ton inscription n'a pas pu être validée. Si c'est une erreur, écris-nous : on regarde ça rapidement.")
            : "L'équipe Uny vérifie chaque inscription pour garantir que seuls de vrais étudiants profitent des avantages. Tu recevras une notification dès que ton compte sera validé, en général sous 24 à 48 h."}
        </p>
        {!rejected && (
          <ul className="bg-canvas mt-5 space-y-2 rounded-2xl p-4 text-left text-sm">
            <li>🪪 Ta carte étudiante Uny, vérifiée et dans ton téléphone</li>
            <li>🎟️ Des codes promo chez les commerçants partenaires</li>
            <li>🟠 Le paiement direct avec Orange Money</li>
          </ul>
        )}
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="text-brand-600 mt-5 inline-flex items-center gap-2 text-sm font-semibold"
        >
          <Mail className="size-4" aria-hidden /> {SUPPORT_EMAIL}
        </a>
      </section>
      <form action="/auth/deconnexion" method="post" className="mt-6">
        <button className="text-muted hover:text-ink flex items-center gap-2 text-sm font-semibold">
          <LogOut className="size-4" aria-hidden /> Se déconnecter
        </button>
      </form>
    </div>
  );
}
