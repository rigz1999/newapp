/*
  # Fix Emetteur Access Control

  ## Problem
  Emetteur users can see ALL projects and data in the organization instead of 
  only their assigned projects. This is caused by:
  1. Duplicate permissive SELECT policies on `projets` (old `projets_select` was never dropped)
  2. `user_can_access_org()` does not check role, so emetteurs pass all org-level checks
  3. No role-based restrictions on investisseurs, paiements, souscriptions, tranches, coupons_echeances

  ## Changes

  1. **New Helper Function: `is_emetteur_role()`**
     - Returns TRUE if user only has emetteur memberships (no admin/member roles)
     - Superadmins always return FALSE (never restricted)
     - Used in RESTRICTIVE policies to block emetteur access

  2. **Projets Table**
     - Drop old `projets_select` policy (the root cause)
     - Recreate `projets_select_policy` with proper role check:
       non-emetteur org members get full access, emetteurs only see assigned projects

  3. **Investisseurs Table**
     - Add RESTRICTIVE policy blocking emetteur users entirely

  4. **Paiements Table**
     - Add RESTRICTIVE policy blocking emetteur users entirely

  5. **Souscriptions Table**
     - Update SELECT policy to scope emetteur access to their assigned projects only
     - Add RESTRICTIVE write policies blocking emetteur mutations

  6. **Tranches Table**
     - Add RESTRICTIVE policy blocking emetteur users entirely

  7. **Coupons Echeances Table**
     - Drop old `coupons_select` policy (same duplicate issue as projets)
     - Update `coupons_echeances_select_policy` to properly scope both roles
     - Add RESTRICTIVE write policies blocking emetteur mutations

  ## Security Notes
  - All changes use SECURITY DEFINER to avoid RLS recursion
  - Superadmin bypass is always preserved
  - Emetteurs retain read access to: their assigned projets, souscriptions for those projets,
    coupons_echeances for those projets, and project_comments (unchanged)
  - Emetteurs have NO access to: investisseurs, paiements, tranches
  - Emetteurs have NO write access to any table
*/

-- Step 1: Create helper function to detect emetteur-only users
CREATE OR REPLACE FUNCTION public.is_emetteur_role()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_super BOOLEAN;
  v_has_emetteur BOOLEAN;
  v_has_other BOOLEAN;
BEGIN
  SELECT COALESCE(is_superadmin, false) INTO v_is_super
  FROM profiles WHERE id = auth.uid();

  IF v_is_super THEN RETURN false; END IF;

  SELECT
    COALESCE(bool_or(role = 'emetteur'), false),
    COALESCE(bool_or(role != 'emetteur'), false)
  INTO v_has_emetteur, v_has_other
  FROM memberships
  WHERE user_id = auth.uid();

  RETURN v_has_emetteur AND NOT v_has_other;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_emetteur_role TO authenticated;

-- Step 2: Fix projets policies
-- Drop BOTH old select policies
DROP POLICY IF EXISTS "projets_select" ON public.projets;
DROP POLICY IF EXISTS "projets_select_policy" ON public.projets;

-- Recreate with proper emetteur scoping
CREATE POLICY "projets_select_policy"
  ON public.projets FOR SELECT
  TO authenticated
  USING (
    (NOT public.is_emetteur_role() AND public.user_can_access_org(org_id))
    OR
    (id IN (SELECT projet_id FROM public.emetteur_projects WHERE user_id = auth.uid()))
  );

-- Step 3: Block emetteurs from investisseurs
DROP POLICY IF EXISTS "block_emetteur_investisseurs" ON public.investisseurs;

CREATE POLICY "block_emetteur_investisseurs"
  ON public.investisseurs AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (NOT public.is_emetteur_role())
  WITH CHECK (NOT public.is_emetteur_role());

-- Step 4: Block emetteurs from paiements
DROP POLICY IF EXISTS "block_emetteur_paiements" ON public.paiements;

CREATE POLICY "block_emetteur_paiements"
  ON public.paiements AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (NOT public.is_emetteur_role())
  WITH CHECK (NOT public.is_emetteur_role());

