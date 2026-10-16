import Link from "next/link";
import { Carte, TitrePage } from "@/components/ui";
import { exigerEspace } from "@/lib/auth/session";
import { aujourdhui } from "@/lib/formulaires/dates";
import { OBJECTIFS, versSaisie } from "@/lib/objectifs/catalogue";
import { clientServeur } from "@/lib/supabase/serveur";
import { FormulaireObjectifs } from "./formulaire-objectifs";

/**
 * Écran « Objectifs mensuels » d'une application : la grille de l'année choisie (une ligne par mois).
 * Lisible par le service ; modifiable par la Direction et l'administrateur. Le réel est comparé à ces
 * objectifs sur la vue d'ensemble de l'application.
 */
export async function PageObjectifs({ espace, libelle, sp }: { espace: string; libelle: string; sp: Record<string, string | string[] | undefined> }) {
  const u = await exigerEspace(espace);
  const courante = Number(aujourdhui().slice(0, 4));
  const demandee = Number(Array.isArray(sp.annee) ? sp.annee[0] : sp.annee);
  const annee = Number.isInteger(demandee) && demandee >= 2025 && demandee <= courante + 3 ? demandee : courante;
  const definitions = OBJECTIFS[espace] ?? [];
  const supabase = await clientServeur();
  const { data } = await supabase.from("objectifs_services").select("indicateur, mois, valeur").eq("espace", espace).gte("mois", `${annee}-01-01`).lte("mois", `${annee}-12-01`);
  const valeurs: Record<string, string> = {};
  for (const o of data ?? []) {
    const d = definitions.find((x) => x.code === o.indicateur);
    if (d) valeurs[`o|${d.code}|${o.mois.slice(0, 7)}`] = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 }).format(versSaisie(Number(o.valeur), d.unite)).replace(/[\u202f\u00a0]/g, " ");
  }
  const modifiable = u.roles.includes("direction") || u.roles.includes("admin");
  const annees = Array.from({ length: courante + 3 - 2025 + 1 }, (_, i) => 2025 + i);

  return (
    <>
      <TitrePage titre="Objectifs mensuels" sousTitre={`${libelle} · un objectif par mois, comparé au réel sur la vue d'ensemble`} fil={[{ libelle, href: `/${espace}` }]} />
      <nav aria-label="Année" className="mb-4 flex flex-wrap gap-1">
        {annees.map((a) => (
          <Link
            key={a}
            href={`/${espace}/objectifs?annee=${a}`}
            aria-current={a === annee ? "page" : undefined}
            className={`flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold md:min-h-10 ${a === annee ? "bg-papel-700 text-white" : "ombre-carte bg-white text-gray-700 hover:bg-papel-50"}`}
          >
            {a}
          </Link>
        ))}
      </nav>
      <Carte>
        {definitions.length ? (
          <FormulaireObjectifs key={annee} espace={espace} annee={annee} definitions={definitions} valeurs={valeurs} modifiable={modifiable} />
        ) : (
          <p className="text-gray-600">Aucun indicateur à suivre pour cette application.</p>
        )}
      </Carte>
      <p className="mt-3 text-sm text-gray-600">
        Pour une semaine ou un jour, une quantité (CA, paquets, visites…) prend la part du mois au prorata des jours ; un taux ou un délai garde la valeur du mois.
        Un objectif « maximum » (pertes, délais, coûts) est atteint tant que le réel reste en dessous.
      </p>
    </>
  );
}
