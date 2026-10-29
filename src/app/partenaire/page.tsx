import Link from "next/link";
import { ArrowRight, ScanLine } from "lucide-react";
import { StatCard } from "@/components/admin/stat-card";
import { FormMessage } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/server";
import { requirePartner } from "@/lib/partner";
import { PARTNER_ENTITIES, VISIBLE_PARTNER_KINDS, type PartnerKind } from "@/lib/partner-entities";
import { formatDate, timeAgo } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata = { title: "Tableau de bord" };

const OUTCOME: Record<string, { label: string; tone: string }> = {
  valid: { label: "Validée", tone: "bg-mint-50 text-mint-700" },
  unverified: { label: "Non vérifié", tone: "bg-mango-50 text-mango-700" },
  expired: { label: "Expirée", tone: "bg-coral-50 text-coral-600" },
  revoked: { label: "Révoquée", tone: "bg-coral-50 text-coral-600" },
};

export default async function PartnerHome() {
  const { profile, partner } = await requirePartner({ manager: true });
  const supabase = await createClient();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const monthAgo = new Date(startOfDay.getTime() - 30 * 86400_000).toISOString();

  const count = (table: "marketplace_items") =>
    supabase.from(table).select("id", { count: "exact", head: true }).eq("partner_id", partner.id);

  const [today, month, recent, deals, items, promos, fiche, survey, generated] = await Promise.all([
    supabase
      .from("card_validations")
      .select("id", { count: "exact", head: true })
      .eq("partner_id", partner.id)
      .eq("eligible", true)
      .gte("created_at", startOfDay.toISOString()),
    supabase
      .from("card_validations")
      .select("student_id")
      .eq("partner_id", partner.id)
      .eq("eligible", true)
      .gte("created_at", monthAgo)
      .limit(5000),
    supabase
      .from("card_validations")
      .select("id, created_at, outcome, eligible, student_name, student_uny_id, deal:deals(title)")
      .eq("partner_id", partner.id)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("deals").select("id, title, view_count, is_active, valid_until").eq("partner_id", partner.id),
    count("marketplace_items"),
    supabase
      .from("promo_codes")
      .select("amount_gnf, payment_method")
      .eq("partner_id", partner.id)
      .eq("status", "used")
      .gte("used_at", monthAgo)
      .limit(5000),
    supabase.from("partners").select("orange_money_merchant_code").eq("id", partner.id).single(),
    supabase.from("partner_survey_responses").select("partner_id").eq("partner_id", partner.id).maybeSingle(),
    supabase
      .from("promo_codes")
      .select("id", { count: "exact", head: true })
      .eq("partner_id", partner.id)
      .gte("created_at", monthAgo),
  ]);
  // Achat confirmé : code validé en caisse avec un mode de paiement déclaré par le commerce
  const confirmed = (promos.data ?? []).filter((p) => p.payment_method);
  const declaredAmount = confirmed.reduce((s, p) => s + (p.amount_gnf ?? 0), 0);

  const uniqueStudents = new Set((month.data ?? []).map((r) => r.student_id)).size;
  const dealViews = (deals.data ?? []).reduce((s, d) => s + d.view_count, 0);
  const counts: Record<PartnerKind, number> = {
    offres: deals.data?.length ?? 0,
    boutique: items.count ?? 0,
  };

  return (
    <div className="animate-fade-up space-y-6">
      <section>
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Bonjour {profile.first_name} 👋</h1>
        <p className="text-muted mt-1 text-sm">Voici l&apos;activité de {partner.name} sur Uny.</p>
      </section>

      {!partner.is_active && (
        <FormMessage type="info">
          Ta fiche est en cours de validation par l&apos;équipe Uny : tu peux déjà préparer tes offres, elles seront visibles dès
          l&apos;activation.
        </FormMessage>
      )}

      <Link
        href="/partenaire/scanner"
        className="bg-brand-600 uny-pattern flex items-center gap-4 rounded-[var(--radius-card)] p-5 text-white shadow-[var(--shadow-float)]"
      >
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/15">
          <ScanLine className="size-8" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-extrabold">Scanner</span>
          <span className="text-brand-100 block text-sm">Carte Uny ou code promo : résultat immédiat, puis confirmation.</span>
        </span>
        <ArrowRight className="size-6 shrink-0" aria-hidden />
      </Link>

      {!survey.data && !survey.error && (
        <Link
          href="/partenaire/avis"
          className="bg-brand-50 ring-brand-100 hover:bg-brand-100 flex items-center gap-3 rounded-[var(--radius-card)] p-4 ring-1 transition"
        >
          <span className="text-2xl" aria-hidden>
            🤝
          </span>
          <span className="min-w-0 flex-1">
            <span className="text-ink block font-bold">Quelles sont vos attentes ?</span>
            <span className="text-muted block text-sm">
              1 minute : l&apos;avantage que vous pouvez offrir et ce que vous attendez d&apos;Uny.
            </span>
          </span>
          <ArrowRight className="text-brand-600 size-5 shrink-0" aria-hidden />
        </Link>
      )}

      {!fiche.data?.orange_money_merchant_code && (
        <FormMessage type="info">
          Ajoute ton code marchand Orange Money dans{" "}
          <Link href="/partenaire/profil" className="font-bold underline">
            ta fiche
          </Link>{" "}
          : les étudiants pourront payer tes promos directement depuis l&apos;app Uny.
        </FormMessage>
      )}

      <section aria-labelledby="funnel-title">
        <h2 id="funnel-title" className="mb-3 font-bold">
          Tes offres sur 30 jours
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Vues des offres" value={dealViews} hint="Depuis la publication" tone="mint" />
          <StatCard label="Coupons générés" value={generated.count ?? 0} hint="Demandés par des étudiants" />
          <StatCard label="Coupons utilisés" value={promos.data?.length ?? 0} hint="Validés en caisse" tone="brand" />
          <StatCard
            label="Achats confirmés"
            value={confirmed.length}
            hint={declaredAmount ? `${declaredAmount.toLocaleString("fr-FR")} GNF déclarés en caisse` : "Paiement déclaré"}
            tone="brand"
          />
        </div>
        <p className="text-muted mt-2 text-xs">
          Les montants sont ceux saisis à la validation : ils ne remplacent pas ta caisse ni ton relevé Orange Money.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard
          label="Cartes vérifiées aujourd'hui"
          value={today.count ?? 0}
          hint="Contrôle du statut, pas une vente"
        />
        <StatCard label="Étudiants vérifiés (30 j)" value={uniqueStudents} hint={`${month.data?.length ?? 0} vérifications`} />
        <StatCard
          label="Offres en ligne"
          value={(deals.data ?? []).filter((d) => d.is_active).length}
          hint={`${counts.offres} au total`}
          tone="mango"
        />
      </section>

      <section>
        <h2 className="mb-3 font-bold">Tes publications</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-2">
          {VISIBLE_PARTNER_KINDS.map((k) => (
            <Link
              key={k}
              href={`/partenaire/${k}`}
              className="hover:ring-brand-200 rounded-[var(--radius-card)] bg-white p-4 shadow-[var(--shadow-card)] ring-1 ring-transparent transition"
            >
              <span className="text-2xl" aria-hidden>
                {PARTNER_ENTITIES[k].emoji}
              </span>
              <p className="mt-1 font-bold">{PARTNER_ENTITIES[k].plural}</p>
              <p className="text-muted text-sm">
                {counts[k]} publication{counts[k] > 1 ? "s" : ""}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-bold">Derniers passages</h2>
          <Link href="/partenaire/scanner" className="text-brand-600 text-sm font-semibold">
            Scanner
          </Link>
        </div>
        {(recent.data ?? []).length === 0 ? (
          <p className="text-muted text-sm">
            Aucun scan pour l&apos;instant. Quand un étudiant présente sa carte Uny, scanne son QR code depuis l&apos;onglet «
            Scanner ».
          </p>
        ) : (
          <ul className="divide-line divide-y text-sm">
            {(recent.data ?? []).map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{r.student_name}</span>
                  <span className="text-muted block truncate text-xs">
                    {r.student_uny_id}
                    {r.deal?.title ? ` · ${r.deal.title}` : ""}
                  </span>
                </span>
                <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", OUTCOME[r.outcome]?.tone)}>
                  {r.eligible ? "Validée" : OUTCOME[r.outcome]?.label}
                </span>
                <span className="text-muted w-full text-xs sm:w-auto">{timeAgo(r.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {(deals.data ?? []).some((d) => d.valid_until) && (
        <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
          <h2 className="mb-3 font-bold">Validité de tes offres</h2>
          <ul className="space-y-2 text-sm">
            {(deals.data ?? [])
              .filter((d) => d.valid_until)
              .map((d) => (
                <li key={d.id} className="flex justify-between gap-3">
                  <Link href={`/partenaire/offres/${d.id}`} className="min-w-0 truncate font-semibold hover:underline">
                    {d.title}
                  </Link>
                  <span className="text-muted shrink-0">jusqu&apos;au {formatDate(d.valid_until)}</span>
                </li>
              ))}
          </ul>
        </section>
      )}
    </div>
  );
}
