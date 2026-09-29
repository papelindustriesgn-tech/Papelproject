import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Clock3, ShieldX, XCircle } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { createPublicClient } from "@/lib/supabase/public";
import { formatDate, initials } from "@/lib/format";

export const metadata: Metadata = { title: "Vérification de carte", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** Page ouverte par le partenaire en scannant le QR code d'une carte Uny. */
export default async function VerifyCardPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const valid = /^[a-f0-9]{36}$/.test(token);
  const supabase = createPublicClient();
  const { data } = valid ? await supabase.rpc("verify_card", { p_token: token }) : { data: null };
  const card = data?.[0];

  const expired = card ? new Date(`${card.expires_at}T23:59:59`) < new Date() : false;
  const ok = card && card.card_status === "active" && card.verification_status === "verified" && !expired;
  const now = new Date().toLocaleString("fr-FR", { timeZone: "Africa/Conakry", dateStyle: "long", timeStyle: "short" });

  return (
    <main className="flex min-h-dvh flex-col items-center bg-canvas px-4 py-8">
      <Link href="/" aria-label="Uny">
        <Logo />
      </Link>
      <div className="mt-6 w-full max-w-sm overflow-hidden rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-float)]">
        {!card ? (
          <div className="p-6 text-center">
            <XCircle className="mx-auto size-16 text-coral-500" aria-hidden />
            <h1 className="mt-3 text-xl font-extrabold">Carte introuvable</h1>
            <p className="mt-2 text-sm text-muted">Ce QR code ne correspond à aucune carte Uny. La carte présentée n&apos;est pas authentique.</p>
          </div>
        ) : (
          <>
            <div className={ok ? "bg-mint-500 p-5 text-center text-white" : card.verification_status === "pending" ? "bg-mango-400 p-5 text-center text-ink" : "bg-coral-500 p-5 text-center text-white"}>
              {ok ? <BadgeCheck className="mx-auto size-12" aria-hidden /> : card.verification_status === "pending" ? <Clock3 className="mx-auto size-12" aria-hidden /> : <ShieldX className="mx-auto size-12" aria-hidden />}
              <h1 className="mt-2 text-xl font-extrabold">
                {ok
                  ? "Étudiant vérifié"
                  : card.card_status === "revoked"
                    ? "Carte désactivée"
                    : expired
                      ? "Carte expirée"
                      : card.verification_status === "pending"
                        ? "Vérification en cours"
                        : "Statut non vérifié"}
              </h1>
              <p className="text-sm opacity-90">{ok ? "Carte authentique et valide" : "Carte authentique, mais avantages non applicables"}</p>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-4">
                <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand-100 text-2xl font-extrabold text-brand-700">
                  {card.avatar_url ? <Image src={card.avatar_url} alt="Photo du titulaire" fill sizes="80px" className="object-cover" /> : initials(card.first_name, card.last_name)}
                </div>
                <div className="min-w-0">
                  <p className="text-lg leading-tight font-extrabold">
                    {card.first_name} {card.last_name}
                  </p>
                  <p className="text-sm text-muted">{card.university ?? "—"}</p>
                  {card.field_of_study && <p className="text-sm text-muted">{card.field_of_study}</p>}
                </div>
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted">Uny ID</dt>
                  <dd className="font-mono font-bold">{card.uny_id}</dd>
                </div>
                <div>
                  <dt className="text-muted">Année</dt>
                  <dd className="font-bold">{card.academic_year}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-muted">Valable jusqu&apos;au</dt>
                  <dd className="font-bold">{formatDate(card.expires_at)}</dd>
                </div>
              </dl>
              <p className="mt-5 rounded-2xl bg-canvas p-3 text-xs text-muted">
                Vérifiez que la photo correspond à la personne qui présente la carte. Contrôle effectué le {now}.
              </p>
            </div>
          </>
        )}
      </div>
      <p className="mt-6 max-w-sm text-center text-xs text-muted">Uny — le passeport étudiant africain. Vous êtes un commerce ? Devenez partenaire.</p>
    </main>
  );
}
