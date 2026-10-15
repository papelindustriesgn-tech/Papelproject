import { ApproveButton } from "@/components/admin/partner-access";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DEAL_CATEGORIES } from "@/lib/constants";
import { formatDate, whatsappLink } from "@/lib/format";
import Link from "next/link";
import { approvePartnerApplication, rejectPartnerApplication } from "../partner-actions";

export const metadata = { title: "Demandes partenaires" };

const WANTS: Record<string, string> = { avantages: "Offres", jobs: "Jobs", logements: "Logements", marketplace: "Boutique" };

export default async function PartnerApplications() {
  await requireAdmin(); // le layout et la page sont rendus en parallèle
  const supabase = await createClient();
  const { data } = await supabase
    .from("partner_applications")
    .select("*, city:cities(name), partner:partners(id, name)")
    .order("status", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);
  const pending = (data ?? []).filter((a) => a.status === "pending");
  const done = (data ?? []).filter((a) => a.status !== "pending");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Demandes partenaires</h1>
        <p className="text-muted text-sm">
          Envoyées depuis la page publique{" "}
          <Link href="/partenaires" className="text-brand-600 font-semibold">
            /partenaires
          </Link>
          . Accepter crée la fiche partenaire et un compte d&apos;accès à l&apos;espace partenaire.
        </p>
      </div>

      {pending.length === 0 ? (
        <p className="text-muted rounded-[var(--radius-card)] bg-white p-8 text-center shadow-[var(--shadow-card)]">
          Aucune demande en attente.
        </p>
      ) : (
        <ul className="space-y-3">
          {pending.map((a) => (
            <li key={a.id} className="space-y-3 rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-lg font-bold">{a.business_name}</p>
                  <p className="text-muted text-sm">
                    {DEAL_CATEGORIES[a.category].emoji} {DEAL_CATEGORIES[a.category].label} · {a.city?.name ?? "—"} ·{" "}
                    {formatDate(a.created_at)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {a.wants.map((w) => (
                    <Badge key={w} tone="brand">
                      {WANTS[w] ?? w}
                    </Badge>
                  ))}
                </div>
              </div>
              {a.offer && <p className="bg-canvas rounded-2xl p-3 text-sm whitespace-pre-line">{a.offer}</p>}
              <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <span className="font-semibold">{a.contact_name}</span>
                <a href={whatsappLink(a.phone)} target="_blank" rel="noopener noreferrer" className="text-mint-700 font-semibold">
                  {a.phone}
                </a>
                <a href={`mailto:${a.email}`} className="text-brand-600 font-semibold break-all">
                  {a.email}
                </a>
              </p>
              <div className="flex flex-wrap items-start gap-3">
                <ApproveButton action={approvePartnerApplication.bind(null, a.id)} />
                <form action={rejectPartnerApplication.bind(null, a.id)}>
                  <ConfirmButton
                    message="Refuser cette demande ?"
                    className="text-coral-600 hover:bg-coral-50 h-9 rounded-xl px-3 text-sm font-semibold"
                  >
                    Refuser
                  </ConfirmButton>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      {done.length > 0 && (
        <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
          <h2 className="mb-3 font-bold">Déjà traitées</h2>
          <ul className="divide-line divide-y text-sm">
            {done.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="min-w-0 truncate">
                  {a.partner ? (
                    <Link href={`/admin/partenaires/${a.partner.id}`} className="font-semibold hover:underline">
                      {a.business_name}
                    </Link>
                  ) : (
                    <span className="font-semibold">{a.business_name}</span>
                  )}{" "}
                  <span className="text-muted">· {a.contact_name}</span>
                </span>
                <Badge tone={a.status === "approved" ? "mint" : "neutral"}>
                  {a.status === "approved" ? "Acceptée" : "Refusée"}
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
