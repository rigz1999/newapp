export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
      }
      memberships: {
        Row: {
          id: string
          org_id: string | null
          user_id: string
          role: 'owner' | 'admin' | 'member' | 'super_admin'
          created_at: string
        }
        Insert: {
          id?: string
          org_id?: string | null
          user_id: string
          role?: 'owner' | 'admin' | 'member' | 'super_admin'
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string | null
          user_id?: string
          role?: 'owner' | 'admin' | 'member' | 'super_admin'
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          org_id: string
          project_name: string
          emetteur: string
          representant_masse: string | null
          rep_masse_email: string | null
          rep_masse_tel: string | null
          manager_email: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          project_name: string
          emetteur: string
          representant_masse?: string | null
          rep_masse_email?: string | null
          rep_masse_tel?: string | null
          manager_email?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          project_name?: string
          emetteur?: string
          representant_masse?: string | null
          rep_masse_email?: string | null
          rep_masse_tel?: string | null
          manager_email?: string | null
          created_at?: string
        }
      }
      tranches: {
        Row: {
          id: string
          project_id: string
          tranche_name: string
          frequence: 'annuel' | 'semestriel' | 'trimestriel'
          taux_interet: number
          maturite_mois: number
          date_emission: string | null
          date_echeance: string | null
          cgp_nom: string | null
          cgp_email: string | null
          transfert_fonds_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          tranche_name: string
          frequence: 'annuel' | 'semestriel' | 'trimestriel'
          taux_interet: number
          maturite_mois: number
          date_emission?: string | null
          date_echeance?: string | null
          cgp_nom?: string | null
          cgp_email?: string | null
          transfert_fonds_date?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          tranche_name?: string
          frequence?: 'annuel' | 'semestriel' | 'trimestriel'
          taux_interet?: number
          maturite_mois?: number
          date_emission?: string | null
          date_echeance?: string | null
          cgp_nom?: string | null
          cgp_email?: string | null
          transfert_fonds_date?: string | null
          created_at?: string
        }
      }
      investors: {
        Row: {
          id: string
          org_id: string
          investor_type: 'physique' | 'morale'
          investisseur_nom: string | null
          raison_sociale: string | null
          representant_legal: string | null
          nom_jeune_fille: string | null
          departement_naissance: string | null
          siren: string | null
          adresse: string | null
          email: string | null
          telephone: string | null
          residence_fiscale: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          investor_type: 'physique' | 'morale'
          investisseur_nom?: string | null
          raison_sociale?: string | null
          representant_legal?: string | null
          nom_jeune_fille?: string | null
          departement_naissance?: string | null
          siren?: string | null
          adresse?: string | null
          email?: string | null
          telephone?: string | null
          residence_fiscale?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          investor_type?: 'physique' | 'morale'
          investisseur_nom?: string | null
          raison_sociale?: string | null
          representant_legal?: string | null
          nom_jeune_fille?: string | null
          departement_naissance?: string | null
          siren?: string | null
          adresse?: string | null
          email?: string | null
          telephone?: string | null
          residence_fiscale?: string | null
          created_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          tranche_id: string
          investor_id: string
          date_souscription: string
          nbr_obligations: number
          montant_investi: number
          coupon_brut: number
          coupon_net: number
          prochaine_date_coupon: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tranche_id: string
          investor_id: string
          date_souscription: string
          nbr_obligations: number
          montant_investi: number
          coupon_brut?: number
          coupon_net?: number
          prochaine_date_coupon?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tranche_id?: string
          investor_id?: string
          date_souscription?: string
          nbr_obligations?: number
          montant_investi?: number
          coupon_brut?: number
          coupon_net?: number
          prochaine_date_coupon?: string | null
          created_at?: string
        }
      }
      payment_proofs: {
        Row: {
          id: string
          paiement_id: string
          file_url: string
          file_name: string
          file_size: number | null
          extracted_data: Json | null
          confidence: number | null
          validated_at: string
          created_at: string
        }
        Insert: {
          id?: string
          paiement_id: string
          file_url: string
          file_name: string
          file_size?: number | null
          extracted_data?: Json | null
          confidence?: number | null
          validated_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          paiement_id?: string
          file_url?: string
          file_name?: string
          file_size?: number | null
          extracted_data?: Json | null
          confidence?: number | null
          validated_at?: string
          created_at?: string
        }
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}