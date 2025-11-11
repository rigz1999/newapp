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
          org_id: string
          user_id: string
          role: 'member' | 'admin'
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          user_id: string
          role?: 'member' | 'admin'
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          user_id?: string
          role?: 'member' | 'admin'
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
      invitations: {
        Row: {
          id: string
          email: string
          first_name: string
          last_name: string
          org_id: string
          role: 'member' | 'admin'
          invited_by: string
          token: string
          status: 'pending' | 'accepted' | 'expired'
          expires_at: string
          created_at: string
          accepted_at: string | null
        }
        Insert: {
          id?: string
          email: string
          first_name: string
          last_name: string
          org_id: string
          role?: 'member' | 'admin'
          invited_by: string
          token: string
          status?: 'pending' | 'accepted' | 'expired'
          expires_at: string
          created_at?: string
          accepted_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          first_name?: string
          last_name?: string
          org_id?: string
          role?: 'member' | 'admin'
          invited_by?: string
          token?: string
          status?: 'pending' | 'accepted' | 'expired'
          expires_at?: string
          created_at?: string
          accepted_at?: string | null
        }
      }
      projets: {
        Row: {
          id: string
          org_id: string | null
          projet: string
          emetteur: string | null
          siren_emetteur: number | null
          nom_representant: string | null
          prenom_representant: string | null
          email_representant: string | null
          representant_masse: string | null
          email_rep_masse: string | null
          telephone_rep_masse: number | null
          taux_interet: number | null
          montant_global_eur: number | null
          maturite_mois: number | null
          base_interet: number | null
          type: 'obligations_simples' | 'obligations_convertibles'
          taux_nominal: number | null
          periodicite_coupons: string | null
          date_emission: string | null
          duree_mois: number | null
          montant_global: number | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id?: string | null
          projet: string
          emetteur?: string | null
          siren_emetteur?: number | null
          nom_representant?: string | null
          prenom_representant?: string | null
          email_representant?: string | null
          representant_masse?: string | null
          email_rep_masse?: string | null
          telephone_rep_masse?: number | null
          taux_interet?: number | null
          montant_global_eur?: number | null
          maturite_mois?: number | null
          base_interet?: number | null
          type?: 'obligations_simples' | 'obligations_convertibles'
          taux_nominal?: number | null
          periodicite_coupons?: string | null
          date_emission?: string | null
          duree_mois?: number | null
          montant_global?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string | null
          projet?: string
          emetteur?: string | null
          siren_emetteur?: number | null
          nom_representant?: string | null
          prenom_representant?: string | null
          email_representant?: string | null
          representant_masse?: string | null
          email_rep_masse?: string | null
          telephone_rep_masse?: number | null
          taux_interet?: number | null
          montant_global_eur?: number | null
          maturite_mois?: number | null
          base_interet?: number | null
          type?: 'obligations_simples' | 'obligations_convertibles'
          taux_nominal?: number | null
          periodicite_coupons?: string | null
          date_emission?: string | null
          duree_mois?: number | null
          montant_global?: number | null
          created_at?: string
        }
      }
      tranches: {
        Row: {
          id: string
          projet_id: string
          tranche_name: string
          frequence: 'annuel' | 'semestriel' | 'trimestriel'
          taux_nominal: number | null
          taux_interet: number
          maturite_mois: number
          date_emission: string | null
          date_echeance_finale: string | null
          cgp_nom: string | null
          cgp_email: string | null
          transfert_fonds_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          projet_id: string
          tranche_name: string
          frequence: 'annuel' | 'semestriel' | 'trimestriel'
          taux_nominal?: number | null
          taux_interet: number
          maturite_mois: number
          date_emission?: string | null
          date_echeance_finale?: string | null
          cgp_nom?: string | null
          cgp_email?: string | null
          transfert_fonds_date?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          projet_id?: string
          tranche_name?: string
          frequence?: 'annuel' | 'semestriel' | 'trimestriel'
          taux_nominal?: number | null
          taux_interet?: number
          maturite_mois?: number
          date_emission?: string | null
          date_echeance_finale?: string | null
          cgp_nom?: string | null
          cgp_email?: string | null
          transfert_fonds_date?: string | null
          created_at?: string
        }
      }
      investisseurs: {
        Row: {
          id: string
          org_id: string
          type: 'physique' | 'morale'
          nom_raison_sociale: string
          prenom: string | null
          representant_legal: string | null
          nom_jeune_fille: string | null
          departement_naissance: string | null
          siren: string | null
          adresse: string | null
          email: string | null
          telephone: string | null
          residence_fiscale: string | null
          cgp_nom: string | null
          cgp_email: string | null
          rib_file_path: string | null
          rib_uploaded_at: string | null
          rib_status: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          type: 'physique' | 'morale'
          nom_raison_sociale: string
          prenom?: string | null
          representant_legal?: string | null
          nom_jeune_fille?: string | null
          departement_naissance?: string | null
          siren?: string | null
          adresse?: string | null
          email?: string | null
          telephone?: string | null
          residence_fiscale?: string | null
          cgp_nom?: string | null
          cgp_email?: string | null
          rib_file_path?: string | null
          rib_uploaded_at?: string | null
          rib_status?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          type?: 'physique' | 'morale'
          nom_raison_sociale?: string
          prenom?: string | null
          representant_legal?: string | null
          nom_jeune_fille?: string | null
          departement_naissance?: string | null
          siren?: string | null
          adresse?: string | null
          email?: string | null
          telephone?: string | null
          residence_fiscale?: string | null
          cgp_nom?: string | null
          cgp_email?: string | null
          rib_file_path?: string | null
          rib_uploaded_at?: string | null
          rib_status?: string | null
          created_at?: string
        }
      }
      souscriptions: {
        Row: {
          id: string
          tranche_id: string
          investisseur_id: string
          id_souscription: string | null
          date_souscription: string
          nombre_obligations: number
          montant_investi: number
          coupon_brut: number
          coupon_net: number
          prochaine_date_coupon: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tranche_id: string
          investisseur_id: string
          id_souscription?: string | null
          date_souscription: string
          nombre_obligations: number
          montant_investi: number
          coupon_brut?: number
          coupon_net?: number
          prochaine_date_coupon?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tranche_id?: string
          investisseur_id?: string
          id_souscription?: string | null
          date_souscription?: string
          nombre_obligations?: number
          montant_investi?: number
          coupon_brut?: number
          coupon_net?: number
          prochaine_date_coupon?: string | null
          created_at?: string
        }
      }
      paiements: {
        Row: {
          id: string
          id_paiement: string
          type: string
          projet_id: string
          tranche_id: string
          investisseur_id: string
          souscription_id: string
          montant: number
          date_paiement: string
          statut_paiement: string | null
          created_at: string
        }
        Insert: {
          id?: string
          id_paiement: string
          type: string
          projet_id: string
          tranche_id: string
          investisseur_id: string
          souscription_id: string
          montant: number
          date_paiement: string
          statut_paiement?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          id_paiement?: string
          type?: string
          projet_id?: string
          tranche_id?: string
          investisseur_id?: string
          souscription_id?: string
          montant?: number
          date_paiement?: string
          statut_paiement?: string | null
          created_at?: string
        }
      }
      coupons_echeances: {
        Row: {
          id: string
          souscription_id: string
          date_echeance: string
          montant_coupon: number
          statut: string
          date_paiement: string | null
          montant_paye: number | null
          paiement_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          souscription_id: string
          date_echeance: string
          montant_coupon: number
          statut?: string
          date_paiement?: string | null
          montant_paye?: number | null
          paiement_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          souscription_id?: string
          date_echeance?: string
          montant_coupon?: number
          statut?: string
          date_paiement?: string | null
          montant_paye?: number | null
          paiement_id?: string | null
          created_at?: string
          updated_at?: string
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
          validated_at: string | null
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
          validated_at?: string | null
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
          validated_at?: string | null
          created_at?: string
        }
      }
      reminder_settings: {
        Row: {
          id: string
          user_id: string
          enabled: boolean
          remind_7_days: boolean
          remind_14_days: boolean
          remind_30_days: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          enabled?: boolean
          remind_7_days?: boolean
          remind_14_days?: boolean
          remind_30_days?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          enabled?: boolean
          remind_7_days?: boolean
          remind_14_days?: boolean
          remind_30_days?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}
