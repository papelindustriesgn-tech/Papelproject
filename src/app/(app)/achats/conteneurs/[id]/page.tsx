import { notFound } from "next/navigation";
import { DocumentsJoints } from "@/components/achats/documents";
import { EtapesConteneur } from "@/components/achats/etapes";
import { Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { Indicateur } from "@/components/ui/indicateur";
import { aujourdhui, formaterDate } from "@/lib/formulaires/dates";
import { ecartPrix } from "@/lib/metier/achats";
import { formaterMontant } from "@/lib/metier/devises";
import { formaterPoids, kg } from "@/lib/metier/unites";
import { pct } from "@/lib/production/affichage";
import { gnf, nombre } from "@/lib/stocks/libelles";
import { clientServeur } from "@/lib/supabase/serveur";
import { supprimerFrais } from "../../actions";
import { FormulaireFrais, FormulaireSuivi } from "./formulaires";

export default async function PageConteneur({ params }: PageProps<"/achats/conteneurs/[id]">) {
  const { id } = await params;
  const supabase = await clientServeur();
  const [{ data: c }, { data: cout }, { data: frais }, { data: types }, { data: lots }] = await Promise.all([
    supabase.from("conteneurs").select("*, bons_commande(id, numero, devise, fournisseurs(nom))").eq("id", id).maybeSingle(),
    supabase.from("couts_conteneurs").select("*").eq("id", id).maybeSingle(),
    supabase.from("frais_approche").select("*, types_frais(libelle)").eq("conteneur_id", id).order("date_frais"),
    supabase.from("types_frais").select("id, libelle").eq("actif", true).order("ordre"),
    supabase.from("lots").select("id, numero_lot, poids_net_kg, cout_kg_gnf, stocks_lots(quantite)").eq("conteneur_id", id).order("numero_lot"),
  ]);
  if (!c || !cout) notFound();
  const jour = aujourdhui();
  const ecart = ecartPrix(Number(cout.cout_kg_gnf), Number(cout.cout_kg_prevu_gnf));
  const kgRecus = Number(cout.kg_recus);

  return (
    <>
      <TitrePage
        fil={[{ libelle: "Conteneurs", href: "/achats/conteneurs" }]} titre={`Conteneur ${c.reference}`} sousTitre={`${c.bons_commande?.numero ?? ""} · ${c.bons_commande?.fournisseurs?.nom ?? ""}${c.navire ? ` · ${c.navire}` : ""}`} />
      <Carte className="mb-4">
        <EtapesConteneur conteneur={c} aujourdhui={jour} />
      </Carte>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicateur libelle="Marchandise" valeur={gnf(cout.marchandise_gnf)} detail={`${formaterPoids(kg(Number(c.poids_net_prevu_kg)))} déclarés`} />
        <Indicateur libelle="Frais d'approche" valeur={gnf(cout.frais_gnf)} />
        <Indicateur libelle="Coût de revient complet" valeur={`${gnf(cout.cout_kg_gnf)} / kg`} detail={`soit ${gnf(Number(cout.cout_kg_gnf) * 1000)} / t`} />
        <Indicateur libelle="Écart réel / prévu" valeur={pct(ecart)} ton={(ecart ?? 0) > 0.05 ? "alerte" : "normal"} detail={`Prévu : ${gnf(cout.cout_kg_prevu_gnf)} / kg`} />
      </div>
      <div className="flex flex-col gap-4">
        <Carte titre="Suivi (dates prévues et réelles)">
          <FormulaireSuivi conteneurId={c.id} dates={Object.fromEntries(Object.entries(c).filter(([k]) => k.startsWith("date_"))) as Record<string, string | null>} notes={c.notes} />
        </Carte>
        <Carte titre="Frais d'approche">
          <Tableau entetes={["Type", "Date", "Montant", "En GNF", "Prestataire", ""]}>
            {(frais ?? []).map((f) => (
              <tr key={f.id}>
                <Cellule>{f.types_frais?.libelle}</Cellule>
                <Cellule>{formaterDate(f.date_frais)}</Cellule>
                <Cellule>
                  {formaterMontant(f.montant, f.devise as "GNF" | "USD")}
                  {f.devise === "USD" && <span className="block text-sm text-gray-600">taux {nombre(f.taux_change, 2)}</span>}
                </Cellule>
                <Cellule className="font-semibold">{gnf(f.montant_gnf)}</Cellule>
                <Cellule>{f.prestataire}{f.reference ? ` (${f.reference})` : ""}</Cellule>
                <Cellule>
                  <form action={supprimerFrais.bind(null, f.id, c.id)}>
                    <button className="min-h-11 px-2 font-semibold text-red-700 underline">Retirer</button>
                  </form>
                </Cellule>
              </tr>
            ))}
          </Tableau>
          <div className="mt-3">
            <FormulaireFrais conteneurId={c.id} types={types ?? []} dateDuJour={jour} />
          </div>
        </Carte>
        <Carte titre={`Bobines reçues (${lots?.length ?? 0})`}>
          {lots && lots.length > 0 ? (
            <>
              <p className="mb-2 text-gray-700">
                Reçu : {formaterPoids(kg(kgRecus))} sur {formaterPoids(kg(Number(c.poids_net_prevu_kg)))} déclarés
                {kgRecus > 0 && ` (écart de poids : ${pct((kgRecus - Number(c.poids_net_prevu_kg)) / Number(c.poids_net_prevu_kg))})`}.
              </p>
              <Tableau entetes={["N° de lot", "Poids net", "Reste", "Coût / kg"]}>
                {lots.map((l) => (
                  <tr key={l.id}>
                    <Cellule className="font-mono">{l.numero_lot}</Cellule>
                    <Cellule>{nombre(l.poids_net_kg, 1)} kg</Cellule>
                    <Cellule>{nombre(Number(l.stocks_lots?.quantite ?? 0), 1)} kg</Cellule>
                    <Cellule>{gnf(l.cout_kg_gnf)}</Cellule>
                  </tr>
                ))}
              </Tableau>
            </>
          ) : (
            <p className="text-gray-700">Les bobines sont réceptionnées par le magasin (Stocks → Bobines → conteneur) dès la livraison : elles entrent au coût de revient complet.</p>
          )}
        </Carte>
        <DocumentsJoints objetType="conteneur" objetId={c.id} />
      </div>
    </>
  );
}
