import Image from "@/components/ui/safe-image";
import { BadgeCheck, Ban, CalendarX2, Clock3, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";
import { safeImage } from "@/lib/images";
import type { VerificationStatus } from "@/lib/constants";
import {
  fieldLabel,
  isLightColor,
  normalizeTemplate,
  type CardBranding,
  type CardDetails,
  type CardField,
  type CardTemplate,
} from "@/lib/card-template";

export type CardDisplayStatus = VerificationStatus | "expired" | "revoked";

export type UnyCardData = {
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  university: string;
  fieldOfStudy: string | null;
  unyId: string;
  academicYear: string;
  status: CardDisplayStatus;
  countryCode: string;
  qrSvg?: string | null;
  /** Identité de l'université partenaire (absente : carte Uny standard). */
  branding?: CardBranding | null;
  template?: CardTemplate | null;
  details?: CardDetails;
};

const statusUi: Record<CardDisplayStatus, { label: string; cls: string; Icon: typeof BadgeCheck }> = {
  verified: { label: "Étudiant vérifié", cls: "bg-mint-500 text-white", Icon: BadgeCheck },
  pending: { label: "Vérification en cours", cls: "bg-mango-400 text-ink", Icon: Clock3 },
  unverified: { label: "Non vérifié", cls: "bg-white/20 text-white", Icon: ShieldAlert },
  expired: { label: "Carte expirée", cls: "bg-coral-500 text-white", Icon: CalendarX2 },
  revoked: { label: "Carte désactivée", cls: "bg-coral-500 text-white", Icon: Ban },
};

/** Champs affichés sous le nom (texte libre) ; les autres vont dans la bande d'informations. */
const LINE_FIELDS: CardField[] = ["faculty", "department", "program"];

/**
 * Carte étudiante Uny. Toutes les tailles sont en unités de conteneur (cqw)
 * pour que la carte garde ses proportions de 280 px à 480 px de large.
 * Avec `branding`, la carte prend les couleurs et le logo de l'université tout en
 * gardant les repères Uny (logo uny., identifiant, QR code, statut).
 */
export function UnyCard({ data, className, sample = false }: { data: UnyCardData; className?: string; sample?: boolean }) {
  const s = statusUi[data.status];
  const b = data.branding ?? null;
  const t = b ? (data.template ?? normalizeTemplate(null)) : null;
  const layout = t?.layout ?? "uny";
  const light = layout === "band" || (layout === "classic" && b !== null && isLightColor(b.primary));
  const fg = light
    ? { main: "text-ink", soft: "text-ink/75", faint: "text-ink/55" }
    : { main: "text-white", soft: "text-white/80", faint: "text-white/60" };
  const statusCls = data.status === "unverified" && light ? "bg-ink/10 text-ink" : s.cls;

  const value = (f: CardField) => data.details?.[f]?.trim() || null;
  const lines = t ? LINE_FIELDS.filter((f) => t.fields.includes(f) && value(f)) : [];
  const pairs = t ? t.fields.filter((f) => !LINE_FIELDS.includes(f) && value(f)) : [];

  const background =
    layout === "classic" && b
      ? { background: `linear-gradient(135deg, ${b.primary} 0%, ${b.secondary} 100%)` }
      : layout === "band"
        ? { background: "#ffffff" }
        : undefined;

  return (
    <div className={cn("[container-type:inline-size] w-full", className)}>
      <div
        className={cn(
          "relative aspect-[1.586] w-full overflow-hidden rounded-[5cqw] shadow-[var(--shadow-float)]",
          fg.main,
          (layout === "uny" || layout === "minimal") && "uny-pattern from-brand-800 via-brand-700 to-brand-500 bg-gradient-to-br",
          layout === "classic" && "uny-pattern",
          layout === "band" && "ring-line ring-1",
        )}
        style={background}
        role="img"
        aria-label={`Carte Uny de ${data.firstName} ${data.lastName}, ${b?.name ?? data.university}, ${data.unyId}, ${s.label}`}
      >
        {layout === "band" && b && <div className="absolute inset-x-0 top-0 h-[17cqw]" style={{ background: b.primary }} />}
        {layout === "minimal" && b && (
          <div
            className="absolute inset-y-0 left-0 w-[2.2cqw]"
            style={{ background: `linear-gradient(180deg, ${b.primary}, ${b.accent})` }}
          />
        )}

        <div className="absolute inset-0 flex flex-col px-[6cqw] pt-[5cqw] pb-[4.6cqw]">
          {/* Ligne supérieure */}
          {b ? (
            <div className="flex h-[10cqw] items-center justify-between gap-[2.5cqw]">
              <div className="flex min-w-0 items-center gap-[2cqw]">
                {safeImage(b.logoUrl) && (
                  <span className="relative size-[9cqw] shrink-0 overflow-hidden rounded-[2cqw] bg-white p-[0.6cqw]">
                    <Image src={b.logoUrl!} alt="" fill sizes="48px" className="object-contain p-[0.6cqw]" />
                  </span>
                )}
                <span
                  className={cn(
                    "line-clamp-2 text-[2.9cqw] leading-tight font-extrabold",
                    layout === "band" ? (isLightColor(b.primary) ? "text-ink" : "text-white") : fg.main,
                  )}
                >
                  {b.name}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-[1.5cqw]">
                {sample && (
                  <span className="bg-mango-400 text-ink rounded-full px-[2.4cqw] py-[1cqw] text-[2.5cqw] font-extrabold tracking-wider uppercase">
                    Exemple
                  </span>
                )}
                <span
                  className={cn(
                    "text-[5.6cqw] leading-none font-extrabold tracking-tight",
                    layout === "band" ? (isLightColor(b.primary) ? "text-ink" : "text-white") : fg.main,
                  )}
                >
                  uny<span className="text-mango-400">.</span>
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-[2cqw]">
              <div className="flex min-w-0 items-baseline gap-[1.5cqw]">
                <span className="text-[7.5cqw] leading-none font-extrabold tracking-tight">
                  uny<span className="text-mango-400">.</span>
                </span>
                <span className="truncate text-[2.6cqw] font-semibold tracking-[0.18em] text-white/70 uppercase">
                  Student pass
                </span>
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
          )}

          {/* Identité + QR */}
          <div className="flex min-h-0 flex-1 items-center gap-[3.5cqw]">
            <div
              className={cn(
                "relative size-[17cqw] shrink-0 overflow-hidden rounded-[3.5cqw] ring-[0.6cqw]",
                light ? "bg-ink/5 ring-ink/10" : "bg-white/20 ring-white/40",
              )}
            >
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
              {b ? (
                lines.map((f) => (
                  <p key={f} className={cn("truncate text-[2.7cqw] leading-snug", f === "program" ? fg.soft : fg.faint)}>
                    {value(f)}
                  </p>
                ))
              ) : (
                <>
                  <p className="mt-[0.8cqw] line-clamp-2 text-[2.8cqw] leading-snug text-white/80">{data.university}</p>
                  {data.fieldOfStudy && <p className="truncate text-[2.8cqw] leading-snug text-white/60">{data.fieldOfStudy}</p>}
                </>
              )}
            </div>
            {data.qrSvg && (
              <div
                className={cn(
                  "size-[21cqw] shrink-0 rounded-[2.5cqw] bg-white p-[1.6cqw] [&_svg]:h-full [&_svg]:w-full",
                  light && "ring-line ring-1",
                )}
                dangerouslySetInnerHTML={{ __html: data.qrSvg }}
                aria-hidden
              />
            )}
          </div>

          {/* Bande d'informations (template de l'université) */}
          {pairs.length > 0 && (
            <dl className="mb-[1.6cqw] flex gap-x-[3.5cqw] overflow-hidden">
              {pairs.map((f) => (
                <div key={f} className="min-w-0 shrink">
                  <dt className={cn("truncate text-[2cqw] font-semibold tracking-[0.08em] uppercase", fg.faint)}>
                    {fieldLabel(t!, f)}
                  </dt>
                  <dd className="truncate text-[2.8cqw] leading-tight font-bold">{value(f)}</dd>
                </div>
              ))}
            </dl>
          )}

          {/* Bas de carte */}
          <div className="flex items-end justify-between gap-[2cqw]">
            <div className="min-w-0">
              <p className={cn("text-[2.4cqw] font-semibold tracking-[0.14em] uppercase", fg.faint)}>Uny ID</p>
              <p className="truncate font-mono text-[4cqw] leading-tight font-bold tracking-wide">{data.unyId}</p>
              {!b && <p className="text-[2.7cqw] text-white/70">Année {data.academicYear}</p>}
            </div>
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-[1cqw] rounded-full px-[2.6cqw] py-[1.3cqw] text-[2.8cqw] font-bold",
                statusCls,
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
