-- Habilitar chaves estrangeiras
PRAGMA foreign_keys = ON;

-- Tabelas principais
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  cpf TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('product', 'service')),
  active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'expired', 'cancelled')) DEFAULT 'pending',
  payment_qr_code TEXT NOT NULL,
  payment_code TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT,
  transaction_id TEXT,
  paid_at DATETIME,
  coupon_id TEXT REFERENCES coupons(id),
  discount_amount DECIMAL DEFAULT 0
);

-- Sistema de cupons
CREATE TABLE IF NOT EXISTS coupons (
  id TEXT PRIMARY KEY,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed')),
  value DECIMAL NOT NULL,
  starts_at DATETIME NOT NULL,
  expires_at DATETIME,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  min_purchase_amount DECIMAL,
  product_id TEXT REFERENCES products(id),
  active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS coupon_uses (
  id TEXT PRIMARY KEY,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  coupon_id TEXT REFERENCES coupons(id),
  order_id TEXT REFERENCES orders(id),
  customer_id TEXT REFERENCES customers(id),
  discount_amount DECIMAL NOT NULL
);

-- Sistema de arquivos
CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  bucket TEXT NOT NULL,
  path TEXT NOT NULL,
  size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  metadata TEXT DEFAULT '{}',
  UNIQUE(bucket, path)
);

-- Sistema de notificações
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  type TEXT NOT NULL CHECK (type IN ('order_status', 'payment', 'system')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  read INTEGER DEFAULT 0,
  data TEXT DEFAULT '{}'
);

-- Logs e auditoria
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  old_data TEXT,
  new_data TEXT
);

CREATE TABLE IF NOT EXISTS login_attempts (
  id TEXT PRIMARY KEY,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  email TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  success INTEGER NOT NULL,
  blocked_until DATETIME
);

CREATE TABLE IF NOT EXISTS blocked_ips (
  id TEXT PRIMARY KEY,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ip_address TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  expires_at DATETIME
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_cpf ON customers(cpf);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_product_id ON orders(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(active);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_ip_address ON blocked_ips(ip_address);