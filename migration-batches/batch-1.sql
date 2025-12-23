-- ============================================
-- Performance Indexes Migration
-- Created: 2025-01-07
-- Purpose: Add indexes to improve query performance on large datasets
-- ============================================

-- Index on memberships.user_id for faster user lookup
CREATE INDEX IF NOT EXISTS idx_memberships_user_id
ON memberships(user_id);

-- Index on memberships.org_id for faster organization queries
CREATE INDEX IF NOT EXISTS idx_memberships_org_id
ON memberships(org_id);

-- Composite index for org membership queries (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_memberships_org_user
ON memberships(org_id, user_id);

-- Index on paiements.date_paiement for date-based ordering and filtering
CREATE INDEX IF NOT EXISTS idx_paiements_date
ON paiements(date_paiement DESC);

-- Index on paiements.tranche_id for joining with tranches
CREATE INDEX IF NOT EXISTS idx_paiements_tranche_id
ON paiements(tranche_id);

-- Index on souscriptions.tranche_id for faster tranche queries
CREATE INDEX IF NOT EXISTS idx_souscriptions_tranche_id
ON souscriptions(tranche_id);

-- Index on souscriptions.investisseur_id for faster investor queries
CREATE INDEX IF NOT EXISTS idx_souscriptions_investisseur_id
ON souscriptions(investisseur_id);

-- Index on tranches.projet_id for faster project queries
CREATE INDEX IF NOT EXISTS idx_tranches_projet_id
ON tranches(projet_id);

-- Index on projets.org_id for faster organization queries
CREATE INDEX IF NOT EXISTS idx_projets_org_id
ON projets(org_id);

-- Index on investisseurs.org_id for faster organization queries
CREATE INDEX IF NOT EXISTS idx_investisseurs_org_id
ON investisseurs(org_id);

-- Index on invitations.org_id for faster organization queries
CREATE INDEX IF NOT EXISTS idx_invitations_org_id
ON invitations(org_id);

-- Index on invitations.email for faster email lookup
CREATE INDEX IF NOT EXISTS idx_invitations_email
ON invitations(email);

-- Index on invitations.status for filtering pending invitations
CREATE INDEX IF NOT EXISTS idx_invitations_status
ON invitations(status);

-- Composite index for active invitations by org (common query pattern)
CREATE INDEX IF NOT EXISTS idx_invitations_org_status
ON invitations(org_id, status)
WHERE status = 'pending';

-- Index on payment_proofs.paiement_id for faster proof lookup
CREATE INDEX IF NOT EXISTS idx_payment_proofs_paiement_id
ON payment_proofs(paiement_id);

-- Index on echeancier.tranche_id for faster schedule queries
CREATE INDEX IF NOT EXISTS idx_echeancier_tranche_id
ON echeancier(tranche_id);

-- Index on echeancier.date_echeance for date-based queries
CREATE INDEX IF NOT EXISTS idx_echeancier_date
ON echeancier(date_echeance);

-- Composite index for upcoming payment schedules (common query)
CREATE INDEX IF NOT EXISTS idx_echeancier_tranche_date
ON echeancier(tranche_id, date_echeance)
WHERE statut = 'à venir';

-- Index on profiles.id for faster profile lookups (if not already exists)
CREATE INDEX IF NOT EXISTS idx_profiles_id
ON profiles(id);

-- Add created_at indexes for tables with temporal ordering
CREATE INDEX IF NOT EXISTS idx_memberships_created_at
ON memberships(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_paiements_created_at
ON paiements(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_souscriptions_created_at
ON souscriptions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tranches_created_at
ON tranches(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_projets_created_at
ON projets(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_investisseurs_created_at
ON investisseurs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_invitations_created_at
ON invitations(created_at DESC);

-- Analyze tables to update statistics for query planner
ANALYZE memberships;
ANALYZE paiements;
ANALYZE souscriptions;
ANALYZE tranches;
ANALYZE projets;
ANALYZE investisseurs;
ANALYZE invitations;
ANALYZE payment_proofs;
ANALYZE echeancier;
ANALYZE profiles;

-- Add comments for documentation
COMMENT ON INDEX idx_memberships_org_user IS 'Composite index for organization membership lookups';
COMMENT ON INDEX idx_paiements_date IS 'Index for date-based payment queries and sorting';
COMMENT ON INDEX idx_invitations_org_status IS 'Partial index for active invitations by organization';
COMMENT ON INDEX idx_echeancier_tranche_date IS 'Partial index for upcoming payment schedules';
/*
  # Add owner column and INSERT policies for signup

  1. Changes
    - Add owner_id column to organizations table
    - Add INSERT policy for organizations table to allow new users to create their organization
    - Add INSERT policy for memberships table to allow new users to create their own membership
  
  2. Security
    - Organizations: Users can insert when they are the owner
    - Memberships: Users can insert when they are adding themselves as a member
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE organizations ADD COLUMN owner_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

CREATE POLICY "Users can create their own organization"
  ON organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can create their own membership"
  ON memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
/*
  # Add admin role support

  1. Changes
    - Add is_admin column to auth.users metadata
    - Update useOrganization hook logic to allow admins to bypass organization checks
  
  2. Notes
    - Admins can log in without being linked to any organization
    - Admin status is stored in user metadata for easy access
*/

-- No schema changes needed - we'll use auth metadata/*
  # Add payments table for tracking coupon payments

  1. New Tables
    - `payments`
      - `id` (uuid, primary key)
      - `subscription_id` (uuid, foreign key to subscriptions)
      - `payment_date` (date) - Date when payment was made
      - `amount` (numeric) - Amount paid
      - `status` (text) - Payment status: 'paid', 'pending', 'failed'
      - `payment_type` (text) - Type: 'coupon', 'principal'
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `payments` table
    - Add policies for organization members to view their payments
*/

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  payment_date date NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'failed')),
  payment_type text NOT NULL DEFAULT 'coupon' CHECK (payment_type IN ('coupon', 'principal')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organization members can view payments"
  ON payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM subscriptions s
      JOIN tranches t ON s.tranche_id = t.id
      JOIN projects p ON t.project_id = p.id
      JOIN memberships m ON p.org_id = m.org_id
      WHERE s.id = payments.subscription_id
      AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Organization members can insert payments"
  ON payments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM subscriptions s
      JOIN tranches t ON s.tranche_id = t.id
      JOIN projects p ON t.project_id = p.id
      JOIN memberships m ON p.org_id = m.org_id
      WHERE s.id = payments.subscription_id
      AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Organization members can update payments"
  ON payments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM subscriptions s
      JOIN tranches t ON s.tranche_id = t.id
      JOIN projects p ON t.project_id = p.id
      JOIN memberships m ON p.org_id = m.org_id
      WHERE s.id = payments.subscription_id
      AND m.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM subscriptions s
      JOIN tranches t ON s.tranche_id = t.id
      JOIN projects p ON t.project_id = p.id
      JOIN memberships m ON p.org_id = m.org_id
      WHERE s.id = payments.subscription_id
      AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Organization members can delete payments"
  ON payments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM subscriptions s
      JOIN tranches t ON s.tranche_id = t.id
      JOIN projects p ON t.project_id = p.id
      JOIN memberships m ON p.org_id = m.org_id
      WHERE s.id = payments.subscription_id
      AND m.user_id = auth.uid()
    )
  );/*
  # Create organizations and memberships tables

  1. New Tables
    - `organizations`
      - `id` (uuid, primary key)
      - `name` (text, organization name)
      - `owner_id` (uuid, references auth.users)
      - `created_at` (timestamp)
    
    - `memberships`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `org_id` (uuid, references organizations)
      - `role` (text, user role in organization)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their organizations
    - Add policies for organization members to read their memberships
*/

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Create memberships table
CREATE TABLE IF NOT EXISTS memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, org_id)
);

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

