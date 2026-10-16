import { ArrowRight, CheckCircle2, Clock, Inbox, Send } from "lucide-react";
import Link from "next/link";
import { Badge, Bouton, Carte, TitrePage } from "@/components/ui";
import { ESPACES } from "@/lib/auth/espaces";
import { exigerEspace } from "@/lib/auth/session";
import { aujourdhui, formaterDate, formaterDateHeure, ilYA } from "@/lib/formulaires/dates";
import { clientServeur } from "@/lib/supabase/serveur";
import { changerStatutTache } from "@/lib/taches/actions";
import { ESPACES_TACHES, STATUTS_TACHE } from "@/lib/taches/libelles";
import type { Database } from "@/lib/supabase/types";
import { FormulaireTache } from "./formulaire-tache";

type Tache = Database["public"]["Views"]["taches_etat"]["Row"];
const libelleEspace = (code: string | null) => ESPACES.find((e) => e.code === code)?.libelle ?? code ?? "";

/**
 * Page « Tâches » d'une application : coordination entre services. Demandes reçues (à prendre en charge puis
 * terminer avec un compte rendu), demandes envoyées (suivi), et nouvelle demande à un autre service.
 */
export async function PageTaches({ espace }: { espace: string }) {
  const u = await exigerEspace(espace);
  const peutAnnuler = (t: Tache) => t.cree_par === u.id || u.roles.includes("direction");
  const supabase = await clientServeur();
  const depuis = `${ilYA(30)}T00:00:00Z`;
  const [{ data: recues }, { data: envoyees }, { data: terminees }] = await Promise.all([
    supabase.from("taches_etat").select("*").eq("espace_destinataire", espace).in("statut", ["a_faire", "en_cours"]).order("priorite", { ascending: false }).order("created_at"),
    supabase.from("taches_etat").select("*").eq("espace_emetteur", espace).in("statut", ["a_faire", "en_cours"]).order("created_at", { ascending: false }),
    supabase.from("taches_etat").select("*").or(`espace_destinataire.eq.${espace},espace_emetteur.eq.${espace}`).in("statut", ["faite", "annulee"]).gte("termine_le", depuis).order("termine_le", { ascending: false }).limit(50),
  ]);
  const jour = aujourdhui();
  const services = ESPACES_TACHES.filter((c) => c !== espace).map((c) => ({ code: c, libelle: libelleEspace(c) }));
  const libelle = libelleEspace(espace);

  return (
    <>
      <TitrePage titre="Tâches" sousTitre="Demandes entre services : qui doit faire quoi, pour quand, et où on en est" fil={[{ libelle, href: `/${espace}` }]} />
      <div className="grid gap-4 xl:grid-cols-2">
        <Carte
          titre={
            <span className="flex items-center gap-2">
              <Inbox size={18} className="text-papel-700" aria-hidden /> Demandes reçues ({recues?.length ?? 0})
            </span>
          }
        >
          {recues?.length ? (
            <ul className="flex flex-col gap-3">
              {recues.map((t) => (
                <CarteTache key={t.id} t={t} jour={jour} sens="recue" espace={espace} />
              ))}
            </ul>
          ) : (
            <p className="flex items-center gap-2 font-semibold text-green-800">
              <CheckCircle2 size={20} aria-hidden /> Aucune demande en attente.
            </p>
          )}
        </Carte>
        <Carte
          titre={
            <span className="flex items-center gap-2">
              <Send size={18} className="text-papel-700" aria-hidden /> Nouvelle demande à un service
            </span>
          }
        >
          <FormulaireTache espace={espace} services={services} />
        </Carte>
      </div>
      <Carte titre={`Demandes envoyées en attente (${envoyees?.length ?? 0})`} className="mt-4">
        {envoyees?.length ? (
          <ul className="flex flex-col gap-3">
            {envoyees.map((t) => (
              <CarteTache key={t.id} t={t} jour={jour} sens="envoyee" espace={espace} annulable={peutAnnuler(t)} />
            ))}
          </ul>
        ) : (
          <p className="text-gray-600">Aucune demande en attente chez un autre service.</p>
        )}
      </Carte>
      {!!terminees?.length && (
        <Carte titre="Terminées ces 30 derniers jours" className="mt-4">
          <ul className="divide-y divide-gray-100">
            {terminees.map((t) => (
              <li key={t.id} className="py-2 text-sm">
                <span className="font-semibold text-gray-900">{t.titre}</span>{" "}
                <Badge ton={STATUTS_TACHE[t.statut ?? ""]?.ton ?? "neutre"}>{STATUTS_TACHE[t.statut ?? ""]?.libelle}</Badge>
                <span className="block text-gray-600">
                  {libelleEspace(t.espace_emetteur)} → {libelleEspace(t.espace_destinataire)}
                  {t.termine_le ? ` · ${formaterDateHeure(t.termine_le)}` : ""}
                  {t.termine_par_nom ? ` par ${t.termine_par_nom}` : ""}
                  {t.compte_rendu ? ` · « ${t.compte_rendu} »` : ""}
                </span>
              </li>
            ))}
          </ul>
        </Carte>
      )}
    </>
  );
}

