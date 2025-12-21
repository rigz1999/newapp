-- Create payment-proofs-temp bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs-temp', 'payment-proofs-temp', false)
ON CONFLICT (id) DO NOTHING;

-- Ensure payment-proofs bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- RLS policies for payment-proofs bucket
CREATE POLICY IF NOT EXISTS "Allow authenticated uploads to payment-proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'payment-proofs');

CREATE POLICY IF NOT EXISTS "Allow public read from payment-proofs"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'payment-proofs');

CREATE POLICY IF NOT EXISTS "Allow authenticated delete from payment-proofs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'payment-proofs');

CREATE POLICY IF NOT EXISTS "Allow authenticated update to payment-proofs"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'payment-proofs');

-- RLS policies for payment-proofs-temp bucket
CREATE POLICY IF NOT EXISTS "Allow authenticated uploads to payment-proofs-temp"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'payment-proofs-temp');

CREATE POLICY IF NOT EXISTS "Allow authenticated read from payment-proofs-temp"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'payment-proofs-temp');

CREATE POLICY IF NOT EXISTS "Allow authenticated delete from payment-proofs-temp"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'payment-proofs-temp');

CREATE POLICY IF NOT EXISTS "Allow authenticated update to payment-proofs-temp"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'payment-proofs-temp');
