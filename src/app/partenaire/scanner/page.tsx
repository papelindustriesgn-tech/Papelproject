import { requirePartner } from "@/lib/partner";
import { createClient } from "@/lib/supabase/server";
import { Scanner } from "./scanner";

export const metadata = { title: "Scanner une carte" };

export default async function ScannerPage() {
  const { partner } = await requirePartner();
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
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
        <h1 className="text-2xl font-extrabold tracking-tight">Scanner une carte</h1>
        <p className="text-muted text-sm">
          Demande à l&apos;étudiant d&apos;ouvrir sa carte Uny (bouton « Présenter ») et scanne le QR code.
        </p>
      </div>
      <Scanner deals={deals ?? []} />
    </div>
  );
}