function CarteTache({ t, jour, sens, espace, annulable = false }: { t: Tache; jour: string; sens: "recue" | "envoyee"; espace: string; annulable?: boolean }) {
  const enRetard = !!t.echeance && t.echeance < jour;
  const statut = STATUTS_TACHE[t.statut ?? ""];
  return (
    <li className={`rounded-2xl p-3 ring-1 ${t.priorite === "urgente" || enRetard ? "bg-red-50 ring-red-200" : "bg-gray-50 ring-gray-100"}`}>
      <div className="flex flex-wrap items-center gap-2">
        {t.priorite === "urgente" && <Badge ton="erreur">Urgent</Badge>}
        <Badge ton={statut?.ton ?? "neutre"}>{statut?.libelle}</Badge>
        <span className="text-sm text-gray-600">
          {sens === "recue" ? `De : ${libelleEspace(t.espace_emetteur)}` : `Pour : ${libelleEspace(t.espace_destinataire)}`}
          {t.cree_par_nom ? ` · ${t.cree_par_nom}` : ""} · {formaterDateHeure(t.created_at!)}
        </span>
      </div>
      <p className="mt-1 font-semibold text-gray-900">{t.titre}</p>
      {t.description && <p className="text-sm text-gray-700">{t.description}</p>}
      <p className="mt-1 flex flex-wrap items-center gap-3 text-sm">
        {t.echeance && (
          <span className={`flex items-center gap-1 ${enRetard ? "font-bold text-red-700" : "text-gray-600"}`}>
            <Clock size={14} aria-hidden /> Pour le {formaterDate(t.echeance)}
            {enRetard ? " (en retard)" : ""}
          </span>
        )}
        {t.statut === "en_cours" && t.pris_par_nom && <span className="text-gray-600">Pris en charge par {t.pris_par_nom}</span>}
        {t.lien && (
          <Link href={t.lien} className="flex items-center gap-1 font-semibold text-papel-700 hover:underline">
            Ouvrir <ArrowRight size={14} aria-hidden />
          </Link>
        )}
      </p>
      {sens === "recue" ? (
        <div className="mt-2 flex flex-wrap items-end gap-2">
          {t.statut === "a_faire" && (
            <form action={changerStatutTache.bind(null, espace, t.id!, "en_cours")}>
              <Bouton type="submit" variante="secondaire" className="min-h-10 text-sm">
                Je m&apos;en occupe
              </Bouton>
            </form>
          )}
          <form action={changerStatutTache.bind(null, espace, t.id!, "faite")} className="flex flex-1 flex-wrap items-end gap-2">
            <label className="flex min-w-48 flex-1 flex-col text-sm text-gray-700">
              Compte rendu (facultatif)
              <input name="compte_rendu" className="min-h-10 rounded-xl border border-gray-300 bg-white px-3" placeholder="Ex. 20 colis préparés au quai" />
            </label>
            <Bouton type="submit" className="min-h-10 text-sm">
              Terminer
            </Bouton>
          </form>
        </div>
      ) : (
        annulable && (
        <form action={changerStatutTache.bind(null, espace, t.id!, "annulee")} className="mt-2">
          <Bouton type="submit" variante="secondaire" className="min-h-10 text-sm">
            Annuler la demande
          </Bouton>
        </form>
        )
      )}
    </li>
  );
}
