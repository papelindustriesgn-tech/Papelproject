import { describe, expect, it } from "vitest";
import { etatCommande, libelleQui } from "../commandes";

const base = { envoi: "recue" as const, paquetsCommandes: 500, paquetsLivres: 0 };

describe("etatCommande", () => {
  it("sur le téléphone : jamais présentée comme acceptée tant qu'elle n'est pas reçue", () => {
    expect(etatCommande({ ...base, envoi: "en_attente" })).toMatchObject({ code: "a_envoyer", qui: "telephone", ton: "attente" });
    expect(etatCommande({ ...base, envoi: "refusee" })).toMatchObject({ code: "refusee", qui: "commercial", ton: "erreur" });
  });

  it("reçue : les ventes confirment la date (souhaitée rappelée), puis le magasin prépare", () => {
    expect(etatCommande({ ...base, dateSouhaitee: "2026-11-20" })).toEqual({
      code: "recue",
      libelle: "Reçue par l'usine",
      prochaine: "Confirmer la date de livraison (souhaitée : 20/11/2026).",
      qui: "ventes",
      ton: "attente",
    });
    expect(etatCommande({ ...base, dateConfirmee: "2026-11-21" })).toMatchObject({ code: "planifiee", libelle: "Livraison prévue le 21/11/2026", qui: "magasin" });
  });

  it("stock insuffisant, livraison en route, livraison partielle", () => {
    expect(etatCommande({ ...base, attenteStock: true })).toMatchObject({ code: "attente_stock", qui: "magasin" });
    expect(etatCommande({ ...base, livraisonEnRoute: true })).toMatchObject({ code: "en_livraison", qui: "logistique" });
    expect(etatCommande({ ...base, paquetsLivres: 200 })).toMatchObject({ code: "partielle", prochaine: "Préparer et livrer le reste." });
    expect(etatCommande({ ...base, paquetsLivres: 200, attenteStock: true })).toMatchObject({ code: "partielle", prochaine: "Le reste attend du stock." });
  });

  it("livrée → facture → paiement (partiel puis complet)", () => {
    const livree = { ...base, paquetsLivres: 500 };
    expect(etatCommande(livree)).toMatchObject({ code: "livree", qui: "comptabilite" });
    expect(etatCommande({ ...livree, factureTtcGnf: 1_000_000, resteAPayerGnf: 400_000 })).toMatchObject({ code: "facturee", qui: "comptabilite" });
    expect(etatCommande({ ...livree, factureTtcGnf: 1_000_000, resteAPayerGnf: 0 })).toEqual({ code: "payee", libelle: "Livrée et payée", prochaine: null, qui: null, ton: "succes" });
  });

  it("annulée : plus rien à faire", () => {
    expect(etatCommande({ ...base, annulee: true })).toMatchObject({ code: "annulee", prochaine: null });
    expect(libelleQui("magasin")).toBe("Le magasin");
    expect(libelleQui(null)).toBe("");
  });
});
