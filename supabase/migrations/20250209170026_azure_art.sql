-- Create backup logs table
CREATE TABLE IF NOT EXISTS backup_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  type TEXT NOT NULL CHECK (type IN ('backup', 'restore')),
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  file_name TEXT,
  file_size BIGINT,
  tables TEXT[],
  error TEXT,
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE backup_logs ENABLE ROW LEVEL SECURITY;

-- Policies for backup logs
CREATE POLICY "Allow admin access to backup_logs"
  ON backup_logs
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
CREATE INDEX IF NOT EXISTS backup_logs_type_idx ON backup_logs(type);
CREATE INDEX IF NOT EXISTS backup_logs_status_idx ON backup_logs(status);
CREATE INDEX IF NOT EXISTS backup_logs_created_at_idx ON backup_logs(created_at);