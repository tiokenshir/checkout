-- Create whatsapp logs table
CREATE TABLE IF NOT EXISTS whatsapp_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  to_phone TEXT NOT NULL,
  template TEXT NOT NULL,
  data JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  error TEXT,
  message_id TEXT
);

-- Enable RLS
ALTER TABLE whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- Policies for whatsapp logs
CREATE POLICY "Allow admin read access to whatsapp_logs"
  ON whatsapp_logs
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
CREATE INDEX IF NOT EXISTS whatsapp_logs_to_phone_idx ON whatsapp_logs(to_phone);
CREATE INDEX IF NOT EXISTS whatsapp_logs_template_idx ON whatsapp_logs(template);
CREATE INDEX IF NOT EXISTS whatsapp_logs_status_idx ON whatsapp_logs(status);
CREATE INDEX IF NOT EXISTS whatsapp_logs_created_at_idx ON whatsapp_logs(created_at);