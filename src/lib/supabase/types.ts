
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
            "communes": {
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
                },"grille_prix": {
                  Row: {
                    "created_at": string,"created_by": string | null,"date_debut": string,"date_fin": string | null,"id": string,"niveau": Database["public"]['Enums']["niveau_prix"],"note": string | null,"prix_paquet_gnf": number,"produit_id": string
                  }
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"date_debut": string,"date_fin"?: string | null,"id"?: string,"niveau": Database["public"]['Enums']["niveau_prix"],"note"?: string | null,"prix_paquet_gnf": number,"produit_id": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"date_debut"?: string,"date_fin"?: string | null,"id"?: string,"niveau"?: Database["public"]['Enums']["niveau_prix"],"note"?: string | null,"prix_paquet_gnf"?: number,"produit_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "grille_prix_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profils"
      referencedColumns: ["id"]
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
            "prix_actuels": {
                  Row: {
                    "conditionnement_id": string | null,"conditionnement_libelle": string | null,"date_debut": string | null,"niveau": Database["public"]['Enums']["niveau_prix"] | null,"paquets_par_colis": number | null,"prix_colis_gnf": number | null,"prix_paquet_gnf": number | null,"produit_code": string | null,"produit_id": string | null,"produit_libelle": string | null
                  }
                  Relationships: [
                    
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
"definir_prix":
{ Args: { "p_date_debut": string,"p_niveau": Database["public"]['Enums']["niveau_prix"],"p_note"?: string,"p_prix_paquet_gnf": number,"p_produit": string }; Returns: string
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
"prix_en_vigueur":
{ Args: { "p_date"?: string,"p_niveau": Database["public"]['Enums']["niveau_prix"],"p_produit": string }; Returns: number
                           },
"taux_a_la_date":
{ Args: { "p_date": string,"p_devise": string }; Returns: number
                           }
          }
          Enums: {
            "niveau_prix": "papel"|"grossiste"|"semi_grossiste"|"detaillant","role_code": "direction"|"achats"|"magasin"|"production"|"maintenance"|"qualite"|"commercial_terrain"|"responsable_commercial"|"logistique"|"finance"|"admin"
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
            "niveau_prix": ["papel", "grossiste", "semi_grossiste", "detaillant"],"role_code": ["direction", "achats", "magasin", "production", "maintenance", "qualite", "commercial_terrain", "responsable_commercial", "logistique", "finance", "admin"]
          }
        }
} as const
