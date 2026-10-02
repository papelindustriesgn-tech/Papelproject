import type { Metadata } from "next";
import { Badge, Bouton, Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { formaterMontant } from "@/lib/metier/devises";
import { aujourdhui, formaterDate } from "@/lib/formulaires/dates";
import { clientServeur } from "@/lib/supabase/serveur";
import { basculerConditionnement, basculerProduit } from "./actions";
import { FormulaireConditionnement, FormulaireNouveauProduit, FormulairePrix, FormulaireProduit } from "./formulaires";

export const metadata: Metadata = { title: "Produits et prix" };

const nf = new Intl.NumberFormat("fr-FR");
const fr = (n: number) => nf.format(n).replace(/ /g, " ");

export default async function PageProduits() {
  const supabase = await clientServeur();
  const date = aujourdhui();
  const [{ data: produits }, { data: niveaux }] = await Promise.all([
    supabase.from("produits").select("*, conditionnements(*), grille_prix(*)").order("actif", { ascending: false }).order("ordre"),
    supabase.from("niveaux_prix").select("code, libelle, actif").order("ordre"),
  ]);
  const libelleNiveau = new Map((niveaux ?? []).map((n) => [n.code, n.libelle]));
  const niveauxActifs = (niveaux ?? []).filter((n) => n.actif);

  return (
    <>
      <TitrePage titre="Produits et prix" sousTitre="Le rendement théorique est recalculé automatiquement. Les prix sont fixés au paquet et historisés." />
      <div className="flex flex-col gap-6">
        {(produits ?? []).map((p) => {
          const prixActuel = (niveau: string) =>
            p.grille_prix.find((g) => g.niveau === niveau && g.date_debut <= date && (!g.date_fin || g.date_fin >= date));
          const prixPapel = prixActuel("papel")?.prix_paquet_gnf;
          const conditionnements = [...p.conditionnements].sort((a, b) => a.paquets_par_colis - b.paquets_par_colis);
          return (
            <Carte
              key={p.id}
              titre={
                <>
                  {p.libelle} ({p.code}) {!p.actif && <Badge ton="neutre">Archivé</Badge>}
                </>
              }
              action={
                <form action={basculerProduit.bind(null, p.id, !p.actif)}>
                  <Bouton type="submit" variante="discret">
                    {p.actif ? "Archiver" : "Réactiver"}
                  </Bouton>
                </form>
              }
            >
              <div className="mb-4 grid gap-2 sm:grid-cols-3">
                <div className="rounded-lg bg-papel-50 p-3">
                  <div className="text-sm text-gray-700">Poids théorique d&apos;un paquet</div>
                  <div className="text-xl font-bold">{String(p.poids_paquet_g).replace(".", ",")} g</div>
                </div>
                <div className="rounded-lg bg-papel-50 p-3">
                  <div className="text-sm text-gray-700">Rendement théorique</div>
                  <div className="text-xl font-bold">{fr(p.rendement_theorique_paquets_t ?? 0)} paquets/t</div>
                </div>
                <div className="rounded-lg bg-papel-50 p-3">
                  <div className="text-sm text-gray-700">Prix Papel actuel (HT)</div>
                  <div className="text-xl font-bold">{prixPapel ? `${formaterMontant(prixPapel)} / paquet` : "Non défini"}</div>
                </div>
              </div>

              <h3 className="mb-2 font-bold">Caractéristiques</h3>
              <FormulaireProduit p={p} />

              <h3 className="mt-6 mb-2 font-bold">Conditionnements (colis)</h3>
              <Tableau entetes={["Colis", "Paquets / colis", "Prix Papel du colis (HT)", "État", ""]}>
                {conditionnements.map((c) => (
                  <tr key={c.id}>
                    <Cellule>
                      {c.libelle} {c.par_defaut && <Badge>Par défaut</Badge>}
                    </Cellule>
                    <Cellule>{c.paquets_par_colis}</Cellule>
                    <Cellule>{prixPapel ? formaterMontant(prixPapel * c.paquets_par_colis) : "—"}</Cellule>
                    <Cellule>{c.actif ? <Badge ton="succes">Actif</Badge> : <Badge ton="neutre">Inactif</Badge>}</Cellule>
                    <Cellule>
                      {!c.par_defaut && (
                        <form action={basculerConditionnement.bind(null, c.id, !c.actif)}>
                          <button className="min-h-11 font-semibold text-papel-700 underline">{c.actif ? "Désactiver" : "Activer"}</button>
                        </form>
                      )}
                    </Cellule>
                  </tr>
                ))}
              </Tableau>
              <div className="mt-3">
                <FormulaireConditionnement produitId={p.id} />
              </div>

              <h3 className="mt-6 mb-2 font-bold">Prix au paquet (hors taxes, identique quel que soit le colis)</h3>
              <Tableau entetes={["Niveau", "Prix / paquet HT", "Du", "Au", "Note"]}>
                {[...p.grille_prix]
                  .sort((a, b) => a.niveau.localeCompare(b.niveau) || b.date_debut.localeCompare(a.date_debut))
                  .map((g) => {
                    const enVigueur = g.date_debut <= date && (!g.date_fin || g.date_fin >= date);
                    return (
                      <tr key={g.id} className={enVigueur ? "" : "text-gray-500"}>
                        <Cellule>
                          {libelleNiveau.get(g.niveau) ?? g.niveau} {enVigueur && <Badge ton="succes">En vigueur</Badge>}
                        </Cellule>
                        <Cellule className="font-semibold">{formaterMontant(g.prix_paquet_gnf)}</Cellule>
                        <Cellule>{formaterDate(g.date_debut)}</Cellule>
                        <Cellule>{g.date_fin ? formaterDate(g.date_fin) : "—"}</Cellule>
                        <Cellule>{g.note ?? ""}</Cellule>
                      </tr>
                    );
                  })}
              </Tableau>
              <div className="mt-3 rounded-lg border border-gray-200 p-3">
                <FormulairePrix produitId={p.id} dateDuJour={date} niveaux={niveauxActifs} />
              </div>
            </Carte>
          );
        })}
        <Carte titre="Nouveau produit">
          <FormulaireNouveauProduit />
        </Carte>
      </div>
    </>
  );
}
