import { CheckCircle2, ChevronRight, CircleAlert, History, Inbox, ListTodo } from "lucide-react";
import Link from "next/link";
import { ActionsDuJour } from "@/components/coque/entree-appli";
import { chargerAlertesEspace } from "@/lib/alertes/espaces";
import { chargerRecents } from "@/lib/accueil/recents";
import { formaterDateHeure } from "@/lib/formulaires/dates";
import { clientServeur } from "@/lib/supabase/serveur";

/**
 * Haut de la vue d'ensemble d'un service : « À faire aujourd'hui » (les gestes du jour, en tuiles).
 * Les indicateurs viennent juste après ; « En attente de vous » et « Ce qui vient de se passer » (`SuiviTravail`)
 * en bas de page, pour que les indicateurs restent visibles sans défiler.
 */
export function AccueilTravail({ espace }: { espace: string }) {
  return (
    <section aria-labelledby="titre-a-faire" className="mb-4">
      <h2 id="titre-a-faire" className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
        <ListTodo size={16} aria-hidden /> À faire aujourd&apos;hui
      </h2>
      <ActionsDuJour espace={espace} />
    </section>
  );
}

/** Bas de la vue d'ensemble : ce qui attend le service (alertes, demandes) et les derniers faits enregistrés. */
export async function SuiviTravail({ espace }: { espace: string }) {
  const s = await clientServeur();
  const [alertes, recents, taches] = await Promise.all([
    chargerAlertesEspace(espace),
    chargerRecents(espace),
    s
      .from("taches_etat")
      .select("id, titre, priorite, cree_par_nom, espace_emetteur")
      .eq("espace_destinataire", espace)
      .in("statut", ["a_faire", "en_cours"])
      .order("priorite", { ascending: false })
      .order("created_at")
      .limit(20),
  ]);
  const demandes = taches.data ?? [];
  const enAttente = [
    ...alertes.map((a) => ({
      cle: `a-${a.message}`,
      critique: a.gravite === "critique",
      texte: a.message,
      nombre: a.nombre,
      lien: a.lien,
    })),
    ...demandes.map((t) => ({
      cle: `t-${t.id}`,
      critique: t.priorite === "urgente",
      texte: `Demande de ${t.cree_par_nom ?? "un service"} : ${t.titre}`,
      nombre: undefined,
      lien: `/${espace}/taches`,
    })),
  ];
  const visibles = enAttente.slice(0, 6);

  return (
    <div className="mt-4 mb-5 grid gap-4">
      <div className={`grid gap-4 ${recents ? "lg:grid-cols-2" : ""}`}>
        <section aria-labelledby="titre-attente" className="ombre-carte rounded-2xl bg-white p-4">
          <h2 id="titre-attente" className="mb-2 flex items-center gap-2 font-semibold text-gray-900">
            <Inbox size={18} className="text-papel-700" aria-hidden /> En attente de vous
            {enAttente.length > 0 && <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">{enAttente.length}</span>}
          </h2>
          {taches.error && <p className="mb-2 text-sm text-amber-800">Les demandes des autres services n&apos;ont pas pu être lues. Rechargez la page.</p>}
          {visibles.length ? (
            <ul className="divide-y divide-gray-100">
              {visibles.map((e) => (
                <li key={e.cle}>
                  <Link href={e.lien} className="flex min-h-11 items-center gap-3 py-2 hover:bg-papel-50">
                    <span
                      className={`flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full px-1.5 text-xs font-bold ${e.critique ? "bg-red-600 text-white" : "bg-amber-100 text-amber-900"}`}
                    >
                      {e.nombre ?? <CircleAlert size={15} aria-hidden />}
                    </span>
                    <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-gray-900">{e.texte}</span>
                    <ChevronRight size={17} className="shrink-0 text-gray-400" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2 text-sm font-semibold text-green-800">
              <CheckCircle2 size={18} aria-hidden /> Rien n&apos;attend votre intervention.
            </p>
          )}
          {enAttente.length > visibles.length && (
            <Link href={`/${espace}/alertes`} className="mt-2 inline-block text-sm font-semibold text-papel-700 underline">
              Voir tout ({enAttente.length})
            </Link>
          )}
        </section>

        {recents && (
          <section aria-labelledby="titre-recents" className="ombre-carte rounded-2xl bg-white p-4">
            <h2 id="titre-recents" className="mb-2 flex items-center gap-2 font-semibold text-gray-900">
              <History size={18} className="text-papel-700" aria-hidden /> Ce qui vient de se passer
            </h2>
            {recents.incomplet && <p className="mb-2 text-sm text-amber-800">Une partie de l&apos;historique n&apos;a pas pu être lue. Rechargez la page.</p>}
            {recents.evenements.length ? (
              <ul className="divide-y divide-gray-100">
                {recents.evenements.map((e, i) => (
                  <li key={i}>
                    {e.lien ? (
                      <Link href={e.lien} className="flex min-h-11 items-start gap-3 py-2 hover:bg-papel-50">
                        <span className="w-24 shrink-0 pt-0.5 text-xs text-gray-500">{formaterDateHeure(e.quand)}</span>
                        <span className="min-w-0 flex-1 text-sm leading-snug text-gray-900">{e.texte}</span>
                      </Link>
                    ) : (
                      <p className="flex min-h-11 items-start gap-3 py-2">
                        <span className="w-24 shrink-0 pt-0.5 text-xs text-gray-500">{formaterDateHeure(e.quand)}</span>
                        <span className="min-w-0 flex-1 text-sm leading-snug text-gray-900">{e.texte}</span>
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              !recents.incomplet && <p className="text-sm text-gray-600">Rien n&apos;a encore été enregistré. Commencez par un des boutons « À faire aujourd&apos;hui ».</p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
