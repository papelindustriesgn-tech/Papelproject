"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Image from "next/image";
import { useMemo, useState } from "react";
import { calculerTotaux } from "@/lib/metier/tva";
import { colis as enColis, colisVersPaquets, formaterStockProduitFini, paquets as enPaquets, somme, type Paquets } from "@/lib/metier/unites";
import { montantEnLettresGnf } from "@/lib/metier/ventes";
import { ecrireMeta, lireMeta, mettreEnFile, type LignePieceLocale, type PieceLocale } from "@/lib/terrain/base-locale";
import { formaterNumero, prefixeSerie, prochainCompteur } from "@/lib/terrain/numerotation";
import { aujourdhuiConakry, Compteur, EnTeteVue, gnf, Vide } from "../communs";
import { useTerrain } from "../contexte";

const champ = "min-h-12 w-full rounded-xl border border-gray-300 bg-white px-3";

/** Création d'un devis ou d'une facture sur le téléphone, même sans réseau : client, quantités en − / +, total toujours visible. */
export function VueNouveauDocument({ clientInitial }: { clientInitial?: string }) {
  const { base, aller, enLigne, lancerSynchronisation } = useTerrain();
  const donnees = useLiveQuery(async () => ({
    clients: (await base.clients.toArray()).sort((a, b) => a.nom.localeCompare(b.nom)),
    produits: await base.produits.toArray(),
    conditionnements: await base.conditionnements.toArray(),
    prix: await base.prix.toArray(),
    types: await base.typesClients.toArray(),
    tva: await lireMeta(base, "tva", { applicable: true, taux: 0.18 }),
    profil: await lireMeta<{ codeSerie: string | null }>(base, "profil", { codeSerie: null }),
  }), [base]);
  const [typePiece, setTypePiece] = useState<"devis" | "facture">("facture");
  const [clientId, setClientId] = useState(clientInitial ?? "");
  const [rechercheClient, setRechercheClient] = useState("");
  /** Quantités saisies par conditionnement : colis complets + paquets en plus. */
  const [quantites, setQuantites] = useState<Record<string, { colis: string; vrac: string }>>({});
  const [vracOuvert, setVracOuvert] = useState<Record<string, boolean>>({});
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
    .map((c) => ({ ...c, libelle: libelleCond(c.id), ordre: donnees.produits.find((p) => p.id === c.produitId)?.ordre ?? 0 }))
    // Produit, puis colis habituel en premier, puis taille de colis croissante.
    .sort((a, b) => a.ordre - b.ordre || Number(b.parDefaut) - Number(a.parDefaut) || a.paquetsParColis - b.paquetsParColis);
  const clientsFiltres = donnees.clients.filter((c) => !rechercheClient.trim() || c.nom.toLowerCase().includes(rechercheClient.trim().toLowerCase()));

  const valider = async () => {
    setErreur(null);
    if (!client) return setErreur("Choisissez le client.");
    if (!lignes.length) return setErreur("Ajoutez au moins un produit (bouton +).");
    if (!donnees.profil.codeSerie) return setErreur("Votre série de numérotation n'est pas définie : contactez l'administrateur.");
    if (typePiece === "facture" && client.conditionPaiement === "credit" && client.plafondCreditGnf > 0 && client.encoursGnf + totaux.totalTtcGnf > client.plafondCreditGnf) {
      return setErreur(`Plafond de crédit dépassé : encours ${gnf(client.encoursGnf)} + facture ${gnf(totaux.totalTtcGnf)} > plafond ${gnf(client.plafondCreditGnf)}.`);
    }
    setEnCours(true);
    const date = aujourdhuiConakry();
    const prefixe = prefixeSerie(typePiece, Number(date.slice(0, 4)), donnees.profil.codeSerie);
    const id = crypto.randomUUID();
    // Numéro attribué dans une transaction : deux documents ne peuvent pas recevoir le même.
    const numero = await base.transaction("rw", [base.meta, base.pieces, base.operations], async () => {
      const n = prochainCompteur(await lireMeta<number>(base, `compteur:${prefixe}`, 0), 0);
      await ecrireMeta(base, `compteur:${prefixe}`, n);
      const num = formaterNumero(prefixe, n);
      const piece: PieceLocale = {
        id, typePiece, numero: num, clientId: client.id, datePiece: date, lignes, totalHtGnf: totaux.totalHtGnf, tvaGnf: totaux.tvaGnf,
        totalTtcGnf: totaux.totalTtcGnf, tauxTva: donnees.tva.applicable ? donnees.tva.taux : 0, notes: "", etat: "en_attente",
      };
      await base.pieces.put(piece);
      await mettreEnFile(base, "piece", {
        id, type_piece: typePiece, numero: num, client_id: client.id, date_piece: date, notes: "",
        lignes: lignes.map((l) => ({ conditionnement_id: l.conditionnementId, quantite_colis: l.quantiteColis, paquets_vrac: l.paquetsVrac, prix_paquet_gnf: l.prixPaquetGnf })),
      });
      return num;
    });
    if (enLigne) void lancerSynchronisation();
    aller(`document/${id}?nouveau=${encodeURIComponent(numero)}`);
  };

  return (
    <div className="flex flex-col gap-3 pb-48">
      <EnTeteVue titre={typePiece === "facture" ? "Nouvelle facture" : "Nouveau devis"} />
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-gray-200 p-1" role="group" aria-label="Type de document">
        {(["facture", "devis"] as const).map((t) => (
          <button key={t} type="button" aria-pressed={typePiece === t} onClick={() => setTypePiece(t)} className={`min-h-11 rounded-xl font-bold ${typePiece === t ? "bg-white text-papel-800 shadow" : "text-gray-600"}`}>
            {t === "facture" ? "Facture" : "Devis"}
          </button>
        ))}
      </div>

      {/* 1. Client */}
      <section className="rounded-2xl border border-gray-200 bg-white p-3">
        <h2 className="mb-2 font-bold">1. Client</h2>
        {client ? (
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-lg font-bold">{client.nom}</div>
              <div className="text-sm text-gray-600">
                {donnees.types.find((t) => t.id === client.typeClientId)?.libelle}
                {client.conditionPaiement === "credit" ? ` · crédit · encours ${gnf(client.encoursGnf)}${client.plafondCreditGnf ? ` / ${gnf(client.plafondCreditGnf)}` : ""}` : " · comptant"}
              </div>
            </div>
            <button type="button" onClick={() => { setClientId(""); setQuantites({}); }} className="min-h-11 shrink-0 rounded-xl border border-gray-300 px-3 font-semibold">
              Changer
            </button>
          </div>
        ) : (
          <>
            <label htmlFor="recherche-client" className="sr-only">Rechercher un client</label>
            <input id="recherche-client" type="search" value={rechercheClient} onChange={(e) => setRechercheClient(e.target.value)} placeholder="Rechercher un client…" className={champ} />
            <ul className="mt-2 max-h-72 divide-y divide-gray-100 overflow-y-auto">
              {clientsFiltres.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => setClientId(c.id)} className="flex min-h-12 w-full items-center justify-between gap-2 py-2 text-left active:bg-gray-50">
                    <span className="font-semibold">{c.nom}</span>
                    <span className="text-sm text-gray-500">{donnees.types.find((t) => t.id === c.typeClientId)?.libelle}</span>
                  </button>
                </li>
              ))}
            </ul>
            {!donnees.clients.length && <p className="text-sm text-gray-700">Aucun client : ouvrez un point de vente puis « Créer comme client ».</p>}
          </>
        )}
      </section>

      {/* 2. Produits */}
      {client && (
        <section className="flex flex-col gap-2">
          <h2 className="px-1 font-bold">2. Produits</h2>
          {conditionnements.map((c) => {
            const prix = prixDe(c.id);
            const q = quantites[c.id] ?? { colis: "", vrac: "" };
            const ligne = lignes.find((l) => l.conditionnementId === c.id);
            return (
              <div key={c.id} className={`rounded-2xl border-2 bg-white p-3 ${ligne ? "border-papel-600" : "border-gray-200"}`}>
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="font-bold">{c.libelle}</div>
                  <div className="text-right text-sm text-gray-600">
                    {prix !== null ? (
                      <>
                        {gnf(prix)} / paquet
                        <div>{gnf(prix * c.paquetsParColis)} / colis</div>
                      </>
                    ) : (
                      "Prix inconnu : synchronisez"
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
                        {formaterStockProduitFini(ligne.paquets as Paquets, { paquetsParColis: c.paquetsParColis })} = {gnf(ligne.montantHtGnf)} HT
                      </p>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </section>
      )}

      {erreur && <p role="alert" className="rounded-2xl border border-red-300 bg-red-50 p-3 text-red-900">{erreur}</p>}

      {/* Total et validation : toujours visibles au-dessus des onglets. */}
      <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[999] mx-auto max-w-xl px-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-lg">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <span className="text-lg font-bold">Total TTC</span>
            <span className="text-xl font-bold">{gnf(totaux.totalTtcGnf)}</span>
          </div>
          <p className="-mt-1 mb-2 text-right text-xs text-gray-500">dont TVA {gnf(totaux.tvaGnf)} · HT {gnf(totaux.totalHtGnf)}</p>
          <button type="button" onClick={() => void valider()} disabled={enCours} className="min-h-14 w-full rounded-2xl bg-papel-700 text-lg font-bold text-white disabled:bg-papel-300">
            Valider {typePiece === "facture" ? "la facture" : "le devis"}
          </button>
        </div>
      </div>
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
  const titre = piece.typePiece === "facture" ? "FACTURE" : "DEVIS";

  const partager = async () => {
    const texte = `${titre} ${piece.numero} – ${donnees.entreprise.nom}\nClient : ${client?.nom ?? ""}\nTotal TTC : ${gnf(piece.totalTtcGnf)}\n(${montantEnLettresGnf(piece.totalTtcGnf)})`;
    if (navigator.share) await navigator.share({ title: `${titre} ${piece.numero}`, text: texte }).catch(() => undefined);
    else window.open(`https://wa.me/?text=${encodeURIComponent(texte)}`, "_blank");
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="print:hidden">
        <EnTeteVue titre={`${piece.typePiece === "facture" ? "Facture" : "Devis"} ${piece.numero}`} retour="documents" />
        {nouveau && <p role="status" className="mb-2 rounded-lg border border-green-300 bg-green-50 p-3 text-green-900">✓ Document {nouveau} validé. Vous pouvez l&apos;imprimer ou le partager.</p>}
        {piece.etat === "en_attente" && <p className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-amber-900">En attente d&apos;envoi au bureau (partira au retour du réseau).</p>}
        {piece.etat === "rejetee" && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-2 text-red-900">Refusé par le bureau : {piece.erreur}. Ne remettez pas ce document au client ; contactez votre responsable.</p>}
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

/** Mes ventes : devis et factures regroupés par jour, avec le total et l'état d'envoi. */
export function VueDocuments() {
  const { base, aller } = useTerrain();
  const [type, setType] = useState<"tous" | "facture" | "devis">("tous");
  const donnees = useLiveQuery(async () => ({
    pieces: (await base.pieces.toArray()).sort((a, b) => b.numero.localeCompare(a.numero)),
    clients: await base.clients.toArray(),
    operationsEnErreur: (await base.operations.toArray()).filter((o) => o.erreur),
  }), [base]);
  if (!donnees) return <p className="p-4">Chargement…</p>;
  const nomClient = (id: string) => donnees.clients.find((c) => c.id === id)?.nom ?? "";
  const pieces = donnees.pieces.filter((p) => type === "tous" || p.typePiece === type);
  const jours = [...new Set(pieces.map((p) => p.datePiece))].sort().reverse();
  const jourLisible = (d: string) =>
    d === aujourdhuiConakry() ? "Aujourd'hui" : new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));

  return (
    <div className="flex flex-col gap-3">
      <EnTeteVue titre="Mes ventes" retour={null} />
      {donnees.operationsEnErreur.length > 0 && (
        <div role="alert" className="rounded-2xl border border-red-300 bg-red-50 p-3 text-red-900">
          <div className="font-semibold">Saisies refusées par le serveur (elles seront réessayées) :</div>
          <ul className="list-disc pl-5 text-sm">
            {donnees.operationsEnErreur.map((o) => (
              <li key={o.id}>{o.type} : {o.erreur}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-gray-200 p-1" role="group" aria-label="Type">
        {(["tous", "facture", "devis"] as const).map((t) => (
          <button key={t} type="button" aria-pressed={type === t} onClick={() => setType(t)} className={`min-h-10 rounded-xl text-sm font-bold ${type === t ? "bg-white text-papel-800 shadow" : "text-gray-600"}`}>
            {t === "tous" ? "Tout" : t === "facture" ? "Factures" : "Devis"}
          </button>
        ))}
      </div>
      {jours.map((j) => {
        const duJour = pieces.filter((p) => p.datePiece === j);
        const total = duJour.filter((p) => p.typePiece === "facture" && p.etat !== "rejetee").reduce((s, p) => s + p.totalTtcGnf, 0);
        return (
          <section key={j}>
            <div className="mb-1 flex items-baseline justify-between px-1">
              <h2 className="text-sm font-semibold capitalize text-gray-600">{jourLisible(j)}</h2>
              {total > 0 && <span className="text-sm font-bold text-gray-800">{gnf(total)} TTC</span>}
            </div>
            <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white">
              {duJour.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => aller(`document/${p.id}`)} className="flex min-h-16 w-full items-center gap-3 px-3 py-2 text-left active:bg-gray-50">
                    <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${p.typePiece === "facture" ? "bg-papel-100 text-papel-800" : "bg-gray-100 text-gray-700"}`}>
                      {p.typePiece === "facture" ? "FA" : "DEV"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{nomClient(p.clientId)}</span>
                      <span className="block font-mono text-xs text-gray-500">{p.numero}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-bold">{gnf(p.totalTtcGnf)}</span>
                      <span className={`text-xs font-semibold ${p.etat === "rejetee" ? "text-red-700" : p.etat === "en_attente" ? "text-amber-800" : "text-green-700"}`}>
                        {p.etat === "rejetee" ? "Refusé" : p.etat === "en_attente" ? "À envoyer" : "Envoyé ✓"}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {!pieces.length && (
        <Vide
          texte="Aucun document pour le moment."
          action={
            <button type="button" onClick={() => aller("document-nouveau")} className="min-h-12 rounded-2xl bg-papel-700 px-5 font-bold text-white">
              Faire une vente
            </button>
          }
        />
      )}
    </div>
  );
}
