/*
  # Add Attachments Support to Project Comments (Actualités)

  ## Changes
  
  1. New Column
    - Add `attachments` JSONB column to `project_comments` table
      - Stores array of file metadata (filename, url, size, type)
      - Default empty array
      - Nullable for backward compatibility
  
  2. Storage Bucket
    - Create `actualites-attachments` bucket for file storage
    - Public bucket for easy access
    - Support images (JPEG, PNG, GIF, WebP)
    - Support videos (MP4, MOV, WebM)
    - Support documents (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX)
    - Max file size: 100MB
  
  3. Security
    - RLS policies for upload (authenticated users in organization)
    - RLS policies for delete (comment owner or admin)
    - Public read access
  
  ## Notes
  - Attachment metadata stored in JSONB for flexibility
  - Files stored in Supabase Storage with organized paths
  - Path format: {org_id}/{project_id}/{comment_id}/{filename}
*/

-- Add attachments column to project_comments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_comments' AND column_name = 'attachments'
  ) THEN
    ALTER TABLE project_comments 
    ADD COLUMN attachments JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Create storage bucket for actualités attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'actualites-attachments',
  'actualites-attachments',
  true,
  104857600, -- 100MB in bytes
  ARRAY[
    -- Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    -- Videos
    'video/mp4',
    'video/quicktime',
    'video/webm',
    -- Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 104857600,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS Policies for actualites-attachments bucket

-- Allow authenticated users to upload files to their organization's projects
CREATE POLICY "Users can upload attachments to their org projects"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'actualites-attachments' AND
  (storage.foldername(name))[1] IN (
    SELECT org_id::text
    FROM memberships
    WHERE user_id = auth.uid()
  )
);

-- Allow authenticated users to delete their own comment attachments or org admins
CREATE POLICY "Users can delete their own attachments or org admins"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'actualites-attachments' AND
  (
    -- Check if user is the comment owner via the path structure
    -- Path format: org_id/project_id/comment_id/filename
    EXISTS (
      SELECT 1
      FROM project_comments pc
      WHERE pc.id::text = (storage.foldername(name))[3]
        AND pc.user_id = auth.uid()
    )
    OR
    -- Or if user is admin/owner of the organization
    EXISTS (
      SELECT 1
      FROM memberships m
      WHERE m.user_id = auth.uid()
        AND m.org_id::text = (storage.foldername(name))[1]
        AND m.role IN ('admin')
    )
  )
);

-- Public read access for all attachments
CREATE POLICY "Public read access for actualites attachments"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'actualites-attachments');