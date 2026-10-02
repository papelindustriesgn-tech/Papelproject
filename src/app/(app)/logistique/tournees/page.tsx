import type { Metadata } from "next";
import Link from "next/link";
import { ExportCsv } from "@/components/donnees/export-csv";
import { BarreFiltres, lireParam } from "@/components/donnees/filtres";
import { Badge, Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { formaterDate } from "@/lib/formulaires/dates";
import { STATUTS_TOURNEE } from "@/lib/logistique/libelles";
import { gnf, nombre } from "@/lib/stocks/libelles";
import { clientServeur } from "@/lib/supabase/serveur";

export const metadata: Metadata = { title: "Tournées" };

export default async function PageTournees({ searchParams }: PageProps<"/logistique/tournees">) {
  const sp = await searchParams;
  const statut = lireParam(sp, "statut");
  const q = lireParam(sp, "q");
  const supabase = await clientServeur();
  let requete = supabase.from("tournees_livraison_etat").select("*").order("date_tournee", { ascending: false }).order("numero", { ascending: false }).limit(300);
  if (statut) requete = requete.eq("statut", statut);
  if (q) requete = requete.or(`numero.ilike.%${q.replace(/[%,()]/g, "")}%,immatriculation.ilike.%${q.replace(/[%,()]/g, "")}%,chauffeur_nom.ilike.%${q.replace(/[%,()]/g, "")}%`);
  const { data } = await requete;
  const lignes = data ?? [];
  return (
    <>
      <TitrePage titre="Tournées" />
      <Carte>
        <BarreFiltres
          recherche={q}
          placeholder="N°, véhicule ou chauffeur"
          valeurs={{ statut }}
          filtres={[{ nom: "statut", libelle: "Statut", options: Object.entries(STATUTS_TOURNEE).map(([valeur, s]) => ({ valeur, libelle: s.libelle })) }]}
          action={
            <ExportCsv
              nomFichier="tournees"
              entetes={["N°", "Date", "Véhicule", "Chauffeur", "Statut", "Bons", "Livrés", "Partiels", "Refusés", "Colis chargés", "Colis livrés", "Km", "Dépenses (GNF)"]}
              lignes={lignes.map((t) => [t.numero, t.date_tournee, t.immatriculation, t.chauffeur_nom, STATUTS_TOURNEE[t.statut!].libelle, Number(t.nb_livraisons), Number(t.nb_livrees), Number(t.nb_partielles), Number(t.nb_refusees), Number(t.colis_charges), Number(t.colis_livres), t.km_parcourus ?? "", Number(t.depenses_gnf)])}
            />
          }
        />
        <Tableau entetes={["N°", "Date", "Véhicule", "Chauffeur", "Bons", "Colis", "Km", "Dépenses", "Statut"]}>
          {lignes.map((t) => (
            <tr key={t.id}>
              <Cellule>
                <Link href={`/logistique/tournees/${t.id}`} className="font-mono font-semibold text-papel-800 underline">{t.numero}</Link>
              </Cellule>
              <Cellule className="whitespace-nowrap">{formaterDate(t.date_tournee)}</Cellule>
              <Cellule>{t.immatriculation}</Cellule>
              <Cellule>{t.chauffeur_nom}</Cellule>
              <Cellule>{t.nb_remises} / {t.nb_livraisons}</Cellule>
              <Cellule>{nombre(t.colis_livres)} / {nombre(t.colis_charges)}</Cellule>
              <Cellule>{t.km_parcourus ?? "—"}</Cellule>
              <Cellule>{gnf(t.depenses_gnf)}</Cellule>
              <Cellule><Badge ton={STATUTS_TOURNEE[t.statut!].ton}>{STATUTS_TOURNEE[t.statut!].libelle}</Badge></Cellule>
            </tr>
          ))}
        </Tableau>
      </Carte>
    </>
  );
}
