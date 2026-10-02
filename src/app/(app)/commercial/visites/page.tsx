import type { Metadata } from "next";
import { ExportCsv } from "@/components/donnees/export-csv";
import { lireParam } from "@/components/donnees/filtres";
import { CarteDynamique } from "@/components/carte/carte-dynamique";
import { Badge, Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { aujourdhui, formaterDateHeure } from "@/lib/formulaires/dates";
import { nombre } from "@/lib/stocks/libelles";
import { clientServeur } from "@/lib/supabase/serveur";

export const metadata: Metadata = { title: "Visites" };

/** Historique des visites et positions des check-ins (contrôle de présence). */
export default async function PageVisites({ searchParams }: PageProps<"/commercial/visites">) {
  const sp = await searchParams;
  const jour = lireParam(sp, "jour") ?? aujourdhui();
  const commercial = lireParam(sp, "commercial");
  const horsZone = lireParam(sp, "hors_zone") === "1";
  const supabase = await clientServeur();
  let requete = supabase.from("visites_carte").select("*").gte("checkin_at", `${jour}T00:00:00Z`).lte("checkin_at", `${jour}T23:59:59Z`).order("checkin_at");
  if (commercial) requete = requete.eq("commercial_id", commercial);
  if (horsZone) requete = requete.eq("dans_zone", false);
  const [{ data }, { data: commerciaux }] = await Promise.all([requete, supabase.from("utilisateur_roles").select("profils(id, nom, prenom)").eq("role", "commercial_terrain")]);
  const visites = data ?? [];

  return (
    <>
      <TitrePage titre="Visites et check-ins" sousTitre="Chaque check-in est horodaté et géolocalisé ; « hors zone » = trop loin du point de vente ou GPS imprécis." />
      <form className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border border-gray-200 bg-white p-3">
        <label className="flex flex-col">
          <span className="text-sm font-medium text-gray-700">Jour</span>
          <input type="date" name="jour" defaultValue={jour} className="min-h-11 rounded-lg border border-gray-300 px-3" />
        </label>
        <label className="flex min-w-0 flex-col">
          <span className="text-sm font-medium text-gray-700">Commercial</span>
          <select name="commercial" defaultValue={commercial ?? ""} className="min-h-11 rounded-lg border border-gray-300 bg-white px-3">
            <option value="">Tous</option>
            {(commerciaux ?? []).filter((c) => c.profils).map((c) => (
              <option key={c.profils!.id} value={c.profils!.id}>{c.profils!.prenom} {c.profils!.nom}</option>
            ))}
          </select>
        </label>
        <label className="flex min-h-11 items-center gap-2">
          <input type="checkbox" name="hors_zone" value="1" defaultChecked={horsZone} className="size-5 accent-papel-700" /> Hors zone uniquement
        </label>
        <button className="min-h-11 rounded-lg bg-papel-700 px-4 font-semibold text-white">Afficher</button>
        <ExportCsv
          nomFichier={`visites-${jour}`}
          entetes={["Heure", "Commercial", "Point de vente", "Distance (m)", "Précision GPS (m)", "Dans la zone", "Rupture", "Stock Papel (colis)", "Notes", "Latitude", "Longitude"]}
          lignes={visites.map((v) => [v.checkin_at, v.commercial_nom, v.pva_nom, v.distance_m === null ? "" : Number(v.distance_m), v.precision_m === null ? "" : Number(v.precision_m), !!v.dans_zone, !!v.rupture, v.stock_papel_colis ?? "", v.notes ?? "", v.latitude, v.longitude])}
        />
      </form>
      <Carte titre={`Positions des check-ins (${visites.length})`} className="mb-4">
        <CarteDynamique
          hauteur={360}
          points={visites
            .filter((v) => v.latitude !== null)
            .map((v) => ({
              id: v.id!,
              latitude: v.latitude!,
              longitude: v.longitude!,
              libelle: `${v.pva_nom} – ${v.commercial_nom}`,
              detail: `${formaterDateHeure(v.checkin_at!)} · ${v.dans_zone ? "dans la zone" : `HORS ZONE (${nombre(v.distance_m)} m)`}`,
              couleur: v.dans_zone ? "#2a78d6" : "#e34948",
              creux: !v.dans_zone,
            }))}
        />
        <p className="mt-2 text-sm text-gray-600">Bleu plein : check-in dans la zone · Rouge creux : hors zone.</p>
      </Carte>
      <Carte titre="Détail">
        <Tableau entetes={["Heure", "Commercial", "Point de vente", "Contrôle", "Constats", "Notes"]}>
          {visites.map((v) => (
            <tr key={v.id}>
              <Cellule className="whitespace-nowrap">{formaterDateHeure(v.checkin_at!)}</Cellule>
              <Cellule>{v.commercial_nom}</Cellule>
              <Cellule>{v.pva_nom}</Cellule>
              <Cellule>{v.dans_zone ? <Badge ton="succes">Dans la zone</Badge> : <Badge ton="erreur">Hors zone{v.distance_m !== null ? ` · ${nombre(v.distance_m)} m` : ""}</Badge>}</Cellule>
              <Cellule>
                {v.rupture ? <Badge ton="erreur">Rupture</Badge> : v.stock_papel_colis !== null ? `${v.stock_papel_colis} colis` : "—"}
              </Cellule>
              <Cellule className="text-sm">{v.notes}</Cellule>
            </tr>
          ))}
        </Tableau>
        {!visites.length && <p className="py-4 text-gray-700">Aucune visite ce jour-là.</p>}
      </Carte>
    </>
  );
}
