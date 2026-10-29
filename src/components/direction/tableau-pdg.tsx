import { AlertTriangle, CheckCircle2, ChevronRight, CircleAlert, Factory, Minus, Package, Users, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Aide } from "@/components/ui/aide";
import { ecartPoints, ecartRelatif, jourCourt, PastilleVariation, type Variation } from "@/components/ui/indicateur";
import { Tendance } from "@/components/ui/tendance";
import { aideDuLibelle } from "@/lib/aide/lexique";
import type { SyntheseDirection } from "@/lib/direction/synthese";
import { margeCompleteParPaquet, type IndicateursLivraison } from "@/lib/metier/performance";
import { formaterPoids, kg } from "@/lib/metier/unites";
import type { CoutsUsine } from "@/lib/performance/charger";
import { pct } from "@/lib/production/affichage";
import { gnf, gnfCourt, nombre } from "@/lib/stocks/libelles";

/**
 * Tableau du PDG : 4 questions, chacune avec un verdict (« Ça va », « À surveiller », « Critique ») et deux chiffres courts
 * accompagnés d'un visuel (barre avec seuil, comparaison, courbe). Le montant exact s'affiche au survol des chiffres.
 */

type Etat = "bien" | "surveiller" | "critique" | "inconnu";
const GRAVITE: Record<Etat, number> = { inconnu: 0, bien: 1, surveiller: 2, critique: 3 };
const pire = (...etats: Etat[]): Etat => {
  const connus = etats.filter((e) => e !== "inconnu");
  return connus.length ? connus.reduce((a, b) => (GRAVITE[b] > GRAVITE[a] ? b : a)) : "inconnu";
};

const VERDICT: Record<Etat, { libelle: string; Icone: LucideIcon; style: string }> = {
  bien: { libelle: "Ça va", Icone: CheckCircle2, style: "bg-green-50 text-[#006300]" },
  surveiller: { libelle: "À surveiller", Icone: AlertTriangle, style: "bg-amber-100 text-amber-900" },
  critique: { libelle: "Critique", Icone: CircleAlert, style: "bg-red-100 text-red-800" },
  inconnu: { libelle: "Pas encore de données", Icone: Minus, style: "bg-gray-100 text-gray-600" },
};
// Couleur des barres selon l'état (toujours accompagnée du verdict écrit) ; neutre = couleur du service.
const COULEUR_BARRE: Record<Etat, string> = { bien: "bg-papel-600", surveiller: "bg-amber-500", critique: "bg-red-600", inconnu: "bg-gray-300" };

