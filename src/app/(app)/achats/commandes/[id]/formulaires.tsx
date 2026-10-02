"use client";

import { useActionState, useState } from "react";
import { Bouton, Champ, Message, Selection } from "@/components/ui";
import { ETAT_INITIAL } from "@/lib/formulaires/etat";
import { ajouterConteneur, ajouterLigneBc, envoyerBc } from "../../actions";

export function FormulaireLigneBc({ bcId, devise, articles }: { bcId: string; devise: string; articles: { id: string; libelle: string; unite: string }[] }) {
  const [etat, action, enCours] = useActionState(ajouterLigneBc.bind(null, bcId), ETAT_INITIAL);
  const v = etat.ok ? {} : (etat.valeurs ?? {});
  const e = etat.erreurs ?? {};
  const [articleId, setArticleId] = useState(v.article_id ?? "");
  const article = articles.find((a) => a.id === articleId);
  const [saisie, setSaisie] = useState(v.unite_saisie ?? "tonne");
  const enTonnes = article?.unite === "kg" && saisie === "tonne";
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      {etat.message && <div className="w-full"><Message ton={etat.ok ? "succes" : "erreur"}>{etat.message}</Message></div>}
      <Selection libelle="Article" name="article_id" value={articleId} onChange={(ev) => setArticleId(ev.target.value)} erreur={e.article_id} className="basis-56 flex-1">
        <option value="">— Choisir —</option>
        {articles.map((a) => (
          <option key={a.id} value={a.id}>{a.libelle} ({a.unite})</option>
        ))}
      </Selection>
      {article?.unite === "kg" ? (
        <Selection libelle="Saisie en" name="unite_saisie" value={saisie} onChange={(ev) => setSaisie(ev.target.value)} erreur={e.unite_saisie} className="basis-28">
          <option value="tonne">Tonnes</option>
          <option value="stock">kg</option>
        </Selection>
      ) : (
        <input type="hidden" name="unite_saisie" value="stock" />
      )}
      <Champ libelle={`Quantité${article ? ` (${enTonnes ? "t" : article.unite})` : ""}`} name="quantite" inputMode="decimal" defaultValue={v.quantite} erreur={e.quantite} className="basis-28 flex-1" />
      <Champ libelle={`Prix (${devise} / ${enTonnes ? "t" : (article?.unite ?? "unité")})`} name="prix_unitaire" inputMode="decimal" defaultValue={v.prix_unitaire} erreur={e.prix_unitaire} className="basis-36 flex-1" />
      <Bouton type="submit" disabled={enCours}>Ajouter</Bouton>
    </form>
  );
}

export function BoutonEnvoyerBc({ bcId }: { bcId: string }) {
  const [etat, action, enCours] = useActionState(envoyerBc.bind(null, bcId), ETAT_INITIAL);
  return (
    <form action={action} className="flex flex-col gap-2">
      {etat.message && <Message ton="erreur">{etat.message}</Message>}
      <Bouton type="submit" disabled={enCours} className="self-start">
        Valider et envoyer au fournisseur
      </Bouton>
    </form>
  );
}

export function FormulaireConteneur({ bcId }: { bcId: string }) {
  const [etat, action, enCours] = useActionState(ajouterConteneur.bind(null, bcId), ETAT_INITIAL);
  const v = etat.valeurs ?? {};
  const e = etat.erreurs ?? {};
  return (
    <form action={action} className="flex flex-col gap-3">
      {etat.message && <Message ton="erreur">{etat.message}</Message>}
      <div className="grid gap-3 sm:grid-cols-3">
        <Champ libelle="Référence du conteneur" name="reference" required defaultValue={v.reference} erreur={e.reference} placeholder="MSCU1234567" />
        <Champ libelle="Navire" name="navire" defaultValue={v.navire} />
        <Champ libelle="Poids net déclaré (kg)" name="poids_net_prevu_kg" inputMode="decimal" required defaultValue={v.poids_net_prevu_kg} erreur={e.poids_net_prevu_kg} aide="Selon la packing list" />
        <Champ libelle="Embarquement prévu" name="date_embarquement_prevue" type="date" defaultValue={v.date_embarquement_prevue} />
        <Champ libelle="Arrivée au port prévue" name="date_arrivee_port_prevue" type="date" defaultValue={v.date_arrivee_port_prevue} />
        <Champ libelle="Dédouanement prévu" name="date_dedouanement_prevue" type="date" defaultValue={v.date_dedouanement_prevue} />
        <Champ libelle="Livraison usine prévue" name="date_livraison_prevue" type="date" defaultValue={v.date_livraison_prevue} />
      </div>
      <Bouton type="submit" disabled={enCours} className="self-start">Ajouter le conteneur</Bouton>
    </form>
  );
}
