"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Image from "next/image";
import { useMemo, useState, type ReactNode } from "react";
import { calculerTotaux } from "@/lib/metier/tva";
import { colis as enColis, colisVersPaquets, formaterStockProduitFini, paquets as enPaquets, somme, type Paquets } from "@/lib/metier/unites";
import { montantEnLettresGnf } from "@/lib/metier/ventes";
import { etatCommande, libelleQui } from "@/lib/metier/commandes";
import { ecrireMeta, lireMeta, mettreEnFile, type LignePieceLocale, type PieceLocale } from "@/lib/terrain/base-locale";
import { messageSimple } from "@/lib/terrain/messages";
import { formaterNumero, prefixeSerie, prochainCompteur } from "@/lib/terrain/numerotation";
import { aujourdhuiConakry, Compteur, dateCourte, EnTeteVue, gnf, PIECES, Vide } from "../communs";
import { useTerrain } from "../contexte";

const champ = "min-h-12 w-full rounded-xl border border-gray-300 bg-white px-3";

/** Demain en heure de Conakry (date souhaitée proposée pour une commande). */
function demain(): string {
  const d = new Date(`${aujourdhuiConakry()}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Recherche par nom ou par téléphone (chiffres seuls, sans espaces ni indicatif). */
function correspond(c: { nom: string; telephone?: string }, recherche: string): boolean {
  const r = recherche.trim().toLowerCase();
  if (!r) return true;
  const chiffres = r.replace(/\D/g, "");
  return c.nom.toLowerCase().includes(r) || (chiffres.length >= 3 && (c.telephone ?? "").replace(/\D/g, "").includes(chiffres));
}

/**
 * Prendre une commande sur le téléphone, même sans réseau, en trois étapes : 1. le client (trouvé par nom ou
 * téléphone, ou créé sans quitter la commande), 2. les produits en colis (− / +), 3. le récapitulatif, puis l'envoi.
 * La commande est le choix par défaut ; devis et facture restent dans « Plus d'options ».
 */
export function VueNouveauDocument({ clientInitial }: { clientInitial?: string }) {
  const { base, aller, enLigne, lancerSynchronisation } = useTerrain();
  const donnees = useLiveQuery(async () => ({
    clients: (await base.clients.toArray()).sort((a, b) => a.nom.localeCompare(b.nom)),
    produits: await base.produits.toArray(),
    conditionnements: await base.conditionnements.toArray(),
    prix: await base.prix.toArray(),
    types: await base.typesClients.toArray(),
    quartiers: await base.quartiers.toArray(),
    tva: await lireMeta(base, "tva", { applicable: true, taux: 0.18 }),
    profil: await lireMeta<{ codeSerie: string | null }>(base, "profil", { codeSerie: null }),
  }), [base]);
  const [typePiece, setTypePiece] = useState<"devis" | "commande" | "facture">("commande");
  const [options, setOptions] = useState(false);
  const [etape, setEtape] = useState<"client" | "produits" | "recap">(clientInitial ? "produits" : "client");
  const [clientId, setClientId] = useState(clientInitial ?? "");
  const [rechercheClient, setRechercheClient] = useState("");
  const [nouveauClient, setNouveauClient] = useState<null | { nom: string; telephone: string; typeClientId: string; quartierId: string }>(null);
  /** Quantités saisies par conditionnement : colis complets + paquets en plus. */
  const [quantites, setQuantites] = useState<Record<string, { colis: string; vrac: string }>>({});
  const [vracOuvert, setVracOuvert] = useState<Record<string, boolean>>({});
  const [dateSouhaitee, setDateSouhaitee] = useState(demain());
  const [remarque, setRemarque] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const client = donnees?.clients.find((c) => c.id === clientId);
  const niveau = donnees?.types.find((t) => t.id === client?.typeClientId)?.niveauPrix ?? "papel";
  const prixDe = (conditionnementId: string) => {
    const c = donnees?.conditionnements.find((x) => x.id === conditionnementId);
    if (!c) return null;
    return donnees?.prix.find((p) => p.cle === `${c.produitId}|${niveau}`)?.prixPaquetGnf ?? donnees?.prix.find((p) => p.cle === `${c.produitId}|papel`)?.prixPaquetGnf ?? null;
  };
  const libelleCond = (id: string) => {
    const c = donnees?.conditionnements.find((x) => x.id === id);
    return c ? `${donnees?.produits.find((p) => p.id === c.produitId)?.libelle} – ${c.libelle}` : "";
  };
  const entier = (v: string) => Number(v.replace(/\s/g, "") || 0);

  // Lignes calculées à partir des quantités (prix de la grille du type de client).
  const lignes: LignePieceLocale[] = useMemo(() => {
    if (!donnees || !client) return [];
    return donnees.conditionnements.flatMap((c) => {
      const q = quantites[c.id];
      const nbColis = entier(q?.colis ?? "");
      const vrac = entier(q?.vrac ?? "");
      const prix = prixDe(c.id);
      if (nbColis + vrac <= 0 || prix === null || !Number.isInteger(nbColis) || !Number.isInteger(vrac)) return [];
      const total = somme(colisVersPaquets(enColis(nbColis), { paquetsParColis: c.paquetsParColis }), enPaquets(vrac));
      return [{ conditionnementId: c.id, quantiteColis: nbColis, paquetsVrac: vrac, paquets: total, prixPaquetGnf: prix, montantHtGnf: total * prix }];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- prixDe dépend de donnees et du client, déjà listés
  }, [donnees, client, quantites]);
  const totaux = useMemo(() => calculerTotaux(lignes.reduce((s, l) => s + l.montantHtGnf, 0), donnees?.tva ?? { applicable: true, taux: 0.18 }), [lignes, donnees?.tva]);

  if (!donnees) return <p className="p-4">Chargement…</p>;

  const fixer = (id: string, champ: "colis" | "vrac", v: string) => setQuantites((q) => ({ ...q, [id]: { colis: q[id]?.colis ?? "", vrac: q[id]?.vrac ?? "", [champ]: v } }));
  const conditionnements = donnees.conditionnements
    .map((c) => ({ ...c, libelle: libelleCond(c.id), produit: donnees.produits.find((p) => p.id === c.produitId)?.libelle ?? "", ordre: donnees.produits.find((p) => p.id === c.produitId)?.ordre ?? 0 }))
    // Produit, puis colis habituel en premier, puis taille de colis croissante.
    .sort((a, b) => a.ordre - b.ordre || Number(b.parDefaut) - Number(a.parDefaut) || a.paquetsParColis - b.paquetsParColis);
  const clientsFiltres = donnees.clients.filter((c) => correspond(c, rechercheClient));
  const def = PIECES[typePiece];
  const ppcDe = (id: string) => donnees.conditionnements.find((c) => c.id === id)?.paquetsParColis ?? 1;

  const choisirClient = (id: string) => {
    setClientId(id);
    setQuantites({});
    setEtape("produits");
    setErreur(null);
  };

  // Nouveau client créé sur le téléphone, sans quitter la commande : il part au bureau avant la commande.
  const creerClient = async () => {
    if (!nouveauClient) return;
    const nom = nouveauClient.nom.trim();
    if (!nom) return setErreur("Écrivez le nom du client.");
    if (!nouveauClient.typeClientId) return setErreur("Choisissez le type de client (grossiste, détaillant…).");
    const doublon = donnees.clients.find((c) => c.nom.trim().toLowerCase() === nom.toLowerCase());
    if (doublon) return setErreur(`« ${doublon.nom} » existe déjà : touchez son nom dans la liste.`);
    const id = crypto.randomUUID();
    await base.transaction("rw", [base.clients, base.operations], async () => {
      await base.clients.put({ id, nom, typeClientId: nouveauClient.typeClientId, conditionPaiement: "comptant", plafondCreditGnf: 0, encoursGnf: 0, enAttente: true, telephone: nouveauClient.telephone.trim(), quartierId: nouveauClient.quartierId || null });
      await mettreEnFile(base, "client", { id, pva_id: null, nom, type_client_id: nouveauClient.typeClientId, responsable: "", telephone: nouveauClient.telephone.trim(), quartier_id: nouveauClient.quartierId || null });
    });
    setNouveauClient(null);
    choisirClient(id);
  };

  const verifier = () => {
    setErreur(null);
    if (!client) return setErreur("Choisissez le client.");
    if (!lignes.length) return setErreur("Ajoutez au moins un colis avec le bouton +.");
    if (typePiece === "commande" && dateSouhaitee && dateSouhaitee < aujourdhuiConakry()) return setErreur("La date de livraison souhaitée est déjà passée.");
    setEtape("recap");
    window.scrollTo({ top: 0 });
  };

  const envoyer = async () => {
    setErreur(null);
    if (enCours || !client || !lignes.length) return;
    if (!donnees.profil.codeSerie) return setErreur("Votre série de numérotation n'est pas encore réglée : demandez à l'administrateur (votre saisie est gardée).");
    if (typePiece === "facture" && client.conditionPaiement === "credit" && client.plafondCreditGnf > 0 && client.encoursGnf + totaux.totalTtcGnf > client.plafondCreditGnf) {
      return setErreur(`Plafond de crédit dépassé : le client doit déjà ${gnf(client.encoursGnf)}, cette facture ajoute ${gnf(totaux.totalTtcGnf)}, le plafond est ${gnf(client.plafondCreditGnf)}.`);
    }
    // Un seul envoi même en cas de double appui : le bouton est bloqué jusqu'à la fin.
    setEnCours(true);
    const date = aujourdhuiConakry();
    const prefixe = prefixeSerie(typePiece, Number(date.slice(0, 4)), donnees.profil.codeSerie);
    const id = crypto.randomUUID();
    const souhaitee = typePiece === "commande" && dateSouhaitee ? dateSouhaitee : null;
    // Numéro attribué dans une transaction : deux documents ne peuvent pas recevoir le même.
    const numero = await base.transaction("rw", [base.meta, base.pieces, base.operations], async () => {
      const n = prochainCompteur(await lireMeta<number>(base, `compteur:${prefixe}`, 0), 0);
      await ecrireMeta(base, `compteur:${prefixe}`, n);
      const num = formaterNumero(prefixe, n);
      const piece: PieceLocale = {
        id, typePiece, numero: num, clientId: client.id, datePiece: date, lignes, totalHtGnf: totaux.totalHtGnf, tvaGnf: totaux.tvaGnf,
        totalTtcGnf: totaux.totalTtcGnf, tauxTva: donnees.tva.applicable ? donnees.tva.taux : 0, notes: remarque.trim(), etat: "en_attente", dateSouhaitee: souhaitee,
      };
      await base.pieces.put(piece);
      await mettreEnFile(base, "piece", {
        id, type_piece: typePiece, numero: num, client_id: client.id, date_piece: date, notes: remarque.trim(), date_livraison_souhaitee: souhaitee,
        lignes: lignes.map((l) => ({ conditionnement_id: l.conditionnementId, quantite_colis: l.quantiteColis, paquets_vrac: l.paquetsVrac, prix_paquet_gnf: l.prixPaquetGnf })),
      });
      return num;
    });
    if (enLigne) void lancerSynchronisation();
    aller(`document/${id}?nouveau=${encodeURIComponent(numero)}`);
  };

  const pied = (bouton: ReactNode) => (
    // Total et bouton : toujours visibles au-dessus des onglets.
    <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[999] mx-auto max-w-xl px-3">
      <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-lg">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <span className="font-bold">Total à payer</span>
          <span className="text-xl font-bold">{gnf(totaux.totalTtcGnf)}</span>
        </div>
        {bouton}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-3 pb-40">
      <EnTeteVue titre={def.nouveau} sousTitre={etape === "client" ? "Étape 1 sur 3 : le client" : etape === "produits" ? "Étape 2 sur 3 : les produits" : "Étape 3 sur 3 : vérifier et envoyer"} />

      {erreur && <p role="alert" className="rounded-2xl border border-red-300 bg-red-50 p-3 text-red-900">{erreur}</p>}

      {etape === "client" && (
        <section className="flex flex-col gap-2">
          {nouveauClient ? (
            <div className="flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-3">
              <h2 className="font-bold">Nouveau client</h2>
              <label className="text-sm font-medium" htmlFor="nc-nom">Nom du client ou de la boutique</label>
              <input id="nc-nom" value={nouveauClient.nom} onChange={(e) => setNouveauClient({ ...nouveauClient, nom: e.target.value })} className={champ} autoComplete="off" />
              <label className="text-sm font-medium" htmlFor="nc-tel">Téléphone (facultatif)</label>
              <input id="nc-tel" inputMode="tel" value={nouveauClient.telephone} onChange={(e) => setNouveauClient({ ...nouveauClient, telephone: e.target.value })} className={champ} placeholder="+224 6xx xx xx xx" />
              <label className="text-sm font-medium" htmlFor="nc-type">Type de client</label>
              <select id="nc-type" value={nouveauClient.typeClientId} onChange={(e) => setNouveauClient({ ...nouveauClient, typeClientId: e.target.value })} className={champ}>
                <option value="">— Choisir —</option>
                {donnees.types.map((t) => (
                  <option key={t.id} value={t.id}>{t.libelle}</option>
                ))}
              </select>
              <label className="text-sm font-medium" htmlFor="nc-quartier">Quartier (facultatif)</label>
              <select id="nc-quartier" value={nouveauClient.quartierId} onChange={(e) => setNouveauClient({ ...nouveauClient, quartierId: e.target.value })} className={champ}>
                <option value="">— Non précisé —</option>
                {donnees.quartiers.map((q) => (
                  <option key={q.id} value={q.id}>{q.libelle}</option>
                ))}
              </select>
              <p className="text-sm text-gray-600">Il sera payé comptant ; le bureau peut ensuite lui ouvrir un crédit.</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setNouveauClient(null)} className="min-h-12 rounded-2xl border border-gray-300 font-semibold">Annuler</button>
                <button type="button" onClick={() => void creerClient()} className="min-h-12 rounded-2xl bg-papel-700 font-bold text-white">Créer et continuer</button>
              </div>
            </div>
          ) : (
            <>
              <label htmlFor="recherche-client" className="sr-only">Rechercher un client</label>
              <input id="recherche-client" type="search" value={rechercheClient} onChange={(e) => setRechercheClient(e.target.value)} placeholder="Nom ou téléphone du client…" className={champ} autoComplete="off" />
              <button
                type="button"
                onClick={() => setNouveauClient({ nom: rechercheClient.replace(/^[\d\s+]+$/, ""), telephone: /^[\d\s+]+$/.test(rechercheClient) ? rechercheClient : "", typeClientId: donnees.types[0]?.id ?? "", quartierId: "" })}
                className="min-h-12 rounded-2xl border-2 border-dashed border-papel-600 font-bold text-papel-800"
              >
                + Nouveau client
              </button>
              <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white">
                {clientsFiltres.slice(0, 50).map((c) => (
                  <li key={c.id}>
                    <button type="button" onClick={() => choisirClient(c.id)} className="flex min-h-14 w-full items-center justify-between gap-2 px-3 py-2 text-left active:bg-gray-50">
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{c.nom}</span>
                        <span className="block text-xs text-gray-500">{[c.telephone, donnees.types.find((t) => t.id === c.typeClientId)?.libelle].filter(Boolean).join(" · ")}</span>
                      </span>
                      {c.enAttente && <span className="shrink-0 text-xs font-semibold text-amber-800">À envoyer</span>}
                    </button>
                  </li>
                ))}
              </ul>
              {!clientsFiltres.length && <Vide texte={donnees.clients.length ? "Aucun client ne correspond : créez-le avec « + Nouveau client »." : "Pas encore de client : créez le premier avec « + Nouveau client »."} />}
            </>
          )}
        </section>
      )}

      {etape !== "client" && client && (
        <section className="flex items-center justify-between gap-2 rounded-2xl border border-gray-200 bg-white p-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase text-gray-500">Client</div>
            <div className="truncate text-lg font-bold">{client.nom}</div>
            <div className="text-sm text-gray-600">
              {donnees.types.find((t) => t.id === client.typeClientId)?.libelle}
              {client.conditionPaiement === "credit" ? ` · crédit · doit déjà ${gnf(client.encoursGnf)}` : " · comptant"}
            </div>
          </div>
          {etape === "produits" && (
            <button type="button" onClick={() => { setClientId(""); setQuantites({}); setEtape("client"); }} className="min-h-11 shrink-0 rounded-xl border border-gray-300 px-3 font-semibold">
              Changer
            </button>
          )}
        </section>
      )}

      {etape === "produits" && client && (
        <>
          <section className="flex flex-col gap-2">
            {conditionnements.map((c) => {
              const prix = prixDe(c.id);
              const q = quantites[c.id] ?? { colis: "", vrac: "" };
              const ligne = lignes.find((l) => l.conditionnementId === c.id);
              return (
                <div key={c.id} className={`rounded-2xl border-2 bg-white p-3 ${ligne ? "border-papel-600" : "border-gray-200"}`}>
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold">{c.produit}</div>
                      <div className="text-sm text-gray-600">Colis de {c.paquetsParColis} paquets</div>
                    </div>
                    <div className="text-right">
                      {prix !== null ? (
                        <>
                          <div className="font-bold">{gnf(prix * c.paquetsParColis)} <span className="text-sm font-normal">le colis</span></div>
                          <div className="text-xs text-gray-500">{gnf(prix)} le paquet, hors taxes</div>
                        </>
                      ) : (
                        <span className="text-sm text-gray-600">Prix pas encore reçu : touchez « Envoyer et recevoir » sur l&apos;accueil</span>
                      )}
                    </div>
                  </div>
                  {prix !== null && (
                    <>
                      <Compteur id={`colis-${c.id}`} libelle={`Colis — ${c.libelle}`} valeur={q.colis} onChange={(v) => fixer(c.id, "colis", v)} />
                      {vracOuvert[c.id] ? (
                        <div className="mt-2">
                          <label htmlFor={`vrac-${c.id}`} className="text-sm font-medium">Paquets en plus (hors colis complet)</label>
                          <input id={`vrac-${c.id}`} inputMode="numeric" value={q.vrac} onChange={(e) => fixer(c.id, "vrac", e.target.value.replace(/[^\d\s]/g, ""))} className={champ} />
                        </div>
                      ) : (
                        <button type="button" onClick={() => setVracOuvert((o) => ({ ...o, [c.id]: true }))} className="mt-1 min-h-10 text-sm font-semibold text-papel-700">
                          + Ajouter des paquets à l&apos;unité
                        </button>
                      )}
                      {ligne && (
                        <p className="mt-1 text-right text-sm font-semibold text-papel-800">
                          {formaterStockProduitFini(ligne.paquets as Paquets, { paquetsParColis: c.paquetsParColis })} = {gnf(ligne.montantHtGnf)} hors taxes
                        </p>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </section>
          {typePiece === "commande" && (
            <section className="rounded-2xl border border-gray-200 bg-white p-3">
              <label htmlFor="date-souhaitee" className="font-bold">Livraison souhaitée par le client</label>
              <input id="date-souhaitee" type="date" min={aujourdhuiConakry()} value={dateSouhaitee} onChange={(e) => setDateSouhaitee(e.target.value)} className={`${champ} mt-1`} />
              <p className="mt-1 text-sm text-gray-600">L&apos;usine confirme ensuite la date : vous la verrez dans « Ventes ».</p>
            </section>
          )}
          <details className="rounded-2xl border border-gray-200 bg-white px-3" open={options}>
            <summary onClick={(e) => { e.preventDefault(); setOptions((o) => !o); }} className="min-h-12 cursor-pointer py-3 font-semibold text-gray-700">Plus d&apos;options</summary>
            <div className="flex flex-col gap-2 pb-3">
              <p className="text-sm text-gray-600">Par défaut, vous prenez une commande : l&apos;usine la prépare, la livre, puis le bureau facture.</p>
              <div className="grid grid-cols-3 gap-1 rounded-2xl bg-gray-200 p-1" role="group" aria-label="Type de document">
                {(["commande", "devis", "facture"] as const).map((t) => (
                  <button key={t} type="button" aria-pressed={typePiece === t} onClick={() => setTypePiece(t)} className={`min-h-11 rounded-xl text-sm font-bold ${typePiece === t ? "bg-white text-papel-800 shadow" : "text-gray-600"}`}>
                    {t === "facture" ? "Facture tout de suite" : PIECES[t].nom}
                  </button>
                ))}
              </div>
              {typePiece === "devis" && <p className="text-sm text-gray-600">Un devis est une proposition de prix : rien n&apos;est préparé ni facturé.</p>}
              {typePiece === "facture" && <p className="text-sm text-gray-600">Facture immédiate : à utiliser seulement si votre responsable vous l&apos;a demandé.</p>}
              <label htmlFor="remarque" className="text-sm font-medium">Remarque pour l&apos;usine (facultatif)</label>
              <input id="remarque" value={remarque} onChange={(e) => setRemarque(e.target.value)} className={champ} placeholder="Ex. livrer le matin" />
            </div>
          </details>
          {pied(
            <button type="button" onClick={verifier} disabled={!lignes.length} className="min-h-14 w-full rounded-2xl bg-papel-700 text-lg font-bold text-white disabled:bg-papel-300">
              {lignes.length ? `Vérifier ${def.le}` : "Ajoutez des colis avec +"}
            </button>,
          )}
        </>
      )}

      {etape === "recap" && client && (
        <>
          <section className="rounded-2xl border border-gray-200 bg-white p-3">
            <h2 className="mb-2 font-bold">{def.nom} à envoyer</h2>
            <ul className="divide-y divide-gray-100">
              {lignes.map((l) => (
                <li key={l.conditionnementId} className="flex items-start justify-between gap-2 py-2">
                  <span className="min-w-0">
                    <span className="block font-semibold">{libelleCond(l.conditionnementId)}</span>
                    <span className="block text-sm text-gray-600">
                      {formaterStockProduitFini(l.paquets as Paquets, { paquetsParColis: ppcDe(l.conditionnementId) })} · {gnf(l.prixPaquetGnf * ppcDe(l.conditionnementId))} le colis
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold">{gnf(l.montantHtGnf)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-2 grid grid-cols-2 gap-1 border-t border-gray-200 pt-2 text-sm">
              <dt>Total hors taxes</dt>
              <dd className="text-right">{gnf(totaux.totalHtGnf)}</dd>
              <dt>TVA</dt>
              <dd className="text-right">{gnf(totaux.tvaGnf)}</dd>
              <dt className="text-base font-bold">Total à payer</dt>
              <dd className="text-right text-base font-bold">{gnf(totaux.totalTtcGnf)}</dd>
            </dl>
            {typePiece === "commande" && <p className="mt-2 text-sm">Livraison souhaitée : <strong>{dateSouhaitee ? dateCourte(dateSouhaitee) : "non précisée"}</strong></p>}
            {remarque.trim() && <p className="mt-1 text-sm">Remarque : {remarque.trim()}</p>}
          </section>
          <p className="rounded-2xl bg-sky-50 p-3 text-sm text-sky-900">
            {enLigne ? "Elle part tout de suite au bureau." : "Pas de réseau : elle est gardée sur ce téléphone et partira toute seule dès que le réseau revient."}
          </p>
          <button type="button" onClick={() => setEtape("produits")} className="min-h-12 rounded-2xl border border-gray-300 bg-white font-semibold">
            Modifier
          </button>
          {pied(
            <button type="button" onClick={() => void envoyer()} disabled={enCours} className="min-h-14 w-full rounded-2xl bg-papel-700 text-lg font-bold text-white disabled:bg-papel-300">
              {enCours ? "Enregistrement…" : `Envoyer ${def.le}`}
            </button>,
          )}
        </>
      )}
    </div>
  );
}

/** Document validé : affichage imprimable, partage (WhatsApp…), état de l'envoi. */
export function VueDocument({ id, nouveau }: { id: string; nouveau?: string | null }) {
  const { base } = useTerrain();
  const donnees = useLiveQuery(async () => {
    const piece = await base.pieces.get(id);
    return {
      piece,
      client: piece ? await base.clients.get(piece.clientId) : undefined,
      conditionnements: await base.conditionnements.toArray(),
      produits: await base.produits.toArray(),
      entreprise: await lireMeta(base, "entreprise", { nom: "Papel Industries", adresse: "", telephone: "", nif: "" }),
    };
  }, [base, id]);
  if (!donnees) return <p>Chargement…</p>;
  const { piece, client } = donnees;
  if (!piece) return <EnTeteVue titre="Document introuvable" retour="documents" />;
  const libelle = (cid: string) => {
    const c = donnees.conditionnements.find((x) => x.id === cid);
    return c ? `Mouchoirs ${donnees.produits.find((p) => p.id === c.produitId)?.libelle} – ${c.libelle}` : "";
  };
  const titre = PIECES[piece.typePiece].titre;

  const partager = async () => {
    const texte = `${titre} ${piece.numero} – ${donnees.entreprise.nom}\nClient : ${client?.nom ?? ""}\nTotal TTC : ${gnf(piece.totalTtcGnf)}\n(${montantEnLettresGnf(piece.totalTtcGnf)})`;
    if (navigator.share) await navigator.share({ title: `${titre} ${piece.numero}`, text: texte }).catch(() => undefined);
    else window.open(`https://wa.me/?text=${encodeURIComponent(texte)}`, "_blank");
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="print:hidden">
        <EnTeteVue titre={`${PIECES[piece.typePiece].nom} ${piece.numero}`} retour="documents" />
        {/* Ce qui est vraiment enregistré : sur ce téléphone seulement, ou reçu par le bureau. */}
        {nouveau && piece.etat === "en_attente" && (
          <p role="status" className="mb-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-950">
            {PIECES[piece.typePiece].nom} {nouveau} enregistrée sur ce téléphone. Elle n&apos;est pas encore arrivée au bureau : elle partira toute seule dès que le réseau revient.
          </p>
        )}
        {nouveau && piece.etat === "synchronisee" && <p role="status" className="mb-2 rounded-lg border border-green-300 bg-green-50 p-3 text-green-900">✓ {PIECES[piece.typePiece].nom} {nouveau} reçue par le bureau.</p>}
        {!nouveau && piece.etat === "en_attente" && <p className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-amber-900">Pas encore envoyée au bureau : elle partira au retour du réseau.</p>}
        {piece.typePiece === "commande" && <SuiviCommande piece={piece} />}
        {piece.etat === "rejetee" && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-2 text-red-900">Refusée par le bureau : {messageSimple(piece.erreur)} Ne la remettez pas au client ; voyez avec votre responsable.</p>}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => window.print()} className="min-h-12 rounded-2xl bg-papel-700 font-bold text-white">Imprimer / PDF</button>
          <button type="button" onClick={() => void partager()} className="min-h-12 rounded-2xl border-2 border-papel-700 bg-white font-bold text-papel-800">Partager (WhatsApp…)</button>
        </div>
      </div>
      <article className="rounded-xl border border-gray-200 bg-white p-4 text-black print:border-0 print:p-0">
        <header className="imprimer-couleurs flex items-start justify-between gap-2 rounded-lg bg-papel-700 p-3 text-white">
          <div>
            <Image src="/logo-papel.png" alt="Papel" width={90} height={51} />
            <div className="text-sm">{donnees.entreprise.nom}</div>
            {donnees.entreprise.telephone && <div className="text-sm">Tél. : {donnees.entreprise.telephone}</div>}
            {donnees.entreprise.nif && <div className="text-sm">NIF : {donnees.entreprise.nif}</div>}
          </div>
          <div className="text-right">
            <div className="text-lg font-bold">{titre}</div>
            <div className="font-mono">{piece.numero}</div>
            <div className="text-sm">{piece.datePiece.split("-").reverse().join("/")}</div>
          </div>
        </header>
        <p className="my-3">
          Client : <strong>{client?.nom}</strong>
        </p>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="py-1">Désignation</th>
              <th className="py-1 text-right">Montant HT</th>
            </tr>
          </thead>
          <tbody>
            {piece.lignes.map((l, i) => (
              <tr key={i} className="border-b border-gray-300">
                <td className="py-1">
                  {libelle(l.conditionnementId)}
                  <div className="text-gray-700">
                    {formaterStockProduitFini(l.paquets as Paquets, { paquetsParColis: donnees.conditionnements.find((c) => c.id === l.conditionnementId)?.paquetsParColis ?? 1 })} × {gnf(l.prixPaquetGnf)}
                  </div>
                </td>
                <td className="py-1 text-right">{gnf(l.montantHtGnf)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="mt-3 ml-auto grid w-64 grid-cols-2 gap-1 text-right">
          <dt>Total HT</dt>
          <dd>{gnf(piece.totalHtGnf)}</dd>
          <dt>TVA {Math.round(piece.tauxTva * 10000) / 100} %</dt>
          <dd>{gnf(piece.tvaGnf)}</dd>
          <dt className="font-bold">Total TTC</dt>
          <dd className="font-bold">{gnf(piece.totalTtcGnf)}</dd>
        </dl>
        <p className="mt-3 text-sm">Arrêté à la somme de : <strong>{montantEnLettresGnf(piece.totalTtcGnf)}</strong>.</p>
      </article>
    </div>
  );
}

const NOMS_OPERATIONS: Record<string, string> = { piece: "Vente", client: "Nouveau client", pva: "Point de vente", visite: "Visite", photo: "Photo", confirmation: "Confirmation de livraison" };

/** État d'une commande sur le téléphone (même règle que le bureau : `etatCommande`). */
function etatDeLaPiece(p: PieceLocale) {
  return etatCommande({
    envoi: p.etat === "en_attente" ? "en_attente" : p.etat === "rejetee" ? "refusee" : "recue",
    dateSouhaitee: p.dateSouhaitee ?? null,
    dateConfirmee: p.suivi?.dateConfirmee ?? null,
    paquetsCommandes: p.suivi?.paquetsCommandes ?? p.lignes.reduce((t, l) => t + l.paquets, 0),
    paquetsLivres: p.suivi?.paquetsLivres ?? 0,
    livraisonEnRoute: p.suivi?.livraisonEnRoute ?? false,
    factureTtcGnf: p.suivi?.factureTtcGnf ?? 0,
    resteAPayerGnf: p.suivi?.resteAPayerGnf ?? 0,
    attenteStock: p.suivi?.attenteStock ?? false,
  });
}

const TON_ETAT = {
  attente: "border-amber-300 bg-amber-50 text-amber-950",
  info: "border-sky-300 bg-sky-50 text-sky-950",
  succes: "border-green-300 bg-green-50 text-green-950",
  erreur: "border-red-300 bg-red-50 text-red-950",
} as const;

/** Où en est la commande, la prochaine étape et qui doit agir ; dates souhaitée et confirmée. */
function SuiviCommande({ piece }: { piece: PieceLocale }) {
  if (piece.etat !== "synchronisee") return null;
  const e = etatDeLaPiece(piece);
  const s = piece.suivi;
  return (
    <div className={`mt-2 rounded-lg border p-3 ${TON_ETAT[e.ton]}`}>
      <div className="font-bold">{e.libelle}</div>
      {e.prochaine && (
        <div className="text-sm">
          Prochaine étape : {e.prochaine}
          {e.qui && ` (${libelleQui(e.qui)})`}
        </div>
      )}
      <dl className="mt-1 grid grid-cols-2 gap-x-2 text-sm">
        <dt>Souhaitée</dt>
        <dd>{piece.dateSouhaitee ? dateCourte(piece.dateSouhaitee) : "—"}</dd>
        <dt>Confirmée</dt>
        <dd>{s?.dateConfirmee ? dateCourte(s.dateConfirmee) : piece.livraisonEstimee ? `pas encore (estimée ${dateCourte(piece.livraisonEstimee)})` : "pas encore"}</dd>
        {s && s.paquetsLivres > 0 && (
          <>
            <dt>Livré</dt>
            <dd>
              {s.paquetsLivres.toLocaleString("fr-FR")} sur {s.paquetsCommandes.toLocaleString("fr-FR")} paquets
            </dd>
          </>
        )}
        {s && s.factureTtcGnf > 0 && (
          <>
            <dt>Reste à payer</dt>
            <dd>{gnf(s.resteAPayerGnf)}</dd>
          </>
        )}
      </dl>
    </div>
  );
}

/** Mes ventes : devis, commandes et factures regroupés par jour, avec le total et l'état d'envoi. */
export function VueDocuments() {
  const { base, aller } = useTerrain();
  const [type, setType] = useState<"tous" | "facture" | "commande" | "devis">("tous");
  const donnees = useLiveQuery(async () => ({
    pieces: (await base.pieces.toArray()).sort((a, b) => b.numero.localeCompare(a.numero)),
    clients: await base.clients.toArray(),
    operationsEnErreur: (await base.operations.toArray()).filter((o) => o.erreur),
  }), [base]);
  if (!donnees) return <p className="p-4">Chargement…</p>;
  const nomClient = (id: string) => donnees.clients.find((c) => c.id === id)?.nom ?? "";
  // Ventes confirmées (reçues par le bureau) et envois en attente : jamais mélangés.
  const aEnvoyer = donnees.pieces.filter((p) => p.etat === "en_attente");
  const pieces = donnees.pieces.filter((p) => p.etat !== "en_attente" && (type === "tous" || p.typePiece === type));
  const jours = [...new Set(pieces.map((p) => p.datePiece))].sort().reverse();
  const jourLisible = (d: string) =>
    d === aujourdhuiConakry() ? "Aujourd'hui" : new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));

  return (
    <div className="flex flex-col gap-3">
      <EnTeteVue titre="Mes ventes" retour={null} />
      {donnees.operationsEnErreur.length > 0 && (
        <div role="alert" className="rounded-2xl border border-red-300 bg-red-50 p-3 text-red-900">
          <div className="font-semibold">Certains envois n&apos;ont pas encore été acceptés par le bureau. Ils sont gardés et seront réessayés :</div>
          <ul className="list-disc pl-5 text-sm">
            {donnees.operationsEnErreur.map((o) => (
              <li key={o.id}>
                {NOMS_OPERATIONS[o.type] ?? "Saisie"} : {messageSimple(o.erreur)}
              </li>
            ))}
          </ul>
        </div>
      )}
      {aEnvoyer.length > 0 && (
        <section className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-3">
          <h2 className="font-bold text-amber-950">Pas encore envoyé au bureau ({aEnvoyer.length})</h2>
          <p className="mb-2 text-sm text-amber-900">Gardé sur ce téléphone ; partira tout seul dès que le réseau revient. Ce n&apos;est pas encore une vente confirmée.</p>
          <ul className="divide-y divide-amber-200">
            {aEnvoyer.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => aller(`document/${p.id}`)} className="flex min-h-12 w-full items-center justify-between gap-2 py-1 text-left">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{PIECES[p.typePiece].nom} · {nomClient(p.clientId)}</span>
                    <span className="block font-mono text-xs text-amber-900">{p.numero}</span>
                  </span>
                  <span className="shrink-0 font-bold">{gnf(p.totalTtcGnf)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="grid grid-cols-4 gap-1 rounded-2xl bg-gray-200 p-1" role="group" aria-label="Type">
        {(["tous", "facture", "commande", "devis"] as const).map((t) => (
          <button key={t} type="button" aria-pressed={type === t} onClick={() => setType(t)} className={`min-h-10 rounded-xl text-sm font-bold ${type === t ? "bg-white text-papel-800 shadow" : "text-gray-600"}`}>
            {t === "tous" ? "Tout" : PIECES[t].pluriel}
          </button>
        ))}
      </div>
      {jours.map((j) => {
        const duJour = pieces.filter((p) => p.datePiece === j);
        // Total du jour : seulement les commandes et factures reçues par le bureau.
        const total = duJour.filter((p) => p.typePiece !== "devis" && p.etat === "synchronisee").reduce((s, p) => s + p.totalTtcGnf, 0);
        return (
          <section key={j}>
            <div className="mb-1 flex items-baseline justify-between px-1">
              <h2 className="text-sm font-semibold capitalize text-gray-600">{jourLisible(j)}</h2>
              {total > 0 && <span className="text-sm font-bold text-gray-800">{gnf(total)} confirmés</span>}
            </div>
            <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white">
              {duJour.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => aller(`document/${p.id}`)} className="flex min-h-16 w-full items-center gap-3 px-3 py-2 text-left active:bg-gray-50">
                    <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${p.typePiece === "facture" ? "bg-papel-100 text-papel-800" : p.typePiece === "commande" ? "bg-sky-100 text-sky-800" : "bg-gray-100 text-gray-700"}`}>
                      {PIECES[p.typePiece].court}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{nomClient(p.clientId)}</span>
                      <span className="block font-mono text-xs text-gray-500">{p.numero}</span>
                      {p.typePiece === "commande" && p.etat === "synchronisee" && <span className="block text-xs font-semibold text-sky-800">{etatDeLaPiece(p).libelle}</span>}
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-bold">{gnf(p.totalTtcGnf)}</span>
                      <span className={`text-xs font-semibold ${p.etat === "rejetee" ? "text-red-700" : "text-green-700"}`}>{p.etat === "rejetee" ? "Refusée" : "Reçue ✓"}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {!pieces.length && !aEnvoyer.length && (
        <Vide
          texte="Aucune vente pour le moment. Touchez « Vendre » pour prendre votre première commande."
          action={
            <button type="button" onClick={() => aller("document-nouveau")} className="min-h-12 rounded-2xl bg-papel-700 px-5 font-bold text-white">
              Prendre une commande
            </button>
          }
        />
      )}
    </div>
  );
}