function Question({ titre, Icone, etat, children }: { titre: string; Icone: LucideIcon; etat: Etat; children: ReactNode }) {
  const v = VERDICT[etat];
  return (
    <section className="ombre-carte flex flex-col rounded-2xl bg-white p-4 break-inside-avoid">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-[1.02rem] font-bold text-gray-900">
          <span className="flex size-9 items-center justify-center rounded-xl bg-papel-100 text-papel-700">
            <Icone size={18} aria-hidden />
          </span>
          {titre}
        </h2>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold ${v.style}`}>
          <v.Icone size={15} aria-hidden /> {v.libelle}
        </span>
      </div>
      <div className="grid flex-1 gap-4 sm:grid-cols-2 sm:divide-x sm:divide-gray-100">{children}</div>
    </section>
  );
}

/** Un chiffre de la question : libellé, valeur courte (exacte au survol), évolution, visuel, détail, lien. */
function Chiffre({ libelle, valeur, exact, variation, visuel, detail, lien }: { libelle: string; valeur: string; exact?: string; variation?: Variation; visuel?: ReactNode; detail?: ReactNode; lien: string }) {
  const explication = aideDuLibelle(libelle);
  return (
    // Lien étiré (after:inset-0) : la bulle « ? » reste au-dessus, hors du lien.
    <div className="group relative flex min-w-0 flex-col gap-1.5 rounded-xl sm:pl-4 sm:first:pl-0">
      <span className="text-[0.88rem] font-medium text-gray-500">
        {libelle}
        {explication && <Aide mot={explication.mot} explication={explication.explication} className="ml-1" />}
      </span>
      <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-[1.75rem] font-bold leading-tight tracking-tight text-gray-900" title={exact}>
          {valeur}
        </span>
        {variation && <PastilleVariation v={variation} />}
      </span>
      {visuel && <div className="relative z-10">{visuel}</div>}
      {detail && <span className="text-sm leading-snug text-gray-600">{detail}</span>}
      <Link
        href={lien}
        aria-label={`${libelle} : voir le détail`}
        className="mt-auto flex items-center gap-0.5 pt-1 text-sm font-semibold text-papel-700 after:absolute after:inset-0 after:rounded-xl group-hover:underline print:hidden"
      >
        Voir le détail <ChevronRight size={14} aria-hidden />
      </Link>
    </div>
  );
}

/** Barre de niveau (0 à 1) avec, s'il y a lieu, la marque du seuil. */
function Barre({ part, etat, seuil, libelleSeuil }: { part: number | null; etat: Etat; seuil?: number; libelleSeuil?: string }) {
  const largeur = Math.max(0, Math.min(1, part ?? 0)) * 100;
  return (
    <div className="relative mt-1 h-2.5 rounded-full bg-gray-100" role="presentation">
      {part !== null && <div className={`barre-animee h-full rounded-full ${COULEUR_BARRE[etat]}`} style={{ width: `${largeur}%` }} />}
      {seuil !== undefined && (
        <span className="absolute -top-1 h-[18px] w-0.5 rounded bg-gray-700" style={{ left: `${Math.max(0, Math.min(1, seuil)) * 100}%` }} title={libelleSeuil} aria-hidden />
      )}
    </div>
  );
}

/** Deux à trois montants comparés en barres horizontales (même échelle). */
function Comparaison({ lignes }: { lignes: { libelle: string; valeur: number; couleur: string }[] }) {
  const max = Math.max(1, ...lignes.map((l) => Math.abs(l.valeur)));
  return (
    <dl className="mt-1 flex flex-col gap-2">
      {lignes.map((l) => (
        <div key={l.libelle} className="text-xs">
          <div className="flex items-baseline justify-between gap-2">
            <dt className="text-gray-600">{l.libelle}</dt>
            <dd className="font-semibold text-gray-800" title={gnf(l.valeur)}>
              {gnfCourt(l.valeur)}
            </dd>
          </div>
          <span className="mt-0.5 block h-2 rounded-full bg-gray-100" aria-hidden>
            <span className={`barre-animee block h-full rounded-full ${l.couleur}`} style={{ width: `${(Math.abs(l.valeur) / max) * 100}%` }} />
          </span>
        </div>
      ))}
    </dl>
  );
}

export function TableauPdg({
  s,
  couts,
  coutsPrec,
  livraison,
  livraisonPrec,
  filtre,
  jours,
}: {
  s: SyntheseDirection;
  couts: CoutsUsine;
  coutsPrec: CoutsUsine;
  livraison: IndicateursLivraison;
  livraisonPrec: IndicateursLivraison;
  /** Filtre gamme ou commercial actif : le résultat (marge filtrée − charges de toute l'usine) n'aurait pas de sens. */
  filtre: boolean;
  /** Jours de la période (courbe du rendement). */
  jours: string[];
}) {
  const v = s.ventes;
  const p = s.production;
  const pp = s.productionPrec;
  const seuils = s.seuils;

  // 1. Argent
  const resultat = filtre ? null : s.marge.margeGnf - couts.chargesGnf;
  const resultatPrec = filtre ? null : s.margePrec.margeGnf - coutsPrec.chargesGnf;
  const etatResultat: Etat = resultat === null ? "inconnu" : resultat < 0 ? "critique" : "bien";
  const etatEncaisse: Etat = v.echuGnf > 0 ? "surveiller" : v.encaisseGnf > 0 ? "bien" : "inconnu";
  const partEncaisse = v.encaisseGnf + v.echuGnf > 0 ? v.encaisseGnf / (v.encaisseGnf + v.echuGnf) : null;

  // 2. Coût du paquet
  const cout = couts.parPaquet;
  const margePaquet = margeCompleteParPaquet(v.prixMoyenPaquetGnf, cout?.totalGnf ?? null);
  const etatCout: Etat = margePaquet === null ? (cout ? "bien" : "inconnu") : margePaquet < 0 ? "critique" : "bien";
  const etatEnergie: Etat = couts.energieParTonne === null ? "inconnu" : "bien";

  // 3. Usine
  const rendementBas = p.ratioRendement !== null && p.ratioRendement < seuils.rendementMin;
  const pertesHautes = (p.tauxPerte ?? 0) > seuils.tauxPerteMax;
  const etatRendement: Etat = p.ratioRendement === null ? "inconnu" : rendementBas || pertesHautes ? "critique" : "bien";
  const couverture = s.stock.couvertureMpJours;
  const etatMatiere: Etat = couverture === null ? (s.stock.kgMp > 0 ? "bien" : "inconnu") : couverture < seuils.couvertureJours ? "surveiller" : "bien";
  const echelleCouverture = Math.max(seuils.couvertureJours * 2, couverture ?? 0, 1);

  // 4. Clients
  const etatOtif: Etat = livraison.otif === null ? "inconnu" : livraison.otif < seuils.otifMin ? "surveiller" : "bien";
  const rupture = s.distribution.tauxRupture;
  const etatRupture: Etat = rupture === null ? "inconnu" : rupture > seuils.tauxRupture ? "surveiller" : "bien";
  const echelleRupture = Math.max(seuils.tauxRupture * 2, rupture ?? 0, 0.01);

  const toutes = filtre ? " · toute l'usine" : "";
  return (
    <div className="mb-4 grid gap-4 lg:grid-cols-2">
      <Question titre="Gagne-t-on de l'argent ?" Icone={Wallet} etat={pire(etatResultat, etatEncaisse)}>
        <Chiffre
          libelle="Bénéfice (ou perte)"
          valeur={resultat === null ? "—" : gnfCourt(resultat)}
          exact={resultat === null ? undefined : gnf(resultat)}
          variation={{ ecart: ecartRelatif(resultat, resultatPrec) }}
          visuel={
            resultat === null ? undefined : (
              <Comparaison
                lignes={[
                  { libelle: "Marge sur les ventes", valeur: s.marge.margeGnf, couleur: "bg-papel-600" },
                  { libelle: "Charges", valeur: couts.chargesGnf, couleur: "bg-gray-400" },
                ]}
              />
            )
          }
          detail={filtre ? "Non découpé par gamme ni par commercial" : undefined}
          lien="/finance/resultat"
        />
        <Chiffre
          libelle="Paiements reçus"
          valeur={gnfCourt(v.encaisseGnf)}
          exact={gnf(v.encaisseGnf)}
          variation={{ ecart: ecartRelatif(v.encaisseGnf, s.ventesPrec.encaisseGnf) }}
          visuel={<Barre part={partEncaisse} etat={etatEncaisse} />}
          detail={v.echuGnf > 0 ? `Impayés échus : ${gnfCourt(v.echuGnf)} sur ${gnfCourt(v.creancesGnf)} de créances` : "Aucun impayé échu"}
          lien="/ventes/encaissements"
        />
      </Question>

      <Question titre="Combien coûte un paquet ?" Icone={Package} etat={pire(etatCout, etatEnergie)}>
        <Chiffre
          libelle="Coût complet par paquet"
          valeur={cout ? gnf(cout.totalGnf) : "—"}
          variation={{ ecart: ecartRelatif(cout?.totalGnf ?? null, coutsPrec.parPaquet?.totalGnf ?? null), hausseBonne: false }}
          visuel={
            cout && v.prixMoyenPaquetGnf !== null ? (
              <Comparaison
                lignes={[
                  { libelle: "Prix de vente", valeur: v.prixMoyenPaquetGnf, couleur: "bg-papel-600" },
                  { libelle: "Coût complet", valeur: cout.totalGnf, couleur: margePaquet !== null && margePaquet < 0 ? "bg-red-600" : "bg-gray-400" },
                ]}
              />
            ) : undefined
          }
          detail={
            cout === null
              ? "Pas de production validée sur la période"
              : margePaquet === null
                ? `Matière ${gnf(cout.matiereGnf)} + charges ${gnf(cout.chargesGnf)} · pas de vente`
                : `${margePaquet >= 0 ? "Gagne" : "Perd"} ${gnf(Math.abs(margePaquet))} par paquet vendu${toutes}`
          }
          lien="/production"
        />
        <Chiffre
          libelle="Énergie par tonne de papier"
          valeur={couts.energieParTonne === null ? "—" : gnfCourt(couts.energieParTonne)}
          exact={couts.energieParTonne === null ? undefined : gnf(couts.energieParTonne)}
          variation={{ ecart: ecartRelatif(couts.energieParTonne, coutsPrec.energieParTonne), hausseBonne: false }}
          visuel={
            couts.energieParTonne !== null && coutsPrec.energieParTonne !== null ? (
              <Comparaison
                lignes={[
                  { libelle: "Cette période", valeur: couts.energieParTonne, couleur: "bg-papel-600" },
                  { libelle: "Précédente", valeur: coutsPrec.energieParTonne, couleur: "bg-gray-300" },
                ]}
              />
            ) : undefined
          }
          detail={couts.energieParTonne === null ? "Pas de papier consommé sur la période" : `${gnfCourt(couts.energieGnf)} d'énergie pour ${formaterPoids(kg(couts.papierKg)).replace(" ", "\u00a0")}`}
          lien="/production"
        />
      </Question>

      <Question titre="L'usine tourne-t-elle bien ?" Icone={Factory} etat={pire(etatRendement, etatMatiere)}>
        <Chiffre
          libelle="Rendement"
          valeur={pct(p.ratioRendement)}
          variation={{ ecart: ecartPoints(p.ratioRendement, pp.ratioRendement), unite: "points" }}
          visuel={jours.length > 1 ? <Tendance points={jours.map((d) => ({ libelle: jourCourt(d), valeur: s.rendementParJour.get(d) ?? null }))} format="pct" /> : undefined}
          detail={`Pertes ${pct(p.tauxPerte)}${pertesHautes ? " (trop élevées)" : ""} · ${nombre(p.paquetsBons)} paquets · seuil ${pct(seuils.rendementMin, 0)}`}
          lien="/production"
        />
        <Chiffre
          libelle="Jours de stock de matière"
          valeur={couverture === null ? formaterPoids(kg(s.stock.kgMp)) : `${nombre(couverture, 0)} jours`}
          visuel={couverture === null ? undefined : <Barre part={couverture / echelleCouverture} etat={etatMatiere} seuil={seuils.couvertureJours / echelleCouverture} libelleSeuil={`Seuil : ${seuils.couvertureJours} jours`} />}
          detail={`${formaterPoids(kg(s.stock.kgMp))} en stock · ${formaterPoids(kg(s.stock.kgTransit))} en route · seuil ${seuils.couvertureJours} j`}
          lien="/magasin"
        />
      </Question>

      <Question titre="Les clients sont-ils servis ?" Icone={Users} etat={pire(etatOtif, etatRupture)}>
        <Chiffre
          libelle="Livrées à temps et complètes"
          valeur={pct(livraison.otif)}
          variation={{ ecart: ecartPoints(livraison.otif, livraisonPrec.otif), unite: "points" }}
          visuel={<Barre part={livraison.otif} etat={etatOtif} seuil={seuils.otifMin} libelleSeuil={`Seuil : ${pct(seuils.otifMin, 0)}`} />}
          detail={
            livraison.commandes
              ? `${nombre(livraison.otifOk)} sur ${nombre(livraison.commandes)} commande(s)${livraison.delaiMoyenJours === null ? "" : ` · délai moyen ${nombre(livraison.delaiMoyenJours, 1)} j`}${toutes}`
              : "Aucune commande arrivée à échéance"
          }
          lien="/logistique"
        />
        <Chiffre
          libelle="Ruptures chez les points de vente"
          valeur={pct(rupture)}
          variation={{ ecart: ecartPoints(rupture, s.distributionPrec.tauxRupture), unite: "points", hausseBonne: false }}
          visuel={<Barre part={rupture === null ? null : rupture / echelleRupture} etat={etatRupture} seuil={seuils.tauxRupture / echelleRupture} libelleSeuil={`Seuil : ${pct(seuils.tauxRupture, 0)}`} />}
          detail={`${nombre(s.distribution.pvaActifs)} points de vente · seuil ${pct(seuils.tauxRupture, 0)}`}
          lien="/commercial"
        />
      </Question>
    </div>
  );
}
