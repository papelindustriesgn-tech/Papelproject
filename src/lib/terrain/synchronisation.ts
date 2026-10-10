/**
 * Synchronisation de l'application terrain :
 * 1. envoi des photos en attente (Supabase Storage), puis
 * 2. envoi de la file d'opérations (RPC `synchroniser_terrain`, idempotente, par lots de 50),
 * 3. récupération des données à jour (référentiels, PVA, clients, visites, pièces, tournée, objectifs),
 * 4. réalignement des compteurs de numérotation.
 * Ne fait rien sans réseau ; relancée automatiquement au retour du réseau et périodiquement.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { prixEnVigueur } from "@/lib/metier/prix";
import type { Database, Json } from "@/lib/supabase/types";
import { ecrireMeta, lireMeta, mettreEnFile, type BaseTerrain, type PieceLocale } from "./base-locale";
import { prefixeSerie } from "./numerotation";

type Client = SupabaseClient<Database>;

export interface BilanSynchronisation {
  envoyees: number;
  rejetees: { id: string; message: string }[];
  photos: number;
  date: string;
}

const aujourdhui = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Conakry" }).format(new Date());

/** Envoie les photos compressées puis crée l'opération qui les rattache au PVA. */
async function envoyerPhotos(base: BaseTerrain, supabase: Client, utilisateurId: string): Promise<number> {
  const enAttente = await base.photos.filter((p) => !p.envoyee).toArray();
  let n = 0;
  for (const photo of enAttente) {
    const chemin = `${utilisateurId}/${photo.pvaId}/${photo.id}.jpg`;
    const { error } = await supabase.storage.from("photos-terrain").upload(chemin, photo.blob, { contentType: "image/jpeg", upsert: false });
    // « existe déjà » = photo envoyée lors d'une tentative précédente interrompue.
    if (error && !/exists|Duplicate/i.test(error.message)) continue;
    await mettreEnFile(base, "photo", { id: photo.id, pva_id: photo.pvaId, visite_id: photo.visiteId, chemin });
    await base.photos.update(photo.id, { envoyee: true });
    n++;
  }
  return n;
}

async function envoyerOperations(base: BaseTerrain, supabase: Client): Promise<{ envoyees: number; rejetees: { id: string; message: string }[] }> {
  const operations = await base.operations.orderBy("creeLe").toArray();
  let envoyees = 0;
  const rejetees: { id: string; message: string }[] = [];
  for (let i = 0; i < operations.length; i += 50) {
    const lot = operations.slice(i, i + 50);
    const { data, error } = await supabase.rpc("synchroniser_terrain", { p_operations: lot.map((o) => ({ id: o.id, type: o.type, donnees: o.donnees })) as unknown as Json });
    if (error) throw new Error(error.message);
    for (const r of (data ?? []) as { id: string; statut: string; message?: string }[]) {
      const op = lot.find((o) => o.id === r.id);
      if (!op) continue;
      if (r.statut === "ok" || r.statut === "deja") {
        await base.operations.delete(op.id);
        envoyees++;
      } else {
        const message = r.message ?? r.statut;
        rejetees.push({ id: op.id, message });
        // Une pièce refusée (plafond, prix…) reste visible sur le téléphone avec le motif ; l'opération est retirée de la file.
        if (op.type === "piece") {
          await base.pieces.update(String(op.donnees.id), { etat: "rejetee", erreur: message });
          await base.operations.delete(op.id);
        } else if (op.type === "pva" && /déjà suivi/.test(message)) {
          // Boutique déjà suivie par un collègue : la fiche locale est retirée et le commercial est prévenu sur l'accueil.
          const refus = await lireMeta<{ nom: string; message: string; date: string }[]>(base, "pvaRefuses", []);
          await ecrireMeta(base, "pvaRefuses", [...refus, { nom: String(op.donnees.nom ?? ""), message, date: new Date().toISOString() }].slice(-10));
          await base.pva.delete(String(op.donnees.id));
          await base.operations.delete(op.id);
        } else {
          await base.operations.update(op.id, { essais: op.essais + 1, erreur: message });
        }
      }
    }
  }
  return { envoyees, rejetees };
}

