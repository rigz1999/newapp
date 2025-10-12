/*
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
