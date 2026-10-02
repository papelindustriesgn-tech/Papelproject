import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { aujourdhui, formaterDate, formaterDateHeure } from "@/lib/formulaires/dates";
import { GRAVITES_NC, ORIGINES_NC, STATUTS_NC } from "@/lib/qualite/libelles";
import { clientServeur } from "@/lib/supabase/serveur";
import { marquerActionRealisee } from "../../actions";
import { BoutonCloturer, FormulaireAction, FormulaireAnalyse } from "./formulaires";

export default async function PageNc({ params }: PageProps<"/qualite/non-conformites/[id]">) {
  const { id } = await params;
  const supabase = await clientServeur();
  const { data: n } = await supabase
    .from("non_conformites")
    .select("*, types_non_conformite(libelle), lots(numero_lot), fiches_production(code_lot), clients(nom), controles_qualite(id), actions_correctives(*)")
    .eq("id", id)
    .maybeSingle();
  if (!n) notFound();
  const close = n.statut === "cloturee";
  const jour = aujourdhui();
  const actions = [...n.actions_correctives].sort((a, b) => a.created_at.localeCompare(b.created_at));

  return (
    <>
      <Link href="/qualite/non-conformites" className="text-papel-700 underline">← Non-conformités</Link>
      <TitrePage
        titre={`Non-conformité ${n.numero}`}
        sousTitre={`${formaterDate(n.date_constat)} · ${ORIGINES_NC[n.origine]}${n.types_non_conformite ? ` · ${n.types_non_conformite.libelle}` : ""}`}
        action={
          <span className="flex gap-2">
            <Badge ton={GRAVITES_NC[n.gravite].ton}>{GRAVITES_NC[n.gravite].libelle}</Badge>
            <Badge ton={STATUTS_NC[n.statut].ton}>{STATUTS_NC[n.statut].libelle}</Badge>
          </span>
        }
      />
      <div className="flex flex-col gap-4">
        <Carte titre="Constat">
          <p className="mb-2">{n.description}</p>
          <ul className="text-gray-700">
            {n.lots && <li>Bobine : <Link className="font-mono text-papel-700 underline" href={`/qualite/tracabilite?q=${encodeURIComponent(n.lots.numero_lot)}`}>{n.lots.numero_lot}</Link></li>}
            {n.fiches_production?.code_lot && <li>Lot de produits finis : <Link className="font-mono text-papel-700 underline" href={`/qualite/tracabilite?q=${encodeURIComponent(n.fiches_production.code_lot)}`}>{n.fiches_production.code_lot}</Link></li>}
            {n.clients && <li>Client : {n.clients.nom}</li>}
            {n.controles_qualite && <li><Link className="text-papel-700 underline" href={`/qualite/controles/${n.controles_qualite.id}`}>Contrôle d&apos;origine</Link></li>}
          </ul>
        </Carte>
        <Carte titre="Analyse">
          {close ? <p>{n.cause_racine}</p> : <FormulaireAnalyse ncId={n.id} cause={n.cause_racine} statut={n.statut} gravite={n.gravite} />}
        </Carte>
        <Carte titre={`Actions correctives (${actions.length})`}>
          <Tableau entetes={["Action", "Responsable", "Échéance", "Réalisée", ""]}>
            {actions.map((a) => (
              <tr key={a.id}>
                <Cellule>{a.description}</Cellule>
                <Cellule>{a.responsable || "—"}</Cellule>
                <Cellule className={!a.realisee_le && a.echeance && a.echeance < jour ? "font-semibold text-red-700" : ""}>{formaterDate(a.echeance)}</Cellule>
                <Cellule>{a.realisee_le ? `${formaterDate(a.realisee_le)}${a.efficace === false ? " (inefficace)" : ""}` : "—"}</Cellule>
                <Cellule>
                  {!close && !a.realisee_le && (
                    <span className="flex flex-wrap gap-2">
                      <form action={marquerActionRealisee.bind(null, a.id, n.id, true)}>
                        <button className="min-h-11 px-2 font-semibold text-papel-700 underline">Réalisée</button>
                      </form>
                      <form action={marquerActionRealisee.bind(null, a.id, n.id, false)}>
                        <button className="min-h-11 px-2 text-gray-700 underline">Réalisée, inefficace</button>
                      </form>
                    </span>
                  )}
                </Cellule>
              </tr>
            ))}
          </Tableau>
          {!close && (
            <div className="mt-3">
              <FormulaireAction ncId={n.id} />
            </div>
          )}
        </Carte>
        {close ? (
          <Carte><p>Clôturée le {n.cloturee_le ? formaterDateHeure(n.cloturee_le) : "—"}.</p></Carte>
        ) : (
          <Carte titre="Clôture">
            <p className="mb-2 text-gray-700">Possible quand la cause racine est renseignée et toutes les actions réalisées.</p>
            <BoutonCloturer ncId={n.id} />
          </Carte>
        )}
      </div>
    </>
  );
}