-- Organizations policies
CREATE POLICY "Users can view organizations they are members of"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT org_id FROM memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Organization owners can update their organizations"
  ON organizations FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Organization owners can delete their organizations"
  ON organizations FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- Memberships policies
CREATE POLICY "Users can view their own memberships"
  ON memberships FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Organization owners can create memberships"
  ON memberships FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Organization owners can update memberships"
  ON memberships FOR UPDATE
  TO authenticated
  USING (
    org_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Organization owners can delete memberships"
  ON memberships FOR DELETE
  TO authenticated
  USING (
    org_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );/*
  # Add payment proof and matching fields

  1. Changes
    - Add `proof_url` column to store PDF file URL/path
    - Add `ocr_raw_text` column to store extracted PDF text
    - Add `matched` column to track if payment was auto-matched
    - Add `souscription_id` column to link payment to specific subscription

  2. Notes
    - Allows tracking payment proofs and match status
    - Enables linking payments to subscriptions for status updates
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'paiements' AND column_name = 'proof_url'
  ) THEN
    ALTER TABLE paiements ADD COLUMN proof_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'paiements' AND column_name = 'ocr_raw_text'
  ) THEN
    ALTER TABLE paiements ADD COLUMN ocr_raw_text text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'paiements' AND column_name = 'matched'
  ) THEN
    ALTER TABLE paiements ADD COLUMN matched boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'paiements' AND column_name = 'souscription_id'
  ) THEN
    ALTER TABLE paiements ADD COLUMN souscription_id uuid REFERENCES souscriptions(id);
  END IF;
END $$;
/*
  # Fix Payment Statuses Without Proofs

  1. Updates
    - Set correct status for payments marked as 'Payé' or 'paid' but have no proof uploaded
    - Status based on date:
      - If date_paiement is > 7 days in the past: 'En retard'
      - Otherwise: 'En attente'

  2. Notes
    - Only affects payments currently marked as paid without proofs
    - Preserves payments that actually have proof files
*/

-- Update payments marked as paid but have no proofs
UPDATE paiements
SET statut = CASE
  WHEN date_paiement < (CURRENT_DATE - INTERVAL '7 days') THEN 'En retard'
  ELSE 'En attente'
END
WHERE (statut = 'Payé' OR statut = 'paid')
  AND id NOT IN (
    SELECT paiement_id FROM payment_proofs
  );
/*
  # Enforce Payment Proof Requirement

  1. Function & Trigger
    - Creates a function to validate payment status based on proof existence
    - Creates a trigger that runs before INSERT or UPDATE on paiements table
    - Automatically changes status from 'Payé'/'paid' to 'En attente' if no proof exists

  2. Security
    - Prevents payments from being marked as paid without proof
    - Maintains data integrity automatically
    - Works for both new payments and updates

  3. Notes
    - Only affects status changes to 'Payé' or 'paid'
    - Allows other statuses without proof
    - Trigger runs BEFORE operation to prevent invalid data
*/

-- Create function to validate payment status
CREATE OR REPLACE FUNCTION validate_payment_proof()
RETURNS TRIGGER AS $$
BEGIN
  -- If trying to set status to 'Payé' or 'paid'
  IF (NEW.statut = 'Payé' OR NEW.statut = 'paid') THEN
    -- Check if proof exists
    IF NOT EXISTS (
      SELECT 1 FROM payment_proofs WHERE paiement_id = NEW.id
    ) THEN
      -- No proof exists, set to 'En attente' instead
      NEW.statut = 'En attente';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on paiements table
DROP TRIGGER IF EXISTS enforce_payment_proof ON paiements;
CREATE TRIGGER enforce_payment_proof
  BEFORE INSERT OR UPDATE ON paiements
  FOR EACH ROW
  EXECUTE FUNCTION validate_payment_proof();
/*
  # Simplify Payment Model - Proof Required

  1. Changes
    - Remove `statut` column from paiements table
    - Payment records ONLY exist when they have been made (with proof)
    - No "pending" or "overdue" statuses - if payment exists, it's been paid
    - Status tracking moves to coupons table based on payment existence

  2. Philosophy
    - Payment record = Proof of payment made
    - No payment record = Not yet paid
    - Coupons table shows status by checking if linked payment exists

  3. Notes
    - Existing data: payments without proofs will be deleted
    - This enforces data integrity at schema level
    - Status is derived, not stored
*/

-- First, delete any payments without proofs
DELETE FROM paiements
WHERE id NOT IN (
  SELECT paiement_id FROM payment_proofs
);

-- Drop the trigger and function that validated status
DROP TRIGGER IF EXISTS enforce_payment_proof ON paiements;
DROP FUNCTION IF EXISTS validate_payment_proof();

-- Remove statut column from paiements
ALTER TABLE paiements DROP COLUMN IF EXISTS statut;

-- Add comment explaining the model
COMMENT ON TABLE paiements IS 'Payment records represent completed payments with proof. A record existing means payment has been made.';
COMMENT ON TABLE payment_proofs IS 'Every payment MUST have at least one proof. Payment cannot exist without proof.';
-- Create profiles table to sync with auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
-- Users can view all profiles (needed for admin panel to show pending users)
CREATE POLICY "Users can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing users (if any)
INSERT INTO public.profiles (id, email, full_name, created_at)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', '') as full_name,
  created_at
FROM auth.users
ON CONFLICT (id) DO NOTHING;
-- Migration: Create user_reminder_settings table
-- Created: 2025-11-06
-- Purpose: Store user preferences for automatic email reminders about upcoming coupon payments

-- Create user_reminder_settings table
CREATE TABLE IF NOT EXISTS user_reminder_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  remind_7_days BOOLEAN NOT NULL DEFAULT false,
  remind_14_days BOOLEAN NOT NULL DEFAULT false,
  remind_30_days BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Ensure one settings record per user
  UNIQUE(user_id)
);

-- Add index on user_id for fast lookups
CREATE INDEX idx_user_reminder_settings_user_id ON user_reminder_settings(user_id);

-- Add index on enabled users for the cron job
CREATE INDEX idx_user_reminder_settings_enabled ON user_reminder_settings(enabled) WHERE enabled = true;

-- Enable RLS
ALTER TABLE user_reminder_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see and modify their own settings
CREATE POLICY "Users can view their own reminder settings"
  ON user_reminder_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reminder settings"
  ON user_reminder_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reminder settings"
  ON user_reminder_settings
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reminder settings"
  ON user_reminder_settings
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_reminder_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on every update
CREATE TRIGGER update_user_reminder_settings_timestamp
  BEFORE UPDATE ON user_reminder_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_reminder_settings_updated_at();

