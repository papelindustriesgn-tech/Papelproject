import type { Metadata } from "next";
import { Carte, Cellule, Message, Tableau, TitrePage } from "@/components/ui";
import { aujourdhui, formaterDate } from "@/lib/formulaires/dates";
import { clientServeur } from "@/lib/supabase/serveur";
import { FormulaireTaux } from "./formulaire";

export const metadata: Metadata = { title: "Taux de change" };

const nombre = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 4 });

export default async function PageTaux() {
  const supabase = await clientServeur();
  const date = aujourdhui();
  const [{ data: taux }, { data: actuel }] = await Promise.all([
    supabase.from("taux_change").select("id, date_effet, taux_gnf, note").eq("devise", "USD").order("date_effet", { ascending: false }).limit(100),
    supabase.rpc("taux_a_la_date", { p_devise: "USD", p_date: date }),
  ]);
  return (
    <>
      <TitrePage titre="Taux de change USD → GNF" sousTitre="Chaque opération en USD enregistre le taux en vigueur à sa date." />
      <div className="flex flex-col gap-4">
        <Message>
          Taux applicable aujourd&apos;hui ({formaterDate(date)}) : <strong>1 USD = {nombre.format(Number(actuel ?? 0)).replace(/ /g, " ")} GNF</strong>
        </Message>
        <Carte titre="Nouveau taux">
          <FormulaireTaux dateDuJour={date} />
        </Carte>
        <Carte titre="Historique">
          <Tableau entetes={["Date d'effet", "Taux (GNF pour 1 USD)", "Note"]}>
            {(taux ?? []).map((t) => (
              <tr key={t.id}>
                <Cellule>{formaterDate(t.date_effet)}</Cellule>
                <Cellule className="font-semibold">{nombre.format(Number(t.taux_gnf))}</Cellule>
                <Cellule>{t.note ?? "—"}</Cellule>
              </tr>
            ))}
          </Tableau>
        </Carte>
      </div>
    </>
  );
}
