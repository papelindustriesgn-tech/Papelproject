import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { requirePartner } from "@/lib/partner";
import { createClient } from "@/lib/supabase/server";
import { PromoRedeem } from "../../scanner/promo-redeem";
import type { PromoCheck } from "../../actions";

export const metadata = { title: "Vérifier un étudiant" };

/**
 * Lien de vérification envoyé par l'étudiant (commande à distance) : la marque voit tout de suite si l'étudiant
 * est vérifié et si son code est valable, puis confirme l'utilisation. Réservé aux membres de la marque du code.
 */
export default async function VerifyLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  await requirePartner();
  const supabase = await createClient();
  const { data } = await supabase.rpc("promo_link_lookup", { p_token: token });
  const link = (data ?? { found: false }) as {
    found: boolean;
    allowed?: boolean;
    partner_id?: string;
    partner_name?: string;
    code?: string;
  };

  if (!link.found || !link.allowed || !link.partner_id || !link.code) {
    return (
      <div className="animate-fade-up mx-auto max-w-xl space-y-4">
        <h1 className="text-2xl font-extrabold tracking-tight">Vérifier un étudiant</h1>
        <div className="bg-coral-50 ring-coral-100 flex gap-3 rounded-2xl p-4 ring-1" data-testid="verify-link-refused">
          <ShieldAlert className="text-coral-600 size-6 shrink-0" aria-hidden />
          <p className="text-sm">
            {!link.found
              ? "Lien de vérification inconnu ou incomplet. Demande à l'étudiant de te renvoyer le lien, ou saisis son code dans « Scanner »."
              : `Ce lien est destiné à ${link.partner_name ?? "une autre marque"}. Connecte-toi avec le compte de cette marque pour vérifier l'étudiant.`}
          </p>
        </div>
        <Link href="/partenaire/scanner" className="text-brand-600 text-sm font-semibold">
          Aller au Scanner
        </Link>
      </div>
    );
  }

  const [{ data: check, error }, { data: fiche }] = await Promise.all([
    supabase.rpc("partner_redeem_promo_code", { p_partner: link.partner_id, p_code: link.code, p_redeem: false }),
    supabase.from("partners").select("orange_money_merchant_code").eq("id", link.partner_id).single(),
  ]);

  return (
    <div className="animate-fade-up mx-auto max-w-xl space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Vérifier un étudiant</h1>
        <p className="text-muted text-sm">
          Commande à distance pour {link.partner_name} : vérifie le statut et le code, puis confirme l&apos;utilisation.
        </p>
      </div>
      <PromoRedeem
        merchantCode={fiche?.orange_money_merchant_code ?? null}
        partnerId={link.partner_id}
        initial={error ? { error: "Vérification impossible. Réessaie." } : { result: check as PromoCheck }}
      />
    </div>
  );
}
