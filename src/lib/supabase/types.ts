
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
            "articles": {
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
    }
                  ]
                },"fiches_production": {
                  Row: {
                    "chef_id": string | null,"cout_matiere_gnf": number | null,"created_at": string,"date_production": string,"duree_poste_min": number,"equipe_id": string | null,"id": string,"ligne_id": string,"notes": string,"of_id": string | null,"poste_id": string,"statut": Database["public"]['Enums']["statut_fiche"],"updated_at": string,"validee_le": string | null,"validee_par": string | null
                  }
                  Insert: {
                    "chef_id"?: string | null,"cout_matiere_gnf"?: number | null,"created_at"?: string,"date_production"?: string,"duree_poste_min"?: number,"equipe_id"?: string | null,"id"?: string,"ligne_id": string,"notes"?: string,"of_id"?: string | null,"poste_id": string,"statut"?: Database["public"]['Enums']["statut_fiche"],"updated_at"?: string,"validee_le"?: string | null,"validee_par"?: string | null
                  }
                  Update: {
                    "chef_id"?: string | null,"cout_matiere_gnf"?: number | null,"created_at"?: string,"date_production"?: string,"duree_poste_min"?: number,"equipe_id"?: string | null,"id"?: string,"ligne_id"?: string,"notes"?: string,"of_id"?: string | null,"poste_id"?: string,"statut"?: Database["public"]['Enums']["statut_fiche"],"updated_at"?: string,"validee_le"?: string | null,"validee_par"?: string | null
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
                    "actif": boolean,"contact": string,"created_at": string,"email": string,"id": string,"nom": string,"notes": string,"pays": string,"telephone": string,"updated_at": string
                  }
                  Insert: {
                    "actif"?: boolean,"contact"?: string,"created_at"?: string,"email"?: string,"id"?: string,"nom": string,"notes"?: string,"pays"?: string,"telephone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "actif"?: boolean,"contact"?: string,"created_at"?: string,"email"?: string,"id"?: string,"nom"?: string,"notes"?: string,"pays"?: string,"telephone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
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
                },"lots": {
                  Row: {
                    "article_id": string,"cout_kg_gnf": number,"created_at": string,"date_reception": string,"diametre_mm": number | null,"fournisseur_id": string | null,"grammage_g_m2": number | null,"id": string,"largeur_mm": number | null,"notes": string,"numero_lot": string,"plis": number | null,"poids_net_kg": number,"statut": Database["public"]['Enums']["statut_lot"],"updated_at": string
                  }
                  Insert: {
                    "article_id": string,"cout_kg_gnf"?: number,"created_at"?: string,"date_reception"?: string,"diametre_mm"?: number | null,"fournisseur_id"?: string | null,"grammage_g_m2"?: number | null,"id"?: string,"largeur_mm"?: number | null,"notes"?: string,"numero_lot": string,"plis"?: number | null,"poids_net_kg": number,"statut"?: Database["public"]['Enums']["statut_lot"],"updated_at"?: string
                  }
                  Update: {
                    "article_id"?: string,"cout_kg_gnf"?: number,"created_at"?: string,"date_reception"?: string,"diametre_mm"?: number | null,"fournisseur_id"?: string | null,"grammage_g_m2"?: number | null,"id"?: string,"largeur_mm"?: number | null,"notes"?: string,"numero_lot"?: string,"plis"?: number | null,"poids_net_kg"?: number,"statut"?: Database["public"]['Enums']["statut_lot"],"updated_at"?: string
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
      foreignKeyName: "lots_fournisseur_id_fkey"
      columns: ["fournisseur_id"]
isOneToOne: false
      referencedRelation: "fournisseurs"
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
                    "actif": boolean,"created_at": string,"id": string,"identifiant": string,"nom": string,"prenom": string,"telephone": string | null,"updated_at": string
                  }
                  Insert: {
                    "actif"?: boolean,"created_at"?: string,"id": string,"identifiant": string,"nom": string,"prenom"?: string,"telephone"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "actif"?: boolean,"created_at"?: string,"id"?: string,"identifiant"?: string,"nom"?: string,"prenom"?: string,"telephone"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
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
"aujourdhui_conakry":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"creer_produit":
{ Args: { "p_code": string,"p_date_prix"?: string,"p_grammage": number,"p_largeur_mm": number,"p_libelle": string,"p_longueur_mm": number,"p_nb_mouchoirs": number,"p_paquets_par_colis": number,"p_plis": number,"p_prix_paquet_gnf"?: number,"p_taux_perte": number }; Returns: string
                           },
"definir_prix":
{ Args: { "p_date_debut": string,"p_niveau": string,"p_note"?: string,"p_prix_paquet_gnf": number,"p_produit": string }; Returns: string
                           },
"est_actif":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"est_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"hook_jeton_acces":
{ Args: { "event": Json }; Returns: Json
                           },
"mes_roles":
{ Args: Record<PropertyKey, never>; Returns: (Database["public"]['Enums']["role_code"])[]
                           },
"ouvrir_inventaire":
{ Args: { "p_famille"?: Database["public"]['Enums']["famille_article"],"p_libelle": string }; Returns: string
                           },
"prix_en_vigueur":
{ Args: { "p_date"?: string,"p_niveau": string,"p_produit": string }; Returns: number
                           },
"receptionner_bobine":
{ Args: { "p_article": string,"p_cout_kg_gnf": number,"p_date"?: string,"p_diametre_mm"?: number,"p_fournisseur"?: string,"p_grammage"?: number,"p_largeur_mm"?: number,"p_notes"?: string,"p_numero_lot": string,"p_plis"?: number,"p_poids_kg": number }; Returns: string
                           },
"taux_a_la_date":
{ Args: { "p_date": string,"p_devise": string }; Returns: number
                           },
"valider_fiche_production":
{ Args: { "p_fiche": string }; Returns: number
                           },
"valider_inventaire":
{ Args: { "p_inventaire": string }; Returns: number
                           }
          }
          Enums: {
            "famille_article": "matiere_premiere"|"emballage"|"produit_fini"|"piece_detachee"|"autre","role_code": "direction"|"achats"|"magasin"|"production"|"maintenance"|"qualite"|"commercial_terrain"|"responsable_commercial"|"logistique"|"finance"|"admin","statut_fiche": "brouillon"|"validee","statut_inventaire": "en_cours"|"valide"|"annule","statut_lot": "disponible"|"bloque"|"epuise","statut_of": "planifie"|"en_cours"|"termine"|"annule","type_mouvement": "reception"|"production"|"retour"|"consommation"|"sortie"|"vente"|"dotation"|"rebut"|"ajustement"|"inventaire","unite_stock": "kg"|"paquet"|"unite"|"rouleau"|"litre"|"metre"
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
            "famille_article": ["matiere_premiere", "emballage", "produit_fini", "piece_detachee", "autre"],"role_code": ["direction", "achats", "magasin", "production", "maintenance", "qualite", "commercial_terrain", "responsable_commercial", "logistique", "finance", "admin"],"statut_fiche": ["brouillon", "validee"],"statut_inventaire": ["en_cours", "valide", "annule"],"statut_lot": ["disponible", "bloque", "epuise"],"statut_of": ["planifie", "en_cours", "termine", "annule"],"type_mouvement": ["reception", "production", "retour", "consommation", "sortie", "vente", "dotation", "rebut", "ajustement", "inventaire"],"unite_stock": ["kg", "paquet", "unite", "rouleau", "litre", "metre"]
          }
        }
} as const
