-- Create drive_files table
CREATE TABLE IF NOT EXISTS drive_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  product_id UUID REFERENCES products(id),
  drive_file_id TEXT NOT NULL,
  name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size BIGINT,
  web_view_link TEXT,
  download_link TEXT
);

-- Create access_requests table
CREATE TABLE IF NOT EXISTS access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  order_id UUID REFERENCES orders(id),
  customer_id UUID REFERENCES customers(id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create access_logs table
CREATE TABLE IF NOT EXISTS access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  request_id UUID REFERENCES access_requests(id),
  customer_id UUID REFERENCES customers(id),
  file_id UUID REFERENCES drive_files(id),
  action TEXT NOT NULL CHECK (action IN ('view', 'download')),
  ip_address TEXT,
  user_agent TEXT
);

-- Enable RLS
ALTER TABLE drive_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow admin access to drive_files"
  ON drive_files
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Allow customers to view approved files"
  ON drive_files
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM access_requests ar
      WHERE ar.status = 'approved'
      AND ar.customer_id = auth.uid()
      AND ar.expires_at > now()
      AND ar.order_id IN (
        SELECT o.id FROM orders o
        WHERE o.product_id = drive_files.product_id
      )
    )
  );

CREATE POLICY "Allow customers to create access requests"
  ON access_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Allow customers to view own requests"
  ON access_requests
  FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "Allow admin manage access requests"
  ON access_requests
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Add indexes
CREATE INDEX IF NOT EXISTS drive_files_product_id_idx ON drive_files(product_id);
CREATE INDEX IF NOT EXISTS access_requests_order_id_idx ON access_requests(order_id);
CREATE INDEX IF NOT EXISTS access_requests_customer_id_idx ON access_requests(customer_id);
CREATE INDEX IF NOT EXISTS access_requests_status_idx ON access_requests(status);
CREATE INDEX IF NOT EXISTS access_logs_request_id_idx ON access_logs(request_id);
CREATE INDEX IF NOT EXISTS access_logs_customer_id_idx ON access_logs(customer_id);
CREATE INDEX IF NOT EXISTS access_logs_file_id_idx ON access_logs(file_id);