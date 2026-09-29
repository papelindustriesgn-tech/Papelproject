import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarCheck, QrCode, ScanLine, Store } from "lucide-react";
import { CardViewer } from "@/components/card/card-viewer";
import { PageTitle } from "@/components/ui/section-header";
import { VerificationBadge } from "@/components/ui/badge";
import { requireProfile } from "@/lib/auth";
import { getCardData } from "@/lib/card";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Ma carte" };

export default async function CardPage() {
  const profile = await requireProfile();
  const { data, card, svg, url } = await getCardData(profile);

  return (
    <div className="animate-fade-up">
      <PageTitle title="Ma carte Uny" subtitle="Ta carte étudiante digitale, toujours dans ta poche." />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,28rem)_1fr]">
        <div>
          <CardViewer data={data} bigQrSvg={svg ?? ""} />
        </div>
        <div className="space-y-4">
          <div className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-bold">Statut</h2>
              <VerificationBadge status={profile.verification_status} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted">Uny ID</dt>
                <dd className="font-mono font-bold">{data.unyId}</dd>
              </div>
              <div>
                <dt className="text-muted">Année universitaire</dt>
                <dd className="font-bold">{data.academicYear}</dd>
              </div>
              <div>
                <dt className="text-muted">Valable jusqu&apos;au</dt>
                <dd className="font-bold">{formatDate(card?.expires_at)}</dd>
              </div>
              <div>
                <dt className="text-muted">Pays</dt>
                <dd className="font-bold">{profile.country_code === "GN" ? "🇬🇳 Guinée" : profile.country_code}</dd>
              </div>
            </dl>
            {url && (
              <p className="text-muted mt-4 text-xs">
                Lien de vérification :{" "}
                <a href={url} className="text-brand-600 font-mono break-all" target="_blank" rel="noopener noreferrer">
                  {url}
                </a>
              </p>
            )}
            {profile.verification_status !== "verified" && (
              <Link
                href="/profil/verification"
                className="bg-mango-50 text-mango-700 hover:bg-mango-100 mt-5 flex items-center justify-between gap-3 rounded-2xl p-4 text-sm font-semibold"
              >
                {profile.verification_status === "pending"
                  ? "Ton justificatif est en cours d'examen. Suivre ma demande"
                  : "Fais vérifier ton statut pour débloquer les réductions"}
                <ArrowRight className="size-4 shrink-0" />
              </Link>
            )}
          </div>
          <div className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
            <h2 className="font-bold">Comment l&apos;utiliser ?</h2>
            <ol className="mt-4 space-y-4 text-sm">
              {[
                { Icon: Store, t: "Chez un partenaire", d: "Choisis ton avantage dans l'onglet Avantages." },
                {
                  Icon: QrCode,
                  t: "Présente ta carte",
                  d: "Appuie sur « Présenter ma carte » : la carte s'affiche en grand avec l'heure en direct.",
                },
                {
                  Icon: ScanLine,
                  t: "Le partenaire scanne",
                  d: "Le QR code confirme que ta carte est authentique et ton statut à jour.",
                },
                { Icon: CalendarCheck, t: "Profite !", d: "La réduction est appliquée selon les conditions de l'offre." },
              ].map(({ Icon, t, d }, i) => (
                <li key={t} className="flex gap-3">
                  <span className="bg-brand-50 text-brand-600 flex size-9 shrink-0 items-center justify-center rounded-xl">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <div>
                    <p className="font-semibold">
                      {i + 1}. {t}
                    </p>
                    <p className="text-muted">{d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
