export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// Tax regime types for investor tax calculation
export type TaxRegime = 'default' | 'pea' | 'assurance_vie' | 'custom';

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
      };
      memberships: {
        Row: {
          id: string;
          org_id: string;
          user_id: string;
          role: 'member' | 'admin' | 'emetteur';
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          user_id: string;
          role?: 'member' | 'admin' | 'emetteur';
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          user_id?: string;
          role?: 'member' | 'admin' | 'emetteur';
          created_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          updated_at?: string;
        };
      };
      invitations: {
        Row: {
          id: string;
          email: string;
          first_name: string;
          last_name: string;
          org_id: string;
          role: 'member' | 'admin' | 'emetteur';
          invited_by: string;
          token: string;
          status: 'pending' | 'accepted' | 'expired';
          expires_at: string;
          created_at: string;
          accepted_at: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          first_name: string;
          last_name: string;
          org_id: string;
          role?: 'member' | 'admin' | 'emetteur';
          invited_by: string;
          token: string;
          status?: 'pending' | 'accepted' | 'expired';
          expires_at: string;
          created_at?: string;
          accepted_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          first_name?: string;
          last_name?: string;
          org_id?: string;
          role?: 'member' | 'admin' | 'emetteur';
          invited_by?: string;
          token?: string;
          status?: 'pending' | 'accepted' | 'expired';
          expires_at?: string;
          created_at?: string;
          accepted_at?: string | null;
        };
      };
      emetteur_projects: {
        Row: {
          id: string;
          org_id: string;
          projet_id: string;
          user_id: string;
          emetteur_name: string;
          assigned_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          projet_id: string;
          user_id: string;
          emetteur_name: string;
          assigned_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          projet_id?: string;
          user_id?: string;
          emetteur_name?: string;
          assigned_by?: string | null;
          updated_at?: string;
        };
      };
      projets: {
        Row: {
          id: string;
          org_id: string | null;
          projet: string;
          emetteur: string | null;
          siren_emetteur: number | null;
          nom_representant: string | null;
          prenom_representant: string | null;
          email_representant: string | null;
          representant_masse: string | null;
          email_rep_masse: string | null;
          telephone_rep_masse: number | null;
          taux_interet: number | null;
          montant_global_eur: number | null;
          maturite_mois: number | null;
          base_interet: number | null;
          type: 'obligations_simples' | 'obligations_convertibles';
          taux_nominal: number | null;
          periodicite_coupons: string | null;
          date_emission: string | null;
          duree_mois: number | null;
          montant_global: number | null;
          apply_flat_tax: boolean | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id?: string | null;
          projet: string;
          emetteur?: string | null;
          siren_emetteur?: number | null;
          nom_representant?: string | null;
          prenom_representant?: string | null;
          email_representant?: string | null;
          representant_masse?: string | null;
          email_rep_masse?: string | null;
          telephone_rep_masse?: number | null;
          taux_interet?: number | null;
          montant_global_eur?: number | null;
          maturite_mois?: number | null;
          base_interet?: number | null;
          type?: 'obligations_simples' | 'obligations_convertibles';
          taux_nominal?: number | null;
          periodicite_coupons?: string | null;
          date_emission?: string | null;
          duree_mois?: number | null;
          montant_global?: number | null;
          apply_flat_tax?: boolean | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string | null;
          projet?: string;
          emetteur?: string | null;
          siren_emetteur?: number | null;
          nom_representant?: string | null;
          prenom_representant?: string | null;
          email_representant?: string | null;
          representant_masse?: string | null;
          email_rep_masse?: string | null;
          telephone_rep_masse?: number | null;
          taux_interet?: number | null;
          montant_global_eur?: number | null;
          maturite_mois?: number | null;
          base_interet?: number | null;
          type?: 'obligations_simples' | 'obligations_convertibles';
          taux_nominal?: number | null;
          periodicite_coupons?: string | null;
          date_emission?: string | null;
          duree_mois?: number | null;
          montant_global?: number | null;
          apply_flat_tax?: boolean | null;
          created_at?: string;
        };
      };
      tranches: {
        Row: {
          id: string;
          projet_id: string;
          tranche_name: string;
          frequence: 'annuel' | 'semestriel' | 'trimestriel';
          taux_nominal: number | null;
          taux_interet: number;
          maturite_mois: number;
          date_emission: string | null;
          date_echeance_finale: string | null;
          cgp_nom: string | null;
          cgp_email: string | null;
          transfert_fonds_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          projet_id: string;
          tranche_name: string;
          frequence: 'annuel' | 'semestriel' | 'trimestriel';
          taux_nominal?: number | null;
          taux_interet: number;
          maturite_mois: number;
          date_emission?: string | null;
          date_echeance_finale?: string | null;
          cgp_nom?: string | null;
          cgp_email?: string | null;
          transfert_fonds_date?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          projet_id?: string;
          tranche_name?: string;
          frequence?: 'annuel' | 'semestriel' | 'trimestriel';
          taux_nominal?: number | null;
          taux_interet?: number;
          maturite_mois?: number;
          date_emission?: string | null;
          date_echeance_finale?: string | null;
          cgp_nom?: string | null;
          cgp_email?: string | null;
          transfert_fonds_date?: string | null;
          created_at?: string;
        };
      };
      investisseurs: {
        Row: {
          id: string;
          org_id: string;
          type: 'physique' | 'morale';
          nom_raison_sociale: string;
          prenom: string | null;
          representant_legal: string | null;
          nom_jeune_fille: string | null;
          departement_naissance: string | null;
          siren: string | null;
          adresse: string | null;
          email: string | null;
          telephone: string | null;
          residence_fiscale: string | null;
          cgp_nom: string | null;
          cgp_email: string | null;
          rib_file_path: string | null;
          rib_uploaded_at: string | null;
          rib_status: string | null;
          tax_regime: string | null;
          custom_tax_rate: number | null;
          id_investisseur: string | null;
          cgp: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          type: 'physique' | 'morale';
          nom_raison_sociale: string;
          prenom?: string | null;
          representant_legal?: string | null;
          nom_jeune_fille?: string | null;
          departement_naissance?: string | null;
          siren?: string | null;
          adresse?: string | null;
          email?: string | null;
          telephone?: string | null;
          residence_fiscale?: string | null;
          cgp_nom?: string | null;
          cgp_email?: string | null;
          rib_file_path?: string | null;
          rib_uploaded_at?: string | null;
          rib_status?: string | null;
          tax_regime?: string | null;
          custom_tax_rate?: number | null;
          id_investisseur?: string | null;
          cgp?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          type?: 'physique' | 'morale';
          nom_raison_sociale?: string;
          prenom?: string | null;
          representant_legal?: string | null;
          nom_jeune_fille?: string | null;
          departement_naissance?: string | null;
          siren?: string | null;
          adresse?: string | null;
          email?: string | null;
          telephone?: string | null;
          residence_fiscale?: string | null;
          cgp_nom?: string | null;
          cgp_email?: string | null;
          rib_file_path?: string | null;
          rib_uploaded_at?: string | null;
          rib_status?: string | null;
          tax_regime?: string | null;
          custom_tax_rate?: number | null;
          id_investisseur?: string | null;
          cgp?: string | null;
          created_at?: string;
        };
      };
      souscriptions: {
        Row: {
          id: string;
          tranche_id: string;
          investisseur_id: string;
          id_souscription: string | null;
          date_souscription: string;
          nombre_obligations: number;
          montant_investi: number;
          coupon_brut: number;
          coupon_net: number;
          prochaine_date_coupon: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tranche_id: string;
          investisseur_id: string;
          id_souscription?: string | null;
          date_souscription: string;
          nombre_obligations: number;
          montant_investi: number;
          coupon_brut?: number;
          coupon_net?: number;
          prochaine_date_coupon?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tranche_id?: string;
          investisseur_id?: string;
          id_souscription?: string | null;
          date_souscription?: string;
          nombre_obligations?: number;
          montant_investi?: number;
          coupon_brut?: number;
          coupon_net?: number;
          prochaine_date_coupon?: string | null;
          created_at?: string;
        };
      };
      paiements: {
        Row: {
          id: string;
          id_paiement: string;
          type: string;
          projet_id: string;
          tranche_id: string;
          investisseur_id: string;
          souscription_id: string;
          montant: number;
          date_paiement: string;
          statut_paiement: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          id_paiement: string;
          type: string;
          projet_id: string;
          tranche_id: string;
          investisseur_id: string;
          souscription_id: string;
          montant: number;
          date_paiement: string;
          statut_paiement?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          id_paiement?: string;
          type?: string;
          projet_id?: string;
          tranche_id?: string;
          investisseur_id?: string;
          souscription_id?: string;
          montant?: number;
          date_paiement?: string;
          statut_paiement?: string | null;
          created_at?: string;
        };
      };
      coupons_echeances: {
        Row: {
          id: string;
          souscription_id: string;
          date_echeance: string;
          montant_coupon: number;
          statut: string;
          date_paiement: string | null;
          montant_paye: number | null;
          paiement_id: string | null;
          echeance_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          souscription_id: string;
          date_echeance: string;
          montant_coupon: number;
          statut?: string;
          date_paiement?: string | null;
          montant_paye?: number | null;
          paiement_id?: string | null;
          echeance_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          souscription_id?: string;
          date_echeance?: string;
          montant_coupon?: number;
          statut?: string;
          date_paiement?: string | null;
          montant_paye?: number | null;
          paiement_id?: string | null;
          echeance_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      payment_proofs: {
        Row: {
          id: string;
          paiement_id: string;
          file_url: string;
          file_name: string;
          file_size: number | null;
          extracted_data: Json | null;
          confidence: number | null;
          validated_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          paiement_id: string;
          file_url: string;
          file_name: string;
          file_size?: number | null;
          extracted_data?: Json | null;
          confidence?: number | null;
          validated_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          paiement_id?: string;
          file_url?: string;
          file_name?: string;
          file_size?: number | null;
          extracted_data?: Json | null;
          confidence?: number | null;
          validated_at?: string | null;
          created_at?: string;
        };
      };
      reminder_settings: {
        Row: {
          id: string;
          user_id: string;
          enabled: boolean;
          remind_7_days: boolean;
          remind_14_days: boolean;
          remind_30_days: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          enabled?: boolean;
          remind_7_days?: boolean;
          remind_14_days?: boolean;
          remind_30_days?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          enabled?: boolean;
          remind_7_days?: boolean;
          remind_14_days?: boolean;
          remind_30_days?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_reminder_settings: {
        Row: {
          id: string;
          user_id: string;
          enabled: boolean;
          remind_7_days: boolean;
          remind_14_days: boolean;
          remind_30_days: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          enabled?: boolean;
          remind_7_days?: boolean;
          remind_14_days?: boolean;
          remind_30_days?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          enabled?: boolean;
          remind_7_days?: boolean;
          remind_14_days?: boolean;
          remind_30_days?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_email_connections: {
        Row: {
          id: string;
          user_id: string;
          provider: string;
          email_address: string;
          access_token: string;
          refresh_token: string | null;
          token_expires_at: string | null;
          scope: string | null;
          token_type: string;
          connected_at: string;
          last_used_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          provider: string;
          email_address: string;
          access_token: string;
          refresh_token?: string | null;
          token_expires_at?: string | null;
          scope?: string | null;
          token_type?: string;
          connected_at?: string;
          last_used_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          provider?: string;
          email_address?: string;
          access_token?: string;
          refresh_token?: string | null;
          token_expires_at?: string | null;
          scope?: string | null;
          token_type?: string;
          connected_at?: string;
          last_used_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      project_comments: {
        Row: {
          id: string;
          projet_id: string;
          user_id: string | null;
          org_id: string;
          comment_text: string;
          attachments: Json;
          created_at: string;
          updated_at: string;
          is_edited: boolean;
        };
        Insert: {
          id?: string;
          projet_id: string;
          user_id?: string | null;
          org_id: string;
          comment_text: string;
          attachments?: Json;
          created_at?: string;
          updated_at?: string;
          is_edited?: boolean;
        };
        Update: {
          id?: string;
          projet_id?: string;
          user_id?: string | null;
          org_id?: string;
          comment_text?: string;
          attachments?: Json;
          created_at?: string;
          updated_at?: string;
          is_edited?: boolean;
        };
      };
      calendar_exports: {
        Row: {
          id: string;
          user_id: string;
          project_id: string | null;
          tranche_id: string | null;
          exported_at: string;
          echeances_snapshot: Json;
          is_outdated: boolean;
          export_settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          project_id?: string | null;
          tranche_id?: string | null;
          exported_at?: string;
          echeances_snapshot?: Json;
          is_outdated?: boolean;
          export_settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          project_id?: string | null;
          tranche_id?: string | null;
          exported_at?: string;
          echeances_snapshot?: Json;
          is_outdated?: boolean;
          export_settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      company_format_profiles: {
        Row: {
          id: string;
          company_id: string | null;
          profile_name: string;
          is_standard: boolean;
          format_config: Json;
          is_active: boolean;
          version: number;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          profile_name: string;
          is_standard?: boolean;
          format_config?: Json;
          is_active?: boolean;
          version?: number;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string | null;
          profile_name?: string;
          is_standard?: boolean;
          format_config?: Json;
          is_active?: boolean;
          version?: number;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      coupons_optimized: {
        Row: {
          id: string;
          souscription_id: string;
          date_echeance: string;
          montant_coupon: number;
          statut: string;
          date_paiement: string | null;
          montant_paye: number | null;
          investisseur_id: string;
          investisseur_nom: string;
          investisseur_id_display: string | null;
          investisseur_type: string;
          investisseur_email: string | null;
          investisseur_cgp: string | null;
          org_id: string;
          has_rib: boolean;
          projet_id: string;
          projet_nom: string;
          tranche_id: string;
          tranche_nom: string;
          montant_net: number;
          statut_calculated: string;
          jours_restants: number;
          view_updated_at: string;
        };
      };
      v_prochains_coupons: {
        Row: {
          souscription_id: string;
          date_prochain_coupon: string;
          montant_prochain_coupon: number;
          statut: string;
        };
      };
      coupons: {
        Row: {
          id: string;
          souscription_id: string;
          date_echeance: string;
          montant_coupon: number;
          statut: string;
          date_paiement: string | null;
          montant_paye: number | null;
          paiement_id: string | null;
          created_at: string;
          updated_at: string;
        };
      };
    };
    Functions: {
      check_super_admin_status: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      get_org_emetteurs: {
        Args: {
          org_uuid: string;
        };
        Returns: {
          id: string;
          user_id: string;
          emetteur_name: string;
          email: string;
        }[];
      };
    };
    Enums: {};
  };
}