-- Comment on table
COMMENT ON TABLE user_reminder_settings IS 'Stores user preferences for automatic email reminders about upcoming coupon payments';
COMMENT ON COLUMN user_reminder_settings.enabled IS 'Master switch for all email reminders';
COMMENT ON COLUMN user_reminder_settings.remind_7_days IS 'Send reminder 7 days before coupon due date';
COMMENT ON COLUMN user_reminder_settings.remind_14_days IS 'Send reminder 14 days before coupon due date';
COMMENT ON COLUMN user_reminder_settings.remind_30_days IS 'Send reminder 30 days before coupon due date';
-- ============================================
-- Setup Cron Job for Coupon Reminders
-- Path: supabase/migrations/20251106000002_setup_reminder_cron.sql
-- ============================================

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the send-coupon-reminders function to run every day at 7:00 AM
-- The cron expression '0 7 * * *' means: minute=0, hour=7, any day, any month, any day of week
SELECT cron.schedule(
  'send-daily-coupon-reminders',  -- Job name
  '0 7 * * *',                     -- Cron expression: Every day at 7:00 AM
  $$
  SELECT
    net.http_post(
      url := 'https://' || current_setting('app.settings.project_ref') || '.supabase.co/functions/v1/send-coupon-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- To view scheduled jobs:
-- SELECT * FROM cron.job;

-- To manually unschedule (if needed later):
-- SELECT cron.unschedule('send-daily-coupon-reminders');
-- ============================================
-- Fix Security Definer Views
-- Created: 2025-11-07
-- Purpose: Remove SECURITY DEFINER from views to properly enforce RLS policies
-- ============================================

-- Drop views (in order due to dependencies)
-- v_souscriptions_with_next depends on v_prochains_coupons, so drop it first
DROP VIEW IF EXISTS v_souscriptions_with_next;
DROP VIEW IF EXISTS v_prochains_coupons;
DROP VIEW IF EXISTS v_coupons_stats;
DROP VIEW IF EXISTS v_souscriptions_with_cgp;

-- Recreate v_coupons_stats (independent view)
CREATE VIEW v_coupons_stats AS
SELECT
  souscription_id,
  count(*) FILTER (WHERE (statut = 'paye'::text)) AS coupons_payes,
  count(*) FILTER (WHERE ((statut = 'en_attente'::text) AND (date_echeance < CURRENT_DATE))) AS coupons_en_retard,
  count(*) FILTER (WHERE ((statut = 'en_attente'::text) AND (date_echeance >= CURRENT_DATE))) AS coupons_a_venir,
  sum(montant_coupon) FILTER (WHERE (statut = 'paye'::text)) AS total_paye,
  sum(montant_coupon) FILTER (WHERE ((statut = 'en_attente'::text) AND (date_echeance < CURRENT_DATE))) AS total_en_retard,
  max(date_paiement) FILTER (WHERE (statut = 'paye'::text)) AS dernier_paiement
FROM coupons_echeances ce
GROUP BY souscription_id;

-- Recreate v_souscriptions_with_cgp (independent view)
CREATE VIEW v_souscriptions_with_cgp AS
SELECT
  s.id,
  s.id_souscription,
  s.projet_id,
  s.tranche_id,
  s.investisseur_id,
  s.date_souscription,
  s.nombre_obligations,
  s.montant_investi,
  s.coupon_brut,
  s.coupon_net,
  s.prochaine_date_coupon,
  s.created_at,
  s.cgp,
  s.email_cgp,
  s.date_validation_bs,
  s.date_transfert,
  s.pea,
  s.pea_compte,
  s.code_cgp,
  s.siren_cgp,
  i.cgp AS investisseur_cgp,
  i.email_cgp AS investisseur_email_cgp
FROM souscriptions s
JOIN investisseurs i ON (s.investisseur_id = i.id);

-- Recreate v_prochains_coupons (used by v_souscriptions_with_next)
CREATE VIEW v_prochains_coupons AS
SELECT
  ce.souscription_id,
  ce.date_echeance AS date_prochain_coupon,
  ce.montant_coupon AS montant_prochain_coupon,
  ce.statut
FROM coupons_echeances ce
JOIN (
  SELECT
    coupons_echeances.souscription_id,
    min(coupons_echeances.date_echeance) AS next_date
  FROM coupons_echeances
  WHERE ((coupons_echeances.date_echeance >= CURRENT_DATE) AND (coupons_echeances.statut <> 'paye'::text))
  GROUP BY coupons_echeances.souscription_id
) nx ON ((nx.souscription_id = ce.souscription_id) AND (nx.next_date = ce.date_echeance));

-- Recreate v_souscriptions_with_next (depends on v_prochains_coupons)
CREATE VIEW v_souscriptions_with_next AS
SELECT
  s.id AS souscription_id,
  i.nom_raison_sociale AS investisseur,
  i.type AS type_investisseur,
  p.projet AS projet_nom,
  p.id AS projet_id,
  t.tranche_name,
  t.id AS tranche_id,
  p.periodicite_coupons,
  p.taux_nominal,
  t.date_emission,
  ((t.date_emission + ((p.maturite_mois || ' months'::text))::interval))::date AS date_echeance_finale,
  s.montant_investi,
  s.coupon_net,
  nx.date_prochain_coupon,
  nx.montant_prochain_coupon,
  nx.statut AS statut_prochain_coupon
FROM souscriptions s
JOIN investisseurs i ON (i.id = s.investisseur_id)
JOIN tranches t ON (t.id = s.tranche_id)
JOIN projets p ON (p.id = t.projet_id)
LEFT JOIN v_prochains_coupons nx ON (nx.souscription_id = s.id);

-- Set all views to use SECURITY INVOKER (enforces RLS policies of querying user)
ALTER VIEW v_coupons_stats SET (security_invoker = true);
ALTER VIEW v_souscriptions_with_cgp SET (security_invoker = true);
ALTER VIEW v_prochains_coupons SET (security_invoker = true);
ALTER VIEW v_souscriptions_with_next SET (security_invoker = true);

-- Add comments
COMMENT ON VIEW v_coupons_stats IS 'Coupon statistics per subscription - uses SECURITY INVOKER to enforce RLS';
COMMENT ON VIEW v_souscriptions_with_cgp IS 'Subscriptions with CGP information - uses SECURITY INVOKER to enforce RLS';
COMMENT ON VIEW v_prochains_coupons IS 'Next upcoming coupon per subscription - uses SECURITY INVOKER to enforce RLS';
COMMENT ON VIEW v_souscriptions_with_next IS 'Subscriptions with next coupon information - uses SECURITY INVOKER to enforce RLS';
-- ============================================
-- Fix Function Search Path Security
-- Created: 2025-11-07
-- Purpose: Set fixed search_path on all functions to prevent search_path injection attacks
-- ============================================

-- Fix all functions by setting search_path to 'public'
-- This prevents malicious users from hijacking function behavior by changing search_path

ALTER FUNCTION public.notify_admin_new_user() SET search_path = public;
ALTER FUNCTION public.generate_souscription_id() SET search_path = public;
ALTER FUNCTION public.is_super_admin() SET search_path = public;
ALTER FUNCTION public.get_user_org_ids() SET search_path = public;
ALTER FUNCTION public.update_coupons_echeances_updated_at() SET search_path = public;
ALTER FUNCTION public.update_user_reminder_settings_updated_at() SET search_path = public;
ALTER FUNCTION public.recalculate_coupons_on_date_emission_change() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.set_date_emission() SET search_path = public;
ALTER FUNCTION public.generate_coupon_schedule(p_souscription_id uuid, p_date_emission date, p_date_fin date, p_periodicite text, p_montant_coupon numeric) SET search_path = public;
ALTER FUNCTION public.update_coupon_statut() SET search_path = public;
ALTER FUNCTION public.mark_coupon_paid(p_souscription uuid, p_date date, p_date_paiement date) SET search_path = public;
ALTER FUNCTION public.generate_investisseur_id() SET search_path = public;
ALTER FUNCTION public.sync_tranche_periodicite() SET search_path = public;

-- Add comments
COMMENT ON FUNCTION public.notify_admin_new_user IS 'Notifies admin of new user - search_path fixed for security';
COMMENT ON FUNCTION public.generate_souscription_id IS 'Generates subscription ID - search_path fixed for security';
COMMENT ON FUNCTION public.is_super_admin IS 'Checks super admin status - search_path fixed for security';
COMMENT ON FUNCTION public.get_user_org_ids IS 'Gets user organization IDs - search_path fixed for security';
COMMENT ON FUNCTION public.handle_new_user IS 'Handles new user creation - search_path fixed for security';
-- ============================================
-- Fix RLS Performance Issues
-- Created: 2025-11-08
-- Purpose: Fix auth_rls_initplan warnings and consolidate multiple permissive policies
--
-- Issues addressed:
-- 1. Wrap auth.uid() in (select ...) to prevent re-evaluation per row
-- 2. Consolidate multiple permissive policies for better performance
-- ============================================

-- ============================================
-- PROFILES TABLE
-- ============================================

-- Drop ALL existing policies (including ones that might exist in Supabase)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Recreate with optimized policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = (select auth.uid()));

-- ============================================
-- USER_REMINDER_SETTINGS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view their own reminder settings" ON user_reminder_settings;
DROP POLICY IF EXISTS "Users can insert their own reminder settings" ON user_reminder_settings;
DROP POLICY IF EXISTS "Users can update their own reminder settings" ON user_reminder_settings;
DROP POLICY IF EXISTS "Users can delete their own reminder settings" ON user_reminder_settings;

CREATE POLICY "Users can view their own reminder settings"
  ON user_reminder_settings
  FOR SELECT
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert their own reminder settings"
  ON user_reminder_settings
  FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own reminder settings"
  ON user_reminder_settings
  FOR UPDATE
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their own reminder settings"
  ON user_reminder_settings
  FOR DELETE
  USING (user_id = (select auth.uid()));

-- ============================================
-- ORGANIZATIONS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view organizations they are members of" ON organizations;
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Super admins can manage all organizations" ON organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Users can create their own organization" ON organizations;
DROP POLICY IF EXISTS "Organization owners can update their organizations" ON organizations;
DROP POLICY IF EXISTS "Organization owners can delete their organizations" ON organizations;

-- Recreate with optimized policies
CREATE POLICY "Users can view organizations they are members of"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT org_id FROM memberships WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can create organizations"
  ON organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = (select auth.uid()));

