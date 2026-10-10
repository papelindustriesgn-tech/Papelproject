import { notFound } from "next/navigation";
import { Badge, Bouton, Carte, TitrePage } from "@/components/ui";
import { clientServeur } from "@/lib/supabase/serveur";
import { changerActivation } from "../actions";
import { FormulaireCodeSerie, FormulaireMotDePasse, FormulaireRoles } from "./formulaires";

export default async function PageUtilisateur({ params }: PageProps<"/admin/utilisateurs/[id]">) {
  const { id } = await params;
  const supabase = await clientServeur();
  const { data: p } = await supabase
    .from("profils")
    .select("id, identifiant, nom, prenom, telephone, actif, created_at, code_serie, utilisateur_roles(role)")
    .eq("id", id)
    .maybeSingle();
  if (!p) notFound();

  return (
    <>
      <TitrePage
        fil={[{ libelle: "Utilisateurs", href: "/admin/utilisateurs" }]}
        titre={`${p.prenom} ${p.nom}`}
        sousTitre={`Identifiant : ${p.identifiant}${p.telephone ? ` · ${p.telephone}` : ""}`}
        action={p.actif ? <Badge ton="succes">Actif</Badge> : <Badge ton="erreur">Désactivé</Badge>}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Carte titre="Rôles">
          <FormulaireRoles utilisateurId={p.id} roles={p.utilisateur_roles.map((r) => r.role)} />
        </Carte>
        <div className="flex flex-col gap-4">
          {p.utilisateur_roles.some((r) => r.role === "commercial_terrain") && (
            <Carte titre="Série de numérotation (application terrain)">
              <FormulaireCodeSerie utilisateurId={p.id} code={p.code_serie} />
            </Carte>
          )}
          <Carte titre="Mot de passe">
            <FormulaireMotDePasse utilisateurId={p.id} />
          </Carte>
          <Carte titre="Accès">
            <p className="mb-3 text-gray-700">
              {p.actif
                ? "Désactiver le compte bloque immédiatement la connexion et tous les accès aux données. L'historique est conservé."
                : "Ce compte est désactivé. Le réactiver lui rend ses accès."}
            </p>
            <form action={changerActivation.bind(null, p.id, !p.actif)}>
              <Bouton type="submit" variante={p.actif ? "danger" : "principal"}>
                {p.actif ? "Désactiver le compte" : "Réactiver le compte"}
              </Bouton>
            </form>
          </Carte>
        </div>
      </div>
    </>
  );
}
