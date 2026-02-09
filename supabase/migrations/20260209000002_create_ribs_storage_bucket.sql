-- Create ribs storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('ribs', 'ribs', false)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated uploads to ribs" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated read from ribs" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete from ribs" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update to ribs" ON storage.objects;

-- RLS policies for ribs bucket
CREATE POLICY "Allow authenticated uploads to ribs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ribs');

CREATE POLICY "Allow authenticated read from ribs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'ribs');

CREATE POLICY "Allow authenticated delete from ribs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'ribs');

CREATE POLICY "Allow authenticated update to ribs"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'ribs');
