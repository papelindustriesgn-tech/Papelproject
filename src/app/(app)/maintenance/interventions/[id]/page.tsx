import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { formaterDateHeure } from "@/lib/formulaires/dates";
import { PRIORITES, STATUTS_INTERVENTION, TYPES_INTERVENTION, versDateHeureLocale } from "@/lib/maintenance/libelles";
import { minutes } from "@/lib/production/affichage";
import { afficherStock, gnf } from "@/lib/stocks/libelles";
import { clientServeur } from "@/lib/supabase/serveur";
import { annulerIntervention, retirerPiece } from "../../actions";
import { FormulairePiece, FormulaireSuivi } from "./formulaires";

export default async function PageIntervention({ params }: PageProps<"/maintenance/interventions/[id]">) {
  const { id } = await params;
  const supabase = await clientServeur();
  const { data: o } = await supabase.from("interventions_etat").select("*").eq("id", id).maybeSingle();
  if (!o) notFound();
  const [{ data: pieces }, { data: associees }, { data: autres }] = await Promise.all([
    supabase.from("intervention_pieces").select("id, quantite, articles(code, libelle, unite)").eq("intervention_id", id),
    supabase.from("equipement_pieces").select("article_id").eq("equipement_id", o.equipement_id!),
    supabase.from("articles").select("id, code, libelle, unite, stocks_articles(quantite)").eq("famille", "piece_detachee").eq("actif", true).order("libelle"),
  ]);
  const ouverte = o.statut === "demandee" || o.statut === "en_cours";
  const liees = new Set((associees ?? []).map((a) => a.article_id));
  // Pièces de l'équipement d'abord, puis les autres pièces détachées.
  const choix = [...(autres ?? [])]
    .sort((a, b) => Number(liees.has(b.id)) - Number(liees.has(a.id)))
    .map((a) => ({ id: a.id, libelle: `${liees.has(a.id) ? "★ " : ""}${a.code} – ${a.libelle} (stock ${afficherStock(Number(a.stocks_articles?.quantite ?? 0), a.unite)})` }));

  return (
    <>
      <Link href="/maintenance/interventions" className="text-papel-700 underline">← Ordres de travail</Link>
      <TitrePage
        titre={`Ordre de travail ${o.numero}`}
        sousTitre={`${o.equipement_code} – ${o.equipement_libelle} · ${TYPES_INTERVENTION[o.type_intervention!]} · signalé le ${formaterDateHeure(o.signale_le!)}`}
        action={
          <span className="flex gap-2">
            <Badge ton={PRIORITES[o.priorite!].ton}>{PRIORITES[o.priorite!].libelle}</Badge>
            <Badge ton={STATUTS_INTERVENTION[o.statut!].ton}>{STATUTS_INTERVENTION[o.statut!].libelle}</Badge>
          </span>
        }
      />
      <div className="flex flex-col gap-4">
        <Carte titre="Demande">
          <p className="whitespace-pre-line">{o.description}</p>
        </Carte>
        <Carte titre="Pièces de rechange">
          <Tableau entetes={["Pièce", "Quantité", ""]}>
            {(pieces ?? []).map((p) => (
              <tr key={p.id}>
                <Cellule>{p.articles?.code} – {p.articles?.libelle}</Cellule>
                <Cellule>{afficherStock(Number(p.quantite), p.articles?.unite ?? "unite")}</Cellule>
                <Cellule>
                  {ouverte && (
                    <form action={retirerPiece.bind(null, p.id, id)}>
                      <button className="min-h-11 px-2 font-semibold text-red-700 underline">Retirer</button>
                    </form>
                  )}
                </Cellule>
              </tr>
            ))}
          </Tableau>
          {ouverte ? (
            <div className="mt-3">
              <FormulairePiece id={id} pieces={choix} />
              <p className="mt-1 text-sm text-gray-700">★ pièce de cet équipement. Les pièces sortent du stock à la clôture de l&apos;intervention.</p>
            </div>
          ) : (
            <p className="mt-2 text-gray-700">Coût des pièces (au coût moyen) : {gnf(o.cout_pieces_gnf)}</p>
          )}
        </Carte>
        <Carte titre="Réalisation">
          {ouverte ? (
            <FormulaireSuivi
              id={id}
              curative={o.type_intervention === "curative"}
              valeurs={{
                debut: versDateHeureLocale(o.debut),
                fin: versDateHeureLocale(o.fin),
                intervenant: o.intervenant ?? "",
                cause: o.cause ?? "",
                travaux: o.travaux ?? "",
                arret_machine: !!o.arret_machine,
                cout_main_oeuvre_gnf: Number(o.cout_main_oeuvre_gnf),
                cout_externe_gnf: Number(o.cout_externe_gnf),
              }}
            />
          ) : (
            <dl className="grid gap-2 sm:grid-cols-2">
              <div><dt className="text-sm text-gray-600">Début – fin</dt><dd>{o.debut ? formaterDateHeure(o.debut) : "—"} → {o.fin ? formaterDateHeure(o.fin) : "—"}{o.duree_min !== null && ` (${minutes(o.duree_min)})`}</dd></div>
              <div><dt className="text-sm text-gray-600">Intervenant(s)</dt><dd>{o.intervenant || "—"}</dd></div>
              {o.cause && <div><dt className="text-sm text-gray-600">Cause</dt><dd>{o.cause}</dd></div>}
              <div className="sm:col-span-2"><dt className="text-sm text-gray-600">Travaux</dt><dd className="whitespace-pre-line">{o.travaux || "—"}</dd></div>
              <div><dt className="text-sm text-gray-600">Coût total</dt><dd className="font-semibold">{gnf(Number(o.cout_main_oeuvre_gnf) + Number(o.cout_externe_gnf) + Number(o.cout_pieces_gnf))}</dd></div>
            </dl>
          )}
        </Carte>
        {ouverte && (
          <form action={annulerIntervention.bind(null, id)}>
            <button className="min-h-11 font-semibold text-red-700 underline">Annuler l&apos;ordre de travail</button>
          </form>
        )}
      </div>
    </>
  );
}
