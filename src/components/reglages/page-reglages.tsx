import { Carte, Message, TitrePage } from "@/components/ui";
import { ESPACES } from "@/lib/auth/espaces";
import { catalogueEcrans } from "@/lib/navigation/ecrans";
import { CATEGORIES_PARAMETRES } from "@/lib/navigation/indicateurs";
import { clientServeur } from "@/lib/supabase/serveur";
import { FormulaireElement, FormulairePromesse, type Element } from "./formulaires";
import { LigneParametre } from "./ligne-parametre";

const BLOCS: { genre: Element["genre"]; titre: string; aide: string }[] = [
  { genre: "action", titre: "2. Boutons « Que voulez-vous faire ? »", aide: "Le bouton n° 1 est le grand bouton principal : mettez-y le geste le plus fréquent du service. Les autres s'affichent en plus petit." },
  { genre: "etape", titre: "3. Parcours « Comment ça marche »", aide: "Les étapes du travail, dans l'ordre. Chaque étape ouvre l'écran correspondant." },
  { genre: "tache", titre: "4. « À faire aujourd'hui »", aide: "Choisissez ce que l'ERP doit compter pour vous. La ligne n'apparaît que s'il y a au moins « Afficher à partir de » éléments en attente." },
];

/**
 * Réglages d'un service, faits par le service lui-même (rien n'est figé dans le code) :
 * entrée de l'application (phrase, boutons, parcours, « À faire ») et paramètres de calcul de son domaine.
 */
export async function PageReglages({ espace }: { espace: string }) {
  const s = await clientServeur();
  const categories = CATEGORIES_PARAMETRES[espace] ?? [];
  const [{ data: accueil }, { data: elements }, { data: modifiable }, { data: parametres }] = await Promise.all([
    s.from("accueil_espaces").select("promesse").eq("espace", espace).maybeSingle(),
    s.from("accueil_elements").select("id, genre, libelle, description, ecran, icone, indicateur, urgent, seuil, ordre, actif").eq("espace", espace).order("ordre").order("created_at"),
    s.rpc("peut_regler_espace", { p_espace: espace }),
    categories.length ? s.from("parametres").select("cle, libelle, description, type_valeur, unite, valeur, categorie").in("categorie", categories.map((c) => c.code)).order("libelle") : Promise.resolve({ data: [] }),
  ]);
  const ecrans = catalogueEcrans();
  const libelle = ESPACES.find((e) => e.code === espace)?.libelle ?? espace;
  const peut = modifiable === true;

  return (
    <>
      <TitrePage titre="Réglages du service" fil={[{ libelle, href: `/${espace}` }]} sousTitre="Ce que voit votre équipe en ouvrant l'application, et les seuils de vos calculs. Chaque modification est tracée." />
      {!peut && <Message ton="info">Seul le responsable du service, la Direction ou l&apos;administrateur peut modifier ces réglages.</Message>}
      <div className="flex flex-col gap-4">
        <Carte titre="1. Phrase d'accueil">
          <FormulairePromesse espace={espace} promesse={accueil?.promesse ?? ""} modifiable={peut} />
        </Carte>
        {BLOCS.map((b) => {
          const liste = ((elements ?? []) as Element[]).filter((e) => e.genre === b.genre);
          return (
            <Carte key={b.genre} titre={b.titre}>
              <p className="mb-1 text-sm text-gray-600">{b.aide}</p>
              {liste.map((e) => (
                <FormulaireElement key={e.id} espace={espace} genre={b.genre} element={e} ecrans={ecrans} modifiable={peut} />
              ))}
              {peut && (
                <details className="mt-2 rounded-lg border border-dashed border-papel-300 px-3">
                  <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-papel-700">+ Ajouter</summary>
                  <FormulaireElement espace={espace} genre={b.genre} ecrans={ecrans} modifiable ordreSuivant={liste.length + 1} />
                </details>
              )}
            </Carte>
          );
        })}
        {categories.map((c) => {
          const liste = (parametres ?? []).filter((p) => p.categorie === c.code);
          if (!liste.length) return null;
          return (
            <Carte key={c.code} titre={`Paramètres de calcul – ${c.libelle}`}>
              {liste.map((p) => (
                <LigneParametre key={p.cle} p={p} />
              ))}
            </Carte>
          );
        })}
      </div>
    </>
  );
}