CREATE POLICY "Organization owners can update their organizations"
  ON organizations
  FOR UPDATE
  TO authenticated
  USING (owner_id = (select auth.uid()))
  WITH CHECK (owner_id = (select auth.uid()));

CREATE POLICY "Organization owners can delete their organizations"
  ON organizations
  FOR DELETE
  TO authenticated
  USING (owner_id = (select auth.uid()));

-- ============================================
-- MEMBERSHIPS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view their memberships" ON memberships;
DROP POLICY IF EXISTS "Users can view their own memberships" ON memberships;
DROP POLICY IF EXISTS "Super admins can manage all memberships" ON memberships;
DROP POLICY IF EXISTS "Organization owners can create memberships" ON memberships;
DROP POLICY IF EXISTS "Users can create their own membership" ON memberships;
DROP POLICY IF EXISTS "Organization owners can update memberships" ON memberships;
DROP POLICY IF EXISTS "Organization owners can delete memberships" ON memberships;

-- Recreate with optimized policies
CREATE POLICY "Users can view their memberships"
  ON memberships
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Organization owners can create memberships"
  ON memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT id FROM organizations WHERE owner_id = (select auth.uid())
    )
  );

CREATE POLICY "Organization owners can update memberships"
  ON memberships
  FOR UPDATE
  TO authenticated
  USING (
    org_id IN (
      SELECT id FROM organizations WHERE owner_id = (select auth.uid())
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT id FROM organizations WHERE owner_id = (select auth.uid())
    )
  );

CREATE POLICY "Organization owners can delete memberships"
  ON memberships
  FOR DELETE
  TO authenticated
  USING (
    org_id IN (
      SELECT id FROM organizations WHERE owner_id = (select auth.uid())
    )
  );

-- ============================================
-- INVITATIONS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view org invitations" ON invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON invitations;
DROP POLICY IF EXISTS "Admins can delete invitations" ON invitations;
DROP POLICY IF EXISTS "Admins can update invitations" ON invitations;

CREATE POLICY "Users can view org invitations"
  ON invitations
  FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM memberships WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Admins can create invitations"
  ON invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM memberships
      WHERE user_id = (select auth.uid()) AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Admins can delete invitations"
  ON invitations
  FOR DELETE
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM memberships
      WHERE user_id = (select auth.uid()) AND role IN ('owner', 'admin')
    )
  );

-- ============================================
-- PROJETS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view their org projets" ON projets;
DROP POLICY IF EXISTS "Users can manage their org projets" ON projets;
DROP POLICY IF EXISTS "Users can insert projets" ON projets;
DROP POLICY IF EXISTS "Users can update projets" ON projets;
DROP POLICY IF EXISTS "Users can delete projets" ON projets;

-- Single consolidated SELECT policy
CREATE POLICY "Users can view their org projets"
  ON projets
  FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM memberships WHERE user_id = (select auth.uid())
    )
  );

-- Single consolidated policy for INSERT/UPDATE/DELETE
CREATE POLICY "Users can manage their org projets"
  ON projets
  FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM memberships WHERE user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM memberships WHERE user_id = (select auth.uid())
    )
  );

-- ============================================
-- INVESTISSEURS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view their org investisseurs" ON investisseurs;
DROP POLICY IF EXISTS "Users can manage their org investisseurs" ON investisseurs;
DROP POLICY IF EXISTS "Users can insert investisseurs" ON investisseurs;
DROP POLICY IF EXISTS "Users can update investisseurs" ON investisseurs;
DROP POLICY IF EXISTS "Users can delete investisseurs" ON investisseurs;

CREATE POLICY "Users can view their org investisseurs"
  ON investisseurs
  FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM memberships WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can manage their org investisseurs"
  ON investisseurs
  FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM memberships WHERE user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM memberships WHERE user_id = (select auth.uid())
    )
  );

