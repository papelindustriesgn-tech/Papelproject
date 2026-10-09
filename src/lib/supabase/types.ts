
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "actions_correctives": {
                  Row: {
                    "commentaire": string,"created_at": string,"description": string,"echeance": string | null,"efficace": boolean | null,"id": string,"nc_id": string,"realisee_le": string | null,"responsable": string
                  }
                  Insert: {
                    "commentaire"?: string,"created_at"?: string,"description": string,"echeance"?: string | null,"efficace"?: boolean | null,"id"?: string,"nc_id": string,"realisee_le"?: string | null,"responsable"?: string
                  }
                  Update: {
                    "commentaire"?: string,"created_at"?: string,"description"?: string,"echeance"?: string | null,"efficace"?: boolean | null,"id"?: string,"nc_id"?: string,"realisee_le"?: string | null,"responsable"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "actions_correctives_nc_id_fkey"
      columns: ["nc_id"]
isOneToOne: false
      referencedRelation: "non_conformites"
      referencedColumns: ["id"]
    }
                  ]
                },"articles": {
                  Row: {
                    "actif": boolean,"categorie_id": string | null,"code": string,"conditionnement_id": string | null,"created_at": string,"famille": Database["public"]['Enums']["famille_article"],"id": string,"libelle": string,"notes": string,"produit_id": string | null,"seuil_alerte": number,"suivi_par_lot": boolean,"unite": Database["public"]['Enums']["unite_stock"],"updated_at": string
                  }
                  Insert: {
                    "actif"?: boolean,"categorie_id"?: string | null,"code": string,"conditionnement_id"?: string | null,"created_at"?: string,"famille": Database["public"]['Enums']["famille_article"],"id"?: string,"libelle": string,"notes"?: string,"produit_id"?: string | null,"seuil_alerte"?: number,"suivi_par_lot"?: boolean,"unite": Database["public"]['Enums']["unite_stock"],"updated_at"?: string
                  }
                  Update: {
                    "actif"?: boolean,"categorie_id"?: string | null,"code"?: string,"conditionnement_id"?: string | null,"created_at"?: string,"famille"?: Database["public"]['Enums']["famille_article"],"id"?: string,"libelle"?: string,"notes"?: string,"produit_id"?: string | null,"seuil_alerte"?: number,"suivi_par_lot"?: boolean,"unite"?: Database["public"]['Enums']["unite_stock"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "articles_categorie_id_fkey"
      columns: ["categorie_id"]
isOneToOne: false
      referencedRelation: "categories_articles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "articles_conditionnement_id_fkey"
      columns: ["conditionnement_id"]
isOneToOne: true
      referencedRelation: "conditionnements"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "articles_conditionnement_id_fkey"
      columns: ["conditionnement_id"]
isOneToOne: true
      referencedRelation: "prix_actuels"
      referencedColumns: ["conditionnement_id"]
    },{
      foreignKeyName: "articles_produit_id_fkey"
      columns: ["produit_id"]
isOneToOne: false
      referencedRelation: "of_avancement"
      referencedColumns: ["produit_id"]
    },{
      foreignKeyName: "articles_produit_id_fkey"
      columns: ["produit_id"]
isOneToOne: false
      referencedRelation: "prix_actuels"
      referencedColumns: ["produit_id"]
    },{
      foreignKeyName: "articles_produit_id_fkey"
      columns: ["produit_id"]
isOneToOne: false
      referencedRelation: "produits"
      referencedColumns: ["id"]
    }
                  ]
                },"bons_commande": {
                  Row: {
                    "created_at": string,"created_by": string | null,"date_commande": string,"date_livraison_prevue": string | null,"devise": string,"fournisseur_id": string,"frais_estimes_gnf": number,"id": string,"incoterm": string,"notes": string,"numero": string | null,"statut": Database["public"]['Enums']["statut_bc"],"taux_change": number,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"date_commande"?: string,"date_livraison_prevue"?: string | null,"devise"?: string,"fournisseur_id": string,"frais_estimes_gnf"?: number,"id"?: string,"incoterm"?: string,"notes"?: string,"numero"?: string | null,"statut"?: Database["public"]['Enums']["statut_bc"],"taux_change"?: number,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"date_commande"?: string,"date_livraison_prevue"?: string | null,"devise"?: string,"fournisseur_id"?: string,"frais_estimes_gnf"?: number,"id"?: string,"incoterm"?: string,"notes"?: string,"numero"?: string | null,"statut"?: Database["public"]['Enums']["statut_bc"],"taux_change"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "bons_commande_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profils"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bons_commande_fournisseur_id_fkey"
      columns: ["fournisseur_id"]
isOneToOne: false
      referencedRelation: "fournisseurs"
      referencedColumns: ["id"]
    }
                  ]
                },"cadences_nominales": {
                  Row: {
                    "created_at": string,"id": string,"ligne_id": string,"paquets_minute": number,"produit_id": string
                  }
                  Insert: {
                    "created_at"?: string,"id"?: string,"ligne_id": string,"paquets_minute": number,"produit_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"ligne_id"?: string,"paquets_minute"?: number,"produit_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cadences_nominales_ligne_id_fkey"
      columns: ["ligne_id"]
isOneToOne: false
      referencedRelation: "lignes_production"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cadences_nominales_produit_id_fkey"
      columns: ["produit_id"]
isOneToOne: false
      referencedRelation: "of_avancement"
      referencedColumns: ["produit_id"]
    },{
      foreignKeyName: "cadences_nominales_produit_id_fkey"
      columns: ["produit_id"]
isOneToOne: false
      referencedRelation: "prix_actuels"
      referencedColumns: ["produit_id"]
    },{
      foreignKeyName: "cadences_nominales_produit_id_fkey"
      columns: ["produit_id"]
isOneToOne: false
      referencedRelation: "produits"
      referencedColumns: ["id"]
    }
                  ]
                },"campagnes": {
                  Row: {
                    "actif": boolean,"created_at": string,"date_debut": string,"date_fin": string,"id": string,"libelle": string,"notes": string
                  }
                  Insert: {
                    "actif"?: boolean,"created_at"?: string,"date_debut": string,"date_fin": string,"id"?: string,"libelle": string,"notes"?: string
                  }
                  Update: {
                    "actif"?: boolean,"created_at"?: string,"date_debut"?: string,"date_fin"?: string,"id"?: string,"libelle"?: string,"notes"?: string
                  }
                  Relationships: [
                    
                  ]
                },"categories_articles": {
                  Row: {
                    "actif": boolean,"created_at": string,"famille": Database["public"]['Enums']["famille_article"],"id": string,"libelle": string
                  }
                  Insert: {
                    "actif"?: boolean,"created_at"?: string,"famille": Database["public"]['Enums']["famille_article"],"id"?: string,"libelle": string
                  }
                  Update: {
                    "actif"?: boolean,"created_at"?: string,"famille"?: Database["public"]['Enums']["famille_article"],"id"?: string,"libelle"?: string
                  }
                  Relationships: [
                    
                  ]
                },"categories_charges": {
                  Row: {
                    "actif": boolean,"compte_comptable": string,"id": string,"libelle": string,"nature": string,"ordre": number
                  }
                  Insert: {
                    "actif"?: boolean,"compte_comptable"?: string,"id"?: string,"libelle": string,"nature": string,"ordre"?: number
                  }
                  Update: {
                    "actif"?: boolean,"compte_comptable"?: string,"id"?: string,"libelle"?: string,"nature"?: string,"ordre"?: number
                  }
                  Relationships: [
                    
                  ]
                },"causes_arret": {
                  Row: {
                    "actif": boolean,"created_at": string,"id": string,"libelle": string,"type_arret": string
                  }
                  Insert: {
                    "actif"?: boolean,"created_at"?: string,"id"?: string,"libelle": string,"type_arret"?: string
                  }
                  Update: {
                    "actif"?: boolean,"created_at"?: string,"id"?: string,"libelle"?: string,"type_arret"?: string
                  }
                  Relationships: [
                    
                  ]
                },"charges_recurrentes": {
                  Row: {
                    "actif": boolean,"categorie_id": string,"date_debut": string,"date_fin": string | null,"fournisseur_id": string | null,"id": string,"jour_echeance": number,"libelle": string,"montant_gnf": number,"tiers": string
                  }
                  Insert: {
                    "actif"?: boolean,"categorie_id": string,"date_debut"?: string,"date_fin"?: string | null,"fournisseur_id"?: string | null,"id"?: string,"jour_echeance"?: number,"libelle": string,"montant_gnf": number,"tiers"?: string
                  }
                  Update: {
                    "actif"?: boolean,"categorie_id"?: string,"date_debut"?: string,"date_fin"?: string | null,"fournisseur_id"?: string | null,"id"?: string,"jour_echeance"?: number,"libelle"?: string,"montant_gnf"?: number,"tiers"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "charges_recurrentes_categorie_id_fkey"
      columns: ["categorie_id"]
isOneToOne: false
      referencedRelation: "categories_charges"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "charges_recurrentes_fournisseur_id_fkey"
      columns: ["fournisseur_id"]
isOneToOne: false
      referencedRelation: "fournisseurs"
      referencedColumns: ["id"]
    }
                  ]
                },"chauffeurs": {
                  Row: {
                    "actif": boolean,"created_at": string,"id": string,"nom": string,"permis": string,"profil_id": string | null,"telephone": string
                  }
                  Insert: {
                    "actif"?: boolean,"created_at"?: string,"id"?: string,"nom": string,"permis"?: string,"profil_id"?: string | null,"telephone"?: string
                  }
                  Update: {
                    "actif"?: boolean,"created_at"?: string,"id"?: string,"nom"?: string,"permis"?: string,"profil_id"?: string | null,"telephone"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "chauffeurs_profil_id_fkey"
      columns: ["profil_id"]
isOneToOne: true
      referencedRelation: "profils"
      referencedColumns: ["id"]
    }
                  ]
                },"clients": {
                  Row: {
                    "actif": boolean,"adresse": string,"code": string,"commercial_id": string | null,"condition_paiement": string,"created_at": string,"created_by": string | null,"delai_paiement_jours": number,"id": string,"nif": string,"nom": string,"notes": string,"plafond_credit_gnf": number,"quartier_id": string | null,"responsable": string,"telephone": string,"type_client_id": string,"updated_at": string
                  }
                  Insert: {
                    "actif"?: boolean,"adresse"?: string,"code"?: string,"commercial_id"?: string | null,"condition_paiement"?: string,"created_at"?: string,"created_by"?: string | null,"delai_paiement_jours"?: number,"id"?: string,"nif"?: string,"nom": string,"notes"?: string,"plafond_credit_gnf"?: number,"quartier_id"?: string | null,"responsable"?: string,"telephone"?: string,"type_client_id": string,"updated_at"?: string
                  }
                  Update: {
                    "actif"?: boolean,"adresse"?: string,"code"?: string,"commercial_id"?: string | null,"condition_paiement"?: string,"created_at"?: string,"created_by"?: string | null,"delai_paiement_jours"?: number,"id"?: string,"nif"?: string,"nom"?: string,"notes"?: string,"plafond_credit_gnf"?: number,"quartier_id"?: string | null,"responsable"?: string,"telephone"?: string,"type_client_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "clients_commercial_id_fkey"
      columns: ["commercial_id"]
isOneToOne: false
      referencedRelation: "profils"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "clients_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profils"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "clients_quartier_id_fkey"
      columns: ["quartier_id"]
isOneToOne: false
      referencedRelation: "quartiers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "clients_type_client_id_fkey"
      columns: ["type_client_id"]
isOneToOne: false
      referencedRelation: "types_clients"
      referencedColumns: ["id"]
    }
                  ]
                },"communes": {
                  Row: {
                    "id": string,"nom": string,"ville_id": string
                  }
                  Insert: {
                    "id"?: string,"nom": string,"ville_id": string
                  }
                  Update: {
                    "id"?: string,"nom"?: string,"ville_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "communes_ville_id_fkey"
      columns: ["ville_id"]
isOneToOne: false
      referencedRelation: "villes"
      referencedColumns: ["id"]
    }
                  ]
                },"comptes_tresorerie": {
                  Row: {
                    "actif": boolean,"compte_comptable": string,"date_solde_initial": string,"devise": string,"id": string,"libelle": string,"ordre": number,"solde_initial": number,"type_compte": string
                  }
                  Insert: {
                    "actif"?: boolean,"compte_comptable"?: string,"date_solde_initial"?: string,"devise"?: string,"id"?: string,"libelle": string,"ordre"?: number,"solde_initial"?: number,"type_compte": string
                  }
                  Update: {
                    "actif"?: boolean,"compte_comptable"?: string,"date_solde_initial"?: string,"devise"?: string,"id"?: string,"libelle"?: string,"ordre"?: number,"solde_initial"?: number,"type_compte"?: string
                  }
                  Relationships: [
                    
                  ]
                },"compteurs": {
                  Row: {
                    "prefixe": string,"valeur": number
                  }
                  Insert: {
                    "prefixe": string,"valeur"?: number
                  }
                  Update: {
                    "prefixe"?: string,"valeur"?: number
                  }
                  Relationships: [
                    
                  ]
                },"conditionnements": {
                  Row: {
                    "actif": boolean,"colis_par_palette": number | null,"created_at": string,"id": string,"libelle": string,"paquets_par_colis": number,"par_defaut": boolean,"produit_id": string,"updated_at": string
                  }
                  Insert: {
                    "actif"?: boolean,"colis_par_palette"?: number | null,"created_at"?: string,"id"?: string,"libelle": string,"paquets_par_colis": number,"par_defaut"?: boolean,"produit_id": string,"updated_at"?: string
                  }
                  Update: {
                    "actif"?: boolean,"colis_par_palette"?: number | null,"created_at"?: string,"id"?: string,"libelle"?: string,"paquets_par_colis"?: number,"par_defaut"?: boolean,"produit_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "conditionnements_produit_id_fkey"
      columns: ["produit_id"]
isOneToOne: false
      referencedRelation: "of_avancement"
      referencedColumns: ["produit_id"]
    },{
      foreignKeyName: "conditionnements_produit_id_fkey"
      columns: ["produit_id"]
isOneToOne: false
      referencedRelation: "prix_actuels"
      referencedColumns: ["produit_id"]
    },{
      foreignKeyName: "conditionnements_produit_id_fkey"
      columns: ["produit_id"]
isOneToOne: false
      referencedRelation: "produits"
      referencedColumns: ["id"]
    }
                  ]
                },"conteneurs": {
                  Row: {
                    "bc_id": string,"created_at": string,"date_arrivee_port_prevue": string | null,"date_arrivee_port_reelle": string | null,"date_dedouanement_prevue": string | null,"date_dedouanement_reelle": string | null,"date_embarquement_prevue": string | null,"date_embarquement_reelle": string | null,"date_livraison_prevue": string | null,"date_livraison_reelle": string | null,"id": string,"navire": string,"notes": string,"poids_net_prevu_kg": number,"reference": string,"statut": Database["public"]['Enums']["statut_conteneur"],"updated_at": string
                  }
                  Insert: {
                    "bc_id": string,"created_at"?: string,"date_arrivee_port_prevue"?: string | null,"date_arrivee_port_reelle"?: string | null,"date_dedouanement_prevue"?: string | null,"date_dedouanement_reelle"?: string | null,"date_embarquement_prevue"?: string | null,"date_embarquement_reelle"?: string | null,"date_livraison_prevue"?: string | null,"date_livraison_reelle"?: string | null,"id"?: string,"navire"?: string,"notes"?: string,"poids_net_prevu_kg"?: number,"reference": string,"statut"?: Database["public"]['Enums']["statut_conteneur"],"updated_at"?: string
                  }
                  Update: {
                    "bc_id"?: string,"created_at"?: string,"date_arrivee_port_prevue"?: string | null,"date_arrivee_port_reelle"?: string | null,"date_dedouanement_prevue"?: string | null,"date_dedouanement_reelle"?: string | null,"date_embarquement_prevue"?: string | null,"date_embarquement_reelle"?: string | null,"date_livraison_prevue"?: string | null,"date_livraison_reelle"?: string | null,"id"?: string,"navire"?: string,"notes"?: string,"poids_net_prevu_kg"?: number,"reference"?: string,"statut"?: Database["public"]['Enums']["statut_conteneur"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "conteneurs_bc_id_fkey"
      columns: ["bc_id"]
isOneToOne: false
      referencedRelation: "bons_commande"
      referencedColumns: ["id"]
    }
                  ]
                },"controles_qualite": {
                  Row: {
                    "controleur_id": string | null,"created_at": string,"date_controle": string,"etape": string,"fiche_id": string | null,"id": string,"lot_id": string | null,"notes": string,"resultat": string | null,"statut": string,"valide_le": string | null
                  }
                  Insert: {
                    "controleur_id"?: string | null,"created_at"?: string,"date_controle"?: string,"etape": string,"fiche_id"?: string | null,"id"?: string,"lot_id"?: string | null,"notes"?: string,"resultat"?: string | null,"statut"?: string,"valide_le"?: string | null
                  }
                  Update: {
                    "controleur_id"?: string | null,"created_at"?: string,"date_controle"?: string,"etape"?: string,"fiche_id"?: string | null,"id"?: string,"lot_id"?: string | null,"notes"?: string,"resultat"?: string | null,"statut"?: string,"valide_le"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "controles_qualite_controleur_id_fkey"
      columns: ["controleur_id"]
isOneToOne: false
      referencedRelation: "profils"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "controles_qualite_fiche_id_fkey"
      columns: ["fiche_id"]
isOneToOne: false
      referencedRelation: "fiches_production"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "controles_qualite_fiche_id_fkey"
      columns: ["fiche_id"]
isOneToOne: false
      referencedRelation: "fiches_resume"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "controles_qualite_fiche_id_fkey"
      columns: ["fiche_id"]
isOneToOne: false
      referencedRelation: "tracabilite_bobines"
      referencedColumns: ["fiche_id"]
    },{
      foreignKeyName: "controles_qualite_lot_id_fkey"
      columns: ["lot_id"]
isOneToOne: false
      referencedRelation: "etat_lots"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "controles_qualite_lot_id_fkey"
      columns: ["lot_id"]
isOneToOne: false
      referencedRelation: "lots"
      referencedColumns: ["id"]
    }
                  ]
                },"criteres_qualite": {
                  Row: {
                    "actif": boolean,"etape": string,"id": string,"libelle": string,"ordre": number,"type_mesure": string,"unite": string,"valeur_max": number | null,"valeur_min": number | null
                  }
                  Insert: {
                    "actif"?: boolean,"etape": string,"id"?: string,"libelle": string,"ordre"?: number,"type_mesure"?: string,"unite"?: string,"valeur_max"?: number | null,"valeur_min"?: number | null
                  }
                  Update: {
                    "actif"?: boolean,"etape"?: string,"id"?: string,"libelle"?: string,"ordre"?: number,"type_mesure"?: string,"unite"?: string,"valeur_max"?: number | null,"valeur_min"?: number | null
                  }
                  Relationships: [
                    
                  ]
                },"demandes_achat": {
                  Row: {
                    "article_id": string,"bc_id": string | null,"commentaire": string,"created_at": string,"date_besoin": string | null,"demandeur_id": string | null,"id": string,"motif": string,"numero": string | null,"quantite": number,"statut": Database["public"]['Enums']["statut_demande"],"traite_par": string | null
                  }
                  Insert: {
                    "article_id": string,"bc_id"?: string | null,"commentaire"?: string,"created_at"?: string,"date_besoin"?: string | null,"demandeur_id"?: string | null,"id"?: string,"motif"?: string,"numero"?: string | null,"quantite": number,"statut"?: Database["public"]['Enums']["statut_demande"],"traite_par"?: string | null
                  }
                  Update: {
                    "article_id"?: string,"bc_id"?: string | null,"commentaire"?: string,"created_at"?: string,"date_besoin"?: string | null,"demandeur_id"?: string | null,"id"?: string,"motif"?: string,"numero"?: string | null,"quantite"?: number,"statut"?: Database["public"]['Enums']["statut_demande"],"traite_par"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "demandes_achat_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "alertes_stock"
      referencedColumns: ["article_id"]
    },{
      foreignKeyName: "demandes_achat_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "articles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "demandes_achat_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "etat_stock"
      referencedColumns: ["article_id"]
    },{
      foreignKeyName: "demandes_achat_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "pieces_critiques_alerte"
      referencedColumns: ["article_id"]
    },{
      foreignKeyName: "demandes_achat_demandeur_id_fkey"
      columns: ["demandeur_id"]
isOneToOne: false
      referencedRelation: "profils"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "demandes_achat_traite_par_fkey"
      columns: ["traite_par"]
isOneToOne: false
      referencedRelation: "profils"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "demandes_bc_fk"
      columns: ["bc_id"]
isOneToOne: false
      referencedRelation: "bons_commande"
      referencedColumns: ["id"]
    }
                  ]
                },"depenses_tournee": {
                  Row: {
                    "created_at": string,"id": string,"montant_gnf": number,"reference": string,"tournee_id": string,"type_id": string
                  }
                  Insert: {
                    "created_at"?: string,"id"?: string,"montant_gnf": number,"reference"?: string,"tournee_id": string,"type_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"montant_gnf"?: number,"reference"?: string,"tournee_id"?: string,"type_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "depenses_tournee_tournee_id_fkey"
      columns: ["tournee_id"]
isOneToOne: false
      referencedRelation: "tournees_livraison"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "depenses_tournee_tournee_id_fkey"
      columns: ["tournee_id"]
isOneToOne: false
      referencedRelation: "tournees_livraison_etat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "depenses_tournee_type_id_fkey"
      columns: ["type_id"]
isOneToOne: false
      referencedRelation: "types_depenses_tournee"
      referencedColumns: ["id"]
    }
                  ]
                },"documents": {
                  Row: {
                    "chemin": string,"created_at": string,"created_by": string | null,"id": string,"nom_fichier": string,"objet_id": string,"objet_type": string,"taille_octets": number | null,"type_document_id": string | null
                  }
                  Insert: {
                    "chemin": string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"nom_fichier": string,"objet_id": string,"objet_type": string,"taille_octets"?: number | null,"type_document_id"?: string | null
                  }
                  Update: {
                    "chemin"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"nom_fichier"?: string,"objet_id"?: string,"objet_type"?: string,"taille_octets"?: number | null,"type_document_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "documents_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profils"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_type_document_id_fkey"
      columns: ["type_document_id"]
isOneToOne: false
      referencedRelation: "types_documents"
      referencedColumns: ["id"]
    }
                  ]
                },"dotations": {
                  Row: {
                    "facture_id": string,"id": string,"paquets_dus": number,"paquets_remis": number,"produit_id": string,"updated_at": string
                  }
                  Insert: {
                    "facture_id": string,"id"?: string,"paquets_dus"?: number,"paquets_remis"?: number,"produit_id": string,"updated_at"?: string
                  }
                  Update: {
                    "facture_id"?: string,"id"?: string,"paquets_dus"?: number,"paquets_remis"?: number,"produit_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "dotations_facture_id_fkey"
      columns: ["facture_id"]
isOneToOne: false
      referencedRelation: "factures_etat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dotations_facture_id_fkey"
      columns: ["facture_id"]
isOneToOne: false
      referencedRelation: "pieces_vente"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dotations_produit_id_fkey"
      columns: ["produit_id"]
isOneToOne: false
      referencedRelation: "of_avancement"
      referencedColumns: ["produit_id"]
    },{
      foreignKeyName: "dotations_produit_id_fkey"
      columns: ["produit_id"]
isOneToOne: false
      referencedRelation: "prix_actuels"
      referencedColumns: ["produit_id"]
    },{
      foreignKeyName: "dotations_produit_id_fkey"
      columns: ["produit_id"]
isOneToOne: false
      referencedRelation: "produits"
      referencedColumns: ["id"]
    }
                  ]
                },"equipement_pieces": {
                  Row: {
                    "article_id": string,"critique": boolean,"equipement_id": string,"id": string
                  }
                  Insert: {
                    "article_id": string,"critique"?: boolean,"equipement_id": string,"id"?: string
                  }
                  Update: {
                    "article_id"?: string,"critique"?: boolean,"equipement_id"?: string,"id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "equipement_pieces_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "alertes_stock"
      referencedColumns: ["article_id"]
    },{
      foreignKeyName: "equipement_pieces_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "articles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "equipement_pieces_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "etat_stock"
      referencedColumns: ["article_id"]
    },{
      foreignKeyName: "equipement_pieces_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "pieces_critiques_alerte"
      referencedColumns: ["article_id"]
    },{
      foreignKeyName: "equipement_pieces_equipement_id_fkey"
      columns: ["equipement_id"]
isOneToOne: false
      referencedRelation: "equipements"
      referencedColumns: ["id"]
    }
                  ]
                },"equipements": {
                  Row: {
                    "actif": boolean,"categorie": string,"code": string,"created_at": string,"criticite": string,"date_mise_service": string | null,"id": string,"libelle": string,"ligne_id": string | null,"marque_modele": string,"notes": string
                  }
                  Insert: {
                    "actif"?: boolean,"categorie"?: string,"code": string,"created_at"?: string,"criticite"?: string,"date_mise_service"?: string | null,"id"?: string,"libelle": string,"ligne_id"?: string | null,"marque_modele"?: string,"notes"?: string
                  }
                  Update: {
                    "actif"?: boolean,"categorie"?: string,"code"?: string,"created_at"?: string,"criticite"?: string,"date_mise_service"?: string | null,"id"?: string,"libelle"?: string,"ligne_id"?: string | null,"marque_modele"?: string,"notes"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "equipements_ligne_id_fkey"
      columns: ["ligne_id"]
isOneToOne: false
      referencedRelation: "lignes_production"
      referencedColumns: ["id"]
    }
                  ]
                },"equipes": {
                  Row: {
                    "actif": boolean,"created_at": string,"id": string,"libelle": string
                  }
                  Insert: {
                    "actif"?: boolean,"created_at"?: string,"id"?: string,"libelle": string
                  }
                  Update: {
                    "actif"?: boolean,"created_at"?: string,"id"?: string,"libelle"?: string
                  }
                  Relationships: [
                    
                  ]
                },"factures_fournisseurs": {
                  Row: {
                    "bc_id": string | null,"categorie_id": string,"conteneur_id": string | null,"created_at": string,"created_by": string | null,"date_echeance": string,"date_facture": string,"devise": string,"fournisseur_id": string | null,"id": string,"libelle": string,"mois_recurrence": string | null,"montant_ht": number,"montant_ht_gnf": number | null,"montant_tva": number,"montant_tva_gnf": number | null,"numero": string | null,"recurrente_id": string | null,"reference_fournisseur": string,"statut": string,"taux_change": number | null,"tiers": string,"total_gnf": number | null
                  }
                  Insert: {
                    "bc_id"?: string | null,"categorie_id": string,"conteneur_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"date_echeance"?: string,"date_facture"?: string,"devise"?: string,"fournisseur_id"?: string | null,"id"?: string,"libelle": string,"mois_recurrence"?: string | null,"montant_ht": number,"montant_ht_gnf"?: number | null,"montant_tva"?: number,"montant_tva_gnf"?: number | null,"numero"?: string | null,"recurrente_id"?: string | null,"reference_fournisseur"?: string,"statut"?: string,"taux_change"?: number | null,"tiers"?: string,"total_gnf"?: number | null
                  }
                  Update: {
                    "bc_id"?: string | null,"categorie_id"?: string,"conteneur_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"date_echeance"?: string,"date_facture"?: string,"devise"?: string,"fournisseur_id"?: string | null,"id"?: string,"libelle"?: string,"mois_recurrence"?: string | null,"montant_ht"?: number,"montant_ht_gnf"?: number | null,"montant_tva"?: number,"montant_tva_gnf"?: number | null,"numero"?: string | null,"recurrente_id"?: string | null,"reference_fournisseur"?: string,"statut"?: string,"taux_change"?: number | null,"tiers"?: string,"total_gnf"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "factures_fournisseurs_bc_id_fkey"
      columns: ["bc_id"]
isOneToOne: false
      referencedRelation: "bons_commande"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "factures_fournisseurs_categorie_id_fkey"
      columns: ["categorie_id"]
isOneToOne: false
      referencedRelation: "categories_charges"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "factures_fournisseurs_conteneur_id_fkey"
      columns: ["conteneur_id"]
isOneToOne: false
      referencedRelation: "conteneurs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "factures_fournisseurs_conteneur_id_fkey"
      columns: ["conteneur_id"]
isOneToOne: false
      referencedRelation: "couts_conteneurs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "factures_fournisseurs_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profils"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "factures_fournisseurs_fournisseur_id_fkey"
      columns: ["fournisseur_id"]
isOneToOne: false
      referencedRelation: "fournisseurs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "factures_recurrente_fk"
      columns: ["recurrente_id"]
isOneToOne: false
      referencedRelation: "charges_recurrentes"
      referencedColumns: ["id"]
    }
                  ]
                },"fiche_arrets": {
                  Row: {
                    "cause_id": string,"commentaire": string,"created_at": string,"duree_min": number,"fiche_id": string,"heure_debut": string | null,"id": string
                  }
                  Insert: {
                    "cause_id": string,"commentaire"?: string,"created_at"?: string,"duree_min": number,"fiche_id": string,"heure_debut"?: string | null,"id"?: string
                  }
                  Update: {
                    "cause_id"?: string,"commentaire"?: string,"created_at"?: string,"duree_min"?: number,"fiche_id"?: string,"heure_debut"?: string | null,"id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "fiche_arrets_cause_id_fkey"
      columns: ["cause_id"]
isOneToOne: false
      referencedRelation: "causes_arret"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fiche_arrets_fiche_id_fkey"
      columns: ["fiche_id"]
isOneToOne: false
      referencedRelation: "fiches_production"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fiche_arrets_fiche_id_fkey"
      columns: ["fiche_id"]
isOneToOne: false
      referencedRelation: "fiches_resume"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fiche_arrets_fiche_id_fkey"
      columns: ["fiche_id"]
isOneToOne: false
      referencedRelation: "tracabilite_bobines"
      referencedColumns: ["fiche_id"]
    }
                  ]
                },"fiche_consommations": {
                  Row: {
                    "article_id": string,"created_at": string,"fiche_id": string,"id": string,"lot_id": string | null,"quantite": number
                  }
                  Insert: {
                    "article_id": string,"created_at"?: string,"fiche_id": string,"id"?: string,"lot_id"?: string | null,"quantite": number
                  }
                  Update: {
                    "article_id"?: string,"created_at"?: string,"fiche_id"?: string,"id"?: string,"lot_id"?: string | null,"quantite"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "fiche_consommations_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "alertes_stock"
      referencedColumns: ["article_id"]
    },{
      foreignKeyName: "fiche_consommations_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "articles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fiche_consommations_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "etat_stock"
      referencedColumns: ["article_id"]
    },{
      foreignKeyName: "fiche_consommations_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "pieces_critiques_alerte"
      referencedColumns: ["article_id"]
    },{
      foreignKeyName: "fiche_consommations_fiche_id_fkey"
      columns: ["fiche_id"]
isOneToOne: false
      referencedRelation: "fiches_production"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fiche_consommations_fiche_id_fkey"
      columns: ["fiche_id"]
isOneToOne: false
      referencedRelation: "fiches_resume"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fiche_consommations_fiche_id_fkey"
      columns: ["fiche_id"]
isOneToOne: false
      referencedRelation: "tracabilite_bobines"
      referencedColumns: ["fiche_id"]
    },{
      foreignKeyName: "fiche_consommations_lot_id_fkey"
      columns: ["lot_id"]
isOneToOne: false
      referencedRelation: "etat_lots"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fiche_consommations_lot_id_fkey"
      columns: ["lot_id"]
isOneToOne: false
      referencedRelation: "lots"
      referencedColumns: ["id"]
    }
                  ]
                },"fiche_operateurs": {
                  Row: {
                    "fiche_id": string,"operateur_id": string
                  }
                  Insert: {
                    "fiche_id": string,"operateur_id": string
                  }
                  Update: {
                    "fiche_id"?: string,"operateur_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "fiche_operateurs_fiche_id_fkey"
      columns: ["fiche_id"]
isOneToOne: false
      referencedRelation: "fiches_production"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fiche_operateurs_fiche_id_fkey"
      columns: ["fiche_id"]
isOneToOne: false
      referencedRelation: "fiches_resume"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fiche_operateurs_fiche_id_fkey"
      columns: ["fiche_id"]
isOneToOne: false
      referencedRelation: "tracabilite_bobines"
      referencedColumns: ["fiche_id"]
    },{
      foreignKeyName: "fiche_operateurs_operateur_id_fkey"
      columns: ["operateur_id"]
isOneToOne: false
      referencedRelation: "operateurs"
      referencedColumns: ["id"]
    }
                  ]
                },"fiche_productions": {
                  Row: {
                    "conditionnement_id": string,"cout_unitaire_gnf": number | null,"created_at": string,"fiche_id": string,"id": string,"paquets": number,"rebuts_kg": number
                  }
                  Insert: {
                    "conditionnement_id": string,"cout_unitaire_gnf"?: number | null,"created_at"?: string,"fiche_id": string,"id"?: string,"paquets": number,"rebuts_kg"?: number
                  }
                  Update: {
                    "conditionnement_id"?: string,"cout_unitaire_gnf"?: number | null,"created_at"?: string,"fiche_id"?: string,"id"?: string,"paquets"?: number,"rebuts_kg"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "fiche_productions_conditionnement_id_fkey"
      columns: ["conditionnement_id"]
isOneToOne: false
      referencedRelation: "conditionnements"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fiche_productions_conditionnement_id_fkey"
      columns: ["conditionnement_id"]
isOneToOne: false
      referencedRelation: "prix_actuels"
      referencedColumns: ["conditionnement_id"]
    },{
      foreignKeyName: "fiche_productions_fiche_id_fkey"
      columns: ["fiche_id"]
isOneToOne: false
      referencedRelation: "fiches_production"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fiche_productions_fiche_id_fkey"
      columns: ["fiche_id"]
isOneToOne: false
      referencedRelation: "fiches_resume"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fiche_productions_fiche_id_fkey"
      columns: ["fiche_id"]
isOneToOne: false
      referencedRelation: "tracabilite_bobines"
      referencedColumns: ["fiche_id"]
    }
                  ]
                },"fiches_production": {
                  Row: {
                    "chef_id": string | null,"code_lot": string | null,"cout_matiere_gnf": number | null,"created_at": string,"date_production": string,"duree_poste_min": number,"equipe_id": string | null,"id": string,"ligne_id": string,"notes": string,"of_id": string | null,"poste_id": string,"statut": Database["public"]['Enums']["statut_fiche"],"updated_at": string,"validee_le": string | null,"validee_par": string | null
                  }
                  Insert: {
                    "chef_id"?: string | null,"code_lot"?: string | null,"cout_matiere_gnf"?: number | null,"created_at"?: string,"date_production"?: string,"duree_poste_min"?: number,"equipe_id"?: string | null,"id"?: string,"ligne_id": string,"notes"?: string,"of_id"?: string | null,"poste_id": string,"statut"?: Database["public"]['Enums']["statut_fiche"],"updated_at"?: string,"validee_le"?: string | null,"validee_par"?: string | null
                  }
                  Update: {
                    "chef_id"?: string | null,"code_lot"?: string | null,"cout_matiere_gnf"?: number | null,"created_at"?: string,"date_production"?: string,"duree_poste_min"?: number,"equipe_id"?: string | null,"id"?: string,"ligne_id"?: string,"notes"?: string,"of_id"?: string | null,"poste_id"?: string,"statut"?: Database["public"]['Enums']["statut_fiche"],"updated_at"?: string,"validee_le"?: string | null,"validee_par"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "fiches_production_chef_id_fkey"
      columns: ["chef_id"]
isOneToOne: false
      referencedRelation: "profils"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fiches_production_equipe_id_fkey"
      columns: ["equipe_id"]
isOneToOne: false
      referencedRelation: "equipes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fiches_production_ligne_id_fkey"
      columns: ["ligne_id"]
isOneToOne: false
      referencedRelation: "lignes_production"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fiches_production_of_id_fkey"
      columns: ["of_id"]
isOneToOne: false
      referencedRelation: "of_avancement"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fiches_production_of_id_fkey"
      columns: ["of_id"]
isOneToOne: false
      referencedRelation: "ordres_fabrication"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fiches_production_poste_id_fkey"
      columns: ["poste_id"]
isOneToOne: false
      referencedRelation: "postes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fiches_production_validee_par_fkey"
      columns: ["validee_par"]
isOneToOne: false
      referencedRelation: "profils"
      referencedColumns: ["id"]
    }
                  ]
                },"fournisseurs": {
                  Row: {
                    "actif": boolean,"contact": string,"created_at": string,"devise": string,"email": string,"id": string,"nom": string,"notes": string,"pays": string,"telephone": string,"updated_at": string
                  }
                  Insert: {
                    "actif"?: boolean,"contact"?: string,"created_at"?: string,"devise"?: string,"email"?: string,"id"?: string,"nom": string,"notes"?: string,"pays"?: string,"telephone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "actif"?: boolean,"contact"?: string,"created_at"?: string,"devise"?: string,"email"?: string,"id"?: string,"nom"?: string,"notes"?: string,"pays"?: string,"telephone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"frais_approche": {
                  Row: {
                    "conteneur_id": string,"created_at": string,"created_by": string | null,"date_frais": string,"devise": string,"id": string,"montant": number,"montant_gnf": number,"prestataire": string,"reference": string,"taux_change": number,"type_frais_id": string
                  }
                  Insert: {
                    "conteneur_id": string,"created_at"?: string,"created_by"?: string | null,"date_frais"?: string,"devise"?: string,"id"?: string,"montant": number,"montant_gnf"?: number,"prestataire"?: string,"reference"?: string,"taux_change"?: number,"type_frais_id": string
                  }
                  Update: {
                    "conteneur_id"?: string,"created_at"?: string,"created_by"?: string | null,"date_frais"?: string,"devise"?: string,"id"?: string,"montant"?: number,"montant_gnf"?: number,"prestataire"?: string,"reference"?: string,"taux_change"?: number,"type_frais_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "frais_approche_conteneur_id_fkey"
      columns: ["conteneur_id"]
isOneToOne: false
      referencedRelation: "conteneurs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "frais_approche_conteneur_id_fkey"
      columns: ["conteneur_id"]
isOneToOne: false
      referencedRelation: "couts_conteneurs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "frais_approche_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profils"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "frais_approche_type_frais_id_fkey"
      columns: ["type_frais_id"]
isOneToOne: false
      referencedRelation: "types_frais"
      referencedColumns: ["id"]
    }
                  ]
                },"grille_prix": {
                  Row: {
                    "created_at": string,"created_by": string | null,"date_debut": string,"date_fin": string | null,"id": string,"niveau": string,"note": string | null,"prix_paquet_gnf": number,"produit_id": string
                  }
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"date_debut": string,"date_fin"?: string | null,"id"?: string,"niveau": string,"note"?: string | null,"prix_paquet_gnf": number,"produit_id": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"date_debut"?: string,"date_fin"?: string | null,"id"?: string,"niveau"?: string,"note"?: string | null,"prix_paquet_gnf"?: number,"produit_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "grille_prix_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profils"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "grille_prix_niveau_fkey"
      columns: ["niveau"]
isOneToOne: false
      referencedRelation: "niveaux_prix"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "grille_prix_produit_id_fkey"
      columns: ["produit_id"]
isOneToOne: false
      referencedRelation: "of_avancement"
      referencedColumns: ["produit_id"]
    },{
      foreignKeyName: "grille_prix_produit_id_fkey"
      columns: ["produit_id"]
isOneToOne: false
      referencedRelation: "prix_actuels"
      referencedColumns: ["produit_id"]
    },{
      foreignKeyName: "grille_prix_produit_id_fkey"
      columns: ["produit_id"]
isOneToOne: false
      referencedRelation: "produits"
      referencedColumns: ["id"]
    }
                  ]
                },"intervention_pieces": {
                  Row: {
                    "article_id": string,"id": string,"intervention_id": string,"quantite": number
                  }
                  Insert: {
                    "article_id": string,"id"?: string,"intervention_id": string,"quantite": number
                  }
                  Update: {
                    "article_id"?: string,"id"?: string,"intervention_id"?: string,"quantite"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "intervention_pieces_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "alertes_stock"
      referencedColumns: ["article_id"]
    },{
      foreignKeyName: "intervention_pieces_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "articles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "intervention_pieces_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "etat_stock"
      referencedColumns: ["article_id"]
    },{
      foreignKeyName: "intervention_pieces_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "pieces_critiques_alerte"
      referencedColumns: ["article_id"]
    },{
      foreignKeyName: "intervention_pieces_intervention_id_fkey"
      columns: ["intervention_id"]
isOneToOne: false
      referencedRelation: "interventions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "intervention_pieces_intervention_id_fkey"
      columns: ["intervention_id"]
isOneToOne: false
      referencedRelation: "interventions_etat"
      referencedColumns: ["id"]
    }
                  ]
                },"interventions": {
                  Row: {
                    "arret_machine": boolean,"cause": string,"cout_externe_gnf": number,"cout_main_oeuvre_gnf": number,"created_at": string,"debut": string | null,"description": string,"equipement_id": string,"fin": string | null,"id": string,"intervenant": string,"numero": string | null,"plan_id": string | null,"priorite": string,"signale_le": string,"signale_par": string | null,"statut": string,"travaux": string,"type_intervention": string
                  }
                  Insert: {
                    "arret_machine"?: boolean,"cause"?: string,"cout_externe_gnf"?: number,"cout_main_oeuvre_gnf"?: number,"created_at"?: string,"debut"?: string | null,"description": string,"equipement_id": string,"fin"?: string | null,"id"?: string,"intervenant"?: string,"numero"?: string | null,"plan_id"?: string | null,"priorite"?: string,"signale_le"?: string,"signale_par"?: string | null,"statut"?: string,"travaux"?: string,"type_intervention": string
                  }
                  Update: {
                    "arret_machine"?: boolean,"cause"?: string,"cout_externe_gnf"?: number,"cout_main_oeuvre_gnf"?: number,"created_at"?: string,"debut"?: string | null,"description"?: string,"equipement_id"?: string,"fin"?: string | null,"id"?: string,"intervenant"?: string,"numero"?: string | null,"plan_id"?: string | null,"priorite"?: string,"signale_le"?: string,"signale_par"?: string | null,"statut"?: string,"travaux"?: string,"type_intervention"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "interventions_equipement_id_fkey"
      columns: ["equipement_id"]
isOneToOne: false
      referencedRelation: "equipements"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "interventions_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "echeances_preventif"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "interventions_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "plans_preventifs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "interventions_signale_par_fkey"
      columns: ["signale_par"]
isOneToOne: false
      referencedRelation: "profils"
      referencedColumns: ["id"]
    }
                  ]
                },"inventaire_lignes": {
                  Row: {
                    "article_id": string,"ecart": number | null,"id": string,"inventaire_id": string,"lot_id": string | null,"quantite_comptee": number | null,"quantite_theorique": number
                  }
                  Insert: {
                    "article_id": string,"ecart"?: never,"id"?: string,"inventaire_id": string,"lot_id"?: string | null,"quantite_comptee"?: number | null,"quantite_theorique": number
                  }
                  Update: {
                    "article_id"?: string,"ecart"?: never,"id"?: string,"inventaire_id"?: string,"lot_id"?: string | null,"quantite_comptee"?: number | null,"quantite_theorique"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "inventaire_lignes_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "alertes_stock"
      referencedColumns: ["article_id"]
    },{
      foreignKeyName: "inventaire_lignes_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "articles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inventaire_lignes_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "etat_stock"
      referencedColumns: ["article_id"]
    },{
      foreignKeyName: "inventaire_lignes_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "pieces_critiques_alerte"
      referencedColumns: ["article_id"]
    },{
      foreignKeyName: "inventaire_lignes_inventaire_id_fkey"
      columns: ["inventaire_id"]
isOneToOne: false
      referencedRelation: "inventaires"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inventaire_lignes_lot_id_fkey"
      columns: ["lot_id"]
isOneToOne: false
      referencedRelation: "etat_lots"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inventaire_lignes_lot_id_fkey"
      columns: ["lot_id"]
isOneToOne: false
      referencedRelation: "lots"
      referencedColumns: ["id"]
    }
                  ]
                },"inventaires": {
                  Row: {
                    "created_at": string,"cree_par": string | null,"date_inventaire": string,"famille": Database["public"]['Enums']["famille_article"] | null,"id": string,"libelle": string,"statut": Database["public"]['Enums']["statut_inventaire"],"valide_le": string | null,"valide_par": string | null
                  }
                  Insert: {
                    "created_at"?: string,"cree_par"?: string | null,"date_inventaire"?: string,"famille"?: Database["public"]['Enums']["famille_article"] | null,"id"?: string,"libelle": string,"statut"?: Database["public"]['Enums']["statut_inventaire"],"valide_le"?: string | null,"valide_par"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"cree_par"?: string | null,"date_inventaire"?: string,"famille"?: Database["public"]['Enums']["famille_article"] | null,"id"?: string,"libelle"?: string,"statut"?: Database["public"]['Enums']["statut_inventaire"],"valide_le"?: string | null,"valide_par"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "inventaires_cree_par_fkey"
      columns: ["cree_par"]
isOneToOne: false
      referencedRelation: "profils"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inventaires_valide_par_fkey"
      columns: ["valide_par"]
isOneToOne: false
      referencedRelation: "profils"
      referencedColumns: ["id"]
    }
                  ]
                },"journal_audit": {
                  Row: {
                    "apres": Json | null,"avant": Json | null,"enregistrement_id": string | null,"horodatage": string,"id": number,"operation": string,"table_nom": string,"utilisateur_id": string | null
                  }
                  Insert: {
                    "apres"?: Json | null,"avant"?: Json | null,"enregistrement_id"?: string | null,"horodatage"?: string,"id"?: never,"operation": string,"table_nom": string,"utilisateur_id"?: string | null
                  }
                  Update: {
                    "apres"?: Json | null,"avant"?: Json | null,"enregistrement_id"?: string | null,"horodatage"?: string,"id"?: never,"operation"?: string,"table_nom"?: string,"utilisateur_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"lignes_bc": {
                  Row: {
                    "article_id": string,"bc_id": string,"id": string,"montant_devise": number,"prix_unitaire": number,"quantite": number
                  }
                  Insert: {
                    "article_id": string,"bc_id": string,"id"?: string,"montant_devise"?: number,"prix_unitaire": number,"quantite": number
                  }
                  Update: {
                    "article_id"?: string,"bc_id"?: string,"id"?: string,"montant_devise"?: number,"prix_unitaire"?: number,"quantite"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "lignes_bc_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "alertes_stock"
      referencedColumns: ["article_id"]
    },{
      foreignKeyName: "lignes_bc_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "articles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lignes_bc_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "etat_stock"
      referencedColumns: ["article_id"]
    },{
      foreignKeyName: "lignes_bc_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "pieces_critiques_alerte"
      referencedColumns: ["article_id"]
    },{
      foreignKeyName: "lignes_bc_bc_id_fkey"
      columns: ["bc_id"]
isOneToOne: false
      referencedRelation: "bons_commande"
      referencedColumns: ["id"]
    }
                  ]
                },"lignes_livraison": {
                  Row: {
                    "conditionnement_id": string,"id": string,"livraison_id": string,"paquets": number,"paquets_retournes": number
                  }
                  Insert: {
                    "conditionnement_id": string,"id"?: string,"livraison_id": string,"paquets": number,"paquets_retournes"?: number
                  }
                  Update: {
                    "conditionnement_id"?: string,"id"?: string,"livraison_id"?: string,"paquets"?: number,"paquets_retournes"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "lignes_livraison_conditionnement_id_fkey"
      columns: ["conditionnement_id"]
isOneToOne: false
      referencedRelation: "conditionnements"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lignes_livraison_conditionnement_id_fkey"
      columns: ["conditionnement_id"]
isOneToOne: false
      referencedRelation: "prix_actuels"
      referencedColumns: ["conditionnement_id"]
    },{
      foreignKeyName: "lignes_livraison_livraison_id_fkey"
      columns: ["livraison_id"]
isOneToOne: false
      referencedRelation: "livraisons"
      referencedColumns: ["id"]
    }
                  ]
                },"lignes_piece": {
                  Row: {
                    "conditionnement_id": string,"created_at": string,"id": string,"montant_ht_gnf": number,"paquets": number,"paquets_vrac": number,"piece_id": string,"prix_paquet_gnf": number,"quantite_colis": number
                  }
                  Insert: {
                    "conditionnement_id": string,"created_at"?: string,"id"?: string,"montant_ht_gnf": number,"paquets": number,"paquets_vrac"?: number,"piece_id": string,"prix_paquet_gnf": number,"quantite_colis"?: number
                  }
                  Update: {
                    "conditionnement_id"?: string,"created_at"?: string,"id"?: string,"montant_ht_gnf"?: number,"paquets"?: number,"paquets_vrac"?: number,"piece_id"?: string,"prix_paquet_gnf"?: number,"quantite_colis"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "lignes_piece_conditionnement_id_fkey"
      columns: ["conditionnement_id"]
isOneToOne: false
      referencedRelation: "conditionnements"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lignes_piece_conditionnement_id_fkey"
      columns: ["conditionnement_id"]
isOneToOne: false
      referencedRelation: "prix_actuels"
      referencedColumns: ["conditionnement_id"]
    },{
      foreignKeyName: "lignes_piece_piece_id_fkey"
      columns: ["piece_id"]
isOneToOne: false
      referencedRelation: "factures_etat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lignes_piece_piece_id_fkey"
      columns: ["piece_id"]
isOneToOne: false
      referencedRelation: "pieces_vente"
      referencedColumns: ["id"]
    }
                  ]
                },"lignes_production": {
                  Row: {
                    "actif": boolean,"created_at": string,"id": string,"libelle": string
                  }
                  Insert: {
                    "actif"?: boolean,"created_at"?: string,"id"?: string,"libelle": string
                  }
                  Update: {
                    "actif"?: boolean,"created_at"?: string,"id"?: string,"libelle"?: string
                  }
                  Relationships: [
                    
                  ]
                },"livraisons": {
                  Row: {
                    "commande_id": string,"commentaire_remise": string,"created_at": string,"created_by": string | null,"date_livraison": string,"id": string,"latitude": number | null,"longitude": number | null,"notes": string,"numero": string | null,"ordre": number,"photo_chemin": string | null,"precision_m": number | null,"receptionnaire": string,"remis_par": string | null,"remise_le": string | null,"signature_chemin": string | null,"statut": string,"statut_remise": string,"tournee_id": string | null,"valide_le": string | null,"valide_par": string | null
                  }
                  Insert: {
                    "commande_id": string,"commentaire_remise"?: string,"created_at"?: string,"created_by"?: string | null,"date_livraison"?: string,"id"?: string,"latitude"?: number | null,"longitude"?: number | null,"notes"?: string,"numero"?: string | null,"ordre"?: number,"photo_chemin"?: string | null,"precision_m"?: number | null,"receptionnaire"?: string,"remis_par"?: string | null,"remise_le"?: string | null,"signature_chemin"?: string | null,"statut"?: string,"statut_remise"?: string,"tournee_id"?: string | null,"valide_le"?: string | null,"valide_par"?: string | null
                  }
                  Update: {
                    "commande_id"?: string,"commentaire_remise"?: string,"created_at"?: string,"created_by"?: string | null,"date_livraison"?: string,"id"?: string,"latitude"?: number | null,"longitude"?: number | null,"notes"?: string,"numero"?: string | null,"ordre"?: number,"photo_chemin"?: string | null,"precision_m"?: number | null,"receptionnaire"?: string,"remis_par"?: string | null,"remise_le"?: string | null,"signature_chemin"?: string | null,"statut"?: string,"statut_remise"?: string,"tournee_id"?: string | null,"valide_le"?: string | null,"valide_par"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "livraisons_commande_id_fkey"
      columns: ["commande_id"]
isOneToOne: false
      referencedRelation: "factures_etat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "livraisons_commande_id_fkey"
      columns: ["commande_id"]
isOneToOne: false
      referencedRelation: "pieces_vente"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "livraisons_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profils"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "livraisons_remis_par_fkey"
      columns: ["remis_par"]
isOneToOne: false
      referencedRelation: "profils"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "livraisons_tournee_id_fkey"
      columns: ["tournee_id"]
isOneToOne: false
      referencedRelation: "tournees_livraison"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "livraisons_tournee_id_fkey"
      columns: ["tournee_id"]
isOneToOne: false
      referencedRelation: "tournees_livraison_etat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "livraisons_valide_par_fkey"
      columns: ["valide_par"]
isOneToOne: false
      referencedRelation: "profils"
      referencedColumns: ["id"]
    }
                  ]
                },"lots": {
                  Row: {
                    "article_id": string,"conteneur_id": string | null,"cout_kg_gnf": number,"created_at": string,"date_reception": string,"diametre_mm": number | null,"fournisseur_id": string | null,"grammage_g_m2": number | null,"id": string,"largeur_mm": number | null,"notes": string,"numero_lot": string,"plis": number | null,"poids_net_kg": number,"statut": Database["public"]['Enums']["statut_lot"],"updated_at": string
                  }
                  Insert: {
                    "article_id": string,"conteneur_id"?: string | null,"cout_kg_gnf"?: number,"created_at"?: string,"date_reception"?: string,"diametre_mm"?: number | null,"fournisseur_id"?: string | null,"grammage_g_m2"?: number | null,"id"?: string,"largeur_mm"?: number | null,"notes"?: string,"numero_lot": string,"plis"?: number | null,"poids_net_kg": number,"statut"?: Database["public"]['Enums']["statut_lot"],"updated_at"?: string
                  }
                  Update: {
                    "article_id"?: string,"conteneur_id"?: string | null,"cout_kg_gnf"?: number,"created_at"?: string,"date_reception"?: string,"diametre_mm"?: number | null,"fournisseur_id"?: string | null,"grammage_g_m2"?: number | null,"id"?: string,"largeur_mm"?: number | null,"notes"?: string,"numero_lot"?: string,"plis"?: number | null,"poids_net_kg"?: number,"statut"?: Database["public"]['Enums']["statut_lot"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lots_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "alertes_stock"
      referencedColumns: ["article_id"]
    },{
      foreignKeyName: "lots_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "articles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lots_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "etat_stock"
      referencedColumns: ["article_id"]
    },{
      foreignKeyName: "lots_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "pieces_critiques_alerte"
      referencedColumns: ["article_id"]
    },{
      foreignKeyName: "lots_conteneur_id_fkey"
      columns: ["conteneur_id"]
isOneToOne: false
      referencedRelation: "conteneurs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lots_conteneur_id_fkey"
      columns: ["conteneur_id"]
isOneToOne: false
      referencedRelation: "couts_conteneurs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lots_fournisseur_id_fkey"
      columns: ["fournisseur_id"]
isOneToOne: false
      referencedRelation: "fournisseurs"
      referencedColumns: ["id"]
    }
                  ]
                },"marques_concurrentes": {
                  Row: {
                    "actif": boolean,"created_at": string,"id": string,"libelle": string
                  }
                  Insert: {
                    "actif"?: boolean,"created_at"?: string,"id"?: string,"libelle": string
                  }
                  Update: {
                    "actif"?: boolean,"created_at"?: string,"id"?: string,"libelle"?: string
                  }
                  Relationships: [
                    
                  ]
                },"mesures_controle": {
                  Row: {
                    "commentaire": string,"conforme": boolean,"controle_id": string,"critere_id": string,"id": string,"valeur": number | null
                  }
                  Insert: {
                    "commentaire"?: string,"conforme": boolean,"controle_id": string,"critere_id": string,"id"?: string,"valeur"?: number | null
                  }
                  Update: {
                    "commentaire"?: string,"conforme"?: boolean,"controle_id"?: string,"critere_id"?: string,"id"?: string,"valeur"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "mesures_controle_controle_id_fkey"
      columns: ["controle_id"]
isOneToOne: false
      referencedRelation: "controles_etat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mesures_controle_controle_id_fkey"
      columns: ["controle_id"]
isOneToOne: false
      referencedRelation: "controles_qualite"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mesures_controle_critere_id_fkey"
      columns: ["critere_id"]
isOneToOne: false
      referencedRelation: "criteres_qualite"
      referencedColumns: ["id"]
    }
                  ]
                },"modes_paiement": {
                  Row: {
                    "actif": boolean,"compte_id": string | null,"created_at": string,"id": string,"libelle": string,"ordre": number
                  }
                  Insert: {
                    "actif"?: boolean,"compte_id"?: string | null,"created_at"?: string,"id"?: string,"libelle": string,"ordre"?: number
                  }
                  Update: {
                    "actif"?: boolean,"compte_id"?: string | null,"created_at"?: string,"id"?: string,"libelle"?: string,"ordre"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "modes_paiement_compte_id_fkey"
      columns: ["compte_id"]
isOneToOne: false
      referencedRelation: "comptes_tresorerie"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "modes_paiement_compte_id_fkey"
      columns: ["compte_id"]
isOneToOne: false
      referencedRelation: "soldes_tresorerie"
      referencedColumns: ["id"]
    }
                  ]
                },"mouvements_stock": {
                  Row: {
                    "article_id": string,"auteur_id": string | null,"cout_unitaire_gnf": number | null,"created_at": string,"date_operation": string,"document_id": string | null,"document_type": string | null,"id": string,"lot_id": string | null,"motif": string,"quantite": number,"stock_apres": number | null,"type": Database["public"]['Enums']["type_mouvement"],"unite": Database["public"]['Enums']["unite_stock"],"valeur_gnf": number | null
                  }
                  Insert: {
                    "article_id": string,"auteur_id"?: string | null,"cout_unitaire_gnf"?: number | null,"created_at"?: string,"date_operation"?: string,"document_id"?: string | null,"document_type"?: string | null,"id"?: string,"lot_id"?: string | null,"motif"?: string,"quantite": number,"stock_apres"?: number | null,"type": Database["public"]['Enums']["type_mouvement"],"unite": Database["public"]['Enums']["unite_stock"],"valeur_gnf"?: number | null
                  }
                  Update: {
                    "article_id"?: string,"auteur_id"?: string | null,"cout_unitaire_gnf"?: number | null,"created_at"?: string,"date_operation"?: string,"document_id"?: string | null,"document_type"?: string | null,"id"?: string,"lot_id"?: string | null,"motif"?: string,"quantite"?: number,"stock_apres"?: number | null,"type"?: Database["public"]['Enums']["type_mouvement"],"unite"?: Database["public"]['Enums']["unite_stock"],"valeur_gnf"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "mouvements_stock_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "alertes_stock"
      referencedColumns: ["article_id"]
    },{
      foreignKeyName: "mouvements_stock_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "articles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mouvements_stock_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "etat_stock"
      referencedColumns: ["article_id"]
    },{
      foreignKeyName: "mouvements_stock_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "pieces_critiques_alerte"
      referencedColumns: ["article_id"]
    },{
      foreignKeyName: "mouvements_stock_auteur_id_fkey"
      columns: ["auteur_id"]
isOneToOne: false
      referencedRelation: "profils"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mouvements_stock_lot_id_fkey"
      columns: ["lot_id"]
isOneToOne: false
      referencedRelation: "etat_lots"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mouvements_stock_lot_id_fkey"
      columns: ["lot_id"]
isOneToOne: false
      referencedRelation: "lots"
      referencedColumns: ["id"]
    }
                  ]
                },"mouvements_tresorerie": {
                  Row: {
                    "categorie_id": string | null,"compte_id": string,"created_at": string,"date_operation": string,"id": string,"libelle": string,"montant": number,"montant_gnf": number,"origine": string,"paiement_id": string | null,"reference": string,"reglement_id": string | null,"saisi_par": string | null,"sens": string,"taux_change": number,"virement_id": string | null
                  }
                  Insert: {
                    "categorie_id"?: string | null,"compte_id": string,"created_at"?: string,"date_operation"?: string,"id"?: string,"libelle": string,"montant": number,"montant_gnf": number,"origine": string,"paiement_id"?: string | null,"reference"?: string,"reglement_id"?: string | null,"saisi_par"?: string | null,"sens": string,"taux_change"?: number,"virement_id"?: string | null
                  }
                  Update: {
                    "categorie_id"?: string | null,"compte_id"?: string,"created_at"?: string,"date_operation"?: string,"id"?: string,"libelle"?: string,"montant"?: number,"montant_gnf"?: number,"origine"?: string,"paiement_id"?: string | null,"reference"?: string,"reglement_id"?: string | null,"saisi_par"?: string | null,"sens"?: string,"taux_change"?: number,"virement_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "mouvements_tresorerie_categorie_id_fkey"
      columns: ["categorie_id"]
isOneToOne: false
      referencedRelation: "categories_charges"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mouvements_tresorerie_compte_id_fkey"
      columns: ["compte_id"]
isOneToOne: false
      referencedRelation: "comptes_tresorerie"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mouvements_tresorerie_compte_id_fkey"
      columns: ["compte_id"]
isOneToOne: false
      referencedRelation: "soldes_tresorerie"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mouvements_tresorerie_paiement_id_fkey"
      columns: ["paiement_id"]
isOneToOne: true
      referencedRelation: "paiements"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mouvements_tresorerie_reglement_id_fkey"
      columns: ["reglement_id"]
isOneToOne: true
      referencedRelation: "reglements_fournisseurs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mouvements_tresorerie_saisi_par_fkey"
      columns: ["saisi_par"]
isOneToOne: false
      referencedRelation: "profils"
      referencedColumns: ["id"]
    }
                  ]
                },"niveaux_prix": {
                  Row: {
                    "actif": boolean,"code": string,"created_at": string,"description": string,"libelle": string,"ordre": number,"updated_at": string
                  }
                  Insert: {
                    "actif"?: boolean,"code": string,"created_at"?: string,"description"?: string,"libelle": string,"ordre"?: number,"updated_at"?: string
                  }
                  Update: {
                    "actif"?: boolean,"code"?: string,"created_at"?: string,"description"?: string,"libelle"?: string,"ordre"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"non_conformites": {
                  Row: {
                    "cause_racine": string,"client_id": string | null,"cloturee_le": string | null,"cloturee_par": string | null,"controle_id": string | null,"created_at": string,"created_by": string | null,"date_constat": string,"description": string,"fiche_id": string | null,"gravite": string,"id": string,"livraison_id": string | null,"lot_id": string | null,"numero": string | null,"origine": string,"statut": string,"type_id": string | null
                  }
                  Insert: {
                    "cause_racine"?: string,"client_id"?: string | null,"cloturee_le"?: string | null,"cloturee_par"?: string | null,"controle_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"date_constat"?: string,"description": string,"fiche_id"?: string | null,"gravite"?: string,"id"?: string,"livraison_id"?: string | null,"lot_id"?: string | null,"numero"?: string | null,"origine": string,"statut"?: string,"type_id"?: string | null
                  }
                  Update: {
                    "cause_racine"?: string,"client_id"?: string | null,"cloturee_le"?: string | null,"cloturee_par"?: string | null,"controle_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"date_constat"?: string,"description"?: string,"fiche_id"?: string | null,"gravite"?: string,"id"?: string,"livraison_id"?: string | null,"lot_id"?: string | null,"numero"?: string | null,"origine"?: string,"statut"?: string,"type_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "non_conformites_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "non_conformites_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "soldes_clients"
      referencedColumns: ["client_id"]
    },{
      foreignKeyName: "non_conformites_cloturee_par_fkey"
      columns: ["cloturee_par"]
isOneToOne: false
      referencedRelation: "profils"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "non_conformites_controle_id_fkey"
      columns: ["controle_id"]
isOneToOne: false
      referencedRelation: "controles_etat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "non_conformites_controle_id_fkey"
      columns: ["controle_id"]
isOneToOne: false
      referencedRelation: "controles_qualite"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "non_conformites_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profils"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "non_conformites_fiche_id_fkey"
      columns: ["fiche_id"]
isOneToOne: false
      referencedRelation: "fiches_production"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "non_conformites_fiche_id_fkey"
      columns: ["fiche_id"]
isOneToOne: false
      referencedRelation: "fiches_resume"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "non_conformites_fiche_id_fkey"
      columns: ["fiche_id"]
isOneToOne: false
      referencedRelation: "tracabilite_bobines"
      referencedColumns: ["fiche_id"]
    },{
      foreignKeyName: "non_conformites_livraison_id_fkey"
      columns: ["livraison_id"]
isOneToOne: false
      referencedRelation: "livraisons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "non_conformites_lot_id_fkey"
      columns: ["lot_id"]
isOneToOne: false
      referencedRelation: "etat_lots"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "non_conformites_lot_id_fkey"
      columns: ["lot_id"]
isOneToOne: false
      referencedRelation: "lots"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "non_conformites_type_id_fkey"
      columns: ["type_id"]
isOneToOne: false
      referencedRelation: "types_non_conformite"
      referencedColumns: ["id"]
    }
                  ]
                },"objectifs_commerciaux": {
                  Row: {
                    "ca_ht_gnf": number,"colis": number,"commercial_id": string,"id": string,"mois": string,"nouveaux_pva": number,"visites": number
                  }
                  Insert: {
                    "ca_ht_gnf"?: number,"colis"?: number,"commercial_id": string,"id"?: string,"mois": string,"nouveaux_pva"?: number,"visites"?: number
                  }
                  Update: {
                    "ca_ht_gnf"?: number,"colis"?: number,"commercial_id"?: string,"id"?: string,"mois"?: string,"nouveaux_pva"?: number,"visites"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "objectifs_commerciaux_commercial_id_fkey"
      columns: ["commercial_id"]
isOneToOne: false
      referencedRelation: "profils"
      referencedColumns: ["id"]
    }
                  ]
                },"operateurs": {
                  Row: {
                    "actif": boolean,"created_at": string,"equipe_id": string | null,"id": string,"matricule": string,"nom": string,"prenom": string
                  }
                  Insert: {
                    "actif"?: boolean,"created_at"?: string,"equipe_id"?: string | null,"id"?: string,"matricule"?: string,"nom": string,"prenom"?: string
                  }
                  Update: {
                    "actif"?: boolean,"created_at"?: string,"equipe_id"?: string | null,"id"?: string,"matricule"?: string,"nom"?: string,"prenom"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "operateurs_equipe_id_fkey"
      columns: ["equipe_id"]
isOneToOne: false
      referencedRelation: "equipes"
      referencedColumns: ["id"]
    }
                  ]
                },"ordres_fabrication": {
                  Row: {
                    "campagne_id": string | null,"conditionnement_id": string,"created_at": string,"created_by": string | null,"date_debut_prevue": string,"date_fin_prevue": string,"id": string,"ligne_id": string | null,"notes": string,"numero": string,"quantite_colis": number,"statut": Database["public"]['Enums']["statut_of"],"updated_at": string
                  }
                  Insert: {
                    "campagne_id"?: string | null,"conditionnement_id": string,"created_at"?: string,"created_by"?: string | null,"date_debut_prevue": string,"date_fin_prevue": string,"id"?: string,"ligne_id"?: string | null,"notes"?: string,"numero"?: string,"quantite_colis": number,"statut"?: Database["public"]['Enums']["statut_of"],"updated_at"?: string
                  }
                  Update: {
                    "campagne_id"?: string | null,"conditionnement_id"?: string,"created_at"?: string,"created_by"?: string | null,"date_debut_prevue"?: string,"date_fin_prevue"?: string,"id"?: string,"ligne_id"?: string | null,"notes"?: string,"numero"?: string,"quantite_colis"?: number,"statut"?: Database["public"]['Enums']["statut_of"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ordres_fabrication_campagne_id_fkey"
      columns: ["campagne_id"]
isOneToOne: false
      referencedRelation: "campagnes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ordres_fabrication_conditionnement_id_fkey"
      columns: ["conditionnement_id"]
isOneToOne: false
      referencedRelation: "conditionnements"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ordres_fabrication_conditionnement_id_fkey"
      columns: ["conditionnement_id"]
isOneToOne: false
      referencedRelation: "prix_actuels"
      referencedColumns: ["conditionnement_id"]
    },{
      foreignKeyName: "ordres_fabrication_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profils"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ordres_fabrication_ligne_id_fkey"
      columns: ["ligne_id"]
isOneToOne: false
      referencedRelation: "lignes_production"
      referencedColumns: ["id"]
    }
                  ]
                },"paiements": {
                  Row: {
                    "created_at": string,"date_paiement": string,"facture_id": string,"id": string,"mode_id": string,"montant_gnf": number,"notes": string,"reference": string,"saisi_par": string | null
                  }
                  Insert: {
                    "created_at"?: string,"date_paiement"?: string,"facture_id": string,"id"?: string,"mode_id": string,"montant_gnf": number,"notes"?: string,"reference"?: string,"saisi_par"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"date_paiement"?: string,"facture_id"?: string,"id"?: string,"mode_id"?: string,"montant_gnf"?: number,"notes"?: string,"reference"?: string,"saisi_par"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "paiements_facture_id_fkey"
      columns: ["facture_id"]
isOneToOne: false
      referencedRelation: "factures_etat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "paiements_facture_id_fkey"
      columns: ["facture_id"]
isOneToOne: false
      referencedRelation: "pieces_vente"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "paiements_mode_id_fkey"
      columns: ["mode_id"]
isOneToOne: false
      referencedRelation: "modes_paiement"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "paiements_saisi_par_fkey"
      columns: ["saisi_par"]
isOneToOne: false
      referencedRelation: "profils"
      referencedColumns: ["id"]
    }
                  ]
                },"parametres": {
                  Row: {
                    "categorie": string,"cle": string,"description": string,"libelle": string,"type_valeur": string,"unite": string | null,"updated_at": string,"updated_by": string | null,"valeur": NonNullable<Json>
                  }
                  Insert: {
                    "categorie"?: string,"cle": string,"description"?: string,"libelle": string,"type_valeur"?: string,"unite"?: string | null,"updated_at"?: string,"updated_by"?: string | null,"valeur": NonNullable<Json>
                  }
                  Update: {
                    "categorie"?: string,"cle"?: string,"description"?: string,"libelle"?: string,"type_valeur"?: string,"unite"?: string | null,"updated_at"?: string,"updated_by"?: string | null,"valeur"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "parametres_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profils"
      referencedColumns: ["id"]
    }
                  ]
                },"pieces_vente": {
                  Row: {
                    "client_id": string,"commercial_id": string | null,"created_at": string,"created_by": string | null,"date_echeance": string | null,"date_piece": string,"id": string,"notes": string,"numero": string | null,"origine_id": string | null,"statut": Database["public"]['Enums']["statut_piece"],"total_ht_gnf": number,"total_ttc_gnf": number,"total_tva_gnf": number,"tva_taux": number,"type_piece": Database["public"]['Enums']["type_piece"],"updated_at": string,"valide_le": string | null,"valide_par": string | null
                  }
                  Insert: {
                    "client_id": string,"commercial_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"date_echeance"?: string | null,"date_piece"?: string,"id"?: string,"notes"?: string,"numero"?: string | null,"origine_id"?: string | null,"statut"?: Database["public"]['Enums']["statut_piece"],"total_ht_gnf"?: number,"total_ttc_gnf"?: number,"total_tva_gnf"?: number,"tva_taux"?: number,"type_piece": Database["public"]['Enums']["type_piece"],"updated_at"?: string,"valide_le"?: string | null,"valide_par"?: string | null
                  }
                  Update: {
                    "client_id"?: string,"commercial_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"date_echeance"?: string | null,"date_piece"?: string,"id"?: string,"notes"?: string,"numero"?: string | null,"origine_id"?: string | null,"statut"?: Database["public"]['Enums']["statut_piece"],"total_ht_gnf"?: number,"total_ttc_gnf"?: number,"total_tva_gnf"?: number,"tva_taux"?: number,"type_piece"?: Database["public"]['Enums']["type_piece"],"updated_at"?: string,"valide_le"?: string | null,"valide_par"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "pieces_vente_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pieces_vente_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "soldes_clients"
      referencedColumns: ["client_id"]
    },{
      foreignKeyName: "pieces_vente_commercial_id_fkey"
      columns: ["commercial_id"]
isOneToOne: false
      referencedRelation: "profils"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pieces_vente_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profils"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pieces_vente_origine_id_fkey"
      columns: ["origine_id"]
isOneToOne: false
      referencedRelation: "factures_etat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pieces_vente_origine_id_fkey"
      columns: ["origine_id"]
isOneToOne: false
      referencedRelation: "pieces_vente"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pieces_vente_valide_par_fkey"
      columns: ["valide_par"]
isOneToOne: false
      referencedRelation: "profils"
      referencedColumns: ["id"]
    }
                  ]
                },"plans_preventifs": {
                  Row: {
                    "actif": boolean,"consignes": string,"created_at": string,"derniere_realisation": string | null,"duree_estimee_min": number | null,"equipement_id": string,"frequence_jours": number,"id": string,"libelle": string
                  }
                  Insert: {
                    "actif"?: boolean,"consignes"?: string,"created_at"?: string,"derniere_realisation"?: string | null,"duree_estimee_min"?: number | null,"equipement_id": string,"frequence_jours": number,"id"?: string,"libelle": string
                  }
                  Update: {
                    "actif"?: boolean,"consignes"?: string,"created_at"?: string,"derniere_realisation"?: string | null,"duree_estimee_min"?: number | null,"equipement_id"?: string,"frequence_jours"?: number,"id"?: string,"libelle"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "plans_preventifs_equipement_id_fkey"
      columns: ["equipement_id"]
isOneToOne: false
      referencedRelation: "equipements"
      referencedColumns: ["id"]
    }
                  ]
                },"postes": {
                  Row: {
                    "actif": boolean,"created_at": string,"heure_debut": string,"heure_fin": string,"id": string,"libelle": string,"ordre": number
                  }
                  Insert: {
                    "actif"?: boolean,"created_at"?: string,"heure_debut": string,"heure_fin": string,"id"?: string,"libelle": string,"ordre"?: number
                  }
                  Update: {
                    "actif"?: boolean,"created_at"?: string,"heure_debut"?: string,"heure_fin"?: string,"id"?: string,"libelle"?: string,"ordre"?: number
                  }
                  Relationships: [
                    
                  ]
                },"produits": {
                  Row: {
                    "actif": boolean,"code": string,"created_at": string,"grammage_g_m2_pli": number,"id": string,"largeur_mm": number,"libelle": string,"longueur_mm": number,"nb_mouchoirs": number,"ordre": number,"plis": number,"poids_paquet_g": number | null,"rendement_theorique_paquets_t": number | null,"taux_perte_ref": number,"updated_at": string
                  }
                  Insert: {
                    "actif"?: boolean,"code": string,"created_at"?: string,"grammage_g_m2_pli"?: number,"id"?: string,"largeur_mm": number,"libelle": string,"longueur_mm": number,"nb_mouchoirs": number,"ordre"?: number,"plis": number,"poids_paquet_g"?: never,"rendement_theorique_paquets_t"?: never,"taux_perte_ref"?: number,"updated_at"?: string
                  }
                  Update: {
                    "actif"?: boolean,"code"?: string,"created_at"?: string,"grammage_g_m2_pli"?: number,"id"?: string,"largeur_mm"?: number,"libelle"?: string,"longueur_mm"?: number,"nb_mouchoirs"?: number,"ordre"?: number,"plis"?: number,"poids_paquet_g"?: never,"rendement_theorique_paquets_t"?: never,"taux_perte_ref"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profils": {
                  Row: {
                    "actif": boolean,"code_serie": string | null,"created_at": string,"id": string,"identifiant": string,"nom": string,"prenom": string,"telephone": string | null,"updated_at": string
                  }
                  Insert: {
                    "actif"?: boolean,"code_serie"?: string | null,"created_at"?: string,"id": string,"identifiant": string,"nom": string,"prenom"?: string,"telephone"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "actif"?: boolean,"code_serie"?: string | null,"created_at"?: string,"id"?: string,"identifiant"?: string,"nom"?: string,"prenom"?: string,"telephone"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"pva": {
                  Row: {
                    "actif": boolean,"client_id": string | null,"commercial_id": string,"created_at": string,"id": string,"nom": string,"notes": string,"position": unknown,"potentiel_colis_mois": number | null,"precision_m": number | null,"quartier_id": string | null,"repere": string,"responsable": string,"telephone": string,"type_client_id": string,"updated_at": string
                  }
                  Insert: {
                    "actif"?: boolean,"client_id"?: string | null,"commercial_id"?: string,"created_at"?: string,"id": string,"nom": string,"notes"?: string,"position"?: unknown,"potentiel_colis_mois"?: number | null,"precision_m"?: number | null,"quartier_id"?: string | null,"repere"?: string,"responsable"?: string,"telephone"?: string,"type_client_id": string,"updated_at"?: string
                  }
                  Update: {
                    "actif"?: boolean,"client_id"?: string | null,"commercial_id"?: string,"created_at"?: string,"id"?: string,"nom"?: string,"notes"?: string,"position"?: unknown,"potentiel_colis_mois"?: number | null,"precision_m"?: number | null,"quartier_id"?: string | null,"repere"?: string,"responsable"?: string,"telephone"?: string,"type_client_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "pva_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pva_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "soldes_clients"
      referencedColumns: ["client_id"]
    },{
      foreignKeyName: "pva_commercial_id_fkey"
      columns: ["commercial_id"]
isOneToOne: false
      referencedRelation: "profils"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pva_quartier_id_fkey"
      columns: ["quartier_id"]
isOneToOne: false
      referencedRelation: "quartiers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pva_type_client_id_fkey"
      columns: ["type_client_id"]
isOneToOne: false
      referencedRelation: "types_clients"
      referencedColumns: ["id"]
    }
                  ]
                },"pva_photos": {
                  Row: {
                    "auteur_id": string | null,"chemin": string,"created_at": string,"id": string,"pva_id": string,"visite_id": string | null
                  }
                  Insert: {
                    "auteur_id"?: string | null,"chemin": string,"created_at"?: string,"id": string,"pva_id": string,"visite_id"?: string | null
                  }
                  Update: {
                    "auteur_id"?: string | null,"chemin"?: string,"created_at"?: string,"id"?: string,"pva_id"?: string,"visite_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "pva_photos_auteur_id_fkey"
      columns: ["auteur_id"]
isOneToOne: false
      referencedRelation: "profils"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pva_photos_pva_id_fkey"
      columns: ["pva_id"]
isOneToOne: false
      referencedRelation: "pva"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pva_photos_pva_id_fkey"
      columns: ["pva_id"]
isOneToOne: false
      referencedRelation: "pva_carte"
      referencedColumns: ["id"]
    }
                  ]
                },"quartiers": {
                  Row: {
                    "commune_id": string,"id": string,"nom": string
                  }
                  Insert: {
                    "commune_id": string,"id"?: string,"nom": string
                  }
                  Update: {
                    "commune_id"?: string,"id"?: string,"nom"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "quartiers_commune_id_fkey"
      columns: ["commune_id"]
isOneToOne: false
      referencedRelation: "communes"
      referencedColumns: ["id"]
    }
                  ]
                },"reglements_fournisseurs": {
                  Row: {
                    "compte_id": string,"created_at": string,"date_reglement": string,"facture_id": string,"id": string,"montant_gnf": number,"reference": string,"saisi_par": string | null
                  }
                  Insert: {
                    "compte_id": string,"created_at"?: string,"date_reglement"?: string,"facture_id": string,"id"?: string,"montant_gnf": number,"reference"?: string,"saisi_par"?: string | null
                  }
                  Update: {
                    "compte_id"?: string,"created_at"?: string,"date_reglement"?: string,"facture_id"?: string,"id"?: string,"montant_gnf"?: number,"reference"?: string,"saisi_par"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "reglements_fournisseurs_compte_id_fkey"
      columns: ["compte_id"]
isOneToOne: false
      referencedRelation: "comptes_tresorerie"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reglements_fournisseurs_compte_id_fkey"
      columns: ["compte_id"]
isOneToOne: false
      referencedRelation: "soldes_tresorerie"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reglements_fournisseurs_facture_id_fkey"
      columns: ["facture_id"]
isOneToOne: false
      referencedRelation: "factures_fournisseurs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reglements_fournisseurs_facture_id_fkey"
      columns: ["facture_id"]
isOneToOne: false
      referencedRelation: "factures_fournisseurs_etat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reglements_fournisseurs_saisi_par_fkey"
      columns: ["saisi_par"]
isOneToOne: false
      referencedRelation: "profils"
      referencedColumns: ["id"]
    }
                  ]
                },"relances": {
                  Row: {
                    "auteur_id": string | null,"canal": string,"created_at": string,"date_relance": string,"facture_id": string,"id": string,"note": string,"promesse_date": string | null
                  }
                  Insert: {
                    "auteur_id"?: string | null,"canal"?: string,"created_at"?: string,"date_relance"?: string,"facture_id": string,"id"?: string,"note"?: string,"promesse_date"?: string | null
                  }
                  Update: {
                    "auteur_id"?: string | null,"canal"?: string,"created_at"?: string,"date_relance"?: string,"facture_id"?: string,"id"?: string,"note"?: string,"promesse_date"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "relances_auteur_id_fkey"
      columns: ["auteur_id"]
isOneToOne: false
      referencedRelation: "profils"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "relances_facture_id_fkey"
      columns: ["facture_id"]
isOneToOne: false
      referencedRelation: "factures_etat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "relances_facture_id_fkey"
      columns: ["facture_id"]
isOneToOne: false
      referencedRelation: "pieces_vente"
      referencedColumns: ["id"]
    }
                  ]
                },"roles": {
                  Row: {
                    "code": Database["public"]['Enums']["role_code"],"description": string,"libelle": string,"ordre": number
                  }
                  Insert: {
                    "code": Database["public"]['Enums']["role_code"],"description"?: string,"libelle": string,"ordre"?: number
                  }
                  Update: {
                    "code"?: Database["public"]['Enums']["role_code"],"description"?: string,"libelle"?: string,"ordre"?: number
                  }
                  Relationships: [
                    
                  ]
                },"stocks_articles": {
                  Row: {
                    "article_id": string,"cmp_gnf": number,"derniere_entree": string | null,"derniere_sortie": string | null,"quantite": number,"updated_at": string,"valeur_gnf": number
                  }
                  Insert: {
                    "article_id": string,"cmp_gnf"?: number,"derniere_entree"?: string | null,"derniere_sortie"?: string | null,"quantite"?: number,"updated_at"?: string,"valeur_gnf"?: number
                  }
                  Update: {
                    "article_id"?: string,"cmp_gnf"?: number,"derniere_entree"?: string | null,"derniere_sortie"?: string | null,"quantite"?: number,"updated_at"?: string,"valeur_gnf"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "stocks_articles_article_id_fkey"
      columns: ["article_id"]
isOneToOne: true
      referencedRelation: "alertes_stock"
      referencedColumns: ["article_id"]
    },{
      foreignKeyName: "stocks_articles_article_id_fkey"
      columns: ["article_id"]
isOneToOne: true
      referencedRelation: "articles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stocks_articles_article_id_fkey"
      columns: ["article_id"]
isOneToOne: true
      referencedRelation: "etat_stock"
      referencedColumns: ["article_id"]
    },{
      foreignKeyName: "stocks_articles_article_id_fkey"
      columns: ["article_id"]
isOneToOne: true
      referencedRelation: "pieces_critiques_alerte"
      referencedColumns: ["article_id"]
    }
                  ]
                },"stocks_lots": {
                  Row: {
                    "lot_id": string,"quantite": number,"updated_at": string
                  }
                  Insert: {
                    "lot_id": string,"quantite"?: number,"updated_at"?: string
                  }
                  Update: {
                    "lot_id"?: string,"quantite"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "stocks_lots_lot_id_fkey"
      columns: ["lot_id"]
isOneToOne: true
      referencedRelation: "etat_lots"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stocks_lots_lot_id_fkey"
      columns: ["lot_id"]
isOneToOne: true
      referencedRelation: "lots"
      referencedColumns: ["id"]
    }
                  ]
                },"taux_change": {
                  Row: {
                    "created_at": string,"date_effet": string,"devise": string,"id": string,"note": string | null,"saisi_par": string | null,"taux_gnf": number
                  }
                  Insert: {
                    "created_at"?: string,"date_effet": string,"devise"?: string,"id"?: string,"note"?: string | null,"saisi_par"?: string | null,"taux_gnf": number
                  }
                  Update: {
                    "created_at"?: string,"date_effet"?: string,"devise"?: string,"id"?: string,"note"?: string | null,"saisi_par"?: string | null,"taux_gnf"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "taux_change_saisi_par_fkey"
      columns: ["saisi_par"]
isOneToOne: false
      referencedRelation: "profils"
      referencedColumns: ["id"]
    }
                  ]
                },"tournee_etapes": {
                  Row: {
                    "ordre": number,"pva_id": string,"tournee_id": string
                  }
                  Insert: {
                    "ordre"?: number,"pva_id": string,"tournee_id": string
                  }
                  Update: {
                    "ordre"?: number,"pva_id"?: string,"tournee_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tournee_etapes_pva_id_fkey"
      columns: ["pva_id"]
isOneToOne: false
      referencedRelation: "pva"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tournee_etapes_pva_id_fkey"
      columns: ["pva_id"]
isOneToOne: false
      referencedRelation: "pva_carte"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tournee_etapes_tournee_id_fkey"
      columns: ["tournee_id"]
isOneToOne: false
      referencedRelation: "tournees"
      referencedColumns: ["id"]
    }
                  ]
                },"tournees": {
                  Row: {
                    "commercial_id": string,"created_at": string,"created_by": string | null,"date_tournee": string,"id": string,"notes": string
                  }
                  Insert: {
                    "commercial_id": string,"created_at"?: string,"created_by"?: string | null,"date_tournee": string,"id"?: string,"notes"?: string
                  }
                  Update: {
                    "commercial_id"?: string,"created_at"?: string,"created_by"?: string | null,"date_tournee"?: string,"id"?: string,"notes"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tournees_commercial_id_fkey"
      columns: ["commercial_id"]
isOneToOne: false
      referencedRelation: "profils"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tournees_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profils"
      referencedColumns: ["id"]
    }
                  ]
                },"tournees_livraison": {
                  Row: {
                    "chauffeur_id": string,"created_at": string,"created_by": string | null,"date_tournee": string,"depart_le": string | null,"id": string,"km_depart": number | null,"km_retour": number | null,"notes": string,"numero": string | null,"retour_le": string | null,"statut": string,"vehicule_id": string
                  }
                  Insert: {
                    "chauffeur_id": string,"created_at"?: string,"created_by"?: string | null,"date_tournee"?: string,"depart_le"?: string | null,"id"?: string,"km_depart"?: number | null,"km_retour"?: number | null,"notes"?: string,"numero"?: string | null,"retour_le"?: string | null,"statut"?: string,"vehicule_id": string
                  }
                  Update: {
                    "chauffeur_id"?: string,"created_at"?: string,"created_by"?: string | null,"date_tournee"?: string,"depart_le"?: string | null,"id"?: string,"km_depart"?: number | null,"km_retour"?: number | null,"notes"?: string,"numero"?: string | null,"retour_le"?: string | null,"statut"?: string,"vehicule_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tournees_livraison_chauffeur_id_fkey"
      columns: ["chauffeur_id"]
isOneToOne: false
      referencedRelation: "chauffeurs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tournees_livraison_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profils"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tournees_livraison_vehicule_id_fkey"
      columns: ["vehicule_id"]
isOneToOne: false
      referencedRelation: "vehicules"
      referencedColumns: ["id"]
    }
                  ]
                },"types_clients": {
                  Row: {
                    "actif": boolean,"created_at": string,"dotation": boolean,"id": string,"libelle": string,"niveau_prix": string,"ordre": number
                  }
                  Insert: {
                    "actif"?: boolean,"created_at"?: string,"dotation"?: boolean,"id"?: string,"libelle": string,"niveau_prix"?: string,"ordre"?: number
                  }
                  Update: {
                    "actif"?: boolean,"created_at"?: string,"dotation"?: boolean,"id"?: string,"libelle"?: string,"niveau_prix"?: string,"ordre"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "types_clients_niveau_prix_fkey"
      columns: ["niveau_prix"]
isOneToOne: false
      referencedRelation: "niveaux_prix"
      referencedColumns: ["code"]
    }
                  ]
                },"types_depenses_tournee": {
                  Row: {
                    "actif": boolean,"id": string,"libelle": string,"ordre": number
                  }
                  Insert: {
                    "actif"?: boolean,"id"?: string,"libelle": string,"ordre"?: number
                  }
                  Update: {
                    "actif"?: boolean,"id"?: string,"libelle"?: string,"ordre"?: number
                  }
                  Relationships: [
                    
                  ]
                },"types_documents": {
                  Row: {
                    "actif": boolean,"created_at": string,"id": string,"libelle": string,"ordre": number
                  }
                  Insert: {
                    "actif"?: boolean,"created_at"?: string,"id"?: string,"libelle": string,"ordre"?: number
                  }
                  Update: {
                    "actif"?: boolean,"created_at"?: string,"id"?: string,"libelle"?: string,"ordre"?: number
                  }
                  Relationships: [
                    
                  ]
                },"types_frais": {
                  Row: {
                    "actif": boolean,"created_at": string,"id": string,"libelle": string,"ordre": number
                  }
                  Insert: {
                    "actif"?: boolean,"created_at"?: string,"id"?: string,"libelle": string,"ordre"?: number
                  }
                  Update: {
                    "actif"?: boolean,"created_at"?: string,"id"?: string,"libelle"?: string,"ordre"?: number
                  }
                  Relationships: [
                    
                  ]
                },"types_non_conformite": {
                  Row: {
                    "actif": boolean,"id": string,"libelle": string,"ordre": number
                  }
                  Insert: {
                    "actif"?: boolean,"id"?: string,"libelle": string,"ordre"?: number
                  }
                  Update: {
                    "actif"?: boolean,"id"?: string,"libelle"?: string,"ordre"?: number
                  }
                  Relationships: [
                    
                  ]
                },"utilisateur_roles": {
                  Row: {
                    "created_at": string,"role": Database["public"]['Enums']["role_code"],"utilisateur_id": string
                  }
                  Insert: {
                    "created_at"?: string,"role": Database["public"]['Enums']["role_code"],"utilisateur_id": string
                  }
                  Update: {
                    "created_at"?: string,"role"?: Database["public"]['Enums']["role_code"],"utilisateur_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "utilisateur_roles_utilisateur_id_fkey"
      columns: ["utilisateur_id"]
isOneToOne: false
      referencedRelation: "profils"
      referencedColumns: ["id"]
    }
                  ]
                },"vehicules": {
                  Row: {
                    "actif": boolean,"capacite_colis": number | null,"created_at": string,"id": string,"immatriculation": string,"libelle": string,"notes": string,"type_vehicule": string
                  }
                  Insert: {
                    "actif"?: boolean,"capacite_colis"?: number | null,"created_at"?: string,"id"?: string,"immatriculation": string,"libelle"?: string,"notes"?: string,"type_vehicule"?: string
                  }
                  Update: {
                    "actif"?: boolean,"capacite_colis"?: number | null,"created_at"?: string,"id"?: string,"immatriculation"?: string,"libelle"?: string,"notes"?: string,"type_vehicule"?: string
                  }
                  Relationships: [
                    
                  ]
                },"villes": {
                  Row: {
                    "id": string,"nom": string,"prefecture": string | null,"region": string | null
                  }
                  Insert: {
                    "id"?: string,"nom": string,"prefecture"?: string | null,"region"?: string | null
                  }
                  Update: {
                    "id"?: string,"nom"?: string,"prefecture"?: string | null,"region"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"visite_concurrence": {
                  Row: {
                    "id": string,"marque_id": string,"prix_gnf": number | null,"produit": string,"visite_id": string
                  }
                  Insert: {
                    "id"?: string,"marque_id": string,"prix_gnf"?: number | null,"produit"?: string,"visite_id": string
                  }
                  Update: {
                    "id"?: string,"marque_id"?: string,"prix_gnf"?: number | null,"produit"?: string,"visite_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "visite_concurrence_marque_id_fkey"
      columns: ["marque_id"]
isOneToOne: false
      referencedRelation: "marques_concurrentes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "visite_concurrence_visite_id_fkey"
      columns: ["visite_id"]
isOneToOne: false
      referencedRelation: "visites"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "visite_concurrence_visite_id_fkey"
      columns: ["visite_id"]
isOneToOne: false
      referencedRelation: "visites_carte"
      referencedColumns: ["id"]
    }
                  ]
                },"visite_prix": {
                  Row: {
                    "prix_gnf": number,"produit_id": string,"visite_id": string
                  }
                  Insert: {
                    "prix_gnf": number,"produit_id": string,"visite_id": string
                  }
                  Update: {
                    "prix_gnf"?: number,"produit_id"?: string,"visite_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "visite_prix_produit_id_fkey"
      columns: ["produit_id"]
isOneToOne: false
      referencedRelation: "of_avancement"
      referencedColumns: ["produit_id"]
    },{
      foreignKeyName: "visite_prix_produit_id_fkey"
      columns: ["produit_id"]
isOneToOne: false
      referencedRelation: "prix_actuels"
      referencedColumns: ["produit_id"]
    },{
      foreignKeyName: "visite_prix_produit_id_fkey"
      columns: ["produit_id"]
isOneToOne: false
      referencedRelation: "produits"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "visite_prix_visite_id_fkey"
      columns: ["visite_id"]
isOneToOne: false
      referencedRelation: "visites"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "visite_prix_visite_id_fkey"
      columns: ["visite_id"]
isOneToOne: false
      referencedRelation: "visites_carte"
      referencedColumns: ["id"]
    }
                  ]
                },"visites": {
                  Row: {
                    "checkin_at": string,"commercial_id": string,"dans_zone": boolean | null,"distance_m": number | null,"id": string,"notes": string,"position": unknown,"precision_m": number | null,"pva_id": string,"rupture": boolean,"stock_papel_colis": number | null,"synchronise_le": string
                  }
                  Insert: {
                    "checkin_at": string,"commercial_id"?: string,"dans_zone"?: boolean | null,"distance_m"?: number | null,"id": string,"notes"?: string,"position"?: unknown,"precision_m"?: number | null,"pva_id": string,"rupture"?: boolean,"stock_papel_colis"?: number | null,"synchronise_le"?: string
                  }
                  Update: {
                    "checkin_at"?: string,"commercial_id"?: string,"dans_zone"?: boolean | null,"distance_m"?: number | null,"id"?: string,"notes"?: string,"position"?: unknown,"precision_m"?: number | null,"pva_id"?: string,"rupture"?: boolean,"stock_papel_colis"?: number | null,"synchronise_le"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "visites_commercial_id_fkey"
      columns: ["commercial_id"]
isOneToOne: false
      referencedRelation: "profils"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "visites_pva_id_fkey"
      columns: ["pva_id"]
isOneToOne: false
      referencedRelation: "pva"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "visites_pva_id_fkey"
      columns: ["pva_id"]
isOneToOne: false
      referencedRelation: "pva_carte"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "alertes_stock": {
                  Row: {
                    "actif": boolean | null,"article_id": string | null,"categorie_id": string | null,"cmp_gnf": number | null,"code": string | null,"conditionnement_id": string | null,"conso_jour": number | null,"derniere_entree": string | null,"derniere_sortie": string | null,"famille": Database["public"]['Enums']["famille_article"] | null,"jours_couverture": number | null,"libelle": string | null,"nb_lots_en_stock": number | null,"niveau_alerte": string | null,"paquets_par_colis": number | null,"produit_id": string | null,"quantite": number | null,"seuil_alerte": number | null,"suivi_par_lot": boolean | null,"unite": Database["public"]['Enums']["unite_stock"] | null,"valeur_gnf": number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "articles_categorie_id_fkey"
      columns: ["categorie_id"]
isOneToOne: false
      referencedRelation: "categories_articles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "articles_conditionnement_id_fkey"
      columns: ["conditionnement_id"]
isOneToOne: true
      referencedRelation: "conditionnements"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "articles_conditionnement_id_fkey"
      columns: ["conditionnement_id"]
isOneToOne: true
      referencedRelation: "prix_actuels"
      referencedColumns: ["conditionnement_id"]
    },{
      foreignKeyName: "articles_produit_id_fkey"
      columns: ["produit_id"]
isOneToOne: false
      referencedRelation: "of_avancement"
      referencedColumns: ["produit_id"]
    },{
      foreignKeyName: "articles_produit_id_fkey"
      columns: ["produit_id"]
isOneToOne: false
      referencedRelation: "prix_actuels"
      referencedColumns: ["produit_id"]
    },{
      foreignKeyName: "articles_produit_id_fkey"
      columns: ["produit_id"]
isOneToOne: false
      referencedRelation: "produits"
      referencedColumns: ["id"]
    }
                  ]
                },"controles_etat": {
                  Row: {
                    "code_lot": string | null,"controleur_id": string | null,"created_at": string | null,"date_controle": string | null,"etape": string | null,"fiche_id": string | null,"id": string | null,"lot_id": string | null,"nb_mesures": number | null,"nb_non_conformes": number | null,"notes": string | null,"numero_lot": string | null,"resultat": string | null,"statut": string | null,"valide_le": string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "controles_qualite_controleur_id_fkey"
      columns: ["controleur_id"]
isOneToOne: false
      referencedRelation: "profils"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "controles_qualite_fiche_id_fkey"
      columns: ["fiche_id"]
isOneToOne: false
      referencedRelation: "fiches_production"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "controles_qualite_fiche_id_fkey"
      columns: ["fiche_id"]
isOneToOne: false
      referencedRelation: "fiches_resume"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "controles_qualite_fiche_id_fkey"
      columns: ["fiche_id"]
isOneToOne: false
      referencedRelation: "tracabilite_bobines"
      referencedColumns: ["fiche_id"]
    },{
      foreignKeyName: "controles_qualite_lot_id_fkey"
      columns: ["lot_id"]
isOneToOne: false
      referencedRelation: "etat_lots"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "controles_qualite_lot_id_fkey"
      columns: ["lot_id"]
isOneToOne: false
      referencedRelation: "lots"
      referencedColumns: ["id"]
    }
                  ]
                },"couts_conteneurs": {
                  Row: {
                    "bc_id": string | null,"bc_numero": string | null,"cout_kg_gnf": number | null,"cout_kg_prevu_gnf": number | null,"date_commande": string | null,"date_livraison_reelle": string | null,"devise": string | null,"fournisseur_id": string | null,"frais_estimes_gnf": number | null,"frais_gnf": number | null,"id": string | null,"kg_bc": number | null,"kg_recus": number | null,"marchandise_gnf": number | null,"montant_bc_devise": number | null,"poids_net_prevu_kg": number | null,"reference": string | null,"statut": Database["public"]['Enums']["statut_conteneur"] | null,"taux_change": number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "bons_commande_fournisseur_id_fkey"
      columns: ["fournisseur_id"]
isOneToOne: false
      referencedRelation: "fournisseurs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conteneurs_bc_id_fkey"
      columns: ["bc_id"]
isOneToOne: false
      referencedRelation: "bons_commande"
      referencedColumns: ["id"]
    }
                  ]
                },"echeances_preventif": {
                  Row: {
                    "actif": boolean | null,"consignes": string | null,"created_at": string | null,"criticite": string | null,"derniere_realisation": string | null,"duree_estimee_min": number | null,"equipement_code": string | null,"equipement_id": string | null,"equipement_libelle": string | null,"frequence_jours": number | null,"id": string | null,"jours_restants": number | null,"libelle": string | null,"prochaine_echeance": string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "plans_preventifs_equipement_id_fkey"
      columns: ["equipement_id"]
isOneToOne: false
      referencedRelation: "equipements"
      referencedColumns: ["id"]
    }
                  ]
                },"etat_lots": {
                  Row: {
                    "article_code": string | null,"article_id": string | null,"article_libelle": string | null,"cout_kg_gnf": number | null,"created_at": string | null,"date_reception": string | null,"diametre_mm": number | null,"fournisseur_id": string | null,"fournisseur_nom": string | null,"grammage_g_m2": number | null,"id": string | null,"largeur_mm": number | null,"notes": string | null,"numero_lot": string | null,"plis": number | null,"poids_net_kg": number | null,"poids_restant_kg": number | null,"statut": Database["public"]['Enums']["statut_lot"] | null,"updated_at": string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "lots_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "alertes_stock"
      referencedColumns: ["article_id"]
    },{
      foreignKeyName: "lots_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "articles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lots_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "etat_stock"
      referencedColumns: ["article_id"]
    },{
      foreignKeyName: "lots_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "pieces_critiques_alerte"
      referencedColumns: ["article_id"]
    },{
      foreignKeyName: "lots_fournisseur_id_fkey"
      columns: ["fournisseur_id"]
isOneToOne: false
      referencedRelation: "fournisseurs"
      referencedColumns: ["id"]
    }
                  ]
                },"etat_stock": {
                  Row: {
                    "actif": boolean | null,"article_id": string | null,"categorie_id": string | null,"cmp_gnf": number | null,"code": string | null,"conditionnement_id": string | null,"conso_jour": number | null,"derniere_entree": string | null,"derniere_sortie": string | null,"famille": Database["public"]['Enums']["famille_article"] | null,"jours_couverture": number | null,"libelle": string | null,"nb_lots_en_stock": number | null,"paquets_par_colis": number | null,"produit_id": string | null,"quantite": number | null,"seuil_alerte": number | null,"suivi_par_lot": boolean | null,"unite": Database["public"]['Enums']["unite_stock"] | null,"valeur_gnf": number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "articles_categorie_id_fkey"
      columns: ["categorie_id"]
isOneToOne: false
      referencedRelation: "categories_articles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "articles_conditionnement_id_fkey"
      columns: ["conditionnement_id"]
isOneToOne: true
      referencedRelation: "conditionnements"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "articles_conditionnement_id_fkey"
      columns: ["conditionnement_id"]
isOneToOne: true
      referencedRelation: "prix_actuels"
      referencedColumns: ["conditionnement_id"]
    },{
      foreignKeyName: "articles_produit_id_fkey"
      columns: ["produit_id"]
isOneToOne: false
      referencedRelation: "of_avancement"
      referencedColumns: ["produit_id"]
    },{
      foreignKeyName: "articles_produit_id_fkey"
      columns: ["produit_id"]
isOneToOne: false
      referencedRelation: "prix_actuels"
      referencedColumns: ["produit_id"]
    },{
      foreignKeyName: "articles_produit_id_fkey"
      columns: ["produit_id"]
isOneToOne: false
      referencedRelation: "produits"
      referencedColumns: ["id"]
    }
                  ]
                },"factures_etat": {
                  Row: {
                    "avoirs_gnf": number | null,"client_code": string | null,"client_id": string | null,"client_nom": string | null,"commercial_id": string | null,"date_echeance": string | null,"date_piece": string | null,"id": string | null,"jours_retard": number | null,"numero": string | null,"paye_gnf": number | null,"solde_gnf": number | null,"total_ht_gnf": number | null,"total_ttc_gnf": number | null,"total_tva_gnf": number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "pieces_vente_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pieces_vente_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "soldes_clients"
      referencedColumns: ["client_id"]
    },{
      foreignKeyName: "pieces_vente_commercial_id_fkey"
      columns: ["commercial_id"]
isOneToOne: false
      referencedRelation: "profils"
      referencedColumns: ["id"]
    }
                  ]
                },"factures_fournisseurs_etat": {
                  Row: {
                    "bc_id": string | null,"beneficiaire": string | null,"categorie_id": string | null,"categorie_libelle": string | null,"compte_charge": string | null,"conteneur_id": string | null,"created_at": string | null,"created_by": string | null,"date_echeance": string | null,"date_facture": string | null,"devise": string | null,"fournisseur_id": string | null,"id": string | null,"jours_retard": number | null,"libelle": string | null,"mois_recurrence": string | null,"montant_ht": number | null,"montant_ht_gnf": number | null,"montant_tva": number | null,"montant_tva_gnf": number | null,"nature": string | null,"numero": string | null,"paye_gnf": number | null,"recurrente_id": string | null,"reference_fournisseur": string | null,"solde_gnf": number | null,"statut": string | null,"taux_change": number | null,"tiers": string | null,"total_gnf": number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "factures_fournisseurs_bc_id_fkey"
      columns: ["bc_id"]
isOneToOne: false
      referencedRelation: "bons_commande"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "factures_fournisseurs_categorie_id_fkey"
      columns: ["categorie_id"]
isOneToOne: false
      referencedRelation: "categories_charges"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "factures_fournisseurs_conteneur_id_fkey"
      columns: ["conteneur_id"]
isOneToOne: false
      referencedRelation: "conteneurs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "factures_fournisseurs_conteneur_id_fkey"
      columns: ["conteneur_id"]
isOneToOne: false
      referencedRelation: "couts_conteneurs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "factures_fournisseurs_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profils"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "factures_fournisseurs_fournisseur_id_fkey"
      columns: ["fournisseur_id"]
isOneToOne: false
      referencedRelation: "fournisseurs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "factures_recurrente_fk"
      columns: ["recurrente_id"]
isOneToOne: false
      referencedRelation: "charges_recurrentes"
      referencedColumns: ["id"]
    }
                  ]
                },"fiches_resume": {
                  Row: {
                    "arret_max_min": number | null,"arrets_non_planifies_min": number | null,"arrets_planifies_min": number | null,"cout_matiere_gnf": number | null,"date_production": string | null,"duree_poste_min": number | null,"equipe_id": string | null,"equipe_libelle": string | null,"id": string | null,"ligne_id": string | null,"ligne_libelle": string | null,"nb_operateurs": number | null,"notes": string | null,"of_id": string | null,"of_numero": string | null,"papier_kg": number | null,"paquets": number | null,"poste_id": string | null,"poste_libelle": string | null,"poste_ordre": number | null,"rebuts_kg": number | null,"statut": Database["public"]['Enums']["statut_fiche"] | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "fiches_production_equipe_id_fkey"
      columns: ["equipe_id"]
isOneToOne: false
      referencedRelation: "equipes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fiches_production_ligne_id_fkey"
      columns: ["ligne_id"]
isOneToOne: false
      referencedRelation: "lignes_production"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fiches_production_of_id_fkey"
      columns: ["of_id"]
isOneToOne: false
      referencedRelation: "of_avancement"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fiches_production_of_id_fkey"
      columns: ["of_id"]
isOneToOne: false
      referencedRelation: "ordres_fabrication"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fiches_production_poste_id_fkey"
      columns: ["poste_id"]
isOneToOne: false
      referencedRelation: "postes"
      referencedColumns: ["id"]
    }
                  ]
                },"interventions_etat": {
                  Row: {
                    "arret_machine": boolean | null,"cause": string | null,"cout_externe_gnf": number | null,"cout_main_oeuvre_gnf": number | null,"cout_pieces_gnf": number | null,"created_at": string | null,"criticite": string | null,"debut": string | null,"description": string | null,"duree_min": number | null,"equipement_code": string | null,"equipement_id": string | null,"equipement_libelle": string | null,"fin": string | null,"id": string | null,"intervenant": string | null,"ligne_id": string | null,"numero": string | null,"plan_id": string | null,"priorite": string | null,"signale_le": string | null,"signale_par": string | null,"statut": string | null,"travaux": string | null,"type_intervention": string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "equipements_ligne_id_fkey"
      columns: ["ligne_id"]
isOneToOne: false
      referencedRelation: "lignes_production"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "interventions_equipement_id_fkey"
      columns: ["equipement_id"]
isOneToOne: false
      referencedRelation: "equipements"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "interventions_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "echeances_preventif"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "interventions_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "plans_preventifs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "interventions_signale_par_fkey"
      columns: ["signale_par"]
isOneToOne: false
      referencedRelation: "profils"
      referencedColumns: ["id"]
    }
                  ]
                },"of_avancement": {
                  Row: {
                    "campagne_id": string | null,"campagne_libelle": string | null,"conditionnement_id": string | null,"conditionnement_libelle": string | null,"created_at": string | null,"created_by": string | null,"date_debut_prevue": string | null,"date_fin_prevue": string | null,"id": string | null,"ligne_id": string | null,"ligne_libelle": string | null,"notes": string | null,"numero": string | null,"paquets_par_colis": number | null,"paquets_produits": number | null,"produit_id": string | null,"produit_libelle": string | null,"quantite_colis": number | null,"statut": Database["public"]['Enums']["statut_of"] | null,"updated_at": string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "ordres_fabrication_campagne_id_fkey"
      columns: ["campagne_id"]
isOneToOne: false
      referencedRelation: "campagnes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ordres_fabrication_conditionnement_id_fkey"
      columns: ["conditionnement_id"]
isOneToOne: false
      referencedRelation: "conditionnements"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ordres_fabrication_conditionnement_id_fkey"
      columns: ["conditionnement_id"]
isOneToOne: false
      referencedRelation: "prix_actuels"
      referencedColumns: ["conditionnement_id"]
    },{
      foreignKeyName: "ordres_fabrication_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profils"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ordres_fabrication_ligne_id_fkey"
      columns: ["ligne_id"]
isOneToOne: false
      referencedRelation: "lignes_production"
      referencedColumns: ["id"]
    }
                  ]
                },"pieces_critiques_alerte": {
                  Row: {
                    "article_id": string | null,"code": string | null,"equipements": string | null,"libelle": string | null,"quantite": number | null,"seuil_alerte": number | null,"unite": Database["public"]['Enums']["unite_stock"] | null
                  }
                  Relationships: [
                    
                  ]
                },"prix_actuels": {
                  Row: {
                    "conditionnement_id": string | null,"conditionnement_libelle": string | null,"date_debut": string | null,"niveau": string | null,"paquets_par_colis": number | null,"prix_colis_gnf": number | null,"prix_paquet_gnf": number | null,"produit_code": string | null,"produit_id": string | null,"produit_libelle": string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "grille_prix_niveau_fkey"
      columns: ["niveau"]
isOneToOne: false
      referencedRelation: "niveaux_prix"
      referencedColumns: ["code"]
    }
                  ]
                },"pva_carte": {
                  Row: {
                    "actif": boolean | null,"client_id": string | null,"commercial_id": string | null,"commercial_nom": string | null,"commune_nom": string | null,"created_at": string | null,"derniere_rupture": boolean | null,"derniere_visite": string | null,"id": string | null,"latitude": number | null,"longitude": number | null,"nom": string | null,"notes": string | null,"potentiel_colis_mois": number | null,"quartier_id": string | null,"quartier_nom": string | null,"repere": string | null,"responsable": string | null,"telephone": string | null,"type_client_id": string | null,"type_libelle": string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "pva_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pva_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "soldes_clients"
      referencedColumns: ["client_id"]
    },{
      foreignKeyName: "pva_commercial_id_fkey"
      columns: ["commercial_id"]
isOneToOne: false
      referencedRelation: "profils"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pva_quartier_id_fkey"
      columns: ["quartier_id"]
isOneToOne: false
      referencedRelation: "quartiers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pva_type_client_id_fkey"
      columns: ["type_client_id"]
isOneToOne: false
      referencedRelation: "types_clients"
      referencedColumns: ["id"]
    }
                  ]
                },"reste_a_livrer": {
                  Row: {
                    "commande_id": string | null,"conditionnement_id": string | null,"paquets_commandes": number | null,"paquets_restants": number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "lignes_piece_conditionnement_id_fkey"
      columns: ["conditionnement_id"]
isOneToOne: false
      referencedRelation: "conditionnements"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lignes_piece_conditionnement_id_fkey"
      columns: ["conditionnement_id"]
isOneToOne: false
      referencedRelation: "prix_actuels"
      referencedColumns: ["conditionnement_id"]
    },{
      foreignKeyName: "lignes_piece_piece_id_fkey"
      columns: ["commande_id"]
isOneToOne: false
      referencedRelation: "factures_etat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lignes_piece_piece_id_fkey"
      columns: ["commande_id"]
isOneToOne: false
      referencedRelation: "pieces_vente"
      referencedColumns: ["id"]
    }
                  ]
                },"soldes_clients": {
                  Row: {
                    "client_id": string | null,"code": string | null,"commercial_id": string | null,"condition_paiement": string | null,"echu_gnf": number | null,"encours_gnf": number | null,"nom": string | null,"plafond_credit_gnf": number | null,"retard_max_jours": number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "clients_commercial_id_fkey"
      columns: ["commercial_id"]
isOneToOne: false
      referencedRelation: "profils"
      referencedColumns: ["id"]
    }
                  ]
                },"soldes_tresorerie": {
                  Row: {
                    "actif": boolean | null,"compte_comptable": string | null,"date_solde_initial": string | null,"devise": string | null,"id": string | null,"libelle": string | null,"ordre": number | null,"solde": number | null,"solde_initial": number | null,"taux_actuel": number | null,"type_compte": string | null
                  }
                  Insert: {
                           "actif"?: boolean | null,"compte_comptable"?: string | null,"date_solde_initial"?: string | null,"devise"?: string | null,"id"?: string | null,"libelle"?: string | null,"ordre"?: number | null,"solde"?: never,"solde_initial"?: number | null,"taux_actuel"?: never,"type_compte"?: string | null
                         }
                        Update: {
                           "actif"?: boolean | null,"compte_comptable"?: string | null,"date_solde_initial"?: string | null,"devise"?: string | null,"id"?: string | null,"libelle"?: string | null,"ordre"?: number | null,"solde"?: never,"solde_initial"?: number | null,"taux_actuel"?: never,"type_compte"?: string | null
                         }
                        Relationships: [
                    
                  ]
                },"tournees_livraison_etat": {
                  Row: {
                    "capacite_colis": number | null,"chauffeur_id": string | null,"chauffeur_nom": string | null,"chauffeur_profil_id": string | null,"colis_charges": number | null,"colis_livres": number | null,"created_at": string | null,"created_by": string | null,"date_tournee": string | null,"depart_le": string | null,"depenses_gnf": number | null,"id": string | null,"immatriculation": string | null,"km_depart": number | null,"km_parcourus": number | null,"km_retour": number | null,"nb_livraisons": number | null,"nb_livrees": number | null,"nb_partielles": number | null,"nb_refusees": number | null,"nb_remises": number | null,"notes": string | null,"numero": string | null,"paquets_charges": number | null,"paquets_livres": number | null,"retour_le": string | null,"statut": string | null,"vehicule_id": string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "chauffeurs_profil_id_fkey"
      columns: ["chauffeur_profil_id"]
isOneToOne: true
      referencedRelation: "profils"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tournees_livraison_chauffeur_id_fkey"
      columns: ["chauffeur_id"]
isOneToOne: false
      referencedRelation: "chauffeurs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tournees_livraison_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profils"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tournees_livraison_vehicule_id_fkey"
      columns: ["vehicule_id"]
isOneToOne: false
      referencedRelation: "vehicules"
      referencedColumns: ["id"]
    }
                  ]
                },"tracabilite_bobines": {
                  Row: {
                    "code_lot": string | null,"date_production": string | null,"fiche_id": string | null,"kg_consommes": number | null,"ligne": string | null,"lot_id": string | null,"poste": string | null,"statut_fiche": Database["public"]['Enums']["statut_fiche"] | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "fiche_consommations_lot_id_fkey"
      columns: ["lot_id"]
isOneToOne: false
      referencedRelation: "etat_lots"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fiche_consommations_lot_id_fkey"
      columns: ["lot_id"]
isOneToOne: false
      referencedRelation: "lots"
      referencedColumns: ["id"]
    }
                  ]
                },"transit": {
                  Row: {
                    "kg_en_transit": number | null,"nb_conteneurs": number | null
                  }
                  Relationships: [
                    
                  ]
                },"visites_carte": {
                  Row: {
                    "checkin_at": string | null,"commercial_id": string | null,"commercial_nom": string | null,"dans_zone": boolean | null,"distance_m": number | null,"id": string | null,"latitude": number | null,"longitude": number | null,"notes": string | null,"precision_m": number | null,"pva_id": string | null,"pva_nom": string | null,"rupture": boolean | null,"stock_papel_colis": number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "visites_commercial_id_fkey"
      columns: ["commercial_id"]
isOneToOne: false
      referencedRelation: "profils"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "visites_pva_id_fkey"
      columns: ["pva_id"]
isOneToOne: false
      referencedRelation: "pva"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "visites_pva_id_fkey"
      columns: ["pva_id"]
isOneToOne: false
      referencedRelation: "pva_carte"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "a_role":
{ Args: { "r": Database["public"]['Enums']["role_code"] }; Returns: boolean
                           },
"a_un_role":
{ Args: { "roles": (Database["public"]['Enums']["role_code"])[] }; Returns: boolean
                           },
"activer_audit":
{ Args: { "p_cle"?: string,"p_table": unknown }; Returns: undefined
                           },
"affecter_livraison":
{ Args: { "p_livraison": string,"p_tournee": string }; Returns: undefined
                           },
"annuler_piece":
{ Args: { "p_piece": string }; Returns: undefined
                           },
"aujourdhui_conakry":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"calculer_dotation_facture":
{ Args: { "p_facture": string }; Returns: undefined
                           },
"cloturer_nc":
{ Args: { "p_nc": string }; Returns: undefined
                           },
"controler_solde_compte":
{ Args: { "p_compte": string }; Returns: undefined
                           },
"convertir_pour_compte":
{ Args: { "p_compte": string,"p_date": string,"p_montant_gnf": number }; Returns: Record<string, unknown>
                           },
"creer_produit":
{ Args: { "p_code": string,"p_date_prix"?: string,"p_grammage": number,"p_largeur_mm": number,"p_libelle": string,"p_longueur_mm": number,"p_nb_mouchoirs": number,"p_paquets_par_colis": number,"p_plis": number,"p_prix_paquet_gnf"?: number,"p_taux_perte": number }; Returns: string
                           },
"decider_lot":
{ Args: { "p_bloquer": boolean,"p_lot": string,"p_motif": string }; Returns: undefined
                           },
"definir_prix":
{ Args: { "p_date_debut": string,"p_niveau": string,"p_note"?: string,"p_prix_paquet_gnf": number,"p_produit": string }; Returns: string
                           },
"demarrer_tournee":
{ Args: { "p_km": number,"p_tournee": string }; Returns: undefined
                           },
"dernier_numero_terrain":
{ Args: { "p_prefixe": string }; Returns: number
                           },
"enregistrer_paiement":
{ Args: { "p_date"?: string,"p_facture": string,"p_mode": string,"p_montant": number,"p_notes"?: string,"p_reference"?: string }; Returns: string
                           },
"enregistrer_remise":
{ Args: { "p_commentaire"?: string,"p_latitude"?: number,"p_livraison": string,"p_longitude"?: number,"p_photo"?: string,"p_precision"?: number,"p_receptionnaire": string,"p_retours"?: Json,"p_signature"?: string,"p_statut": string }; Returns: undefined
                           },
"envoyer_bc":
{ Args: { "p_bc": string }; Returns: string
                           },
"est_actif":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"est_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"exiger_logistique":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"generer_charges_mois":
{ Args: { "p_mois": string }; Returns: number
                           },
"generer_preventifs":
{ Args: { "p_horizon_jours"?: number }; Returns: number
                           },
"hook_jeton_acces":
{ Args: { "event": Json }; Returns: Json
                           },
"mes_roles":
{ Args: Record<PropertyKey, never>; Returns: (Database["public"]['Enums']["role_code"])[]
                           },
"nombre_fr":
{ Args: { "n": number }; Returns: string
                           },
"ouvrir_inventaire":
{ Args: { "p_famille"?: Database["public"]['Enums']["famille_article"],"p_libelle": string }; Returns: string
                           },
"parametre_num":
{ Args: { "p_cle": string,"p_defaut": number }; Returns: number
                           },
"peut_ecrire_piece":
{ Args: { "p_piece": string }; Returns: boolean
                           },
"preparer_livraison":
{ Args: { "p_commande": string }; Returns: string
                           },
"prix_en_vigueur":
{ Args: { "p_date"?: string,"p_niveau": string,"p_produit": string }; Returns: number
                           },
"prochain_numero":
{ Args: { "p_prefixe": string }; Returns: string
                           },
"rapport_hebdomadaire":
{ Args: { "p_au": string,"p_du": string }; Returns: Json
                           },
"receptionner_bobine":
{ Args: { "p_article": string,"p_cout_kg_gnf": number,"p_date"?: string,"p_diametre_mm"?: number,"p_fournisseur"?: string,"p_grammage"?: number,"p_largeur_mm"?: number,"p_notes"?: string,"p_numero_lot": string,"p_plis"?: number,"p_poids_kg": number }; Returns: string
                           },
"receptionner_bobine_conteneur":
{ Args: { "p_article": string,"p_conteneur": string,"p_diametre_mm"?: number,"p_grammage"?: number,"p_largeur_mm"?: number,"p_numero_lot": string,"p_plis"?: number,"p_poids_kg": number }; Returns: string
                           },
"regler_facture_fournisseur":
{ Args: { "p_compte": string,"p_date"?: string,"p_facture": string,"p_montant_gnf": number,"p_reference"?: string }; Returns: string
                           },
"remettre_dotation":
{ Args: { "p_conditionnement": string,"p_dotation": string,"p_paquets": number }; Returns: undefined
                           },
"retirer_livraison":
{ Args: { "p_livraison": string }; Returns: undefined
                           },
"synchroniser_terrain":
{ Args: { "p_operations": Json }; Returns: Json
                           },
"taux_a_la_date":
{ Args: { "p_date": string,"p_devise": string }; Returns: number
                           },
"terminer_intervention":
{ Args: { "p_intervention": string }; Returns: undefined
                           },
"terminer_tournee":
{ Args: { "p_km": number,"p_tournee": string }; Returns: undefined
                           },
"tracer_fiche":
{ Args: { "p_fiche": string }; Returns: {
              "client_id": string,"client_nom": string,"conditionnement": string,"date_livraison": string,"livraison_id": string,"numero": string,"paquets": number
            }[]
                           },
"transformer_piece":
{ Args: { "p_piece": string,"p_type": Database["public"]['Enums']["type_piece"] }; Returns: string
                           },
"utilisateur_a_role":
{ Args: { "p_role": Database["public"]['Enums']["role_code"],"p_utilisateur": string }; Returns: boolean
                           },
"valider_avoir":
{ Args: { "p_avoir": string,"p_retour_stock"?: boolean }; Returns: string
                           },
"valider_controle":
{ Args: { "p_controle": string }; Returns: string
                           },
"valider_fiche_production":
{ Args: { "p_fiche": string }; Returns: number
                           },
"valider_inventaire":
{ Args: { "p_inventaire": string }; Returns: number
                           },
"valider_livraison":
{ Args: { "p_livraison": string }; Returns: string
                           },
"valider_piece":
{ Args: { "p_piece": string }; Returns: string
                           },
"virement_interne":
{ Args: { "p_date"?: string,"p_de": string,"p_libelle"?: string,"p_montant_gnf": number,"p_vers": string }; Returns: string
                           }
          }
          Enums: {
            "famille_article": "matiere_premiere"|"emballage"|"produit_fini"|"piece_detachee"|"autre","role_code": "direction"|"achats"|"magasin"|"production"|"maintenance"|"qualite"|"commercial_terrain"|"responsable_commercial"|"logistique"|"finance"|"admin","statut_bc": "brouillon"|"envoye"|"recu"|"annule","statut_conteneur": "commande"|"en_mer"|"au_port"|"dedouane"|"livre","statut_demande": "soumise"|"approuvee"|"refusee"|"commandee","statut_fiche": "brouillon"|"validee","statut_inventaire": "en_cours"|"valide"|"annule","statut_lot": "disponible"|"bloque"|"epuise","statut_of": "planifie"|"en_cours"|"termine"|"annule","statut_piece": "brouillon"|"valide"|"annule","type_mouvement": "reception"|"production"|"retour"|"consommation"|"sortie"|"vente"|"dotation"|"rebut"|"ajustement"|"inventaire","type_piece": "devis"|"commande"|"facture"|"avoir","unite_stock": "kg"|"paquet"|"unite"|"rouleau"|"litre"|"metre"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "famille_article": ["matiere_premiere", "emballage", "produit_fini", "piece_detachee", "autre"],"role_code": ["direction", "achats", "magasin", "production", "maintenance", "qualite", "commercial_terrain", "responsable_commercial", "logistique", "finance", "admin"],"statut_bc": ["brouillon", "envoye", "recu", "annule"],"statut_conteneur": ["commande", "en_mer", "au_port", "dedouane", "livre"],"statut_demande": ["soumise", "approuvee", "refusee", "commandee"],"statut_fiche": ["brouillon", "validee"],"statut_inventaire": ["en_cours", "valide", "annule"],"statut_lot": ["disponible", "bloque", "epuise"],"statut_of": ["planifie", "en_cours", "termine", "annule"],"statut_piece": ["brouillon", "valide", "annule"],"type_mouvement": ["reception", "production", "retour", "consommation", "sortie", "vente", "dotation", "rebut", "ajustement", "inventaire"],"type_piece": ["devis", "commande", "facture", "avoir"],"unite_stock": ["kg", "paquet", "unite", "rouleau", "litre", "metre"]
          }
        }
} as const
