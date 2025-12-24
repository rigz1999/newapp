-- Fix Storage Buckets and RLS Policies for Paris Database
-- Run this in the Paris database SQL Editor to enable payment file uploads

-- =====================================================
-- STORAGE BUCKETS
-- =====================================================

-- Create payment-proofs bucket (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-proofs',
  'payment-proofs',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];

-- Create payment-proofs-temp bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-proofs-temp',
  'payment-proofs-temp',
  false,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];

-- =====================================================
-- RLS POLICIES FOR payment-proofs BUCKET
-- =====================================================

-- Allow authenticated users to insert
DROP POLICY IF EXISTS "Authenticated users can upload payment proofs" ON storage.objects;
CREATE POLICY "Authenticated users can upload payment proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'payment-proofs');

-- Allow authenticated users to select
DROP POLICY IF EXISTS "Authenticated users can view payment proofs" ON storage.objects;
CREATE POLICY "Authenticated users can view payment proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'payment-proofs');

-- Allow authenticated users to delete
DROP POLICY IF EXISTS "Authenticated users can delete payment proofs" ON storage.objects;
CREATE POLICY "Authenticated users can delete payment proofs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'payment-proofs');

-- Allow authenticated users to update
DROP POLICY IF EXISTS "Authenticated users can update payment proofs" ON storage.objects;
CREATE POLICY "Authenticated users can update payment proofs"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'payment-proofs');

-- =====================================================
-- RLS POLICIES FOR payment-proofs-temp BUCKET
-- =====================================================

-- Allow authenticated users to insert
DROP POLICY IF EXISTS "Authenticated users can upload temp payment proofs" ON storage.objects;
CREATE POLICY "Authenticated users can upload temp payment proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'payment-proofs-temp');

-- Allow authenticated users to select
DROP POLICY IF EXISTS "Authenticated users can view temp payment proofs" ON storage.objects;
CREATE POLICY "Authenticated users can view temp payment proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'payment-proofs-temp');

-- Allow authenticated users to delete
DROP POLICY IF EXISTS "Authenticated users can delete temp payment proofs" ON storage.objects;
CREATE POLICY "Authenticated users can delete temp payment proofs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'payment-proofs-temp');

-- Allow authenticated users to update
DROP POLICY IF EXISTS "Authenticated users can update temp payment proofs" ON storage.objects;
CREATE POLICY "Authenticated users can update temp payment proofs"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'payment-proofs-temp');

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify buckets created
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id IN ('payment-proofs', 'payment-proofs-temp');

-- Verify policies created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'objects'
AND policyname LIKE '%payment proofs%'
ORDER BY policyname;
