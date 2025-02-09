-- Drop existing policies
DROP POLICY IF EXISTS "Allow public read access to customers" ON customers;
DROP POLICY IF EXISTS "Allow insert access to customers" ON customers;

-- Create new policies
CREATE POLICY "Allow public read access to customers"
  ON customers
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to customers"
  ON customers
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow authenticated full access to customers"
  ON customers
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS customers_email_idx ON customers(email);
CREATE INDEX IF NOT EXISTS customers_cpf_idx ON customers(cpf);