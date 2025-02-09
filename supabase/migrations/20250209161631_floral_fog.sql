/*
  # Add order notes table

  1. New Tables
    - `order_notes`
      - `id` (uuid, primary key)
      - `order_id` (uuid, references orders)
      - `content` (text)
      - `created_at` (timestamp)
      - `created_by` (text)

  2. Security
    - Enable RLS on `order_notes` table
    - Add policies for authenticated users
*/

-- Create order notes table
CREATE TABLE IF NOT EXISTS order_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  order_id UUID NOT NULL REFERENCES orders(id),
  content TEXT NOT NULL,
  created_by TEXT NOT NULL
);

-- Enable RLS
ALTER TABLE order_notes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow authenticated read access to order_notes"
  ON order_notes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert to order_notes"
  ON order_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add indexes
CREATE INDEX IF NOT EXISTS order_notes_order_id_idx ON order_notes(order_id);
CREATE INDEX IF NOT EXISTS order_notes_created_at_idx ON order_notes(created_at);