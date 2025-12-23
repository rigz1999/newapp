-- ============================================
-- Complete Base Schema for Paris Supabase Project
-- Tables ordered by dependencies to avoid FK errors
-- ============================================

-- ============================================
-- 1. PROFILES (depends only on auth.users)
-- ============================================
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text,
  full_name text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_superadmin boolean DEFAULT false,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. ORGANIZATIONS (depends on auth.users)
-- ============================================
CREATE TABLE public.organizations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT organizations_pkey PRIMARY KEY (id),
  CONSTRAINT organizations_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. MEMBERSHIPS (depends on organizations, profiles)
-- ============================================
CREATE TABLE public.memberships (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  org_id uuid,
  role text NOT NULL DEFAULT 'member'::text CHECK (role = ANY (ARRAY['admin'::text, 'member'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT memberships_pkey PRIMARY KEY (id),
  CONSTRAINT memberships_user_id_org_id_key UNIQUE (user_id, org_id),
  CONSTRAINT memberships_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
  CONSTRAINT memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. INVITATIONS (depends on organizations)
-- ============================================
CREATE TABLE public.invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  org_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member'::text CHECK (role = ANY (ARRAY['admin'::text, 'member'::text])),
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'expired'::text])),
  token text NOT NULL UNIQUE,
  invited_by uuid NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  accepted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT invitations_pkey PRIMARY KEY (id),
  CONSTRAINT invitations_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
  CONSTRAINT invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. USER_REMINDER_SETTINGS (depends on auth.users)
-- ============================================
CREATE TABLE public.user_reminder_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT false,
  remind_7_days boolean NOT NULL DEFAULT false,
  remind_14_days boolean NOT NULL DEFAULT false,
  remind_30_days boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_reminder_settings_pkey PRIMARY KEY (id),
  CONSTRAINT user_reminder_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.user_reminder_settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. SUPERADMIN_USERS (depends on auth.users)
-- ============================================
CREATE TABLE public.superadmin_users (
  user_id uuid NOT NULL,
  email text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT superadmin_users_pkey PRIMARY KEY (user_id),
  CONSTRAINT superadmin_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.superadmin_users ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 7. APP_CONFIG (no dependencies)
-- ============================================
CREATE TABLE public.app_config (
  key text NOT NULL,
  value text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT app_config_pkey PRIMARY KEY (key)
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 8. PROJETS (depends on organizations)
-- ============================================
CREATE TABLE public.projets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  projet text NOT NULL,
  emetteur text,
  siren_emetteur bigint,
  nom_representant text,
  prenom_representant text,
  email_representant text,
  representant_masse text,
  email_rep_masse text,
  telephone_rep_masse bigint,
  created_at timestamp without time zone DEFAULT now(),
  taux_interet numeric,
  montant_global_eur numeric,
  maturite_mois integer,
  base_interet integer DEFAULT 360,
  type text NOT NULL DEFAULT 'obligations_simples'::text CHECK (type = ANY (ARRAY['obligations_simples'::text, 'obligations_convertibles'::text])),
  taux_nominal numeric,
  periodicite_coupons text,
  date_emission date,
  duree_mois integer,
  org_id uuid,
  CONSTRAINT projets_pkey PRIMARY KEY (id),
  CONSTRAINT projets_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);

ALTER TABLE public.projets ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 9. INVESTISSEURS (depends on organizations)
-- ============================================
CREATE TABLE public.investisseurs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  id_investisseur text NOT NULL UNIQUE,
  type text,
  nom_raison_sociale text NOT NULL,
  representant_legal text,
  siren bigint,
  email text,
  telephone bigint,
  adresse text,
  residence_fiscale text,
  departement_naissance integer,
  created_at timestamp without time zone DEFAULT now(),
  date_naissance date,
  lieu_naissance text,
  ppe boolean,
  categorie_mifid text,
  rib_file_path text,
  rib_uploaded_at timestamp without time zone,
  rib_status character varying DEFAULT 'manquant'::character varying,
  cgp text,
  email_cgp text,
  org_id uuid,
  cgp_nom text,
  cgp_email text,
  CONSTRAINT investisseurs_pkey PRIMARY KEY (id),
  CONSTRAINT investisseurs_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);

ALTER TABLE public.investisseurs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 10. TRANCHES (depends on projets)
-- ============================================
CREATE TABLE public.tranches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tranche_name text NOT NULL,
  projet_id uuid,
  date_emission date,
  date_echeance date,
  created_at timestamp without time zone DEFAULT now(),
  date_transfert_fonds date,
  taux_nominal numeric,
  periodicite_coupons text,
  date_echeance_finale date,
  duree_mois integer,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tranches_pkey PRIMARY KEY (id),
  CONSTRAINT tranches_projet_id_fkey FOREIGN KEY (projet_id) REFERENCES public.projets(id) ON DELETE CASCADE
);

