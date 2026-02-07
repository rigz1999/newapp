/*
  # Allow Emetteur Read Access to Tranches and Investisseurs

  ## Problem
  Emetteur users see an empty echeancier because RESTRICTIVE policies
  completely block their access to `tranches` and `investisseurs` tables.
  The ProjectDetail page needs both tables to display tranche info,
  echeancier data, and subscription details.

  ## Changes

  1. **Tranches Table**
     - Drop the blanket `block_emetteur_tranches` RESTRICTIVE FOR ALL policy
     - Add RESTRICTIVE SELECT policy that scopes emetteurs to their assigned projects only
     - Add RESTRICTIVE write policies (INSERT/UPDATE/DELETE) that block emetteurs

  2. **Investisseurs Table**
     - Drop the blanket `block_emetteur_investisseurs` RESTRICTIVE FOR ALL policy
     - Add RESTRICTIVE SELECT policy that scopes emetteurs to investors in their assigned projects
     - Add RESTRICTIVE write policies (INSERT/UPDATE/DELETE) that block emetteurs

  ## Security
  - Emetteurs can only READ tranches/investisseurs tied to their assigned projects
  - All write access remains blocked for emetteurs
  - Non-emetteur users are unaffected (pass through with no restrictions)
  - Superadmins always bypass via is_emetteur_role() returning FALSE
*/

-- ============================================
-- TRANCHES: Replace blanket block with scoped read + write block
-- ============================================

DROP POLICY IF EXISTS "block_emetteur_tranches" ON public.tranches;

CREATE POLICY "scope_emetteur_tranches_select"
  ON public.tranches AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING (
    NOT public.is_emetteur_role()
    OR
    projet_id IN (
      SELECT projet_id FROM public.emetteur_projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "block_emetteur_tranches_insert"
  ON public.tranches AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (NOT public.is_emetteur_role());

CREATE POLICY "block_emetteur_tranches_update"
  ON public.tranches AS RESTRICTIVE
  FOR UPDATE TO authenticated
  USING (NOT public.is_emetteur_role())
  WITH CHECK (NOT public.is_emetteur_role());

CREATE POLICY "block_emetteur_tranches_delete"
  ON public.tranches AS RESTRICTIVE
  FOR DELETE TO authenticated
  USING (NOT public.is_emetteur_role());

-- ============================================
-- INVESTISSEURS: Replace blanket block with scoped read + write block
-- ============================================

DROP POLICY IF EXISTS "block_emetteur_investisseurs" ON public.investisseurs;

CREATE POLICY "scope_emetteur_investisseurs_select"
  ON public.investisseurs AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING (
    NOT public.is_emetteur_role()
    OR
    id IN (
      SELECT DISTINCT investisseur_id FROM public.souscriptions
      WHERE projet_id IN (
        SELECT projet_id FROM public.emetteur_projects WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "block_emetteur_investisseurs_insert"
  ON public.investisseurs AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (NOT public.is_emetteur_role());

CREATE POLICY "block_emetteur_investisseurs_update"
  ON public.investisseurs AS RESTRICTIVE
  FOR UPDATE TO authenticated
  USING (NOT public.is_emetteur_role())
  WITH CHECK (NOT public.is_emetteur_role());

CREATE POLICY "block_emetteur_investisseurs_delete"
  ON public.investisseurs AS RESTRICTIVE
  FOR DELETE TO authenticated
  USING (NOT public.is_emetteur_role());
