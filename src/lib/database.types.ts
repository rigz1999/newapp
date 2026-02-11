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
        Relationships: [];
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
        Relationships: [
          {
            foreignKeyName: 'memberships_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'memberships_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          is_superadmin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          is_superadmin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          is_superadmin?: boolean;
          updated_at?: string;
        };
        Relationships: [];
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
        Relationships: [
          {
            foreignKeyName: 'invitations_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: 'emetteur_projects_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'emetteur_projects_projet_id_fkey';
            columns: ['projet_id'];
            isOneToOne: false;
            referencedRelation: 'projets';
            referencedColumns: ['id'];
          },
        ];
      };
      projets: {
        Row: {
          id: string;
          short_id: string | null;
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
          prorogation_possible: boolean;
          duree_prorogation_mois: number | null;
          step_up_taux: number | null;
          prorogation_activee: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          short_id?: string | null;
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
          prorogation_possible?: boolean;
          duree_prorogation_mois?: number | null;
          step_up_taux?: number | null;
          prorogation_activee?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          short_id?: string | null;
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
          prorogation_possible?: boolean;
          duree_prorogation_mois?: number | null;
          step_up_taux?: number | null;
          prorogation_activee?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'projets_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      tranches: {
        Row: {
          id: string;
          short_id: string | null;
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
          periodicite_coupons: string | null;
          duree_mois: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          short_id?: string | null;
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
          periodicite_coupons?: string | null;
          duree_mois?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          short_id?: string | null;
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
          periodicite_coupons?: string | null;
          duree_mois?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tranches_projet_id_fkey';
            columns: ['projet_id'];
            isOneToOne: false;
            referencedRelation: 'projets';
            referencedColumns: ['id'];
          },
        ];
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
          archived: boolean;
          archived_at: string | null;
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
          archived?: boolean;
          archived_at?: string | null;
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
          archived?: boolean;
          archived_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'investisseurs_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: 'souscriptions_tranche_id_fkey';
            columns: ['tranche_id'];
            isOneToOne: false;
            referencedRelation: 'tranches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'souscriptions_investisseur_id_fkey';
            columns: ['investisseur_id'];
            isOneToOne: false;
            referencedRelation: 'investisseurs';
            referencedColumns: ['id'];
          },
        ];
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
          org_id: string;
          montant: number;
          date_paiement: string;
          statut: string | null;
          note: string | null;
          statut_paiement: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          id_paiement?: string;
          type: string;
          projet_id?: string;
          tranche_id: string;
          investisseur_id?: string;
          souscription_id?: string;
          org_id?: string;
          montant: number;
          date_paiement: string;
          statut?: string | null;
          note?: string | null;
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
          org_id?: string;
          montant?: number;
          date_paiement?: string;
          statut?: string | null;
          note?: string | null;
          statut_paiement?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'paiements_projet_id_fkey';
            columns: ['projet_id'];
            isOneToOne: false;
            referencedRelation: 'projets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'paiements_tranche_id_fkey';
            columns: ['tranche_id'];
            isOneToOne: false;
            referencedRelation: 'tranches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'paiements_investisseur_id_fkey';
            columns: ['investisseur_id'];
            isOneToOne: false;
            referencedRelation: 'investisseurs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'paiements_souscription_id_fkey';
            columns: ['souscription_id'];
            isOneToOne: false;
            referencedRelation: 'souscriptions';
            referencedColumns: ['id'];
          },
        ];
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
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'coupons_echeances_souscription_id_fkey';
            columns: ['souscription_id'];
            isOneToOne: false;
            referencedRelation: 'souscriptions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'coupons_echeances_paiement_id_fkey';
            columns: ['paiement_id'];
            isOneToOne: false;
            referencedRelation: 'paiements';
            referencedColumns: ['id'];
          },
        ];
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
          uploaded_at: string | null;
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
          uploaded_at?: string | null;
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
          uploaded_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'payment_proofs_paiement_id_fkey';
            columns: ['paiement_id'];
            isOneToOne: false;
            referencedRelation: 'paiements';
            referencedColumns: ['id'];
          },
        ];
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
        Relationships: [];
      };
      project_comments: {
        Row: {
          id: string;
          projet_id: string;
          org_id: string;
          comment_text: string;
          user_id: string | null;
          attachments: Json | null;
          is_edited: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          projet_id: string;
          org_id: string;
          comment_text: string;
          user_id?: string | null;
          attachments?: Json | null;
          is_edited?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          projet_id?: string;
          org_id?: string;
          comment_text?: string;
          user_id?: string | null;
          attachments?: Json | null;
          is_edited?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'project_comments_projet_id_fkey';
            columns: ['projet_id'];
            isOneToOne: false;
            referencedRelation: 'projets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_comments_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      user_email_connections: {
        Row: {
          id: string;
          user_id: string;
          provider: string;
          email_address: string;
          access_token: string;
          refresh_token: string;
          token_expires_at: string;
          scope: string;
          token_type: string;
          connected_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          provider: string;
          email_address: string;
          access_token: string;
          refresh_token: string;
          token_expires_at: string;
          scope: string;
          token_type?: string;
          connected_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          provider?: string;
          email_address?: string;
          access_token?: string;
          refresh_token?: string;
          token_expires_at?: string;
          scope?: string;
          token_type?: string;
          connected_at?: string;
        };
        Relationships: [];
      };
      company_format_profiles: {
        Row: {
          id: string;
          company_id: string | null;
          profile_name: string;
          is_standard: boolean;
          is_active: boolean;
          version: number;
          description: string | null;
          format_config: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          profile_name: string;
          is_standard?: boolean;
          is_active?: boolean;
          version?: number;
          description?: string | null;
          format_config?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string | null;
          profile_name?: string;
          is_standard?: boolean;
          is_active?: boolean;
          version?: number;
          description?: string | null;
          format_config?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'company_format_profiles_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      calendar_exports: {
        Row: {
          id: string;
          project_id: string;
          tranche_id: string | null;
          is_outdated: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          tranche_id?: string | null;
          is_outdated?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          tranche_id?: string | null;
          is_outdated?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'calendar_exports_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'calendar_exports_tranche_id_fkey';
            columns: ['tranche_id'];
            isOneToOne: false;
            referencedRelation: 'tranches';
            referencedColumns: ['id'];
          },
        ];
      };
      demo_requests: {
        Row: {
          id: string;
          name: string;
          email: string;
          company: string | null;
          message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          company?: string | null;
          message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          company?: string | null;
          message?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          org_id: string | null;
          user_id: string | null;
          user_email: string | null;
          user_name: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          description: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id?: string | null;
          user_id?: string | null;
          user_email?: string | null;
          user_name?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          description: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string | null;
          user_id?: string | null;
          user_email?: string | null;
          user_name?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          description?: string;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'audit_logs_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
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
          paiement_id: string | null;
          investisseur_id: string;
          investisseur_nom: string;
          investisseur_type: string;
          investisseur_email: string;
          investisseur_cgp: string | null;
          has_rib: boolean;
          projet_id: string;
          projet_nom: string;
          tranche_id: string;
          tranche_nom: string;
          montant_brut: number;
          montant_net: number;
          statut_calculated: string;
          jours_restants: number;
          montant_investi: number;
          date_echeance_finale: string;
          is_last_echeance: boolean;
        };
        Relationships: [];
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
        };
        Relationships: [
          {
            foreignKeyName: 'coupons_echeances_souscription_id_fkey';
            columns: ['souscription_id'];
            isOneToOne: false;
            referencedRelation: 'souscriptions';
            referencedColumns: ['id'];
          },
        ];
      };
      v_prochains_coupons: {
        Row: {
          souscription_id: string;
          date_prochain_coupon: string;
          montant_prochain_coupon: number;
          statut: string;
        };
        Relationships: [
          {
            foreignKeyName: 'coupons_echeances_souscription_id_fkey';
            columns: ['souscription_id'];
            isOneToOne: false;
            referencedRelation: 'souscriptions';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Functions: {
      check_super_admin_status: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      get_org_emetteurs: {
        Args: { p_org_id: string };
        Returns: { emetteur_name: string }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
