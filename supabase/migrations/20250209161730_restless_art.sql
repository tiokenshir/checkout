/*
  # Add payment links and roles

  1. New Tables
    - `payment_links`
      - `id` (uuid, primary key)
      - `created_at` (timestamp)
      - `expires_at` (timestamp)
      - `product_id` (uuid, references products)
      - `status` (text: active, expired, used)
      - `created_by` (text)
      - `url_token` (text, unique)

    - `user_roles`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `role` (text: admin, manager, sales)
      - `permissions` (text[])

  2. Security
    - Enable RLS on new tables
    - Add policies for role-based access
*/

-- Create payment links table
CREATE TABLE IF NOT EXISTS payment_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  product_id UUID NOT NULL REFERENCES products(id),
  status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'used')) DEFAULT 'active',
  created_by TEXT NOT NULL,
  url_token TEXT UNIQUE NOT NULL
);

-- Create user roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'sales')),
  permissions TEXT[] NOT NULL,
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Policies for payment_links
CREATE POLICY "Allow authenticated read access to payment_links"
  ON payment_links
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert to payment_links"
  ON payment_links
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND (
        role = 'admin'
        OR role = 'manager'
        OR (role = 'sales' AND 'create_payment_links' = ANY(permissions))
      )
    )
  );

-- Policies for user_roles
CREATE POLICY "Allow admin read access to user_roles"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Allow admin manage user_roles"
  ON user_roles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Add indexes
CREATE INDEX IF NOT EXISTS payment_links_status_idx ON payment_links(status);
CREATE INDEX IF NOT EXISTS payment_links_expires_at_idx ON payment_links(expires_at);
CREATE INDEX IF NOT EXISTS payment_links_url_token_idx ON payment_links(url_token);
CREATE INDEX IF NOT EXISTS user_roles_user_id_idx ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS user_roles_role_idx ON user_roles(role);