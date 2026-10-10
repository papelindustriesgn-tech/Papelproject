"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { FilePlus2, MessageCircle, Navigation, Pencil, Phone, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { mettreEnFile } from "@/lib/terrain/base-locale";
import { EnTeteVue, dateHeure, numeroInternational } from "../communs";
import { useTerrain } from "../contexte";

function Miniature({ blob }: { blob: Blob }) {
  const url = useMemo(() => URL.createObjectURL(blob), [blob]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  // eslint-disable-next-line @next/next/no-img-element -- photo locale (blob) : next/image ne s'applique pas
  return <img src={url} alt="Photo du point de vente" className="h-24 w-24 shrink-0 rounded-xl object-cover" />;
}

/** Bouton d'action rond (appeler, WhatsApp, itinéraire). */
function Action({ href, libelle, children, actif = true }: { href?: string; libelle: string; children: React.ReactNode; actif?: boolean }) {
  const contenu = (
    <>
      <span className={`flex size-12 items-center justify-center rounded-full ${actif ? "bg-papel-100 text-papel-800" : "bg-gray-100 text-gray-300"}`}>{children}</span>
      <span className={`text-xs font-semibold ${actif ? "text-gray-800" : "text-gray-400"}`}>{libelle}</span>
    </>
  );
  return actif && href ? (
    <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="flex flex-col items-center gap-1">
      {contenu}
    </a>
  ) : (
    <span className="flex flex-col items-center gap-1">{contenu}</span>
  );
}

export function VueFichePva({ id, visiteOk }: { id: string; visiteOk?: boolean }) {
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

  if (!donnees) return <p className="p-4">Chargement…</p>;
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

  const tel = pva.telephone ? numeroInternational(pva.telephone) : null;
  const derniere = visites[0];

  return (
    <div className="flex flex-col gap-3">
      <EnTeteVue titre={pva.nom} sousTitre={donnees.types.find((t) => t.id === pva.typeClientId)?.libelle} retour="pva" />
      {visiteOk && <p className="rounded-2xl border border-green-300 bg-green-50 p-3 font-semibold text-green-900" role="status">✓ Visite enregistrée.{pva.clientId ? " Le client commande ? Faites la facture ci-dessous." : ""}</p>}
      {message && <p className="rounded-2xl border border-green-300 bg-green-50 p-3 text-green-900" role="status">{message}</p>}

      <section className="grid grid-cols-3 gap-2 rounded-2xl border border-gray-200 bg-white p-3">
        <Action href={tel ? `tel:${tel}` : undefined} libelle="Appeler" actif={!!tel}>
          <Phone size={22} />
        </Action>
        <Action href={tel ? `https://wa.me/${tel.replace("+", "")}` : undefined} libelle="WhatsApp" actif={!!tel}>
          <MessageCircle size={22} />
        </Action>
        <Action href={pva.latitude !== null ? `https://www.google.com/maps/dir/?api=1&destination=${pva.latitude},${pva.longitude}` : undefined} libelle="Itinéraire" actif={pva.latitude !== null}>
          <Navigation size={22} />
        </Action>
      </section>

      <button type="button" onClick={() => aller(`visite/${pva.id}`)} className="min-h-14 rounded-2xl bg-papel-700 px-3 text-base font-bold text-white shadow-sm active:scale-[0.99]">
        Commencer la visite (check-in GPS)
      </button>
      <div className="grid grid-cols-2 gap-2">
        {pva.clientId ? (
          <button type="button" onClick={() => aller(`document-nouveau?client=${pva.clientId}`)} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border-2 border-papel-700 bg-white font-bold text-papel-800">
            <FilePlus2 size={18} /> Facture / devis
          </button>
        ) : (
          <button type="button" onClick={() => void devenirClient()} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border-2 border-papel-700 bg-white font-bold text-papel-800">
            <UserPlus size={18} /> Créer comme client
          </button>
        )}
        <button type="button" onClick={() => aller(`pva-modifier/${pva.id}`)} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-gray-300 bg-white font-semibold text-gray-800">
          <Pencil size={16} /> Modifier
        </button>
      </div>

      {derniere && (
        <section className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-3">
            <div className="text-xs font-medium uppercase text-gray-500">Dernière visite</div>
            <div className="font-bold">{dateHeure(derniere.checkinAt)}</div>
          </div>
          <div className={`rounded-2xl border p-3 ${derniere.rupture ? "border-red-200 bg-red-50" : "border-gray-200 bg-white"}`}>
            <div className="text-xs font-medium uppercase text-gray-500">Stock Papel</div>
            <div className={`font-bold ${derniere.rupture ? "text-red-700" : ""}`}>{derniere.rupture ? "Rupture" : derniere.stockPapelColis !== null ? `${derniere.stockPapelColis} colis` : "—"}</div>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-3">
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
          <dt className="text-gray-500">Responsable</dt>
          <dd>{pva.responsable || "—"}</dd>
          <dt className="text-gray-500">Téléphone</dt>
          <dd>{pva.telephone || "—"}</dd>
          <dt className="text-gray-500">Quartier</dt>
          <dd>{donnees.quartiers.find((q) => q.id === pva.quartierId)?.libelle ?? "—"}</dd>
          <dt className="text-gray-500">Repère</dt>
          <dd>{pva.repere || "—"}</dd>
          <dt className="text-gray-500">Potentiel</dt>
          <dd>{pva.potentielColisMois !== null ? `${pva.potentielColisMois} colis / mois` : "—"}</dd>
          <dt className="text-gray-500">GPS</dt>
          <dd>{pva.latitude !== null ? "Position enregistrée" : "Enregistrée à la première visite"}</dd>
        </dl>
      </section>

      {photos.length > 0 && (
        <section className="-mx-3 flex gap-2 overflow-x-auto px-3">
          {photos.map((p) => (
            <Miniature key={p.id} blob={p.blob} />
          ))}
        </section>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-3">
        <h2 className="mb-2 text-lg font-bold">Historique des visites</h2>
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
