-- Create cloud storage integrations table
CREATE TABLE IF NOT EXISTS storage_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  provider TEXT NOT NULL CHECK (provider IN ('dropbox', 'google_drive', 'onedrive')),
  credentials JSONB NOT NULL,
  settings JSONB DEFAULT '{}'::jsonb,
  active BOOLEAN DEFAULT true,
  user_id UUID REFERENCES auth.users(id)
);

-- Create storage sync logs table
CREATE TABLE IF NOT EXISTS storage_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  integration_id UUID REFERENCES storage_integrations(id),
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  files_synced INTEGER DEFAULT 0,
  total_size BIGINT DEFAULT 0,
  error TEXT
);

-- Create WhatsApp settings table
CREATE TABLE IF NOT EXISTS whatsapp_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  api_url TEXT NOT NULL,
  api_key TEXT NOT NULL,
  webhook_url TEXT,
  default_message_template JSONB DEFAULT '{}'::jsonb,
  active BOOLEAN DEFAULT true,
  user_id UUID REFERENCES auth.users(id)
);

-- Create WhatsApp templates table
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  category TEXT NOT NULL CHECK (category IN ('order', 'payment', 'notification')),
  active BOOLEAN DEFAULT true
);

-- Enable RLS
ALTER TABLE storage_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- Policies for storage_integrations
CREATE POLICY "Users can manage own storage integrations"
  ON storage_integrations
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies for storage_sync_logs
CREATE POLICY "Users can view own sync logs"
  ON storage_sync_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM storage_integrations
      WHERE id = integration_id AND user_id = auth.uid()
    )
  );

-- Policies for whatsapp_settings
CREATE POLICY "Users can manage own WhatsApp settings"
  ON whatsapp_settings
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies for whatsapp_templates
CREATE POLICY "Users can view WhatsApp templates"
  ON whatsapp_templates
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage WhatsApp templates"
  ON whatsapp_templates
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Add indexes
CREATE INDEX IF NOT EXISTS storage_integrations_user_id_idx ON storage_integrations(user_id);
CREATE INDEX IF NOT EXISTS storage_integrations_provider_idx ON storage_integrations(provider);
CREATE INDEX IF NOT EXISTS storage_sync_logs_integration_id_idx ON storage_sync_logs(integration_id);
CREATE INDEX IF NOT EXISTS whatsapp_settings_user_id_idx ON whatsapp_settings(user_id);
CREATE INDEX IF NOT EXISTS whatsapp_templates_category_idx ON whatsapp_templates(category);