ALTER TABLE public.tranches ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 11. SOUSCRIPTIONS (depends on projets, tranches, investisseurs)
-- ============================================
CREATE TABLE public.souscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  id_souscription text NOT NULL UNIQUE,
  projet_id uuid,
  tranche_id uuid,
  investisseur_id uuid,
  date_souscription date,
  nombre_obligations integer,
  montant_investi numeric,
  coupon_brut numeric,
  coupon_net numeric,
  prochaine_date_coupon date,
  created_at timestamp without time zone DEFAULT now(),
  cgp text,
  email_cgp text,
  date_validation_bs date,
  date_transfert date,
  pea boolean,
  pea_compte text,
  code_cgp text,
  siren_cgp text,
  CONSTRAINT souscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT souscriptions_projet_id_fkey FOREIGN KEY (projet_id) REFERENCES public.projets(id) ON DELETE CASCADE,
  CONSTRAINT souscriptions_tranche_id_fkey FOREIGN KEY (tranche_id) REFERENCES public.tranches(id) ON DELETE CASCADE,
  CONSTRAINT souscriptions_investisseur_id_fkey FOREIGN KEY (investisseur_id) REFERENCES public.investisseurs(id) ON DELETE CASCADE
);

ALTER TABLE public.souscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 12. COUPONS_ECHEANCES (depends on souscriptions)
-- ============================================
CREATE TABLE public.coupons_echeances (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  souscription_id uuid NOT NULL,
  date_echeance date NOT NULL,
  montant_coupon numeric NOT NULL,
  statut text NOT NULL DEFAULT 'en_attente'::text,
  date_paiement date,
  montant_paye numeric,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  echeance_id uuid,
  CONSTRAINT coupons_echeances_pkey PRIMARY KEY (id),
  CONSTRAINT coupons_echeances_souscription_id_fkey FOREIGN KEY (souscription_id) REFERENCES public.souscriptions(id) ON DELETE CASCADE
);

ALTER TABLE public.coupons_echeances ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 13. PAIEMENTS (depends on projets, tranches, investisseurs, souscriptions, organizations, coupons_echeances)
-- ============================================
CREATE TABLE public.paiements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  id_paiement text NOT NULL UNIQUE,
  type text,
  projet_id uuid,
  tranche_id uuid,
  investisseur_id uuid,
  montant numeric,
  date_paiement date,
  note text,
  created_at timestamp without time zone DEFAULT now(),
  proof_url text,
  ocr_raw_text text,
  matched boolean DEFAULT false,
  souscription_id uuid,
  statut text DEFAULT 'payé'::text CHECK (statut = ANY (ARRAY['payé'::text, 'en_attente'::text, 'annulé'::text])),
  org_id uuid,
  echeance_id uuid,
  CONSTRAINT paiements_pkey PRIMARY KEY (id),
  CONSTRAINT paiements_projet_id_fkey FOREIGN KEY (projet_id) REFERENCES public.projets(id) ON DELETE CASCADE,
  CONSTRAINT paiements_tranche_id_fkey FOREIGN KEY (tranche_id) REFERENCES public.tranches(id) ON DELETE CASCADE,
  CONSTRAINT paiements_investisseur_id_fkey FOREIGN KEY (investisseur_id) REFERENCES public.investisseurs(id) ON DELETE CASCADE,
  CONSTRAINT paiements_souscription_id_fkey FOREIGN KEY (souscription_id) REFERENCES public.souscriptions(id) ON DELETE CASCADE,
  CONSTRAINT paiements_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
  CONSTRAINT paiements_echeance_id_fkey FOREIGN KEY (echeance_id) REFERENCES public.coupons_echeances(id) ON DELETE SET NULL
);

ALTER TABLE public.paiements ENABLE ROW LEVEL SECURITY;

-- Add missing FK from coupons_echeances to paiements (if needed)
-- ALTER TABLE public.coupons_echeances ADD COLUMN paiement_id uuid;
-- ALTER TABLE public.coupons_echeances ADD CONSTRAINT coupons_echeances_paiement_id_fkey
--   FOREIGN KEY (paiement_id) REFERENCES public.paiements(id) ON DELETE SET NULL;

-- ============================================
-- 14. PAYMENT_PROOFS (depends on paiements)
-- ============================================
CREATE TABLE public.payment_proofs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  paiement_id uuid,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size integer,
  extracted_data jsonb,
  confidence integer,
  validated_at timestamp without time zone DEFAULT now(),
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT payment_proofs_pkey PRIMARY KEY (id),
  CONSTRAINT payment_proofs_paiement_id_fkey FOREIGN KEY (paiement_id) REFERENCES public.paiements(id) ON DELETE CASCADE
);

ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE INDEXES
-- ============================================

CREATE INDEX idx_memberships_user_id ON memberships(user_id);
CREATE INDEX idx_memberships_org_id ON memberships(org_id);
CREATE INDEX idx_invitations_org_id ON invitations(org_id);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_projets_org_id ON projets(org_id);
CREATE INDEX idx_investisseurs_org_id ON investisseurs(org_id);
CREATE INDEX idx_tranches_projet_id ON tranches(projet_id);
CREATE INDEX idx_souscriptions_projet_id ON souscriptions(projet_id);
CREATE INDEX idx_souscriptions_tranche_id ON souscriptions(tranche_id);
CREATE INDEX idx_souscriptions_investisseur_id ON souscriptions(investisseur_id);
CREATE INDEX idx_coupons_echeances_souscription_id ON coupons_echeances(souscription_id);
CREATE INDEX idx_paiements_echeance_id ON paiements(echeance_id);
CREATE INDEX idx_paiements_org_id ON paiements(org_id);
CREATE INDEX idx_payment_proofs_paiement_id ON payment_proofs(paiement_id);

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
-- Schema created successfully!
-- Next: Run your migration batch files for RLS policies and functions.
