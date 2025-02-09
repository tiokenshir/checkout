-- Drop existing policies
DROP POLICY IF EXISTS "Allow public read access to orders" ON orders;
DROP POLICY IF EXISTS "Allow insert access to orders" ON orders;
DROP POLICY IF EXISTS "Allow admin update access to orders" ON orders;

-- Create new policies
CREATE POLICY "Allow public read access to orders"
  ON orders
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to orders"
  ON orders
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update to orders"
  ON orders
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS orders_customer_id_idx ON orders(customer_id);
CREATE INDEX IF NOT EXISTS orders_product_id_idx ON orders(product_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders(created_at);