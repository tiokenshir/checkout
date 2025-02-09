-- Create coupons table
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed')),
  value DECIMAL NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  min_purchase_amount DECIMAL,
  product_id UUID REFERENCES products(id),
  active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id)
);

-- Create coupon uses table
CREATE TABLE IF NOT EXISTS coupon_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  coupon_id UUID REFERENCES coupons(id),
  order_id UUID REFERENCES orders(id),
  customer_id UUID REFERENCES customers(id),
  discount_amount DECIMAL NOT NULL
);

-- Add coupon fields to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES coupons(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount DECIMAL DEFAULT 0;

-- Create login attempts table for security
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  email TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  blocked_until TIMESTAMPTZ
);

-- Create blocked IPs table
CREATE TABLE IF NOT EXISTS blocked_ips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  ip_address TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_uses ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_ips ENABLE ROW LEVEL SECURITY;

-- Policies for coupons
CREATE POLICY "Allow public read access to active coupons"
  ON coupons
  FOR SELECT
  TO public
  USING (
    active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_uses IS NULL OR current_uses < max_uses)
  );

CREATE POLICY "Allow authenticated manage coupons"
  ON coupons
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policies for coupon uses
CREATE POLICY "Allow public insert to coupon uses"
  ON coupon_uses
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow authenticated read coupon uses"
  ON coupon_uses
  FOR SELECT
  TO authenticated
  USING (true);

-- Add indexes
CREATE INDEX IF NOT EXISTS coupons_code_idx ON coupons(code);
CREATE INDEX IF NOT EXISTS coupons_active_idx ON coupons(active);
CREATE INDEX IF NOT EXISTS coupons_expires_at_idx ON coupons(expires_at);
CREATE INDEX IF NOT EXISTS coupon_uses_coupon_id_idx ON coupon_uses(coupon_id);
CREATE INDEX IF NOT EXISTS coupon_uses_order_id_idx ON coupon_uses(order_id);
CREATE INDEX IF NOT EXISTS login_attempts_email_idx ON login_attempts(email);
CREATE INDEX IF NOT EXISTS login_attempts_ip_address_idx ON login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS blocked_ips_ip_address_idx ON blocked_ips(ip_address);