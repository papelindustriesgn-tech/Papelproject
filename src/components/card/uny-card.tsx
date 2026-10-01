import Image from "@/components/ui/safe-image";
import { BadgeCheck, Clock3, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";
import { safeImage } from "@/lib/images";
import type { VerificationStatus } from "@/lib/constants";

export type UnyCardData = {
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  university: string;
  fieldOfStudy: string | null;
  unyId: string;
  academicYear: string;
  status: VerificationStatus;
  countryCode: string;
  qrSvg?: string | null;
};

const statusUi: Record<VerificationStatus, { label: string; cls: string; Icon: typeof BadgeCheck }> = {
  verified: { label: "Étudiant vérifié", cls: "bg-mint-500 text-white", Icon: BadgeCheck },
  pending: { label: "Vérification en cours", cls: "bg-mango-400 text-ink", Icon: Clock3 },
  unverified: { label: "Non vérifié", cls: "bg-white/20 text-white", Icon: ShieldAlert },
};

/**
 * Carte étudiante Uny. Toutes les tailles sont en unités de conteneur (cqw)
 * pour que la carte garde ses proportions de 280 px à 480 px de large.
 */
export function UnyCard({ data, className, sample = false }: { data: UnyCardData; className?: string; sample?: boolean }) {
  const s = statusUi[data.status];
  return (
    <div className={cn("[container-type:inline-size] w-full", className)}>
      <div
        className="uny-pattern from-brand-800 via-brand-700 to-brand-500 relative aspect-[1.586] w-full overflow-hidden rounded-[5cqw] bg-gradient-to-br text-white shadow-[var(--shadow-float)]"
        role="img"
        aria-label={`Carte Uny de ${data.firstName} ${data.lastName}, ${data.unyId}, ${s.label}`}
      >
        <div className="absolute inset-0 flex flex-col px-[6cqw] pt-[5.5cqw] pb-[5cqw]">
          {/* Ligne supérieure */}
          <div className="flex items-center justify-between gap-[2cqw]">
            <div className="flex min-w-0 items-baseline gap-[1.5cqw]">
              <span className="text-[7.5cqw] leading-none font-extrabold tracking-tight">
                uny<span className="text-mango-400">.</span>
              </span>
              <span className="truncate text-[2.6cqw] font-semibold tracking-[0.18em] text-white/70 uppercase">Student pass</span>
            </div>
            <div className="flex shrink-0 items-center gap-[1.5cqw]">
              {sample && (
                <span className="bg-mango-400 text-ink rounded-full px-[2.4cqw] py-[1cqw] text-[2.5cqw] font-extrabold tracking-wider uppercase">
                  Exemple
                </span>
              )}
              <span className="rounded-full bg-white/15 px-[2.4cqw] py-[1cqw] text-[2.8cqw] font-bold tracking-wider">
                {data.countryCode}
              </span>
            </div>
          </div>

          {/* Identité + QR */}
          <div className="flex min-h-0 flex-1 items-center gap-[3.5cqw]">
            <div className="relative size-[17cqw] shrink-0 overflow-hidden rounded-[3.5cqw] bg-white/20 ring-[0.6cqw] ring-white/40">
              {safeImage(data.photoUrl) ? (
                <Image src={data.photoUrl!} alt="" fill sizes="96px" className="object-cover" />
              ) : (
                <span className="flex h-full items-center justify-center text-[6cqw] font-extrabold">
                  {initials(data.firstName, data.lastName)}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[5cqw] leading-tight font-extrabold">{data.firstName}</p>
              <p className="truncate text-[5cqw] leading-tight font-extrabold uppercase">{data.lastName}</p>
              <p className="mt-[0.8cqw] line-clamp-2 text-[2.8cqw] leading-snug text-white/80">{data.university}</p>
              {data.fieldOfStudy && <p className="truncate text-[2.8cqw] leading-snug text-white/60">{data.fieldOfStudy}</p>}
            </div>
            {data.qrSvg && (
              <div
                className="size-[21cqw] shrink-0 rounded-[2.5cqw] bg-white p-[1.6cqw] [&_svg]:h-full [&_svg]:w-full"
                dangerouslySetInnerHTML={{ __html: data.qrSvg }}
                aria-hidden
              />
            )}
          </div>

          {/* Bas de carte */}
          <div className="flex items-end justify-between gap-[2cqw]">
            <div className="min-w-0">
              <p className="text-[2.4cqw] font-semibold tracking-[0.14em] text-white/60 uppercase">Uny ID</p>
              <p className="font-mono text-[4.3cqw] leading-tight font-bold tracking-wide">{data.unyId}</p>
              <p className="text-[2.7cqw] text-white/70">Année {data.academicYear}</p>
            </div>
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-[1cqw] rounded-full px-[2.6cqw] py-[1.3cqw] text-[2.8cqw] font-bold",
                s.cls,
              )}
            >
              <s.Icon className="size-[3.4cqw]" aria-hidden />
              {s.label}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
