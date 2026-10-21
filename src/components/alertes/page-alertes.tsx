import { Settings } from "lucide-react";
import Link from "next/link";
import { TitrePage } from "@/components/ui";
import { chargerAlertesEspace } from "@/lib/alertes/espaces";
import { exigerEspace } from "@/lib/auth/session";
import { ESPACES } from "@/lib/auth/espaces";
import { ListeAlertes } from "./liste-alertes";

/**
 * Page « Alertes » d'une application (menu de gauche, avec le nombre en pastille rouge) : ce qui demande une action,
 * critiques d'abord — lignes « À faire » réglées par l'administrateur, commandes clients à servir, alertes de stock,
 * de production, d'impayés… Chaque carte ouvre l'écran où agir.
 */
export async function PageAlertes({ espace }: { espace: string }) {
  const u = await exigerEspace(espace);
  const alertes = await chargerAlertesEspace(espace);
  const libelle = ESPACES.find((e) => e.code === espace)?.libelle ?? "";
  return (
    <>
      <TitrePage
        titre="Alertes"
        sousTitre={espace === "direction" ? "Ce qui demande une action aujourd'hui, dans tous les services" : "Ce qui demande une action aujourd'hui dans cette application"}
        fil={[{ libelle, href: `/${espace}` }]}
        action={
          u.roles.includes("admin") ? (
            <Link href={`/admin/reglages/${espace}`} className="flex min-h-10 items-center gap-1 rounded-xl px-3 text-sm font-semibold text-papel-700 hover:bg-papel-50">
              <Settings size={16} aria-hidden /> Choisir les alertes
            </Link>
          ) : undefined
        }
      />
      <ListeAlertes alertes={alertes} tout titre="À traiter" />
    </>
  );
}
