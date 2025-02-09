-- Create email logs table
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  to_email TEXT NOT NULL,
  template TEXT NOT NULL,
  data JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  error TEXT
);

-- Enable RLS
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Policies for email logs
CREATE POLICY "Allow admin read access to email_logs"
  ON email_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Add indexes
CREATE INDEX IF NOT EXISTS email_logs_to_email_idx ON email_logs(to_email);
CREATE INDEX IF NOT EXISTS email_logs_template_idx ON email_logs(template);
CREATE INDEX IF NOT EXISTS email_logs_status_idx ON email_logs(status);
CREATE INDEX IF NOT EXISTS email_logs_created_at_idx ON email_logs(created_at);