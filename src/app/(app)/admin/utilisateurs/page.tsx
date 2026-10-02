import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { LIBELLES_ROLES, type Role } from "@/lib/auth/espaces";
import { clientServeur } from "@/lib/supabase/serveur";
import { FormulaireCreation } from "./formulaire-creation";

export const metadata: Metadata = { title: "Utilisateurs" };

export default async function PageUtilisateurs() {
  const supabase = await clientServeur();
  const { data: profils } = await supabase
    .from("profils")
    .select("id, identifiant, nom, prenom, telephone, actif, utilisateur_roles(role)")
    .order("nom");

  return (
    <>
      <TitrePage titre="Utilisateurs" sousTitre="Comptes, rôles et accès. Chaque rôle ne voit que son espace." />
      <div className="flex flex-col gap-4">
        <Carte titre={`Comptes (${profils?.length ?? 0})`}>
          <Tableau entetes={["Nom", "Identifiant", "Téléphone", "Rôles", "État", ""]}>
            {(profils ?? []).map((p) => (
              <tr key={p.id}>
                <Cellule>
                  {p.prenom} {p.nom}
                </Cellule>
                <Cellule className="font-mono text-sm">{p.identifiant}</Cellule>
                <Cellule>{p.telephone ?? "—"}</Cellule>
                <Cellule>{p.utilisateur_roles.map((r) => LIBELLES_ROLES[r.role as Role]).join(", ")}</Cellule>
                <Cellule>{p.actif ? <Badge ton="succes">Actif</Badge> : <Badge ton="erreur">Désactivé</Badge>}</Cellule>
                <Cellule>
                  <Link href={`/admin/utilisateurs/${p.id}`} className="font-semibold text-papel-700 underline">
                    Modifier
                  </Link>
                </Cellule>
              </tr>
            ))}
          </Tableau>
        </Carte>
        <Carte titre="Nouveau compte">
          <FormulaireCreation />
        </Carte>
      </div>
    </>
  );
}
