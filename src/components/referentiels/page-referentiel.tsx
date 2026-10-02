import Link from "next/link";
import { notFound } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ExportCsv } from "@/components/donnees/export-csv";
import { BarreFiltres, lireParam, motifRecherche } from "@/components/donnees/filtres";
import { Badge, Bouton, Carte, TitrePage } from "@/components/ui";
import { basculerActif } from "@/lib/referentiels/actions";
import { referentiel, referentielsDeLEspace } from "@/lib/referentiels/definitions";
import { clientServeur } from "@/lib/supabase/serveur";
import { BoutonSupprimer, FormulaireLigne, type OptionsReferences } from "./formulaire-ligne";

const PAR_PAGE = 100;

/** Index des listes de référence d'un espace. */
export function IndexReferentiels({ espace }: { espace: string }) {
  return (
    <>
      <TitrePage titre="Listes de référence" sousTitre="Toutes ces listes sont modifiables par vos équipes." />
      <div className="grid gap-3 sm:grid-cols-2">
        {referentielsDeLEspace(espace).map((r) => (
          <Link key={r.code} href={`/${espace}/listes/${r.code}`} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:border-papel-300">
            <div className="text-lg font-bold text-papel-900">{r.titre}</div>
            <div className="text-gray-600">{r.description}</div>
          </Link>
        ))}
      </div>
    </>
  );
}

/** Page générique d'une liste : recherche, ajout, modification, archivage, export. */
export async function PageReferentiel({
  espace,
  code,
  searchParams,
}: {
  espace: string;
  code: string;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const def = referentiel(code);
  if (!def || !def.espaces.includes(espace)) notFound();

  const q = lireParam(searchParams, "q");
  const voirArchives = lireParam(searchParams, "archives") === "1";
  const supabase = (await clientServeur()) as unknown as SupabaseClient;

  // Options des champs « référence » (ex. liste des villes pour une commune).
  const options: OptionsReferences = {};
  for (const c of def.champs) {
    if (c.type === "reference" && c.reference) {
      const cle = c.reference.cle ?? "id";
      const { data } = await supabase.from(c.reference.table).select(`${cle}, ${c.reference.libelle}`).order(c.reference.libelle).limit(2000);
      options[c.nom] = ((data ?? []) as unknown as Record<string, string>[]).map((d) => ({ valeur: d[cle], libelle: d[c.reference!.libelle] }));
    }
  }

  const champTexte = def.champs.find((c) => c.type === "texte")?.nom;
  let requete = supabase.from(def.table).select("*").order(def.tri).limit(PAR_PAGE);
  if (q && champTexte) requete = requete.ilike(champTexte, motifRecherche(q));
  if (def.archivable && !voirArchives) requete = requete.eq("actif", true);
  const { data, error } = await requete;
  const lignes = (data ?? []) as Record<string, unknown>[];

  const texte = (ligne: Record<string, unknown>, nom: string) => (ligne[nom] === null || ligne[nom] === undefined ? "" : String(ligne[nom]));
  const affichage = (ligne: Record<string, unknown>, nom: string) => {
    const c = def.champs.find((x) => x.nom === nom)!;
    const v = texte(ligne, nom);
    if (c.type === "reference") return options[nom]?.find((o) => o.valeur === v)?.libelle ?? "";
    if (c.type === "choix") return c.options?.find((o) => o.valeur === v)?.libelle ?? v;
    if (c.type === "booleen") return v === "true" ? "oui" : "non";
    return v;
  };

  return (
    <>
      <Link href={`/${espace}/listes`} className="text-papel-700 underline">
        ← Toutes les listes
      </Link>
      <TitrePage titre={def.titre} sousTitre={def.description} />
      <div className="flex flex-col gap-4">
        <Carte titre="Ajouter">
          <FormulaireLigne espace={espace} code={code} id={null} champs={def.champs} options={options} />
        </Carte>
        <Carte titre={`${lignes.length}${lignes.length === PAR_PAGE ? "+" : ""} élément(s)`}>
          <BarreFiltres
            recherche={q}
            valeurs={{ archives: voirArchives ? "1" : undefined }}
            filtres={def.archivable ? [{ nom: "archives", libelle: "Archivés", options: [{ valeur: "1", libelle: "Afficher aussi les archivés" }] }] : []}
            action={
              <ExportCsv
                nomFichier={def.code}
                entetes={def.champs.map((c) => c.libelle).concat(def.archivable ? ["Actif"] : [])}
                lignes={lignes.map((l) => def.champs.map((c) => affichage(l, c.nom) as string | number).concat(def.archivable ? [l.actif ? "oui" : "non"] : []))}
              />
            }
          />
          {error && <p className="text-red-700">Lecture impossible : vous n&apos;avez peut-être pas les droits.</p>}
          <ul className="divide-y divide-gray-100">
            {lignes.map((l) => {
              const id = texte(l, def.cle);
              const valeurs = Object.fromEntries(def.champs.map((c) => [c.nom, texte(l, c.nom)]));
              return (
                <li key={id} className={`py-3 ${def.archivable && !l.actif ? "opacity-60" : ""}`}>
                  <FormulaireLigne espace={espace} code={code} id={id} champs={def.champs} valeurs={valeurs} options={options} />
                  <div className="mt-1 flex items-center gap-2">
                    {def.archivable ? (
                      <>
                        {!l.actif && <Badge ton="neutre">Archivé</Badge>}
                        <form action={basculerActif.bind(null, espace, code, id, !l.actif)}>
                          <Bouton type="submit" variante="discret">
                            {l.actif ? "Archiver" : "Réactiver"}
                          </Bouton>
                        </form>
                      </>
                    ) : (
                      <BoutonSupprimer espace={espace} code={code} id={id} />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Carte>
      </div>
    </>
  );
}
