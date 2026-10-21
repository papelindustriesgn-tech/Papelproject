import type { Metadata } from "next";
import { ExportCsv } from "@/components/donnees/export-csv";
import { BarreFiltres, lireParam } from "@/components/donnees/filtres";
import { Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { aujourdhui, formaterDate } from "@/lib/formulaires/dates";
import { formaterMontant } from "@/lib/metier/devises";
import { gnf } from "@/lib/stocks/libelles";
import { clientServeur } from "@/lib/supabase/serveur";
import { FormulaireMouvement, FormulaireVirement } from "./formulaires";

export const metadata: Metadata = { title: "Trésorerie" };

const ORIGINES: Record<string, string> = { client: "Client", fournisseur: "Fournisseur", virement: "Virement", autre: "Divers" };

export default async function PageTresorerie({ searchParams }: PageProps<"/finance/tresorerie">) {
  const sp = await searchParams;
  const compte = lireParam(sp, "compte");
  const origine = lireParam(sp, "origine");
  const du = lireParam(sp, "du");
  const au = lireParam(sp, "au");
  const supabase = await clientServeur();
  let requete = supabase.from("mouvements_tresorerie").select("*, comptes_tresorerie(libelle, devise), categories_charges(libelle)").order("date_operation", { ascending: false }).order("created_at", { ascending: false }).limit(500);
  if (compte) requete = requete.eq("compte_id", compte);
  if (origine) requete = requete.eq("origine", origine);
  if (du) requete = requete.gte("date_operation", du);
  if (au) requete = requete.lte("date_operation", au);
  const [{ data }, { data: comptes }, { data: categories }] = await Promise.all([
    requete,
    supabase.from("soldes_tresorerie").select("id, libelle, devise, solde").eq("actif", true).order("ordre"),
    supabase.from("categories_charges").select("id, libelle").eq("actif", true).neq("nature", "stock").order("ordre"),
  ]);
  const lignes = data ?? [];
  const optionsComptes = (comptes ?? []).map((c) => ({ id: c.id!, libelle: `${c.libelle} (${formaterMontant(Number(c.solde), c.devise as "GNF" | "USD")})` }));
  const jour = aujourdhui();
  return (
    <>
      <TitrePage titre="Trésorerie" sousTitre="Journal inaltérable : une erreur se corrige par un mouvement inverse." />
      <Carte titre="Journal" className="mb-4">
        <BarreFiltres
          valeurs={{ compte, origine, du, au }}
          filtres={[
            { nom: "compte", libelle: "Compte", options: (comptes ?? []).map((c) => ({ valeur: c.id!, libelle: c.libelle! })) },
            { nom: "origine", libelle: "Origine", options: Object.entries(ORIGINES).map(([valeur, libelle]) => ({ valeur, libelle })) },
            { nom: "du", libelle: "Du", type: "date" },
            { nom: "au", libelle: "Au", type: "date" },
          ]}
          action={
            <ExportCsv
              nomFichier="journal-tresorerie"
              entetes={["Date", "Compte", "Origine", "Libellé", "Référence", "Entrée", "Sortie", "Devise", "Taux", "Contre-valeur GNF"]}
              lignes={lignes.map((m) => [m.date_operation, m.comptes_tresorerie?.libelle ?? "", ORIGINES[m.origine], m.libelle, m.reference, m.sens === "entree" ? Number(m.montant) : "", m.sens === "sortie" ? Number(m.montant) : "", m.comptes_tresorerie?.devise ?? "", Number(m.taux_change), (m.sens === "entree" ? 1 : -1) * Number(m.montant_gnf)])}
            />
          }
        />
        <Tableau entetes={["Date", "Compte", "Libellé", "Entrée", "Sortie"]}>
          {lignes.map((m) => {
            const montant = formaterMontant(Number(m.montant), (m.comptes_tresorerie?.devise ?? "GNF") as "GNF" | "USD");
            return (
              <tr key={m.id}>
                <Cellule className="whitespace-nowrap">{formaterDate(m.date_operation)}</Cellule>
                <Cellule>{m.comptes_tresorerie?.libelle}</Cellule>
                <Cellule>
                  {m.libelle}
                  <span className="block text-sm text-gray-600">{[ORIGINES[m.origine], m.categories_charges?.libelle, m.reference].filter(Boolean).join(" · ")}</span>
                </Cellule>
                <Cellule className="text-papel-800">{m.sens === "entree" ? montant : ""}</Cellule>
                <Cellule className="text-red-700">{m.sens === "sortie" ? montant : ""}</Cellule>
              </tr>
            );
          })}
        </Tableau>
        <p className="mt-2 text-sm text-gray-700">Total affiché : {gnf(lignes.reduce((s, m) => s + (m.sens === "entree" ? 1 : -1) * Number(m.montant_gnf), 0))} (contre-valeur GNF).</p>
      </Carte>
      <Carte titre="Mouvement divers" className="mb-4">
        <FormulaireMouvement comptes={optionsComptes} categories={categories ?? []} dateDuJour={jour} />
      </Carte>
      <Carte titre="Virement entre comptes">
        <FormulaireVirement comptes={optionsComptes} dateDuJour={jour} />
      </Carte>
    </>
  );
}
