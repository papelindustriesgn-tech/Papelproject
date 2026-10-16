import type { Metadata } from "next";
import Link from "next/link";
import { ExportCsv } from "@/components/donnees/export-csv";
import { BarreFiltres, lireParam } from "@/components/donnees/filtres";
import { Badge, Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { aujourdhui, formaterDate } from "@/lib/formulaires/dates";
import { ETAPES_CONTROLE } from "@/lib/qualite/libelles";
import { clientServeur } from "@/lib/supabase/serveur";
import { FormulaireNouveauControle } from "./formulaire";

export const metadata: Metadata = { title: "Contrôles qualité" };

export default async function PageControles({ searchParams }: PageProps<"/qualite/controles">) {
  const sp = await searchParams;
  const etape = lireParam(sp, "etape");
  const resultat = lireParam(sp, "resultat");
  const supabase = await clientServeur();
  let requete = supabase.from("controles_etat").select("*").order("date_controle", { ascending: false }).order("created_at", { ascending: false }).limit(300);
  if (etape) requete = requete.eq("etape", etape);
  if (resultat === "brouillon") requete = requete.eq("statut", "brouillon");
  else if (resultat) requete = requete.eq("resultat", resultat);
  const [{ data }, { data: lots }, { data: fiches }] = await Promise.all([
    requete,
    supabase.from("lots").select("id, numero_lot, date_reception").neq("statut", "epuise").order("date_reception", { ascending: false }).limit(300),
    supabase.from("fiches_production").select("id, code_lot, date_production").not("code_lot", "is", null).order("date_production", { ascending: false }).limit(200),
  ]);
  const lignes = data ?? [];
  return (
    <>
      <TitrePage titre="Contrôles qualité" />
      <Carte titre="Nouveau contrôle" className="mb-4">
        <FormulaireNouveauControle
          dateDuJour={aujourdhui()}
          lots={(lots ?? []).map((l) => ({ id: l.id, libelle: `${l.numero_lot} (reçue le ${formaterDate(l.date_reception)})` }))}
          fiches={(fiches ?? []).map((f) => ({ id: f.id, libelle: `${f.code_lot} (${formaterDate(f.date_production)})` }))}
        />
      </Carte>
      <Carte>
        <BarreFiltres
          valeurs={{ etape, resultat }}
          filtres={[
            { nom: "etape", libelle: "Étape", options: Object.entries(ETAPES_CONTROLE).map(([valeur, libelle]) => ({ valeur, libelle })) },
            { nom: "resultat", libelle: "Résultat", options: [{ valeur: "conforme", libelle: "Conforme" }, { valeur: "non_conforme", libelle: "Non conforme" }, { valeur: "brouillon", libelle: "En cours de saisie" }] },
          ]}
          action={
            <ExportCsv
              nomFichier="controles-qualite"
              entetes={["Date", "Étape", "Bobine", "Lot produits finis", "Mesures", "Non conformes", "Résultat"]}
              lignes={lignes.map((c) => [c.date_controle, ETAPES_CONTROLE[c.etape!], c.numero_lot ?? "", c.code_lot ?? "", Number(c.nb_mesures), Number(c.nb_non_conformes), c.resultat ?? "en cours"])}
            />
          }
        />
        <Tableau entetes={["Date", "Étape", "Objet", "Mesures", "Résultat"]}>
          {lignes.map((c) => (
            <tr key={c.id}>
              <Cellule>
                <Link href={`/qualite/controles/${c.id}`} className="font-medium text-papel-700 hover:underline">{formaterDate(c.date_controle)}</Link>
              </Cellule>
              <Cellule>{ETAPES_CONTROLE[c.etape!]}</Cellule>
              <Cellule className="font-mono">{c.numero_lot ?? c.code_lot}</Cellule>
              <Cellule>{c.nb_mesures}</Cellule>
              <Cellule>
                {c.statut === "brouillon" ? <Badge ton="alerte">En cours</Badge> : c.resultat === "conforme" ? <Badge ton="succes">Conforme</Badge> : <Badge ton="erreur">Non conforme ({c.nb_non_conformes})</Badge>}
              </Cellule>
            </tr>
          ))}
        </Tableau>
      </Carte>
    </>
  );
}
