import { requirePartner } from "@/lib/partner";
import { createClient } from "@/lib/supabase/server";
import { Scanner } from "./scanner";
import { PromoRedeem } from "./promo-redeem";

export const metadata = { title: "Scanner une carte ou un code promo" };

export default async function ScannerPage() {
  const { partner } = await requirePartner();
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data: fiche } = await supabase.from("partners").select("orange_money_merchant_code").eq("id", partner.id).single();
  const { data: deals } = await supabase
    .from("deals")
    .select("id, title, discount_label")
    .eq("partner_id", partner.id)
    .eq("is_active", true)
    .or(`valid_until.is.null,valid_until.gte.${today}`)
    .order("created_at", { ascending: false });

  return (
    <div className="animate-fade-up mx-auto max-w-xl space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Scanner</h1>
        <p className="text-muted text-sm">
          Valide le code promo de l&apos;étudiant, ou scanne le QR code de sa carte Uny (bouton « Présenter »).
        </p>
      </div>
      <PromoRedeem merchantCode={fiche?.orange_money_merchant_code ?? null} />
      <h2 className="pt-2 font-bold">Vérifier une carte étudiante</h2>
      <Scanner deals={deals ?? []} />
    </div>
  );
}
