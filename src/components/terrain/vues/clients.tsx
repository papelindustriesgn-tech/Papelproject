"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { FilePlus2, MessageCircle, Phone, Store } from "lucide-react";
import { useMemo } from "react";
import { aujourdhuiConakry, EnTeteVue, gnf, gnfCourt, joursDepuis, numeroInternational, Vide } from "../communs";
import { useTerrain } from "../contexte";

/** Liste de mes clients : encours, plafond, dernier achat ; appeler ou vendre en un geste. */
export function ListeClients({ recherche }: { recherche: string }) {
  const { base, aller } = useTerrain();
  const donnees = useLiveQuery(async () => ({
    clients: (await base.clients.toArray()).sort((a, b) => a.nom.localeCompare(b.nom)),
    pieces: await base.pieces.toArray(),
    types: await base.typesClients.toArray(),
  }), [base]);
  const liste = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return (donnees?.clients ?? [])
      .filter((c) => !q || c.nom.toLowerCase().includes(q) || (c.telephone ?? "").includes(q) || (c.code ?? "").toLowerCase().includes(q))
      .map((c) => {
        const factures = (donnees?.pieces ?? []).filter((p) => p.clientId === c.id && p.typePiece === "facture" && p.etat !== "rejetee").sort((a, b) => b.datePiece.localeCompare(a.datePiece));
        return { ...c, derniere: factures[0] ?? null };
      });
  }, [donnees, recherche]);
  if (!donnees) return <p className="p-4">Chargement…</p>;
  if (!donnees.clients.length) return <Vide texte="Aucun client pour le moment : ouvrez un prospect puis « Créer comme client »." />;

  return (
    <ul className="flex flex-col gap-2">
      {liste.map((c) => {
        const ratio = c.plafondCreditGnf > 0 ? c.encoursGnf / c.plafondCreditGnf : 0;
        const jours = joursDepuis(c.derniere?.datePiece ?? null);
        return (
          <li key={c.id} className={`overflow-hidden rounded-2xl border border-l-4 border-gray-200 bg-white ${ratio >= 0.9 ? "border-l-red-600" : c.encoursGnf > 0 ? "border-l-amber-500" : "border-l-green-600"}`}>
            <button type="button" onClick={() => aller(`client/${c.id}`)} className="w-full px-3 pb-2 pt-3 text-left active:bg-gray-50">
              <span className="flex items-start justify-between gap-2">
                <span className="min-w-0">
                  <span className="block font-bold">
                    {c.nom} {c.enAttente && <span className="text-sm font-normal text-amber-800">(à envoyer)</span>}
                  </span>
                  <span className="block text-sm text-gray-600">
                    {donnees.types.find((t) => t.id === c.typeClientId)?.libelle}
                    {c.code ? ` · ${c.code}` : ""} · {c.conditionPaiement === "credit" ? "crédit" : "comptant"}
                  </span>
                </span>
                {c.encoursGnf > 0 && (
                  <span className="shrink-0 text-right">
                    <span className="block text-xs text-gray-500">Doit</span>
                    <span className={`font-bold ${ratio >= 0.9 ? "text-red-700" : "text-amber-800"}`}>{gnfCourt(c.encoursGnf)}</span>
                  </span>
                )}
              </span>
              {c.conditionPaiement === "credit" && c.plafondCreditGnf > 0 && (
                <span className="mt-2 block h-2 overflow-hidden rounded-full bg-gray-200" aria-label="Crédit utilisé">
                  <span className={`block h-full rounded-full ${ratio >= 0.9 ? "bg-red-600" : "bg-amber-500"}`} style={{ width: `${Math.min(1, ratio) * 100}%` }} />
                </span>
              )}
              <span className="mt-1 block text-xs text-gray-500">
                {c.derniere ? `Dernier achat ${jours === 0 ? "aujourd'hui" : `il y a ${jours} j`} · ${gnfCourt(c.derniere.totalTtcGnf)}` : "Aucun achat récent"}
              </span>
            </button>
            <div className="grid grid-cols-2 border-t border-gray-100 text-sm font-semibold text-papel-800">
              {c.telephone ? (
                <a href={`tel:${numeroInternational(c.telephone)}`} className="flex min-h-11 items-center justify-center gap-1.5 border-r border-gray-100 active:bg-gray-50">
                  <Phone size={16} /> Appeler
                </a>
              ) : (
                <span className="flex min-h-11 items-center justify-center gap-1.5 border-r border-gray-100 text-gray-300">
                  <Phone size={16} /> Appeler
                </span>
              )}
              <button type="button" onClick={() => aller(`document-nouveau?client=${c.id}`)} className="flex min-h-11 items-center justify-center gap-1.5 bg-papel-50 active:bg-papel-100">
                <FilePlus2 size={16} /> Vendre
              </button>
            </div>
          </li>
        );
      })}
      {!liste.length && <Vide texte="Aucun client ne correspond." />}
    </ul>
  );
}

