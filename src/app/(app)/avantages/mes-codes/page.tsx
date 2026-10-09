import type { Metadata } from "next";
import Link from "next/link";
import { BackLink } from "@/components/ui/back-link";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { PageTitle } from "@/components/ui/section-header";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatGNF } from "@/lib/format";
import { PAYMENT_METHODS, isPaymentMethod } from "@/lib/orange-money";

export const metadata: Metadata = { title: "Mes codes promo" };

export default async function MyPromoCodes() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data } = await supabase
    .from("promo_codes")
    .select(
      "id, code, status, expires_at, used_at, amount_gnf, payment_method, payment_reference, deal:deals(id, title, discount_label), partner:partners(name)",
    )
    .eq("student_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(50);
  const now = new Date().toISOString();
  const codes = data ?? [];

  return (
    <div className="animate-fade-up mx-auto max-w-2xl">
      <BackLink href="/avantages" label="Avantages" />
      <PageTitle title="Mes codes promo" subtitle="Tes codes personnels chez les partenaires Uny." />
      {codes.length === 0 ? (
        <EmptyState
          emoji="🎟️"
          title="Aucun code pour l'instant"
          text="Choisis une offre et appuie sur « Obtenir mon code promo »."
          action={<LinkButton href="/avantages">Voir les offres</LinkButton>}
        />
      ) : (
        <ul className="space-y-3">
          {codes.map((c) => {
            const state =
              c.status === "used" ? "used" : c.status === "cancelled" ? "cancelled" : c.expires_at <= now ? "expired" : "active";
            return (
              <li key={c.id} className="rounded-[var(--radius-card)] bg-white p-4 shadow-[var(--shadow-card)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-muted truncate text-xs font-semibold">{c.partner?.name}</p>
                    <Link href={`/avantages/${c.deal?.id}`} className="block truncate font-bold">
                      {c.deal?.discount_label} · {c.deal?.title}
                    </Link>
                    <p className="text-brand-700 mt-1 font-mono text-xl font-black tracking-widest">{c.code}</p>
                  </div>
                  <Badge tone={state === "active" ? "mint" : state === "used" ? "brand" : "neutral"}>
                    {state === "active" ? "À utiliser" : state === "used" ? "Utilisé" : state === "expired" ? "Expiré" : "Annulé"}
                  </Badge>
                </div>
                <p className="text-muted mt-2 text-xs">
                  {state === "used"
                    ? `Utilisé le ${formatDate(c.used_at)}${c.amount_gnf != null ? ` · ${formatGNF(c.amount_gnf)}` : ""}${
                        isPaymentMethod(c.payment_method) ? ` · ${PAYMENT_METHODS[c.payment_method]}` : ""
                      }`
                    : state === "active"
                      ? `Valable jusqu'au ${formatDate(c.expires_at)}${c.payment_reference ? ` · Réf. Orange Money ${c.payment_reference}` : ""}`
                      : `Expiré le ${formatDate(c.expires_at)}`}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
