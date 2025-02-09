/*
  # Fix Products RLS Policies

  1. Changes
    - Remove existing policies
    - Add new policies for products table:
      - Allow public read access for active products
      - Allow authenticated users to read all products
      - Allow authenticated users with proper permissions to manage products
  
  2. Security
    - Enable RLS
    - Add policies based on user roles and permissions
*/

-- Remove existing policies
DROP POLICY IF EXISTS "Allow public read access to products" ON products;
DROP POLICY IF EXISTS "Allow admin full access to products" ON products;

-- Add new policies
CREATE POLICY "Allow public read access to active products"
  ON products
  FOR SELECT
  TO public
  USING (active = true);

CREATE POLICY "Allow authenticated read access to all products"
  ON products
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow product management for authorized users"
  ON products
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND (
        role = 'admin'
        OR role = 'manager'
        OR (role = 'sales' AND 'manage_products' = ANY(permissions))
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND (
        role = 'admin'
        OR role = 'manager'
        OR (role = 'sales' AND 'manage_products' = ANY(permissions))
      )
    )
  );