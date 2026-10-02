import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { formaterDate } from "@/lib/formulaires/dates";
import { libelleTolerance } from "@/lib/metier/qualite";
import { ETAPES_CONTROLE } from "@/lib/qualite/libelles";
import { nombre } from "@/lib/stocks/libelles";
import { clientServeur } from "@/lib/supabase/serveur";
import { supprimerControle } from "../../actions";
import { FormulaireMesures } from "./formulaire";

export default async function PageControle({ params }: PageProps<"/qualite/controles/[id]">) {
  const { id } = await params;
  const supabase = await clientServeur();
  const { data: c } = await supabase.from("controles_etat").select("*").eq("id", id).maybeSingle();
  if (!c) notFound();
  const [{ data: criteres }, { data: mesures }, { data: nc }] = await Promise.all([
    supabase.from("criteres_qualite").select("id, libelle, type_mesure, unite, valeur_min, valeur_max").eq("etape", c.etape!).eq("actif", true).order("ordre"),
    supabase.from("mesures_controle").select("id, valeur, conforme, commentaire, criteres_qualite(libelle, unite, valeur_min, valeur_max, ordre)").eq("controle_id", id),
    supabase.from("non_conformites").select("id, numero").eq("controle_id", id),
  ]);
  const objet = c.numero_lot ? `bobine ${c.numero_lot}` : `lot ${c.code_lot}`;

  return (
    <>
      <Link href="/qualite/controles" className="text-papel-700 underline">← Contrôles</Link>
      <TitrePage
        titre={`Contrôle ${ETAPES_CONTROLE[c.etape!].toLowerCase()} – ${objet}`}
        sousTitre={formaterDate(c.date_controle)}
        action={c.statut === "brouillon" ? <Badge ton="alerte">En cours</Badge> : c.resultat === "conforme" ? <Badge ton="succes">Conforme</Badge> : <Badge ton="erreur">Non conforme</Badge>}
      />
      {c.statut === "brouillon" ? (
        <Carte titre="Mesures">
          <FormulaireMesures controleId={id} criteres={(criteres ?? []).map((x) => ({ ...x, valeur_min: x.valeur_min === null ? null : Number(x.valeur_min), valeur_max: x.valeur_max === null ? null : Number(x.valeur_max) }))} />
          <form action={supprimerControle.bind(null, id)} className="mt-3">
            <button className="min-h-11 font-semibold text-red-700 underline">Supprimer ce contrôle</button>
          </form>
        </Carte>
      ) : (
        <Carte titre="Résultats">
          {nc && nc.length > 0 && (
            <p className="mb-3">
              Non-conformité ouverte :{" "}
              {nc.map((n) => (
                <Link key={n.id} href={`/qualite/non-conformites/${n.id}`} className="font-mono font-semibold text-papel-700 underline">{n.numero}</Link>
              ))}
            </p>
          )}
          <Tableau entetes={["Critère", "Valeur", "Tolérance", "Résultat", "Commentaire"]}>
            {(mesures ?? [])
              .sort((a, b) => (a.criteres_qualite?.ordre ?? 0) - (b.criteres_qualite?.ordre ?? 0))
              .map((m) => (
                <tr key={m.id}>
                  <Cellule>{m.criteres_qualite?.libelle}</Cellule>
                  <Cellule>{m.valeur === null ? "—" : `${nombre(m.valeur, 3)} ${m.criteres_qualite?.unite ?? ""}`}</Cellule>
                  <Cellule>{libelleTolerance({ min: m.criteres_qualite?.valeur_min ?? null, max: m.criteres_qualite?.valeur_max ?? null }, m.criteres_qualite?.unite)}</Cellule>
                  <Cellule>{m.conforme ? <Badge ton="succes">Conforme</Badge> : <Badge ton="erreur">Non conforme</Badge>}</Cellule>
                  <Cellule className="text-sm">{m.commentaire}</Cellule>
                </tr>
              ))}
          </Tableau>
          {c.notes && <p className="mt-3 text-gray-700">Observations : {c.notes}</p>}
        </Carte>
      )}
    </>
  );
}
