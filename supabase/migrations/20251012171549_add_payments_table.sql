/*
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
  );