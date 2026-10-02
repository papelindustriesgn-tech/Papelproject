import type { Metadata } from "next";
import { lireParam } from "@/components/donnees/filtres";
import { ExportCsv } from "@/components/donnees/export-csv";
import { Badge, Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { formaterDate } from "@/lib/formulaires/dates";
import { nombre } from "@/lib/stocks/libelles";
import { clientServeur } from "@/lib/supabase/serveur";
import { DecisionLot } from "./decision";

export const metadata: Metadata = { title: "Traçabilité" };

type Livraison = { livraison_id: string; numero: string; date_livraison: string; client_nom: string; conditionnement: string; paquets: number; code_lot?: string };

function TableauClients({ livraisons, avecLot }: { livraisons: Livraison[]; avecLot?: boolean }) {
  const clients = new Set(livraisons.map((l) => l.client_nom));
  return (
    <>
      <p className="mb-2 text-gray-700">
        <strong>{clients.size} client(s)</strong> potentiellement concerné(s) : livraisons du même produit dans la fenêtre de traçabilité
        (estimation — les ventes ne suivent pas les numéros de lot).
      </p>
      <div className="mb-2">
        <ExportCsv
          nomFichier="tracabilite-clients"
          entetes={[...(avecLot ? ["Lot PF"] : []), "Bon de livraison", "Date", "Client", "Produit", "Paquets"]}
          lignes={livraisons.map((l) => [...(avecLot ? [l.code_lot ?? ""] : []), l.numero, l.date_livraison, l.client_nom, l.conditionnement, Number(l.paquets)])}
        />
      </div>
      <Tableau entetes={[...(avecLot ? ["Lot PF"] : []), "Bon de livraison", "Date", "Client", "Produit", "Paquets"]}>
        {livraisons.map((l) => (
          <tr key={`${l.code_lot ?? ""}-${l.livraison_id}-${l.conditionnement}`}>
            {avecLot && <Cellule className="font-mono">{l.code_lot}</Cellule>}
            <Cellule className="font-mono">{l.numero}</Cellule>
            <Cellule>{formaterDate(l.date_livraison)}</Cellule>
            <Cellule>{l.client_nom}</Cellule>
            <Cellule>{l.conditionnement}</Cellule>
            <Cellule>{nombre(l.paquets)}</Cellule>
          </tr>
        ))}
      </Tableau>
    </>
  );
}

export default async function PageTracabilite({ searchParams }: PageProps<"/qualite/tracabilite">) {
  const sp = await searchParams;
  const q = (lireParam(sp, "q") ?? "").trim();
  const exact = q.replace(/[\\%_]/g, (c) => `\\${c}`); // recherche exacte, insensible à la casse
  const supabase = await clientServeur();

  let contenu: React.ReactNode = null;
  if (q) {
    const [{ data: lot }, { data: fiche }] = await Promise.all([
      supabase.from("etat_lots").select("*").ilike("numero_lot", exact).maybeSingle(),
      supabase.from("fiches_production").select("id, code_lot, date_production, statut, postes(libelle), lignes_production(libelle), fiche_productions(paquets, conditionnements(libelle, produits(libelle)))").ilike("code_lot", exact).maybeSingle(),
    ]);
    if (lot) {
      // Amont → aval : bobine → fiches qui l'ont consommée → clients livrés ensuite.
      const { data: fiches } = await supabase.from("tracabilite_bobines").select("*").eq("lot_id", lot.id!).order("date_production");
      const livraisons: Livraison[] = [];
      for (const f of fiches ?? []) {
        const { data } = await supabase.rpc("tracer_fiche", { p_fiche: f.fiche_id! });
        for (const l of data ?? []) if (!livraisons.some((x) => x.livraison_id === l.livraison_id && x.conditionnement === l.conditionnement)) livraisons.push({ ...l, code_lot: f.code_lot ?? "" });
      }
      contenu = (
        <>
          <Carte titre={`Bobine ${lot.numero_lot}`} className="mb-4" action={lot.statut === "bloque" ? <Badge ton="erreur">Bloquée</Badge> : lot.statut === "epuise" ? <Badge ton="neutre">Épuisée</Badge> : <Badge ton="succes">Disponible</Badge>}>
            <p>
              {lot.article_libelle} · {lot.fournisseur_nom ?? "fournisseur non précisé"} · reçue le {formaterDate(lot.date_reception)} · {nombre(lot.poids_net_kg, 1)} kg (reste {nombre(lot.poids_restant_kg, 1)} kg)
            </p>
            {lot.notes && <p className="mt-1 whitespace-pre-line text-sm text-gray-700">{lot.notes}</p>}
            {lot.statut !== "epuise" && (
              <div className="mt-3">
                <DecisionLot lotId={lot.id!} bloquee={lot.statut === "bloque"} />
              </div>
            )}
          </Carte>
          <Carte titre={`Lots de produits finis fabriqués avec cette bobine (${fiches?.length ?? 0})`} className="mb-4">
            <Tableau entetes={["Lot PF", "Date", "Poste", "Ligne", "Papier consommé"]}>
              {(fiches ?? []).map((f) => (
                <tr key={f.fiche_id}>
                  <Cellule className="font-mono">{f.code_lot}</Cellule>
                  <Cellule>{formaterDate(f.date_production)}</Cellule>
                  <Cellule>{f.poste}</Cellule>
                  <Cellule>{f.ligne}</Cellule>
                  <Cellule>{nombre(f.kg_consommes, 1)} kg</Cellule>
                </tr>
              ))}
            </Tableau>
          </Carte>
          <Carte titre="Clients livrés">
            <TableauClients livraisons={livraisons} avecLot />
          </Carte>
        </>
      );
    } else if (fiche) {
      // Aval ← amont : lot de produits finis → bobines consommées, et clients livrés ensuite.
      const [{ data: bobines }, { data: livraisons }] = await Promise.all([
        supabase.from("fiche_consommations").select("quantite, lots(id, numero_lot, statut, fournisseurs(nom))").eq("fiche_id", fiche.id).not("lot_id", "is", null),
        supabase.rpc("tracer_fiche", { p_fiche: fiche.id }),
      ]);
      contenu = (
        <>
          <Carte titre={`Lot de produits finis ${fiche.code_lot}`} className="mb-4">
            <p>
              Fabriqué le {formaterDate(fiche.date_production)} · {fiche.postes?.libelle} · {fiche.lignes_production?.libelle} ·{" "}
              {fiche.fiche_productions.filter((p) => p.paquets > 0).map((p) => `${p.conditionnements?.produits?.libelle} ${p.conditionnements?.libelle} : ${nombre(p.paquets)} paquets`).join(" · ")}
            </p>
          </Carte>
          <Carte titre="Bobines consommées" className="mb-4">
            <Tableau entetes={["Bobine", "Fournisseur", "Papier consommé", "Statut"]}>
              {(bobines ?? []).map((b, i) => (
                <tr key={i}>
                  <Cellule className="font-mono">{b.lots?.numero_lot}</Cellule>
                  <Cellule>{b.lots?.fournisseurs?.nom ?? "—"}</Cellule>
                  <Cellule>{nombre(b.quantite, 1)} kg</Cellule>
                  <Cellule>{b.lots?.statut === "bloque" ? <Badge ton="erreur">Bloquée</Badge> : b.lots?.statut}</Cellule>
                </tr>
              ))}
            </Tableau>
          </Carte>
          <Carte titre="Clients livrés">
            <TableauClients livraisons={livraisons ?? []} />
          </Carte>
        </>
      );
    } else {
      contenu = <Carte><p>Aucune bobine ni aucun lot de produits finis « {q} ».</p></Carte>;
    }
  }

  return (
    <>
      <TitrePage titre="Traçabilité" sousTitre="Bobine (n° de lot) → lots de produits finis → clients, ou lot de produits finis → bobines et clients." />
      <form className="mb-4 flex flex-wrap items-end gap-2">
        <label className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-medium text-gray-700">N° de bobine ou code de lot (ex. JB-0012, PF261001-1)</span>
          <input name="q" defaultValue={q} className="min-h-11 rounded-lg border border-gray-300 px-3" />
        </label>
        <button className="min-h-11 rounded-lg bg-papel-700 px-4 font-semibold text-white">Tracer</button>
      </form>
      {contenu}
    </>
  );
}
