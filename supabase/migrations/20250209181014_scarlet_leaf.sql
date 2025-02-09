-- Create external integrations table
CREATE TABLE IF NOT EXISTS external_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('webhook', 'api')),
  endpoint TEXT NOT NULL,
  api_key TEXT NOT NULL UNIQUE,
  active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  user_id UUID REFERENCES auth.users(id)
);

-- Create integration logs table
CREATE TABLE IF NOT EXISTS integration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  integration_id UUID REFERENCES external_integrations(id),
  event TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  request JSONB,
  response JSONB,
  error TEXT,
  duration INTEGER -- in milliseconds
);

-- Enable RLS
ALTER TABLE external_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_logs ENABLE ROW LEVEL SECURITY;

-- Policies for external_integrations
CREATE POLICY "Users can manage own integrations"
  ON external_integrations
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies for integration_logs
CREATE POLICY "Users can view own integration logs"
  ON integration_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM external_integrations
      WHERE id = integration_id AND user_id = auth.uid()
    )
  );

-- Add indexes
CREATE INDEX IF NOT EXISTS external_integrations_user_id_idx ON external_integrations(user_id);
CREATE INDEX IF NOT EXISTS external_integrations_type_idx ON external_integrations(type);
CREATE INDEX IF NOT EXISTS external_integrations_active_idx ON external_integrations(active);
CREATE INDEX IF NOT EXISTS integration_logs_integration_id_idx ON integration_logs(integration_id);
CREATE INDEX IF NOT EXISTS integration_logs_status_idx ON integration_logs(status);
CREATE INDEX IF NOT EXISTS integration_logs_created_at_idx ON integration_logs(created_at);

-- Add trigger for logging
CREATE OR REPLACE FUNCTION log_integration_call()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO integration_logs (
    integration_id,
    event,
    status,
    request,
    response,
    error,
    duration
  ) VALUES (
    NEW.id,
    NEW.metadata->>'event',
    CASE WHEN NEW.metadata->>'error' IS NULL THEN 'success' ELSE 'failed' END,
    NEW.metadata->'request',
    NEW.metadata->'response',
    NEW.metadata->>'error',
    (EXTRACT(EPOCH FROM now()) - EXTRACT(EPOCH FROM NEW.created_at))::INTEGER * 1000
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_integration_call
  AFTER INSERT ON external_integrations
  FOR EACH ROW
  EXECUTE FUNCTION log_integration_call();