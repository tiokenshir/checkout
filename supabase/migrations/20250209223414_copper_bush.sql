-- Drop existing policies
DROP POLICY IF EXISTS "Allow public read access to active products" ON products;
DROP POLICY IF EXISTS "Allow authenticated read access to all products" ON products;
DROP POLICY IF EXISTS "Allow product management for authorized users" ON products;

-- Create new policies
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

CREATE POLICY "Allow authenticated insert to products"
  ON products
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update to products"
  ON products
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated delete to products"
  ON products
  FOR DELETE
  TO authenticated
  USING (true);