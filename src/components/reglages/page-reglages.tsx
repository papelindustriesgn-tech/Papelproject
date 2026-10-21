import { Carte, Message, TitrePage } from "@/components/ui";
import { ESPACES } from "@/lib/auth/espaces";
import { catalogueEcrans } from "@/lib/navigation/ecrans";
import { CATEGORIES_PARAMETRES } from "@/lib/navigation/indicateurs";
import { clientServeur } from "@/lib/supabase/serveur";
import { FormulaireElement, type Element } from "./formulaires";
import { LigneParametre } from "./ligne-parametre";

// Ce que l'administrateur règle pour chaque application (la phrase d'accueil et le parcours « Comment ça marche »
// ne s'affichent plus depuis la simplification du 17/10/2026 : ils ne sont plus proposés ici).
const BLOCS: { genre: Element["genre"]; titre: string; aide: string }[] = [
  {
    genre: "action",
    titre: "1. Boutons d'action (en haut à droite de la vue d'ensemble)",
    aide: "Le bouton n° 1 est le bouton principal, en couleur : mettez-y le geste le plus fréquent du service. Seuls les boutons n° 2 et 3 s'affichent à côté ; les suivants sont ignorés.",
  },
  {
    genre: "tache",
    titre: "2. Alertes « À faire » (menu Alertes)",
    aide: "Choisissez ce que l'ERP doit compter pour le service. La ligne n'apparaît dans « Alertes » (et dans la pastille rouge) que s'il y a au moins « Afficher à partir de » éléments en attente.",
  },
];

/**
 * Réglages d'un service, faits par l'administrateur dans l'interface (rien n'est figé dans le code) :
 * boutons d'action, alertes « À faire » et paramètres de calcul de son domaine.
 */
export async function PageReglages({ espace }: { espace: string }) {
  const s = await clientServeur();
  const categories = CATEGORIES_PARAMETRES[espace] ?? [];
  const [{ data: elements }, { data: modifiable }, { data: parametres }] = await Promise.all([
    s.from("accueil_elements").select("id, genre, libelle, description, ecran, icone, indicateur, urgent, seuil, ordre, actif").eq("espace", espace).order("ordre").order("created_at"),
    s.rpc("peut_regler_espace", { p_espace: espace }),
    categories.length ? s.from("parametres").select("cle, libelle, description, type_valeur, unite, valeur, categorie").in("categorie", categories.map((c) => c.code)).order("libelle") : Promise.resolve({ data: [] }),
  ]);
  const ecrans = catalogueEcrans();
  const libelle = ESPACES.find((e) => e.code === espace)?.libelle ?? espace;
  const peut = modifiable === true;

  return (
    <>
      <TitrePage titre={libelle} fil={[{ libelle: "Réglages des services", href: "/admin/reglages" }]} sousTitre={`Les boutons et les alertes de l'application ${libelle}, et les seuils de ses calculs. Chaque modification est tracée.`} />
      {!peut && <Message ton="info">Seul l&apos;administrateur peut modifier ces réglages.</Message>}
      <div className="flex flex-col gap-4">
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
