-- Configurações iniciais
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabelas principais
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  cpf TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('product', 'service')),
  active BOOLEAN DEFAULT true
);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  product_id UUID NOT NULL REFERENCES products(id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'expired', 'cancelled')) DEFAULT 'pending',
  payment_qr_code TEXT NOT NULL,
  payment_code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT,
  transaction_id TEXT,
  paid_at TIMESTAMPTZ,
  coupon_id UUID REFERENCES coupons(id),
  discount_amount DECIMAL(10,2) DEFAULT 0
);

-- Sistema de cupons
CREATE TABLE coupons (
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

CREATE TABLE coupon_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  coupon_id UUID REFERENCES coupons(id),
  order_id UUID REFERENCES orders(id),
  customer_id UUID REFERENCES customers(id),
  discount_amount DECIMAL NOT NULL
);

-- Sistema de arquivos
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  bucket TEXT NOT NULL,
  path TEXT NOT NULL,
  size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(bucket, path)
);

-- Sistema de notificações
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES auth.users(id),
  type TEXT NOT NULL CHECK (type IN ('order_status', 'payment', 'system')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  data JSONB
);

-- Sistema de auditoria
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT
);

-- Sistema de segurança
CREATE TABLE login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  email TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  blocked_until TIMESTAMPTZ
);

CREATE TABLE blocked_ips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  ip_address TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id)
);

-- Sistema de relatórios
CREATE TABLE report_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('sales', 'products', 'customers')),
  format TEXT NOT NULL CHECK (format IN ('pdf', 'excel')),
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  recipients TEXT[] NOT NULL,
  active BOOLEAN DEFAULT true,
  last_run TIMESTAMPTZ,
  next_run TIMESTAMPTZ,
  settings JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id)
);

CREATE TABLE report_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  schedule_id UUID REFERENCES report_schedules(id),
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  recipients TEXT[] NOT NULL,
  file_url TEXT,
  error TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Índices
CREATE INDEX customers_email_idx ON customers(email);
CREATE INDEX customers_cpf_idx ON customers(cpf);
CREATE INDEX products_active_idx ON products(active);
CREATE INDEX orders_customer_id_idx ON orders(customer_id);
CREATE INDEX orders_product_id_idx ON orders(product_id);
CREATE INDEX orders_status_idx ON orders(status);
CREATE INDEX orders_created_at_idx ON orders(created_at);
CREATE INDEX coupons_code_idx ON coupons(code);
CREATE INDEX coupons_active_idx ON coupons(active);
CREATE INDEX coupons_expires_at_idx ON coupons(expires_at);
CREATE INDEX notifications_user_id_idx ON notifications(user_id);
CREATE INDEX notifications_read_idx ON notifications(read);
CREATE INDEX audit_logs_user_id_idx ON audit_logs(user_id);
CREATE INDEX audit_logs_table_name_idx ON audit_logs(table_name);
CREATE INDEX login_attempts_email_idx ON login_attempts(email);
CREATE INDEX login_attempts_ip_address_idx ON login_attempts(ip_address);
CREATE INDEX report_schedules_active_idx ON report_schedules(active);
CREATE INDEX report_schedules_next_run_idx ON report_schedules(next_run);

-- Funções
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER set_timestamp
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_timestamp
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_timestamp
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
