/*
  # Initial Schema Setup

  1. Tables
    - customers: Stores customer information
    - products: Stores product and service information
    - orders: Stores order information and payment status

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  cpf TEXT NOT NULL,
  phone TEXT NOT NULL,
  CONSTRAINT customers_email_key UNIQUE (email),
  CONSTRAINT customers_cpf_key UNIQUE (cpf)
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('product', 'service')),
  active BOOLEAN DEFAULT true
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  product_id UUID NOT NULL REFERENCES products(id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'expired', 'cancelled')) DEFAULT 'pending',
  payment_qr_code TEXT NOT NULL,
  payment_code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL
);

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Policies for customers
CREATE POLICY "Allow public read access to customers"
  ON customers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow insert access to customers"
  ON customers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policies for products
CREATE POLICY "Allow public read access to products"
  ON products
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow admin full access to products"
  ON products
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'admin'
  )
  WITH CHECK (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Policies for orders
CREATE POLICY "Allow public read access to orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow insert access to orders"
  ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow admin update access to orders"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'admin'
  )
  WITH CHECK (
    auth.jwt() ->> 'role' = 'admin'
  );