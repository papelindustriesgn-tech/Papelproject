import { ChevronRight, ClipboardEdit } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { ComplementsPdg } from "@/lib/direction/pdg";
import type { SyntheseDirection } from "@/lib/direction/synthese";
import { formaterDate, formaterDateHeure } from "@/lib/formulaires/dates";
import { LIBELLES_ETAT, type EtatDonnee } from "@/lib/metier/chiffres";
import { gnf, gnfCourt, nombre } from "@/lib/stocks/libelles";

/** Fiche d'un chiffre : ce qu'il mesure, la période, les données utilisées, la mise à jour, l'objectif. */
interface Explication {
  mesure: string;
  periode: string;
  donnees: string;
  maj: string;
  objectif?: string | null;
}

const TONS: Record<EtatDonnee, string> = {
  valide: "bg-green-100 text-green-900",
  estime: "bg-amber-100 text-amber-900",
  non_renseigne: "bg-gray-200 text-gray-800",
  indisponible: "bg-red-100 text-red-900",
  aucune_activite: "bg-gray-100 text-gray-700",
};

function Chiffre({ libelle, valeur, etat, detail, lien, explication }: { libelle: string; valeur: string; etat: EtatDonnee; detail?: ReactNode; lien: string; explication: Explication }) {
  return (
    <li className="ombre-carte flex flex-col rounded-2xl bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-700">{libelle}</h3>
        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${TONS[etat]}`}>{LIBELLES_ETAT[etat]}</span>
      </div>
      <Link href={lien} className="mt-1 flex items-center justify-between gap-2 rounded-lg hover:bg-papel-50">
        <span className="text-2xl font-bold text-gray-900">{valeur}</span>
        <ChevronRight size={18} className="shrink-0 text-gray-400" aria-hidden />
      </Link>
      {detail && <div className="mt-1 text-sm text-gray-700">{detail}</div>}
      <details className="mt-auto pt-2 text-xs text-gray-600">
        <summary className="cursor-pointer font-semibold text-papel-700">D&apos;où vient ce chiffre ?</summary>
        <dl className="mt-1 grid gap-0.5">
          <div><dt className="inline font-semibold">Mesure : </dt><dd className="inline">{explication.mesure}</dd></div>
          <div><dt className="inline font-semibold">Période : </dt><dd className="inline">{explication.periode}</dd></div>
          <div><dt className="inline font-semibold">Données : </dt><dd className="inline">{explication.donnees}</dd></div>
          <div><dt className="inline font-semibold">Mise à jour : </dt><dd className="inline">{explication.maj}</dd></div>
          <div><dt className="inline font-semibold">Objectif : </dt><dd className="inline">{explication.objectif ?? "aucun objectif fixé"}</dd></div>
        </dl>
      </details>
    </li>
  );
}

const maj = (iso: string | null, quoi: string) => (iso ? `calculé à l'ouverture de la page ; dernière ${quoi} le ${formaterDateHeure(iso)}` : `calculé à l'ouverture de la page ; aucune ${quoi} enregistrée`);

/**
 * Synthèse du PDG : 8 chiffres qui répondent aux questions de la direction, chacun ouvre les opérations qui le composent,
 * avec son état (validé, estimé, données à compléter, indisponible, aucune activité) et sa fiche « D'où vient ce chiffre ? ».
 * Production et pertes n'apparaissent que si l'usine produit ; la marge seulement si le coût des paquets vendus est connu.
 */
export function SynthesePdg({ s, c, du, au, objectifs }: { s: SyntheseDirection; c: ComplementsPdg; du: string; au: string; objectifs: Map<string, { valeur: number }> }) {
  const periode = du === au ? `le ${formaterDate(du)}` : `du ${formaterDate(du)} au ${formaterDate(au)}`;
  const aujourdhui = "situation à l'instant (toutes périodes)";
  const obj = (code: string, f: (v: number) => string) => (objectifs.get(code) ? f(objectifs.get(code)!.valeur) : null);
  const alertesStock = s.alertes.filter((a) => a.domaine === "Stock").length;
  const v = s.ventes;
  const t = c.tresorerie;
  const pfDispo = (c.stock ?? []).filter((x) => x.physique > 0 || x.disponible < 0);

  return (
    <section aria-labelledby="titre-synthese" className="mb-5">
      <h2 id="titre-synthese" className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Opérations en cours et fiabilité des chiffres, {periode}
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Chiffre
          libelle="Ventes nettes (hors taxes)"
          valeur={gnfCourt(v.caHtGnf)}
          etat={v.nbFactures === 0 ? "aucune_activite" : "valide"}
          detail={`${nombre(v.nbFactures)} facture(s) · ${nombre(v.paquets)} paquets`}
          lien="/ventes/pieces?type=facture"
          explication={{ mesure: "factures validées moins avoirs (annulations) validés, hors taxes", periode, donnees: "factures et avoirs validés (jamais les devis ni les commandes)", maj: maj(c.majs.facture, "facture"), objectif: obj("ca_ttc", (o) => `${gnf(o)} taxes comprises (réalisé : ${gnf(v.caTtcGnf)})`) }}
        />
        <Chiffre
          libelle="Argent reçu (encaissements)"
          valeur={gnfCourt(v.encaisseGnf)}
          etat={v.encaisseGnf === 0 ? "aucune_activite" : "valide"}
          detail="Paiements des clients enregistrés au bureau"
          lien="/ventes/encaissements"
          explication={{ mesure: "argent réellement reçu des clients, quelle que soit la date de la facture (différent des ventes)", periode, donnees: "paiements enregistrés par la comptabilité", maj: maj(c.majs.paiement, "paiement"), objectif: obj("encaissements", gnf) }}
        />
        <Chiffre
          libelle="Trésorerie"
          valeur={gnfCourt(s.finance.tresorerieGnf)}
          etat={t ? t.etat : "indisponible"}
          detail={
            !t ? "Vérifications non lues" : t.jamais ? `${t.jamais} compte(s) jamais vérifié(s)` : t.derniere ? `Dernière vérification : ${formaterDate(t.derniere)}` : "Aucun compte"
          }
          lien="/finance/tresorerie"
          explication={{ mesure: "argent disponible dans les caisses, banques et comptes mobiles (USD au taux du jour)", periode: aujourdhui, donnees: "soldes d'ouverture + journal de trésorerie ; validé quand chaque compte a été vérifié (caisse comptée, relevé lu) depuis moins de 7 jours", maj: t?.derniere ? `dernière vérification complète le ${formaterDate(t.derniere)}` : "jamais vérifiée entièrement" }}
        />
        <Chiffre
          libelle="Impayés en retard"
          valeur={gnfCourt(s.finance.creancesEchuesGnf)}
          etat={s.finance.creancesEchuesGnf === 0 ? "aucune_activite" : "valide"}
          detail={`Reste à payer total : ${gnfCourt(s.finance.creancesGnf)}`}
          lien="/ventes/impayes"
          explication={{ mesure: "factures dont la date limite de paiement est passée, pour ce qui n'est pas encore payé", periode: aujourdhui, donnees: "factures validées − avoirs − paiements", maj: maj(c.majs.paiement, "paiement") }}
        />
        <Chiffre
          libelle="Stock disponible à vendre"
          valeur={c.stock ? `${nombre(pfDispo.reduce((t2, x) => t2 + Math.max(0, x.disponible), 0))} paquets` : "—"}
          etat={c.stock ? (pfDispo.length ? "valide" : "aucune_activite") : "indisponible"}
          detail={
            c.stock ? (
              <>
                {pfDispo.slice(0, 3).map((x) => (
                  <span key={`${x.produit}${x.conditionnement}`} className={`block ${x.disponible < 0 ? "font-semibold text-red-700" : ""}`}>
                    {x.produit} ({x.conditionnement}) : {x.disponible < 0 ? `il manque ${nombre(-x.disponible)} paquets` : `${nombre(Math.floor(x.disponible / x.paquetsParColis))} colis`}
                  </span>
                ))}
                {alertesStock > 0 && <span className="block font-semibold text-amber-800">{alertesStock} alerte(s) de stock</span>}
              </>
            ) : (
              "Stock non lu"
            )
          }
          lien="/magasin/commandes"
          explication={{ mesure: "produits finis en stock moins ce qui est réservé pour les commandes déjà reçues", periode: aujourdhui, donnees: "mouvements de stock (entrées, livraisons) et commandes validées non livrées", maj: maj(c.majs.mouvement, "entrée ou sortie de stock") }}
        />
        <Chiffre
          libelle="Commandes à livrer"
          valeur={c.commandes ? nombre(c.commandes.nombre) : "—"}
          etat={c.commandes ? (c.commandes.nombre ? "valide" : "aucune_activite") : "indisponible"}
          detail={
            c.commandes ? (
              <>
                {nombre(c.commandes.paquetsRestants)} paquets à livrer
                {c.commandes.enRetard > 0 && <span className="block font-semibold text-red-700">{c.commandes.enRetard} en retard sur la date promise</span>}
              </>
            ) : (
              "Commandes non lues"
            )
          }
          lien="/ventes/commandes"
          explication={{ mesure: "commandes clients validées avec un reste à livrer ; retard = date de livraison promise dépassée", periode: aujourdhui, donnees: "commandes validées, bons de livraison, dates promises", maj: maj(c.majs.mouvement, "sortie de stock") }}
        />
        {c.production === "active" || c.production === "aucune_sur_periode" ? (
          <Chiffre
            libelle="Production et déchets"
            valeur={`${nombre(s.production.paquetsBons)} paquets`}
            etat={c.production === "active" ? "valide" : "aucune_activite"}
            detail={s.production.tauxPerte === null ? "Déchets : —" : `Déchets : ${nombre(s.production.tauxPerte * 100, 1)} % du papier (maximum ${nombre(s.seuils.tauxPerteMax * 100, 1)} %)`}
            lien="/production"
            explication={{ mesure: "paquets produits et part du papier jetée", periode, donnees: "saisies de production validées", maj: maj(c.majs.fiche, "saisie de production validée"), objectif: obj("paquets_produits", (o) => `${nombre(o)} paquets`) }}
          />
        ) : (
          <li className="flex items-center rounded-2xl bg-white/60 p-4 text-sm text-gray-600">
            {c.production === "pas_demarree" ? "La production n'a pas encore démarré : aucun chiffre ni alerte de production." : "Production : saisies non lues."}
          </li>
        )}
        <Chiffre
          libelle="Marge sur les ventes"
          valeur={!c.marge ? "—" : c.marge.etat === "non_renseigne" || c.marge.etat === "aucune_activite" ? "—" : gnfCourt(s.marge.margeGnf)}
          etat={c.marge ? c.marge.etat : "indisponible"}
          detail={
            !c.marge
              ? "Coûts non lus"
              : c.marge.etat === "non_renseigne"
                ? `Pas affichée : ${nombre((c.marge.partSansCout ?? 0) * 100)} % des paquets vendus n'ont pas de coût`
                : c.marge.etat === "aucune_activite"
                  ? "Aucune vente sur la période"
                  : s.marge.taux === null
                    ? undefined
                    : `${nombre(s.marge.taux * 100, 1)} % des ventes${c.marge.etat === "estime" ? " (quelques paquets sans coût)" : ""}`
          }
          lien="/finance/resultat"
          explication={{ mesure: "ventes nettes hors taxes − coût d'achat ou de fabrication des paquets vendus (hors charges fixes)", periode, donnees: "factures et avoirs, sorties de stock au coût moyen ; affichée seulement si 95 % des paquets vendus ont un coût", maj: maj(c.majs.mouvement, "sortie de stock"), objectif: obj("marge_brute", gnf) }}
        />
      </ul>

      {c.aCompleter.length > 0 && (
        <div className="ombre-carte mt-4 rounded-2xl bg-white p-4" role="region" aria-label="Données à compléter">
          <h2 className="mb-2 flex items-center gap-2 font-semibold text-gray-900">
            <ClipboardEdit size={18} className="text-papel-700" aria-hidden /> Données à compléter
          </h2>
          <p className="mb-2 text-sm text-gray-600">Tant que ces informations manquent, certains chiffres sont estimés ou cachés.</p>
          <ul className="divide-y divide-gray-100">
            {c.aCompleter.map((d) => (
              <li key={d.texte} className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm text-gray-900">{d.texte}</span>
                <Link href={d.lien} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-papel-700 px-3 text-sm font-semibold text-white hover:bg-papel-800 sm:min-h-9">
                  {d.action}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
