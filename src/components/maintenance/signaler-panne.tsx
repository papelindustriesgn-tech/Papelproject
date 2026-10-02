import { Badge, Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { formaterDateHeure } from "@/lib/formulaires/dates";
import { STATUTS_INTERVENTION } from "@/lib/maintenance/libelles";
import { clientServeur } from "@/lib/supabase/serveur";
import { FormulairePanne } from "./formulaire-panne";

/** Page « Pannes » de la production : signalement et suivi des ordres de travail curatifs. */
export async function SignalerPanne({ espace }: { espace: string }) {
  const supabase = await clientServeur();
  const [{ data: equipements }, { data: ot }] = await Promise.all([
    supabase.from("equipements").select("id, code, libelle").eq("actif", true).order("code"),
    supabase.from("interventions_etat").select("id, numero, equipement_code, description, signale_le, statut, fin").eq("type_intervention", "curative").order("signale_le", { ascending: false }).limit(30),
  ]);
  return (
    <>
      <TitrePage titre="Pannes" sousTitre="Signalez une panne : la maintenance reçoit l'ordre de travail immédiatement." />
      <Carte titre="Signaler une panne" className="mb-4">
        <FormulairePanne espace={espace} equipements={(equipements ?? []).map((e) => ({ id: e.id, libelle: `${e.code} – ${e.libelle}` }))} />
      </Carte>
      <Carte titre="Pannes récentes">
        <Tableau entetes={["OT", "Signalée le", "Équipement", "Description", "Statut"]}>
          {(ot ?? []).map((o) => (
            <tr key={o.id}>
              <Cellule className="font-mono">{o.numero}</Cellule>
              <Cellule className="whitespace-nowrap">{formaterDateHeure(o.signale_le!)}</Cellule>
              <Cellule>{o.equipement_code}</Cellule>
              <Cellule className="text-sm">{o.description}</Cellule>
              <Cellule>
                <Badge ton={STATUTS_INTERVENTION[o.statut!].ton}>{STATUTS_INTERVENTION[o.statut!].libelle}</Badge>
                {o.fin && <span className="block text-sm text-gray-600">réparée le {formaterDateHeure(o.fin)}</span>}
              </Cellule>
            </tr>
          ))}
        </Tableau>
      </Carte>
    </>
  );
}