/** Fiche client : coordonnées, crédit, historique des factures et devis, vendre. */
export function VueFicheClient({ id }: { id: string }) {
  const { base, aller } = useTerrain();
  const donnees = useLiveQuery(async () => ({
    client: await base.clients.get(id),
    pieces: (await base.pieces.where("clientId").equals(id).toArray()).sort((a, b) => b.numero.localeCompare(a.numero)),
    pva: (await base.pva.toArray()).find((p) => p.clientId === id),
    types: await base.typesClients.toArray(),
    quartiers: await base.quartiers.toArray(),
  }), [base, id]);
  if (!donnees) return <p className="p-4">Chargement…</p>;
  const { client, pieces, pva } = donnees;
  if (!client) return <EnTeteVue titre="Client introuvable" retour="pva?vue=clients" />;
  const tel = client.telephone ? numeroInternational(client.telephone) : null;
  const mois = aujourdhuiConakry().slice(0, 7);
  const factures = pieces.filter((p) => p.typePiece === "facture" && p.etat !== "rejetee");
  const caMois = factures.filter((p) => p.datePiece.slice(0, 7) === mois).reduce((s, p) => s + p.totalHtGnf, 0);
  const disponible = client.plafondCreditGnf > 0 ? Math.max(0, client.plafondCreditGnf - client.encoursGnf) : null;

  return (
    <div className="flex flex-col gap-3">
      <EnTeteVue titre={client.nom} sousTitre={[donnees.types.find((t) => t.id === client.typeClientId)?.libelle, client.code].filter(Boolean).join(" · ")} retour="pva?vue=clients" />

      <section className="grid grid-cols-3 gap-2 rounded-2xl border border-gray-200 bg-white p-3 text-center">
        {[
          { href: tel ? `tel:${tel}` : null, libelle: "Appeler", Icone: Phone },
          { href: tel ? `https://wa.me/${tel.replace("+", "")}` : null, libelle: "WhatsApp", Icone: MessageCircle },
        ].map(({ href, libelle, Icone }) =>
          href ? (
            <a key={libelle} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="flex flex-col items-center gap-1">
              <span className="flex size-12 items-center justify-center rounded-full bg-papel-100 text-papel-800"><Icone size={22} /></span>
              <span className="text-xs font-semibold">{libelle}</span>
            </a>
          ) : (
            <span key={libelle} className="flex flex-col items-center gap-1 text-gray-300">
              <span className="flex size-12 items-center justify-center rounded-full bg-gray-100"><Icone size={22} /></span>
              <span className="text-xs font-semibold">{libelle}</span>
            </span>
          ),
        )}
        {pva ? (
          <button type="button" onClick={() => aller(`pva/${pva.id}`)} className="flex flex-col items-center gap-1">
            <span className="flex size-12 items-center justify-center rounded-full bg-papel-100 text-papel-800"><Store size={22} /></span>
            <span className="text-xs font-semibold">Boutique</span>
          </button>
        ) : (
          <span className="flex flex-col items-center gap-1 text-gray-300">
            <span className="flex size-12 items-center justify-center rounded-full bg-gray-100"><Store size={22} /></span>
            <span className="text-xs font-semibold">Boutique</span>
          </span>
        )}
      </section>

      <button type="button" onClick={() => aller(`document-nouveau?client=${client.id}`)} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-papel-700 text-lg font-bold text-white">
        <FilePlus2 size={20} /> Nouvelle facture / devis
      </button>

      <section className="grid grid-cols-2 gap-2">
        <div className={`rounded-2xl border p-3 ${client.encoursGnf > 0 ? "border-amber-200 bg-amber-50" : "border-gray-200 bg-white"}`}>
          <div className="text-xs font-medium uppercase text-gray-500">Reste à payer</div>
          <div className="text-lg font-bold">{gnf(client.encoursGnf)}</div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-3">
          <div className="text-xs font-medium uppercase text-gray-500">{client.conditionPaiement === "credit" ? "Crédit disponible" : "Paiement"}</div>
          <div className="text-lg font-bold">{client.conditionPaiement === "credit" ? (disponible !== null ? gnf(disponible) : "Sans plafond") : "Comptant"}</div>
        </div>
        <div className="col-span-2 rounded-2xl border border-gray-200 bg-white p-3">
          <div className="text-xs font-medium uppercase text-gray-500">Acheté ce mois (HT)</div>
          <div className="text-lg font-bold">{gnf(caMois)}</div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-3">
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
          <dt className="text-gray-500">Responsable</dt>
          <dd>{client.responsable || "—"}</dd>
          <dt className="text-gray-500">Téléphone</dt>
          <dd>{client.telephone || "—"}</dd>
          <dt className="text-gray-500">Adresse</dt>
          <dd>{client.adresse || "—"}</dd>
          <dt className="text-gray-500">Quartier</dt>
          <dd>{donnees.quartiers.find((q) => q.id === client.quartierId)?.libelle ?? "—"}</dd>
        </dl>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-3">
        <h2 className="mb-2 text-lg font-bold">Factures et devis</h2>
        {pieces.length ? (
          <ul className="divide-y divide-gray-100">
            {pieces.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => aller(`document/${p.id}`)} className="flex min-h-12 w-full items-center justify-between gap-2 py-2 text-left">
                  <span>
                    <span className="block font-mono text-sm font-semibold">{p.numero}</span>
                    <span className="text-xs text-gray-500">{p.datePiece.split("-").reverse().join("/")}</span>
                  </span>
                  <span className="text-right">
                    <span className="block font-bold">{gnf(p.totalTtcGnf)}</span>
                    <span className={`text-xs font-semibold ${p.etat === "rejetee" ? "text-red-700" : p.etat === "en_attente" ? "text-amber-800" : "text-green-700"}`}>
                      {p.etat === "rejetee" ? "Refusé" : p.etat === "en_attente" ? "À envoyer" : "Envoyé ✓"}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-600">Aucune facture sur les 90 derniers jours.</p>
        )}
      </section>
    </div>
  );
}
