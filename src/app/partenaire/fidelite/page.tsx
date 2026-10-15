import { Gift } from "lucide-react";
import { requirePartner } from "@/lib/partner";
import { createClient } from "@/lib/supabase/server";
import { formatGNF } from "@/lib/format";
import { ProgramForm } from "./program-form";
import { CustomerList, type Customer } from "./customer-list";

export const metadata = { title: "Fidélité & clients" };

export default async function LoyaltyPage() {
  const { partner } = await requirePartner();
  const supabase = await createClient();
  const [{ data: program }, { data: customers }] = await Promise.all([
    supabase.from("loyalty_programs").select("stamps_required, reward, is_active").eq("partner_id", partner.id).maybeSingle(),
    supabase.rpc("partner_top_customers", { p_partner: partner.id, p_limit: 100 }),
  ]);
  const list = (customers ?? []) as Customer[];
  const visits = list.reduce((n, c) => n + c.total_visits, 0);
  const spent = list.reduce((n, c) => n + Number(c.total_spent_gnf), 0);
  const loyal = list.filter((c) => c.total_visits >= 2).length;
  const required = program?.is_active ? program.stamps_required : null;

  return (
    <div className="animate-fade-up mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Fidélité & clients</h1>
        <p className="text-muted text-sm">
          Récompense les étudiants qui reviennent : chaque passage validé dans « Scanner » ajoute un tampon sur leur carte de
          fidélité.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { label: "Clients Uny", value: list.length },
          { label: "Clients fidèles", value: loyal },
          { label: "Ventes suivies", value: spent ? formatGNF(spent) : `${visits} passages` },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-white p-3 shadow-[var(--shadow-card)]">
            <p className="truncate text-lg font-extrabold">{s.value}</p>
            <p className="text-muted text-xs">{s.label}</p>
          </div>
        ))}
      </div>

      <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <h2 className="mb-1 flex items-center gap-2 font-bold">
          <Gift className="text-brand-600 size-5" aria-hidden /> Ma carte de fidélité
        </h2>
        <p className="text-muted mb-4 text-sm">
          Exemple : après 5 passages, le 6e repas est offert. Les étudiants voient ton programme sur tes offres et reçoivent une
          notification quand ils débloquent la récompense.
        </p>
        <ProgramForm program={program} />
      </section>

      <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <h2 className="font-bold">Mes meilleurs clients</h2>
        <p className="text-muted mb-2 text-sm">
          {required
            ? "Remercie tes clients les plus fidèles : offre-leur un tampon ou directement la récompense. Ils sont prévenus par notification."
            : "Active ta carte de fidélité ci-dessus pour pouvoir récompenser tes clients."}
        </p>
        {list.length === 0 ? (
          <p className="text-muted py-4 text-center text-sm">
            Tes clients apparaîtront ici dès leur premier passage validé dans « Scanner ».
          </p>
        ) : (
          <CustomerList customers={list} required={required} />
        )}
      </section>
    </div>
  );
}