async function recupererDonnees(base: BaseTerrain, supabase: Client, utilisateurId: string): Promise<void> {
  const jour = aujourdhui();
  const il_y_a_45j = new Date(Date.now() - 45 * 86_400_000).toISOString();
  const il_y_a_90j = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10);
  const [produits, conditionnements, grille, types, quartiers, marques, params, profil, pva, clients, soldes, visites, pieces, tournee, objectifs] = await Promise.all([
    supabase.from("produits").select("id, libelle, ordre").eq("actif", true),
    supabase.from("conditionnements").select("id, produit_id, libelle, paquets_par_colis, par_defaut").eq("actif", true),
    supabase.from("grille_prix").select("produit_id, niveau, prix_paquet_gnf, date_debut, date_fin").or(`date_fin.is.null,date_fin.gte.${jour}`),
    supabase.from("types_clients").select("id, libelle, niveau_prix").eq("actif", true).order("ordre"),
    supabase.from("quartiers").select("id, nom, communes(nom)").order("nom"),
    supabase.from("marques_concurrentes").select("id, libelle").eq("actif", true).order("libelle"),
    supabase.from("parametres").select("cle, valeur").in("cle", ["gps_rayon_checkin_m", "gps_precision_max_m", "gps_rayon_doublon_m", "tva_applicable", "tva_taux", "entreprise_nom", "entreprise_adresse", "entreprise_telephone", "entreprise_nif"]),
    supabase.from("profils").select("nom, prenom, code_serie").eq("id", utilisateurId).single(),
    supabase.from("pva_carte").select("*").eq("commercial_id", utilisateurId),
    supabase.from("clients").select("id, code, nom, type_client_id, condition_paiement, plafond_credit_gnf, responsable, telephone, adresse, quartier_id").eq("commercial_id", utilisateurId).eq("actif", true),
    supabase.from("soldes_clients").select("client_id, encours_gnf"),
    supabase.from("visites_carte").select("*").eq("commercial_id", utilisateurId).gte("checkin_at", il_y_a_45j),
    supabase.from("pieces_vente").select("id, type_piece, numero, client_id, date_piece, statut, total_ht_gnf, total_tva_gnf, total_ttc_gnf, tva_taux, notes, lignes_piece(conditionnement_id, quantite_colis, paquets_vrac, paquets, prix_paquet_gnf, montant_ht_gnf)").eq("commercial_id", utilisateurId).in("type_piece", ["devis", "facture"]).eq("statut", "valide").gte("date_piece", il_y_a_90j),
    supabase.from("tournees").select("date_tournee, tournee_etapes(pva_id, ordre)").eq("commercial_id", utilisateurId).eq("date_tournee", jour).maybeSingle(),
    supabase.from("objectifs_commerciaux").select("visites, nouveaux_pva, ca_ht_gnf, colis").eq("commercial_id", utilisateurId).eq("mois", `${jour.slice(0, 7)}-01`).maybeSingle(),
  ]);
  // Points de vente des collègues (pour prévenir un doublon dès la saisie, même hors ligne).
  const collegues = await supabase.rpc("pva_des_collegues");
  const erreur = [produits, conditionnements, grille, types, pva, clients, visites, pieces].find((r) => r.error);
  if (erreur?.error) throw new Error(erreur.error.message);

  // Opérations encore en attente : on ne remplace pas la version locale de ces éléments.
  const enAttente = new Set((await base.operations.toArray()).map((o) => String(o.donnees.id)));

  await base.transaction("rw", [base.produits, base.conditionnements, base.prix, base.typesClients, base.quartiers, base.marques, base.meta], async () => {
    await base.produits.clear();
    await base.produits.bulkPut((produits.data ?? []).map((p) => ({ id: p.id, libelle: p.libelle, ordre: p.ordre })));
    await base.conditionnements.clear();
    await base.conditionnements.bulkPut((conditionnements.data ?? []).map((c) => ({ id: c.id, produitId: c.produit_id, libelle: c.libelle, paquetsParColis: c.paquets_par_colis, parDefaut: c.par_defaut })));
    // Prix en vigueur aujourd'hui, par produit et par niveau.
    const groupes = new Map<string, { prixPaquetGnf: number; dateDebut: string; dateFin: string | null }[]>();
    for (const g of grille.data ?? []) {
      const cle = `${g.produit_id}|${g.niveau}`;
      groupes.set(cle, [...(groupes.get(cle) ?? []), { prixPaquetGnf: g.prix_paquet_gnf, dateDebut: g.date_debut, dateFin: g.date_fin }]);
    }
    await base.prix.clear();
    for (const [cle, h] of groupes) {
      const p = prixEnVigueur(h, jour);
      if (p) await base.prix.put({ cle, produitId: cle.split("|")[0], niveau: cle.split("|")[1], prixPaquetGnf: p.prixPaquetGnf });
    }
    await base.typesClients.clear();
    await base.typesClients.bulkPut((types.data ?? []).map((t) => ({ id: t.id, libelle: t.libelle, niveauPrix: t.niveau_prix })));
    await base.quartiers.clear();
    await base.quartiers.bulkPut((quartiers.data ?? []).map((q) => ({ id: q.id, libelle: `${q.nom}${q.communes?.nom ? ` (${q.communes.nom})` : ""}` })));
    await base.marques.clear();
    await base.marques.bulkPut(marques.data ?? []);
    const p = new Map((params.data ?? []).map((x) => [x.cle, x.valeur]));
    await ecrireMeta(base, "regles", { rayonM: Number(p.get("gps_rayon_checkin_m") ?? 100), precisionMaxM: Number(p.get("gps_precision_max_m") ?? 50) });
    await ecrireMeta(base, "rayonDoublonM", Number(p.get("gps_rayon_doublon_m") ?? 30));
    if (!collegues.error) await ecrireMeta(base, "pvaCollegues", collegues.data ?? []);
    await ecrireMeta(base, "tva", { applicable: p.get("tva_applicable") === true, taux: Number(p.get("tva_taux") ?? 0.18) });
    await ecrireMeta(base, "entreprise", { nom: String(p.get("entreprise_nom") ?? "Papel Industries"), adresse: String(p.get("entreprise_adresse") ?? ""), telephone: String(p.get("entreprise_telephone") ?? ""), nif: String(p.get("entreprise_nif") ?? "") });
    await ecrireMeta(base, "profil", { nom: profil.data?.nom ?? "", prenom: profil.data?.prenom ?? "", codeSerie: profil.data?.code_serie ?? null });
    await ecrireMeta(base, "tournee", (tournee.data?.tournee_etapes ?? []).sort((a, b) => a.ordre - b.ordre).map((e) => e.pva_id));
    await ecrireMeta(base, "objectifs", objectifs.data ?? null);
  });

  await base.transaction("rw", [base.pva, base.clients, base.visites, base.pieces], async () => {
    const pvaServeur = (pva.data ?? []).filter((x) => !enAttente.has(x.id!));
    await base.pva.filter((x) => !x.enAttente).delete();
    await base.pva.bulkPut(
      pvaServeur.map((x) => ({
        id: x.id!, nom: x.nom!, typeClientId: x.type_client_id!, responsable: x.responsable ?? "", telephone: x.telephone ?? "", quartierId: x.quartier_id,
        repere: x.repere ?? "", latitude: x.latitude, longitude: x.longitude, precisionM: null, potentielColisMois: x.potentiel_colis_mois, clientId: x.client_id,
        notes: x.notes ?? "", derniereVisite: x.derniere_visite, derniereRupture: x.derniere_rupture, enAttente: false,
      })),
    );
    // Les PVA confirmés par le serveur ne sont plus « en attente ».
    for (const x of pvaServeur) await base.pva.update(x.id!, { enAttente: false });

    const encours = new Map((soldes.data ?? []).map((s) => [s.client_id, Number(s.encours_gnf ?? 0)]));
    await base.clients.filter((c) => !c.enAttente).delete();
    await base.clients.bulkPut(
      (clients.data ?? []).filter((c) => !enAttente.has(c.id)).map((c) => ({
        id: c.id, nom: c.nom, typeClientId: c.type_client_id, conditionPaiement: c.condition_paiement, plafondCreditGnf: c.plafond_credit_gnf, encoursGnf: encours.get(c.id) ?? 0, enAttente: false,
        code: c.code, responsable: c.responsable, telephone: c.telephone, adresse: c.adresse, quartierId: c.quartier_id,
      })),
    );
    for (const c of clients.data ?? []) await base.clients.update(c.id, { enAttente: false });

    await base.visites.filter((v) => !v.enAttente).delete();
    await base.visites.bulkPut(
      (visites.data ?? []).filter((v) => !enAttente.has(v.id!)).map((v) => ({
        id: v.id!, pvaId: v.pva_id!, checkinAt: v.checkin_at!, latitude: v.latitude, longitude: v.longitude, precisionM: v.precision_m === null ? null : Number(v.precision_m),
        dansZone: v.dans_zone, distanceM: v.distance_m === null ? null : Number(v.distance_m), stockPapelColis: v.stock_papel_colis, rupture: !!v.rupture, notes: v.notes ?? "", enAttente: false,
      })),
    );

    const piecesServeur: PieceLocale[] = (pieces.data ?? []).map((p) => ({
      id: p.id, typePiece: p.type_piece as "devis" | "facture", numero: p.numero ?? "", clientId: p.client_id, datePiece: p.date_piece,
      lignes: p.lignes_piece.map((l) => ({ conditionnementId: l.conditionnement_id, quantiteColis: l.quantite_colis, paquetsVrac: l.paquets_vrac, paquets: l.paquets, prixPaquetGnf: l.prix_paquet_gnf, montantHtGnf: l.montant_ht_gnf })),
      totalHtGnf: p.total_ht_gnf, tvaGnf: p.total_tva_gnf, totalTtcGnf: p.total_ttc_gnf, tauxTva: Number(p.tva_taux), notes: p.notes, etat: "synchronisee",
    }));
    await base.pieces.filter((p) => p.etat === "synchronisee").delete();
    await base.pieces.bulkPut(piecesServeur);
  });
}

