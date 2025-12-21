-- Create payment-proofs-temp bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs-temp', 'payment-proofs-temp', false)
ON CONFLICT (id) DO NOTHING;

-- Ensure payment-proofs bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies if they exist (payment-proofs)
DROP POLICY IF EXISTS "Allow authenticated uploads to payment-proofs" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read from payment-proofs" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete from payment-proofs" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update to payment-proofs" ON storage.objects;

-- Drop existing policies if they exist (payment-proofs-temp)
DROP POLICY IF EXISTS "Allow authenticated uploads to payment-proofs-temp" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated read from payment-proofs-temp" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete from payment-proofs-temp" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update to payment-proofs-temp" ON storage.objects;

-- Create RLS policies for payment-proofs bucket
CREATE POLICY "Allow authenticated uploads to payment-proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'payment-proofs');

CREATE POLICY "Allow public read from payment-proofs"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'payment-proofs');

CREATE POLICY "Allow authenticated delete from payment-proofs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'payment-proofs');

CREATE POLICY "Allow authenticated update to payment-proofs"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'payment-proofs');

-- Create RLS policies for payment-proofs-temp bucket
CREATE POLICY "Allow authenticated uploads to payment-proofs-temp"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'payment-proofs-temp');

CREATE POLICY "Allow authenticated read from payment-proofs-temp"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'payment-proofs-temp');

CREATE POLICY "Allow authenticated delete from payment-proofs-temp"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'payment-proofs-temp');

CREATE POLICY "Allow authenticated update to payment-proofs-temp"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'payment-proofs-temp');
