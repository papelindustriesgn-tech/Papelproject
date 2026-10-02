import type { Metadata } from "next";
import { ExportCsv } from "@/components/donnees/export-csv";
import { Badge, Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { formaterDate } from "@/lib/formulaires/dates";
import { etatEcheance } from "@/lib/metier/maintenance";
import { clientServeur } from "@/lib/supabase/serveur";
import { archiverPlan } from "../actions";
import { BoutonGenerer, FormulairePlan } from "./formulaires";

export const metadata: Metadata = { title: "Maintenance préventive" };

const ETATS = { retard: { libelle: "En retard", ton: "erreur" }, proche: { libelle: "À faire", ton: "alerte" }, planifie: { libelle: "Planifié", ton: "succes" } } as const;

export default async function PagePreventif() {
  const supabase = await clientServeur();
  const [{ data: echeances }, { data: equipements }] = await Promise.all([
    supabase.from("echeances_preventif").select("*").order("prochaine_echeance"),
    supabase.from("equipements").select("id, code, libelle").eq("actif", true).order("code"),
  ]);
  const lignes = echeances ?? [];
  return (
    <>
      <TitrePage titre="Maintenance préventive" sousTitre="Plans par équipement ; l'échéance avance à chaque intervention préventive terminée." action={<BoutonGenerer />} />
      <Carte className="mb-4">
        <div className="mb-2">
          <ExportCsv
            nomFichier="plan-preventif"
            entetes={["Équipement", "Opération", "Fréquence (j)", "Durée (min)", "Dernière réalisation", "Prochaine échéance", "Jours restants"]}
            lignes={lignes.map((p) => [p.equipement_code, p.libelle, p.frequence_jours, p.duree_estimee_min ?? "", p.derniere_realisation ?? "", p.prochaine_echeance, Number(p.jours_restants)])}
          />
        </div>
        <Tableau entetes={["Équipement", "Opération", "Fréquence", "Dernière fois", "Échéance", "État", ""]}>
          {lignes.map((p) => {
            const e = ETATS[etatEcheance(Number(p.jours_restants))];
            return (
              <tr key={p.id}>
                <Cellule>{p.equipement_code}</Cellule>
                <Cellule>{p.libelle}{p.consignes && <span className="block text-sm text-gray-600">{p.consignes}</span>}</Cellule>
                <Cellule>{p.frequence_jours} j</Cellule>
                <Cellule>{formaterDate(p.derniere_realisation)}</Cellule>
                <Cellule>{formaterDate(p.prochaine_echeance)}</Cellule>
                <Cellule><Badge ton={e.ton}>{e.libelle}</Badge></Cellule>
                <Cellule>
                  <form action={archiverPlan.bind(null, p.id!)}>
                    <button className="min-h-11 px-2 text-gray-700 underline">Archiver</button>
                  </form>
                </Cellule>
              </tr>
            );
          })}
        </Tableau>
      </Carte>
      <Carte titre="Nouveau plan préventif">
        <FormulairePlan equipements={(equipements ?? []).map((e) => ({ id: e.id, libelle: `${e.code} – ${e.libelle}` }))} />
      </Carte>
    </>
  );
}