/** Réaligne les compteurs de numérotation sur le dernier numéro connu du serveur. */
async function realignerCompteurs(base: BaseTerrain, supabase: Client): Promise<void> {
  const profil = await lireMeta<{ codeSerie: string | null }>(base, "profil", { codeSerie: null });
  if (!profil.codeSerie) return;
  const annee = Number(aujourdhui().slice(0, 4));
  for (const type of ["devis", "facture"] as const) {
    const prefixe = prefixeSerie(type, annee, profil.codeSerie);
    const { data } = await supabase.rpc("dernier_numero_terrain", { p_prefixe: prefixe });
    const cle = `compteur:${prefixe}`;
    const local = await lireMeta<number>(base, cle, 0);
    await ecrireMeta(base, cle, Math.max(local, Number(data ?? 0)));
  }
}

let enCours: Promise<BilanSynchronisation> | null = null;

/** Lance une synchronisation (une seule à la fois). */
export function synchroniser(base: BaseTerrain, supabase: Client, utilisateurId: string): Promise<BilanSynchronisation> {
  if (enCours) return enCours;
  enCours = (async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) throw new Error("Pas de réseau : les saisies restent sur le téléphone et partiront automatiquement.");
    const photos = await envoyerPhotos(base, supabase, utilisateurId);
    const { envoyees, rejetees } = await envoyerOperations(base, supabase);
    await recupererDonnees(base, supabase, utilisateurId);
    await realignerCompteurs(base, supabase);
    const bilan = { envoyees, rejetees, photos, date: new Date().toISOString() };
    await ecrireMeta(base, "derniereSynchro", bilan);
    return bilan;
  })().finally(() => {
    enCours = null;
  });
  return enCours;
}