-- Step 5: Block emetteurs from tranches
DROP POLICY IF EXISTS "block_emetteur_tranches" ON public.tranches;

CREATE POLICY "block_emetteur_tranches"
  ON public.tranches AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (NOT public.is_emetteur_role())
  WITH CHECK (NOT public.is_emetteur_role());

-- Step 6: Fix souscriptions - emetteurs need scoped read access
DROP POLICY IF EXISTS "souscriptions_select" ON public.souscriptions;

CREATE POLICY "souscriptions_select"
  ON public.souscriptions FOR SELECT
  TO authenticated
  USING (
    (NOT public.is_emetteur_role() AND EXISTS (
      SELECT 1 FROM public.tranches t
      JOIN public.projets p ON p.id = t.projet_id
      WHERE t.id = souscriptions.tranche_id
      AND public.user_can_access_org(p.org_id)
    ))
    OR
    (projet_id IN (
      SELECT projet_id FROM public.emetteur_projects WHERE user_id = auth.uid()
    ))
  );

-- Block emetteur write access on souscriptions
DROP POLICY IF EXISTS "block_emetteur_souscriptions_insert" ON public.souscriptions;
DROP POLICY IF EXISTS "block_emetteur_souscriptions_update" ON public.souscriptions;
DROP POLICY IF EXISTS "block_emetteur_souscriptions_delete" ON public.souscriptions;

CREATE POLICY "block_emetteur_souscriptions_insert"
  ON public.souscriptions AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (NOT public.is_emetteur_role());

CREATE POLICY "block_emetteur_souscriptions_update"
  ON public.souscriptions AS RESTRICTIVE
  FOR UPDATE TO authenticated
  USING (NOT public.is_emetteur_role())
  WITH CHECK (NOT public.is_emetteur_role());

CREATE POLICY "block_emetteur_souscriptions_delete"
  ON public.souscriptions AS RESTRICTIVE
  FOR DELETE TO authenticated
  USING (NOT public.is_emetteur_role());

-- Step 7: Fix coupons_echeances - drop old duplicate policy
DROP POLICY IF EXISTS "coupons_select" ON public.coupons_echeances;
DROP POLICY IF EXISTS "coupons_echeances_select_policy" ON public.coupons_echeances;

CREATE POLICY "coupons_echeances_select_policy"
  ON public.coupons_echeances FOR SELECT
  TO authenticated
  USING (
    (NOT public.is_emetteur_role() AND EXISTS (
      SELECT 1 FROM public.souscriptions s
      JOIN public.tranches t ON t.id = s.tranche_id
      JOIN public.projets p ON p.id = t.projet_id
      WHERE s.id = coupons_echeances.souscription_id
      AND public.user_can_access_org(p.org_id)
    ))
    OR
    (souscription_id IN (
      SELECT s.id FROM public.souscriptions s
      WHERE s.projet_id IN (
        SELECT projet_id FROM public.emetteur_projects WHERE user_id = auth.uid()
      )
    ))
  );

-- Block emetteur write access on coupons_echeances
DROP POLICY IF EXISTS "block_emetteur_coupons_insert" ON public.coupons_echeances;
DROP POLICY IF EXISTS "block_emetteur_coupons_update" ON public.coupons_echeances;
DROP POLICY IF EXISTS "block_emetteur_coupons_delete" ON public.coupons_echeances;

CREATE POLICY "block_emetteur_coupons_insert"
  ON public.coupons_echeances AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (NOT public.is_emetteur_role());

CREATE POLICY "block_emetteur_coupons_update"
  ON public.coupons_echeances AS RESTRICTIVE
  FOR UPDATE TO authenticated
  USING (NOT public.is_emetteur_role())
  WITH CHECK (NOT public.is_emetteur_role());

CREATE POLICY "block_emetteur_coupons_delete"
  ON public.coupons_echeances AS RESTRICTIVE
  FOR DELETE TO authenticated
  USING (NOT public.is_emetteur_role());