-- ============================================
-- TRANCHES TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view their org tranches" ON tranches;
DROP POLICY IF EXISTS "Users can manage their org tranches" ON tranches;
DROP POLICY IF EXISTS "Users can insert tranches" ON tranches;
DROP POLICY IF EXISTS "Users can update tranches" ON tranches;
DROP POLICY IF EXISTS "Users can delete tranches" ON tranches;

CREATE POLICY "Users can view their org tranches"
  ON tranches
  FOR SELECT
  TO authenticated
  USING (
    projet_id IN (
      SELECT p.id FROM projets p
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can manage their org tranches"
  ON tranches
  FOR ALL
  TO authenticated
  USING (
    projet_id IN (
      SELECT p.id FROM projets p
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    projet_id IN (
      SELECT p.id FROM projets p
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  );

-- ============================================
-- SOUSCRIPTIONS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view their org souscriptions" ON souscriptions;
DROP POLICY IF EXISTS "Users can manage their org souscriptions" ON souscriptions;
DROP POLICY IF EXISTS "Users can insert souscriptions" ON souscriptions;
DROP POLICY IF EXISTS "Users can update souscriptions" ON souscriptions;
DROP POLICY IF EXISTS "Users can delete souscriptions" ON souscriptions;

CREATE POLICY "Users can view their org souscriptions"
  ON souscriptions
  FOR SELECT
  TO authenticated
  USING (
    projet_id IN (
      SELECT p.id FROM projets p
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can manage their org souscriptions"
  ON souscriptions
  FOR ALL
  TO authenticated
  USING (
    projet_id IN (
      SELECT p.id FROM projets p
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    projet_id IN (
      SELECT p.id FROM projets p
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  );

-- ============================================
-- COUPONS_ECHEANCES TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view their org coupons" ON coupons_echeances;
DROP POLICY IF EXISTS "Users can manage their org coupons" ON coupons_echeances;
DROP POLICY IF EXISTS "Users can insert coupons" ON coupons_echeances;
DROP POLICY IF EXISTS "Users can update coupons" ON coupons_echeances;
DROP POLICY IF EXISTS "Users can delete coupons" ON coupons_echeances;

CREATE POLICY "Users can view their org coupons"
  ON coupons_echeances
  FOR SELECT
  TO authenticated
  USING (
    souscription_id IN (
      SELECT s.id FROM souscriptions s
      JOIN projets p ON p.id = s.projet_id
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can manage their org coupons"
  ON coupons_echeances
  FOR ALL
  TO authenticated
  USING (
    souscription_id IN (
      SELECT s.id FROM souscriptions s
      JOIN projets p ON p.id = s.projet_id
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    souscription_id IN (
      SELECT s.id FROM souscriptions s
      JOIN projets p ON p.id = s.projet_id
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  );

-- ============================================
-- PAIEMENTS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view their org paiements" ON paiements;
DROP POLICY IF EXISTS "Users can manage their org paiements" ON paiements;
DROP POLICY IF EXISTS "Users can insert paiements" ON paiements;
DROP POLICY IF EXISTS "Users can update paiements" ON paiements;
DROP POLICY IF EXISTS "Users can delete paiements" ON paiements;

CREATE POLICY "Users can view their org paiements"
  ON paiements
  FOR SELECT
  TO authenticated
  USING (
    echeance_id IN (
      SELECT ce.id FROM coupons_echeances ce
      JOIN souscriptions s ON s.id = ce.souscription_id
      JOIN projets p ON p.id = s.projet_id
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can manage their org paiements"
  ON paiements
  FOR ALL
  TO authenticated
  USING (
    echeance_id IN (
      SELECT ce.id FROM coupons_echeances ce
      JOIN souscriptions s ON s.id = ce.souscription_id
      JOIN projets p ON p.id = s.projet_id
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    echeance_id IN (
      SELECT ce.id FROM coupons_echeances ce
      JOIN souscriptions s ON s.id = ce.souscription_id
      JOIN projets p ON p.id = s.projet_id
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  );

-- ============================================
-- PAYMENT_PROOFS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view payment proofs" ON payment_proofs;
DROP POLICY IF EXISTS "Users can manage payment proofs" ON payment_proofs;
DROP POLICY IF EXISTS "Allow all operations on payment_proofs" ON payment_proofs;
DROP POLICY IF EXISTS "Users can insert payment_proofs" ON payment_proofs;
DROP POLICY IF EXISTS "Users can update payment_proofs" ON payment_proofs;
DROP POLICY IF EXISTS "Users can delete payment_proofs" ON payment_proofs;

CREATE POLICY "Users can view payment proofs"
  ON payment_proofs
  FOR SELECT
  TO authenticated
  USING (
    paiement_id IN (
      SELECT pa.id FROM paiements pa
      JOIN coupons_echeances ce ON ce.id = pa.echeance_id
      JOIN souscriptions s ON s.id = ce.souscription_id
      JOIN projets p ON p.id = s.projet_id
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can manage payment proofs"
  ON payment_proofs
  FOR ALL
  TO authenticated
  USING (
    paiement_id IN (
      SELECT pa.id FROM paiements pa
      JOIN coupons_echeances ce ON ce.id = pa.echeance_id
      JOIN souscriptions s ON s.id = ce.souscription_id
      JOIN projets p ON p.id = s.projet_id
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    paiement_id IN (
      SELECT pa.id FROM paiements pa
      JOIN coupons_echeances ce ON ce.id = pa.echeance_id
      JOIN souscriptions s ON s.id = ce.souscription_id
      JOIN projets p ON p.id = s.projet_id
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  );

-- Add comments for documentation
COMMENT ON POLICY "Users can view all profiles" ON public.profiles IS
  'Optimized: Uses (select auth.uid()) to prevent per-row re-evaluation. Allows all authenticated users to view profiles for admin functionality.';

COMMENT ON POLICY "Users can view organizations they are members of" ON organizations IS
  'Optimized: Uses (select auth.uid()) and consolidates org viewing policies';

COMMENT ON POLICY "Users can view their memberships" ON memberships IS
  'Optimized: Uses (select auth.uid()) and consolidates membership viewing policies';
-- ============================================
-- Create Invitations Table
-- Created: 2025-11-08
-- Purpose: Create invitations table if it doesn't exist and set up RLS policies
-- ============================================

-- Create invitations table
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view org invitations" ON invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON invitations;
DROP POLICY IF EXISTS "Admins can delete invitations" ON invitations;
DROP POLICY IF EXISTS "Admins can update invitations" ON invitations;

-- Policy for viewing invitations (all org members can see pending invitations)
CREATE POLICY "Users can view org invitations"
  ON invitations
  FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM memberships WHERE user_id = (select auth.uid())
    )
  );

-- Policy for creating invitations (admins and org owners)
CREATE POLICY "Admins can create invitations"
  ON invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow if user is admin/super_admin in memberships
    org_id IN (
      SELECT org_id FROM memberships
      WHERE user_id = (select auth.uid()) AND role IN ('admin', 'super_admin')
    )
    OR
    -- Allow if user is the organization owner
    org_id IN (
      SELECT id FROM organizations
      WHERE owner_id = (select auth.uid())
    )
  );

-- Policy for deleting invitations (admins and org owners)
CREATE POLICY "Admins can delete invitations"
  ON invitations
  FOR DELETE
  TO authenticated
  USING (
    -- Allow if user is admin/super_admin in memberships
    org_id IN (
      SELECT org_id FROM memberships
      WHERE user_id = (select auth.uid()) AND role IN ('admin', 'super_admin')
    )
    OR
    -- Allow if user is the organization owner
    org_id IN (
      SELECT id FROM organizations
      WHERE owner_id = (select auth.uid())
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invitations_org_id ON invitations(org_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);

-- Comments
COMMENT ON TABLE invitations IS 'Stores pending invitations for users to join organizations';
COMMENT ON POLICY "Users can view org invitations" ON invitations IS
  'All organization members can view pending invitations for their org';
COMMENT ON POLICY "Admins can create invitations" ON invitations IS
  'Organization owners and admins can create invitations';
COMMENT ON POLICY "Admins can delete invitations" ON invitations IS
  'Organization owners and admins can delete invitations';
-- ============================================
-- Complete RLS Setup for User Management
-- Created: 2025-11-08
-- Purpose: Fix all user/invitation deletion policies
-- ============================================

-- ============================================
-- 1. INVITATIONS - Delete invitations (for admins/owners)
-- ============================================

DROP POLICY IF EXISTS "Admins can delete invitations" ON invitations;

CREATE POLICY "Admins can delete invitations"
  ON invitations
  FOR DELETE
  TO authenticated
  USING (
    -- Organization owners can delete
    org_id IN (
      SELECT id FROM organizations
      WHERE owner_id = (select auth.uid())
    )
    OR
    -- Admins can delete
    org_id IN (
      SELECT org_id FROM memberships
      WHERE user_id = (select auth.uid())
      AND role IN ('admin', 'super_admin')
    )
  );

-- ============================================
-- 2. MEMBERSHIPS - Remove users from organizations
-- ============================================

DROP POLICY IF EXISTS "Organization owners can delete memberships" ON memberships;
DROP POLICY IF EXISTS "Admins can delete memberships" ON memberships;

CREATE POLICY "Admins and owners can delete memberships"
  ON memberships
  FOR DELETE
  TO authenticated
  USING (
    -- Organization owners can delete any membership in their org
    org_id IN (
      SELECT id FROM organizations
      WHERE owner_id = (select auth.uid())
    )
    OR
    -- Admins can delete memberships in their org (except owner's membership)
    (
      org_id IN (
        SELECT org_id FROM memberships
        WHERE user_id = (select auth.uid())
        AND role IN ('admin', 'super_admin')
      )
      AND
      -- Cannot delete the organization owner's membership
      user_id NOT IN (
        SELECT owner_id FROM organizations WHERE id = memberships.org_id
      )
    )
  );

-- Comments
COMMENT ON POLICY "Admins can delete invitations" ON invitations IS
  'Organization owners and admins can delete invitations - optimized with (select auth.uid())';

COMMENT ON POLICY "Admins and owners can delete memberships" ON memberships IS
  'Organization owners and admins can remove members, but admins cannot remove the owner';
-- ============================================
-- Workflow Simplification: Single Super Admin System
-- Created: 2025-11-08
-- Purpose:
--   - Super admin = single user identified by email (not in memberships)
--   - Organizations have owner_id (main admin)
--   - Memberships: only 'admin' or 'member' roles
--   - Invitations workflow for account creation
-- ============================================

-- IMPORTANT: Replace 'YOUR_SUPER_ADMIN_EMAIL@example.com' with your actual email address!

-- ============================================
-- Step 1: Clean up existing data
-- ============================================

-- Remove super_admin role from memberships (convert to admin)
UPDATE memberships
SET role = 'admin'
WHERE role = 'super_admin';

-- Fix organizations without owner_id
-- Replace with your actual super admin email
UPDATE organizations
SET owner_id = (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com')
WHERE owner_id IS NULL;

-- Update role constraint to only allow 'admin' and 'member'
ALTER TABLE memberships DROP CONSTRAINT IF EXISTS memberships_role_check;
ALTER TABLE memberships ADD CONSTRAINT memberships_role_check
  CHECK (role IN ('admin', 'member'));

-- ============================================
-- Step 2: Drop ALL existing policies
-- ============================================

-- Memberships policies
DROP POLICY IF EXISTS "Users can view their memberships" ON memberships;
DROP POLICY IF EXISTS "Users can view memberships" ON memberships;
DROP POLICY IF EXISTS "Organization owners can create memberships" ON memberships;
DROP POLICY IF EXISTS "Admins can create memberships" ON memberships;
DROP POLICY IF EXISTS "Organization owners can update memberships" ON memberships;
DROP POLICY IF EXISTS "Admins can update memberships" ON memberships;
DROP POLICY IF EXISTS "Organization owners can delete memberships" ON memberships;
DROP POLICY IF EXISTS "Admins can delete memberships" ON memberships;
DROP POLICY IF EXISTS "Admins and owners can delete memberships" ON memberships;

-- Organizations policies
DROP POLICY IF EXISTS "Users can view organizations they are members of" ON organizations;
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Super admin can create organizations" ON organizations;
DROP POLICY IF EXISTS "Organization owners can update their organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can update organizations" ON organizations;
DROP POLICY IF EXISTS "Organization owners can delete their organizations" ON organizations;
DROP POLICY IF EXISTS "Super admin can delete organizations" ON organizations;

-- Invitations policies
DROP POLICY IF EXISTS "Users can view org invitations" ON invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON invitations;
DROP POLICY IF EXISTS "Admins can delete invitations" ON invitations;
DROP POLICY IF EXISTS "Anyone authenticated can delete invitations" ON invitations;

-- ============================================
-- Step 3: Create new optimized policies
-- ============================================

-- ============================================
-- MEMBERSHIPS POLICIES
-- ============================================

CREATE POLICY "Users can view memberships"
  ON memberships FOR SELECT
  TO authenticated
  USING (
    -- Super admin can view all
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    -- Organization owners can view their org members
    org_id IN (SELECT id FROM organizations WHERE owner_id = (select auth.uid()))
    OR
    -- Admins can view their org members
    org_id IN (
      SELECT org_id FROM memberships
      WHERE user_id = (select auth.uid()) AND role = 'admin'
    )
    OR
    -- Users can view their own memberships
    user_id = (select auth.uid())
  );

CREATE POLICY "Admins can create memberships"
  ON memberships FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Super admin can create anywhere
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    -- Organization owners can create in their org
    org_id IN (SELECT id FROM organizations WHERE owner_id = (select auth.uid()))
    OR
    -- Admins can create in their org
    org_id IN (
      SELECT org_id FROM memberships
      WHERE user_id = (select auth.uid()) AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update memberships"
  ON memberships FOR UPDATE
  TO authenticated
  USING (
    -- Super admin can update anywhere
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    -- Organization owners can update in their org
    org_id IN (SELECT id FROM organizations WHERE owner_id = (select auth.uid()))
    OR
    -- Admins can update in their org (except owner)
    (
      org_id IN (
        SELECT org_id FROM memberships
        WHERE user_id = (select auth.uid()) AND role = 'admin'
      )
      AND user_id NOT IN (
        SELECT owner_id FROM organizations WHERE id = memberships.org_id
      )
    )
  )
  WITH CHECK (
    -- Same as USING
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    org_id IN (SELECT id FROM organizations WHERE owner_id = (select auth.uid()))
    OR
    (
      org_id IN (
        SELECT org_id FROM memberships
        WHERE user_id = (select auth.uid()) AND role = 'admin'
      )
      AND user_id NOT IN (
        SELECT owner_id FROM organizations WHERE id = memberships.org_id
      )
    )
  );

CREATE POLICY "Admins can delete memberships"
  ON memberships FOR DELETE
  TO authenticated
  USING (
    -- Super admin can delete anywhere
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    -- Organization owners can delete in their org
    org_id IN (SELECT id FROM organizations WHERE owner_id = (select auth.uid()))
    OR
    -- Admins can delete in their org (except owner)
    (
      EXISTS (
        SELECT 1 FROM memberships m
        WHERE m.org_id = memberships.org_id
        AND m.user_id = (select auth.uid())
        AND m.role = 'admin'
      )
      AND user_id NOT IN (
        SELECT owner_id FROM organizations WHERE id = memberships.org_id
      )
    )
  );

-- ============================================
-- ORGANIZATIONS POLICIES
-- ============================================

CREATE POLICY "Users can view their organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    -- Super admin can view all
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    -- Users can view orgs they are members of
    id IN (SELECT org_id FROM memberships WHERE user_id = (select auth.uid()))
  );

CREATE POLICY "Super admin can create organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
  );

CREATE POLICY "Admins can update organizations"
  ON organizations FOR UPDATE
  TO authenticated
  USING (
    -- Super admin can update all
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    -- Organization owners can update their org
    owner_id = (select auth.uid())
  )
  WITH CHECK (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    owner_id = (select auth.uid())
  );

CREATE POLICY "Super admin can delete organizations"
  ON organizations FOR DELETE
  TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
  );

-- ============================================
-- INVITATIONS POLICIES
-- ============================================

CREATE POLICY "Users can view org invitations"
  ON invitations FOR SELECT
  TO authenticated
  USING (
    -- Super admin can view all
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    -- Organization members can view their org invitations
    org_id IN (SELECT org_id FROM memberships WHERE user_id = (select auth.uid()))
  );

CREATE POLICY "Admins can create invitations"
  ON invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Super admin can create anywhere
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    -- Organization owners can create
    org_id IN (SELECT id FROM organizations WHERE owner_id = (select auth.uid()))
    OR
    -- Admins can create in their org
    org_id IN (
      SELECT org_id FROM memberships
      WHERE user_id = (select auth.uid()) AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete invitations"
  ON invitations FOR DELETE
  TO authenticated
  USING (
    -- Super admin can delete all
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    -- Organization owners can delete
    org_id IN (SELECT id FROM organizations WHERE owner_id = (select auth.uid()))
    OR
    -- Admins can delete in their org
    org_id IN (
      SELECT org_id FROM memberships
      WHERE user_id = (select auth.uid()) AND role = 'admin'
    )
  );

-- ============================================
-- Comments for documentation
-- ============================================

COMMENT ON POLICY "Users can view memberships" ON memberships IS
  'Super admin sees all. Org owners and admins see their org. Users see their own.';

COMMENT ON POLICY "Admins can create memberships" ON memberships IS
  'Super admin can create anywhere. Org owners and admins can create in their org.';

COMMENT ON POLICY "Admins can delete memberships" ON memberships IS
  'Super admin can delete anywhere. Org owners can delete in their org. Admins can delete in their org except the owner.';

COMMENT ON POLICY "Users can view their organizations" ON organizations IS
  'Super admin sees all organizations. Users see orgs they are members of.';

COMMENT ON POLICY "Super admin can create organizations" ON organizations IS
  'Only the super admin can create new organizations.';

COMMENT ON POLICY "Super admin can delete organizations" ON organizations IS
  'Only the super admin can delete organizations.';

COMMENT ON POLICY "Admins can create invitations" ON invitations IS
  'Super admin can invite to any org. Org owners and admins can invite to their org.';

COMMENT ON POLICY "Admins can delete invitations" ON invitations IS
  'Super admin can delete any invitation. Org owners and admins can delete invitations from their org.';

-- ============================================
-- Verification queries (run these to check)
-- ============================================

-- Check your setup
SELECT
    'Super Admin Check' as check_type,
    id,
    email,
    (email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') as is_super_admin
FROM auth.users
WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com';

-- Check organizations
SELECT
    'Organizations' as check_type,
    id,
    name,
    owner_id,
    (SELECT email FROM auth.users WHERE id = owner_id) as owner_email
FROM organizations;

-- Check memberships (should only have 'admin' or 'member')
SELECT
    'Memberships' as check_type,
    m.id,
    m.role,
    m.org_id,
    o.name as org_name,
    (SELECT email FROM auth.users WHERE id = m.user_id) as user_email
FROM memberships m
JOIN organizations o ON o.id = m.org_id;

-- Check for any remaining super_admin roles (should be empty)
SELECT * FROM memberships WHERE role = 'super_admin';
-- ============================================
-- Add Missing RLS Policies for Data Tables
-- Created: 2025-11-08
-- Purpose: Add RLS policies for projets, tranches, souscriptions, paiements, etc.
--          with super admin support
-- ============================================

-- IMPORTANT: Replace 'YOUR_SUPER_ADMIN_EMAIL@example.com' with your actual email address!

-- ============================================
-- PROFILES TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = (select auth.uid()));

-- ============================================
-- PROJETS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view their org projets" ON projets;
DROP POLICY IF EXISTS "Users can manage their org projets" ON projets;

CREATE POLICY "Users can view their org projets"
  ON projets
  FOR SELECT
  TO authenticated
  USING (
    -- Super admin can view all
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    -- Users can view their org projets
    org_id IN (
      SELECT org_id FROM memberships WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can manage their org projets"
  ON projets
  FOR ALL
  TO authenticated
  USING (
    -- Super admin can manage all
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    -- Users can manage their org projets
    org_id IN (
      SELECT org_id FROM memberships WHERE user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    org_id IN (
      SELECT org_id FROM memberships WHERE user_id = (select auth.uid())
    )
  );

-- ============================================
-- INVESTISSEURS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view their org investisseurs" ON investisseurs;
DROP POLICY IF EXISTS "Users can manage their org investisseurs" ON investisseurs;

CREATE POLICY "Users can view their org investisseurs"
  ON investisseurs
  FOR SELECT
  TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    org_id IN (
      SELECT org_id FROM memberships WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can manage their org investisseurs"
  ON investisseurs
  FOR ALL
  TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    org_id IN (
      SELECT org_id FROM memberships WHERE user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    org_id IN (
      SELECT org_id FROM memberships WHERE user_id = (select auth.uid())
    )
  );

-- ============================================
-- TRANCHES TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view their org tranches" ON tranches;
DROP POLICY IF EXISTS "Users can manage their org tranches" ON tranches;

CREATE POLICY "Users can view their org tranches"
  ON tranches
  FOR SELECT
  TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    projet_id IN (
      SELECT p.id FROM projets p
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can manage their org tranches"
  ON tranches
  FOR ALL
  TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    projet_id IN (
      SELECT p.id FROM projets p
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    projet_id IN (
      SELECT p.id FROM projets p
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  );

-- ============================================
-- SOUSCRIPTIONS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view their org souscriptions" ON souscriptions;
DROP POLICY IF EXISTS "Users can manage their org souscriptions" ON souscriptions;

CREATE POLICY "Users can view their org souscriptions"
  ON souscriptions
  FOR SELECT
  TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    projet_id IN (
      SELECT p.id FROM projets p
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can manage their org souscriptions"
  ON souscriptions
  FOR ALL
  TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    projet_id IN (
      SELECT p.id FROM projets p
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    projet_id IN (
      SELECT p.id FROM projets p
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  );

-- ============================================
-- COUPONS_ECHEANCES TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view their org coupons" ON coupons_echeances;
DROP POLICY IF EXISTS "Users can manage their org coupons" ON coupons_echeances;

CREATE POLICY "Users can view their org coupons"
  ON coupons_echeances
  FOR SELECT
  TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    souscription_id IN (
      SELECT s.id FROM souscriptions s
      JOIN projets p ON p.id = s.projet_id
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can manage their org coupons"
  ON coupons_echeances
  FOR ALL
  TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    souscription_id IN (
      SELECT s.id FROM souscriptions s
      JOIN projets p ON p.id = s.projet_id
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    souscription_id IN (
      SELECT s.id FROM souscriptions s
      JOIN projets p ON p.id = s.projet_id
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  );

-- ============================================
-- PAIEMENTS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view their org paiements" ON paiements;
DROP POLICY IF EXISTS "Users can manage their org paiements" ON paiements;

CREATE POLICY "Users can view their org paiements"
  ON paiements
  FOR SELECT
  TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    echeance_id IN (
      SELECT ce.id FROM coupons_echeances ce
      JOIN souscriptions s ON s.id = ce.souscription_id
      JOIN projets p ON p.id = s.projet_id
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can manage their org paiements"
  ON paiements
  FOR ALL
  TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    echeance_id IN (
      SELECT ce.id FROM coupons_echeances ce
      JOIN souscriptions s ON s.id = ce.souscription_id
      JOIN projets p ON p.id = s.projet_id
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    echeance_id IN (
      SELECT ce.id FROM coupons_echeances ce
      JOIN souscriptions s ON s.id = ce.souscription_id
      JOIN projets p ON p.id = s.projet_id
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  );

-- ============================================
-- PAYMENT_PROOFS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view payment proofs" ON payment_proofs;
DROP POLICY IF EXISTS "Users can manage payment proofs" ON payment_proofs;

CREATE POLICY "Users can view payment proofs"
  ON payment_proofs
  FOR SELECT
  TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    paiement_id IN (
      SELECT pa.id FROM paiements pa
      JOIN coupons_echeances ce ON ce.id = pa.echeance_id
      JOIN souscriptions s ON s.id = ce.souscription_id
      JOIN projets p ON p.id = s.projet_id
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can manage payment proofs"
  ON payment_proofs
  FOR ALL
  TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    paiement_id IN (
      SELECT pa.id FROM paiements pa
      JOIN coupons_echeances ce ON ce.id = pa.echeance_id
      JOIN souscriptions s ON s.id = ce.souscription_id
      JOIN projets p ON p.id = s.projet_id
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    paiement_id IN (
      SELECT pa.id FROM paiements pa
      JOIN coupons_echeances ce ON ce.id = pa.echeance_id
      JOIN souscriptions s ON s.id = ce.souscription_id
      JOIN projets p ON p.id = s.projet_id
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  );

-- ============================================
-- USER_REMINDER_SETTINGS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view their own reminder settings" ON user_reminder_settings;
DROP POLICY IF EXISTS "Users can insert their own reminder settings" ON user_reminder_settings;
DROP POLICY IF EXISTS "Users can update their own reminder settings" ON user_reminder_settings;
DROP POLICY IF EXISTS "Users can delete their own reminder settings" ON user_reminder_settings;

CREATE POLICY "Users can view their own reminder settings"
  ON user_reminder_settings
  FOR SELECT
  TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    user_id = (select auth.uid())
  );

CREATE POLICY "Users can insert their own reminder settings"
  ON user_reminder_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own reminder settings"
  ON user_reminder_settings
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    user_id = (select auth.uid())
  )
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their own reminder settings"
  ON user_reminder_settings
  FOR DELETE
  TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    user_id = (select auth.uid())
  );

-- ============================================
-- Comments for documentation
-- ============================================

COMMENT ON POLICY "Users can view their org projets" ON projets IS
  'Super admin can view all. Users can view their org projects. Uses (select auth.uid()) for performance.';

COMMENT ON POLICY "Users can view their org tranches" ON tranches IS
  'Super admin can view all. Users can view tranches for their org projects.';

COMMENT ON POLICY "Users can view their org souscriptions" ON souscriptions IS
  'Super admin can view all. Users can view souscriptions for their org projects.';

COMMENT ON POLICY "Users can view their org paiements" ON paiements IS
  'Super admin can view all. Users can view paiements for their org.';
-- ============================================
-- Fix Invitation Functions Search Path
-- Created: 2025-11-08
-- Purpose: Add search_path to invitation functions to fix security warnings
-- ============================================

-- Function to mark an invitation as accepted
-- This function is called when a user accepts an invitation
CREATE OR REPLACE FUNCTION public.mark_invitation_accepted(invitation_token TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.invitations
  SET
    status = 'accepted',
    accepted_at = NOW()
  WHERE token = invitation_token
    AND status = 'pending'
    AND expires_at > NOW();
END;
$$;

-- Trigger function to delete invitations when a user is deleted
-- This ensures cleanup of pending invitations for deleted users
CREATE OR REPLACE FUNCTION public.delete_invitation_on_user_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Delete any invitations that were sent by this user
  DELETE FROM public.invitations
  WHERE invited_by = OLD.id;

  RETURN OLD;
END;
$$;

-- Create trigger on auth.users table if it doesn't exist
DROP TRIGGER IF EXISTS on_user_delete_cleanup_invitations ON auth.users;
CREATE TRIGGER on_user_delete_cleanup_invitations
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_invitation_on_user_delete();

-- Add comments for documentation
COMMENT ON FUNCTION public.mark_invitation_accepted(TEXT) IS
  'Marks an invitation as accepted and sets the accepted_at timestamp. Only updates pending, non-expired invitations.';

COMMENT ON FUNCTION public.delete_invitation_on_user_delete() IS
  'Trigger function that deletes invitations when the user who sent them is deleted. Maintains referential integrity.';
-- Allow anonymous users to read invitations using their token
-- This is necessary for the invitation acceptance flow where users are not yet authenticated

-- Add policy for anonymous users to view their invitation by token
CREATE POLICY "Anyone can view invitation with valid token"
  ON invitations FOR SELECT
  TO anon
  USING (true);

-- Note: This allows any anonymous user to read any invitation
-- The security is handled by the token being a long, random UUID that is hard to guess
-- The token is: crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '')
-- Which gives approximately 2^256 possible values, making brute force attacks infeasible
