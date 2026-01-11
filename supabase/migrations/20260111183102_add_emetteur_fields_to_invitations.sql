/*
  # Add emetteur-specific fields to invitations table

  1. Changes
    - Add `emetteur_name` column to store the emetteur company name
    - Add `projet_id` column to link emetteur invitation to a specific project
    - Add `projet_name` column to store the project name for reference
    
  2. Purpose
    - When an emetteur invitation is accepted, we need to know:
      - Which project to assign them to (projet_id)
      - What emetteur company name to use (emetteur_name)
    - These fields are nullable and only used when role = 'emetteur'
    
  3. Notes
    - These fields are optional and only populated for emetteur invitations
    - Regular admin/member invitations will have these fields as NULL
*/

-- Add emetteur-specific fields to invitations table
ALTER TABLE invitations
ADD COLUMN IF NOT EXISTS emetteur_name text,
ADD COLUMN IF NOT EXISTS projet_id uuid REFERENCES projets(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS projet_name text;

-- Add comment explaining these fields
COMMENT ON COLUMN invitations.emetteur_name IS 'Company name of the emetteur (only used when role=emetteur)';
COMMENT ON COLUMN invitations.projet_id IS 'Project ID to assign emetteur to (only used when role=emetteur)';
COMMENT ON COLUMN invitations.projet_name IS 'Project name for reference (only used when role=emetteur)';
