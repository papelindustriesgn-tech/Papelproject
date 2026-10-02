"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useState } from "react";
import { mettreEnFile } from "@/lib/terrain/base-locale";
import { EnTeteVue, dateHeure } from "../communs";
import { useTerrain } from "../contexte";

function Miniature({ blob }: { blob: Blob }) {
  const url = useMemo(() => URL.createObjectURL(blob), [blob]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  // eslint-disable-next-line @next/next/no-img-element -- photo locale (blob) : next/image ne s'applique pas
  return <img src={url} alt="Photo du point de vente" className="h-24 w-24 rounded-lg object-cover" />;
}

export function VueFichePva({ id }: { id: string }) {
  const { base, aller, lancerSynchronisation, enLigne } = useTerrain();
  const donnees = useLiveQuery(async () => {
    const [pva, visites, photos, types, quartiers] = await Promise.all([
      base.pva.get(id),
      base.visites.where("pvaId").equals(id).reverse().sortBy("checkinAt"),
      base.photos.where("pvaId").equals(id).toArray(),
      base.typesClients.toArray(),
      base.quartiers.toArray(),
    ]);
    return { pva, visites, photos, types, quartiers };
  }, [base, id]);
  const [message, setMessage] = useState<string | null>(null);

  if (!donnees) return <p>Chargement…</p>;
  const { pva, visites, photos } = donnees;
  if (!pva) return <EnTeteVue titre="Point de vente introuvable" retour="pva" />;

  // Transformer le PVA en client (pour lui faire des factures).
  const devenirClient = async () => {
    const clientId = crypto.randomUUID();
    await base.transaction("rw", [base.clients, base.pva, base.operations], async () => {
      await base.clients.put({ id: clientId, nom: pva.nom, typeClientId: pva.typeClientId, conditionPaiement: "comptant", plafondCreditGnf: 0, encoursGnf: 0, enAttente: true });
      await base.pva.update(pva.id, { clientId });
      await mettreEnFile(base, "client", { id: clientId, pva_id: pva.id, nom: pva.nom, type_client_id: pva.typeClientId, responsable: pva.responsable, telephone: pva.telephone, quartier_id: pva.quartierId });
    });
    setMessage("Le point de vente est maintenant client : vous pouvez lui faire des devis et factures.");
    if (enLigne) void lancerSynchronisation();
  };

  return (
    <div className="flex flex-col gap-4">
      <EnTeteVue titre={pva.nom} retour="pva" />
      {message && <p className="rounded-lg border border-green-300 bg-green-50 p-3 text-green-900" role="status">{message}</p>}
      <button type="button" onClick={() => aller(`visite/${pva.id}`)} className="min-h-14 rounded-xl bg-papel-700 text-lg font-bold text-white">
        Commencer la visite (check-in GPS)
      </button>
      <div className="grid grid-cols-2 gap-2">
        {pva.clientId ? (
          <button type="button" onClick={() => aller(`document-nouveau?client=${pva.clientId}`)} className="min-h-12 rounded-lg border border-papel-300 bg-white font-semibold text-papel-800">
            Facture / devis
          </button>
        ) : (
          <button type="button" onClick={() => void devenirClient()} className="min-h-12 rounded-lg border border-papel-300 bg-white font-semibold text-papel-800">
            Créer comme client
          </button>
        )}
        <button type="button" onClick={() => aller(`pva-modifier/${pva.id}`)} className="min-h-12 rounded-lg border border-papel-300 bg-white font-semibold text-papel-800">
          Modifier
        </button>
      </div>
      <section className="rounded-xl border border-gray-200 bg-white p-3">
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          <dt className="text-gray-600">Type</dt>
          <dd>{donnees.types.find((t) => t.id === pva.typeClientId)?.libelle}</dd>
          <dt className="text-gray-600">Responsable</dt>
          <dd>{pva.responsable || "—"}</dd>
          <dt className="text-gray-600">Téléphone</dt>
          <dd>{pva.telephone ? <a href={`tel:${pva.telephone.replace(/\s/g, "")}`} className="font-semibold text-papel-700 underline">{pva.telephone}</a> : "—"}</dd>
          <dt className="text-gray-600">Quartier</dt>
          <dd>{donnees.quartiers.find((q) => q.id === pva.quartierId)?.libelle ?? "—"}</dd>
          <dt className="text-gray-600">Repère</dt>
          <dd>{pva.repere || "—"}</dd>
          <dt className="text-gray-600">Potentiel</dt>
          <dd>{pva.potentielColisMois !== null ? `${pva.potentielColisMois} colis / mois` : "—"}</dd>
          <dt className="text-gray-600">GPS</dt>
          <dd>{pva.latitude !== null ? `${pva.latitude.toFixed(5)}, ${pva.longitude?.toFixed(5)}` : "Position enregistrée à la première visite"}</dd>
        </dl>
        {pva.latitude !== null && (
          <a href={`https://www.google.com/maps/dir/?api=1&destination=${pva.latitude},${pva.longitude}`} target="_blank" rel="noreferrer" className="mt-2 inline-block font-semibold text-papel-700 underline">
            Itinéraire
          </a>
        )}
      </section>
      {photos.length > 0 && (
        <section className="flex flex-wrap gap-2">
          {photos.map((p) => (
            <Miniature key={p.id} blob={p.blob} />
          ))}
        </section>
      )}
      <section className="rounded-xl border border-gray-200 bg-white p-3">
        <h2 className="mb-2 text-lg font-bold text-papel-900">Dernières visites</h2>
        {visites.length ? (
          <ul className="divide-y divide-gray-100">
            {visites.slice(0, 10).map((v) => (
              <li key={v.id} className="py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{dateHeure(v.checkinAt)}</span>
                  {v.rupture && <span className="rounded-full bg-red-100 px-2 text-sm font-semibold text-red-800">Rupture</span>}
                  {v.dansZone === false && <span className="rounded-full bg-amber-100 px-2 text-sm font-semibold text-amber-900">Hors zone</span>}
                  {v.enAttente && <span className="text-sm text-amber-800">(à envoyer)</span>}
                </div>
                {v.stockPapelColis !== null && <div className="text-sm text-gray-700">Stock Papel : {v.stockPapelColis} colis</div>}
                {v.notes && <div className="text-sm text-gray-700">{v.notes}</div>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-700">Pas encore de visite.</p>
        )}
      </section>
    </div>
  );
}
