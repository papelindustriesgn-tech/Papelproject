import type { Metadata } from "next";
import Link from "next/link";
import { Carte, classesBouton, TitrePage } from "@/components/ui";
import { aujourdhui, formaterDate } from "@/lib/formulaires/dates";
import { nomComplet } from "@/lib/rh/libelles";
import { clientServeur } from "@/lib/supabase/serveur";
import { FeuillePresence } from "../formulaires";

export const metadata: Metadata = { title: "Présences" };

function decaler(jour: string, n: number): string {
  return new Date(Date.parse(`${jour}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
}

export default async function PagePresences({ searchParams }: PageProps<"/rh/presences">) {
  const sp = await searchParams;
  const auj = aujourdhui();
  const demande = typeof sp.jour === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.jour) ? sp.jour : auj;
  const jour = demande > auj ? auj : demande;
  const supabase = await clientServeur();
  const [{ data: employes }, { data: presences }, { data: absences }, { data: ferie }] = await Promise.all([
    supabase.from("employes").select("id, matricule, nom, prenom, fonctions(libelle)").eq("actif", true).lte("date_embauche", jour).order("nom"),
    supabase.from("presences").select("employe_id, statut, heures_sup, note").eq("jour", jour),
    supabase.from("absences").select("employe_id, types_absences(libelle)").eq("statut", "approuvee").lte("du", jour).gte("au", jour),
    supabase.from("jours_feries").select("libelle").eq("jour", jour).maybeSingle(),
  ]);
  const p = new Map((presences ?? []).map((x) => [x.employe_id, x]));
  const a = new Map((absences ?? []).map((x) => [x.employe_id, x.types_absences?.libelle ?? "Absence"]));
  const lignes = (employes ?? []).map((e) => ({
    id: e.id,
    matricule: e.matricule ?? "",
    nom: nomComplet(e),
    fonction: e.fonctions?.libelle ?? "",
    statut: p.get(e.id)?.statut ?? null,
    heuresSup: Number(p.get(e.id)?.heures_sup ?? 0),
    note: p.get(e.id)?.note ?? "",
    absenceApprouvee: a.get(e.id) ?? null,
  }));
  const dimanche = new Date(`${jour}T00:00:00Z`).getUTCDay() === 0;
  return (
    <>
      <TitrePage titre="Feuille de présence" sousTitre={`${new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${jour}T00:00:00Z`))} · ${lignes.length} employé(s)`} />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Link href={`/rh/presences?jour=${decaler(jour, -1)}`} className={classesBouton("secondaire")}>
          ← Jour précédent
        </Link>
        {jour < auj && (
          <Link href={`/rh/presences?jour=${decaler(jour, 1)}`} className={classesBouton("secondaire")}>
            Jour suivant →
          </Link>
        )}
        {jour !== auj && (
          <Link href="/rh/presences" className={classesBouton("discret")}>
            Aujourd&apos;hui
          </Link>
        )}
        <form className="flex items-center gap-2">
          <label htmlFor="jour" className="text-sm text-gray-600">Autre jour</label>
          <input id="jour" name="jour" type="date" max={auj} defaultValue={jour} className="min-h-11 rounded border border-gray-300 px-2 md:min-h-9" />
          <button className={classesBouton("secondaire")}>Ouvrir</button>
        </form>
      </div>
      {(dimanche || ferie) && <p className="mb-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sky-900">{ferie ? `Jour férié : ${ferie.libelle}.` : "Dimanche."} Les employés sont normalement au repos.</p>}
      {lignes.length ? (
        <FeuillePresence key={jour} jour={jour} lignes={lignes} />
      ) : (
        <Carte>
          <p className="text-gray-700">Aucun employé actif. Créez d&apos;abord les dossiers dans « Employés ».</p>
        </Carte>
      )}
      <p className="mt-2 text-sm text-gray-500">Saisie du {formaterDate(jour)} : les absences approuvées sont proposées en « Congé ». Les heures supplémentaires et les absences alimentent la paie du mois.</p>
    </>
  );
}
