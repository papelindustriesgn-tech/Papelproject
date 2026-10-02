"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Image from "next/image";
import { useMemo, useState } from "react";
import { calculerTotaux } from "@/lib/metier/tva";
import { colis as enColis, colisVersPaquets, formaterStockProduitFini, paquets as enPaquets, somme, type Paquets } from "@/lib/metier/unites";
import { montantEnLettresGnf } from "@/lib/metier/ventes";
import { ecrireMeta, lireMeta, mettreEnFile, type LignePieceLocale, type PieceLocale } from "@/lib/terrain/base-locale";
import { formaterNumero, prefixeSerie, prochainCompteur } from "@/lib/terrain/numerotation";
import { aujourdhuiConakry, EnTeteVue } from "../communs";
import { useTerrain } from "../contexte";

const champ = "min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3";
const gnf = (n: number) => `${n.toLocaleString("fr-FR").replace(/[  ]/g, " ")} GNF`;

/** Création d'un devis ou d'une facture sur le téléphone, même sans réseau. */
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
  const [lignes, setLignes] = useState<LignePieceLocale[]>([]);
  const [saisie, setSaisie] = useState({ conditionnementId: "", colis: "", vrac: "" });
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const client = donnees?.clients.find((c) => c.id === clientId);
  const niveau = donnees?.types.find((t) => t.id === client?.typeClientId)?.niveauPrix ?? "papel";
  const prixDe = (conditionnementId: string) => {
    const c = donnees?.conditionnements.find((x) => x.id === conditionnementId);
    if (!c) return null;
    return donnees?.prix.find((p) => p.cle === `${c.produitId}|${niveau}`)?.prixPaquetGnf ?? donnees?.prix.find((p) => p.cle === `${c.produitId}|papel`)?.prixPaquetGnf ?? null;
  };
  const totaux = useMemo(() => calculerTotaux(lignes.reduce((s, l) => s + l.montantHtGnf, 0), donnees?.tva ?? { applicable: true, taux: 0.18 }), [lignes, donnees?.tva]);
  const libelleCond = (id: string) => {
    const c = donnees?.conditionnements.find((x) => x.id === id);
    return c ? `${donnees?.produits.find((p) => p.id === c.produitId)?.libelle} – ${c.libelle}` : "";
  };

  if (!donnees) return <p>Chargement…</p>;

  const ajouterLigne = () => {
    setErreur(null);
    const c = donnees.conditionnements.find((x) => x.id === saisie.conditionnementId);
    const nbColis = Number(saisie.colis.replace(/\s/g, "") || 0);
    const vrac = Number(saisie.vrac.replace(/\s/g, "") || 0);
    if (!c) return setErreur("Choisissez le produit et le colis.");
    if (!Number.isInteger(nbColis) || !Number.isInteger(vrac) || nbColis < 0 || vrac < 0 || nbColis + vrac === 0) return setErreur("Saisissez un nombre de colis (et éventuellement de paquets) entier.");
    if (!client) return setErreur("Choisissez d'abord le client (le prix dépend de son type).");
    const prix = prixDe(c.id);
    if (prix === null) return setErreur("Aucun prix connu pour ce produit : synchronisez l'application.");
    const total = somme(colisVersPaquets(enColis(nbColis), { paquetsParColis: c.paquetsParColis }), enPaquets(vrac));
    setLignes((l) => [...l, { conditionnementId: c.id, quantiteColis: nbColis, paquetsVrac: vrac, paquets: total, prixPaquetGnf: prix, montantHtGnf: total * prix }]);
    setSaisie({ conditionnementId: saisie.conditionnementId, colis: "", vrac: "" });
  };

  const valider = async () => {
    setErreur(null);
    if (!client) return setErreur("Choisissez le client.");
    if (!lignes.length) return setErreur("Ajoutez au moins un produit.");
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
    <div className="flex flex-col gap-3">
      <EnTeteVue titre="Nouveau document" />
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Type de document">
        {(["facture", "devis"] as const).map((t) => (
          <button key={t} type="button" aria-pressed={typePiece === t} onClick={() => setTypePiece(t)} className={`min-h-12 rounded-lg border font-semibold ${typePiece === t ? "border-papel-700 bg-papel-700 text-white" : "border-gray-300 bg-white"}`}>
            {t === "facture" ? "Facture" : "Devis"}
          </button>
        ))}
      </div>
      <div>
        <label htmlFor="client" className="mb-1 block font-medium">Client</label>
        <select id="client" value={clientId} onChange={(e) => { setClientId(e.target.value); setLignes([]); }} className={champ}>
          <option value="">— Choisir —</option>
          {donnees.clients.map((c) => (
            <option key={c.id} value={c.id}>{c.nom}</option>
          ))}
        </select>
        {!donnees.clients.length && <p className="text-sm text-gray-700">Aucun client : ouvrez un point de vente puis « Créer comme client ».</p>}
        {client?.conditionPaiement === "credit" && <p className="text-sm text-gray-700">Crédit · encours {gnf(client.encoursGnf)}{client.plafondCreditGnf ? ` · plafond ${gnf(client.plafondCreditGnf)}` : ""}</p>}
      </div>
      <fieldset className="rounded-lg border border-gray-200 p-3">
        <legend className="px-1 font-medium">Ajouter un produit</legend>
        <label htmlFor="cond" className="sr-only">Produit et colis</label>
        <select id="cond" value={saisie.conditionnementId} onChange={(e) => setSaisie((s) => ({ ...s, conditionnementId: e.target.value }))} className={champ}>
          <option value="">— Produit et colis —</option>
          {donnees.conditionnements
            .map((c) => ({ id: c.id, libelle: libelleCond(c.id) }))
            .sort((a, b) => a.libelle.localeCompare(b.libelle))
            .map((c) => (
              <option key={c.id} value={c.id}>{c.libelle}</option>
            ))}
        </select>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <input aria-label="Colis" placeholder="Colis" inputMode="numeric" value={saisie.colis} onChange={(e) => setSaisie((s) => ({ ...s, colis: e.target.value }))} className={champ} />
          <input aria-label="Paquets en plus" placeholder="+ paquets" inputMode="numeric" value={saisie.vrac} onChange={(e) => setSaisie((s) => ({ ...s, vrac: e.target.value }))} className={champ} />
          <button type="button" onClick={ajouterLigne} className="min-h-11 rounded-lg bg-papel-700 font-semibold text-white">Ajouter</button>
        </div>
        {saisie.conditionnementId && client && prixDe(saisie.conditionnementId) !== null && <p className="mt-1 text-sm text-gray-700">Prix HT : {gnf(prixDe(saisie.conditionnementId)!)} / paquet</p>}
      </fieldset>
      {lignes.length > 0 && (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
          {lignes.map((l, i) => (
            <li key={i} className="flex items-center gap-2 p-2">
              <div className="flex-1">
                <div className="font-semibold">{libelleCond(l.conditionnementId)}</div>
                <div className="text-sm text-gray-700">
                  {formaterStockProduitFini(l.paquets as Paquets, { paquetsParColis: donnees.conditionnements.find((c) => c.id === l.conditionnementId)?.paquetsParColis ?? 1 })} × {gnf(l.prixPaquetGnf)} = {gnf(l.montantHtGnf)}
                </div>
              </div>
              <button type="button" onClick={() => setLignes((x) => x.filter((_, j) => j !== i))} className="min-h-11 px-2 font-semibold text-red-700 underline">Retirer</button>
            </li>
          ))}
        </ul>
      )}
      <dl className="grid grid-cols-2 gap-1 rounded-lg bg-papel-50 p-3 text-right">
        <dt>Total HT</dt>
        <dd className="font-semibold">{gnf(totaux.totalHtGnf)}</dd>
        <dt>TVA</dt>
        <dd className="font-semibold">{gnf(totaux.tvaGnf)}</dd>
        <dt className="text-lg font-bold">Total TTC</dt>
        <dd className="text-lg font-bold">{gnf(totaux.totalTtcGnf)}</dd>
      </dl>
      {erreur && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-red-900">{erreur}</p>}
      <button type="button" onClick={() => void valider()} disabled={enCours} className="min-h-14 rounded-xl bg-papel-700 text-lg font-bold text-white disabled:bg-papel-300">
        Valider {typePiece === "facture" ? "la facture" : "le devis"}
      </button>
      <p className="text-sm text-gray-600">La validation attribue le numéro définitif. Le document est envoyé au bureau dès que le réseau est disponible.</p>
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
          <button type="button" onClick={() => window.print()} className="min-h-12 rounded-lg bg-papel-700 font-semibold text-white">Imprimer / PDF</button>
          <button type="button" onClick={() => void partager()} className="min-h-12 rounded-lg border border-papel-300 bg-white font-semibold text-papel-800">Partager</button>
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

/** Mes devis et factures, avec leur état d'envoi. */
export function VueDocuments() {
  const { base, aller } = useTerrain();
  const donnees = useLiveQuery(async () => ({
    pieces: (await base.pieces.toArray()).sort((a, b) => b.numero.localeCompare(a.numero)),
    clients: await base.clients.toArray(),
    operationsEnErreur: (await base.operations.toArray()).filter((o) => o.erreur),
  }), [base]);
  if (!donnees) return <p>Chargement…</p>;
  const nomClient = (id: string) => donnees.clients.find((c) => c.id === id)?.nom ?? "";
  return (
    <div className="flex flex-col gap-3">
      <EnTeteVue
        titre="Mes documents"
        action={
          <button type="button" onClick={() => aller("document-nouveau")} className="min-h-11 rounded-lg bg-papel-700 px-3 font-semibold text-white">
            + Nouveau
          </button>
        }
      />
      {donnees.operationsEnErreur.length > 0 && (
        <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-red-900">
          <div className="font-semibold">Saisies refusées par le serveur (elles seront réessayées) :</div>
          <ul className="list-disc pl-5 text-sm">
            {donnees.operationsEnErreur.map((o) => (
              <li key={o.id}>{o.type} : {o.erreur}</li>
            ))}
          </ul>
        </div>
      )}
      <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
        {donnees.pieces.map((p) => (
          <li key={p.id}>
            <button type="button" onClick={() => aller(`document/${p.id}`)} className="flex min-h-14 w-full items-center gap-2 px-3 py-2 text-left">
              <span className="flex-1">
                <span className="block font-mono font-semibold">{p.numero}</span>
                <span className="text-sm text-gray-600">{nomClient(p.clientId)} · {p.datePiece.split("-").reverse().join("/")}</span>
              </span>
              <span className="text-right">
                <span className="block font-semibold">{gnf(p.totalTtcGnf)}</span>
                <span className={`text-sm ${p.etat === "rejetee" ? "font-bold text-red-700" : p.etat === "en_attente" ? "text-amber-800" : "text-green-800"}`}>
                  {p.etat === "rejetee" ? "Refusé" : p.etat === "en_attente" ? "À envoyer" : "Envoyé"}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {!donnees.pieces.length && <p className="text-gray-700">Aucun document pour le moment.</p>}
    </div>
  );
}
