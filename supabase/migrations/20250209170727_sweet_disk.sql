/*
  # Sistema de Relatórios Agendados

  1. Novas Tabelas
    - `report_schedules`: Configurações dos agendamentos de relatórios
    - `report_logs`: Histórico de execução dos relatórios

  2. Segurança
    - RLS habilitado em todas as tabelas
    - Políticas de acesso baseadas em funções de usuário

  3. Índices
    - Otimização para consultas frequentes
    - Índices em colunas de busca e ordenação
*/

-- Create report schedules table
CREATE TABLE IF NOT EXISTS report_schedules (
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

-- Create report logs table
CREATE TABLE IF NOT EXISTS report_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  schedule_id UUID REFERENCES report_schedules(id),
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  recipients TEXT[] NOT NULL,
  file_url TEXT,
  error TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE report_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_logs ENABLE ROW LEVEL SECURITY;

-- Policies for report schedules
CREATE POLICY "Allow admin access to report_schedules"
  ON report_schedules
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND (
        role = 'admin'
        OR (role = 'manager' AND 'view_reports' = ANY(permissions))
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND (
        role = 'admin'
        OR (role = 'manager' AND 'view_reports' = ANY(permissions))
      )
    )
  );

-- Policies for report logs
CREATE POLICY "Allow admin access to report_logs"
  ON report_logs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND (
        role = 'admin'
        OR (role = 'manager' AND 'view_reports' = ANY(permissions))
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND (
        role = 'admin'
        OR (role = 'manager' AND 'view_reports' = ANY(permissions))
      )
    )
  );

-- Add indexes
CREATE INDEX IF NOT EXISTS report_schedules_type_idx ON report_schedules(type);
CREATE INDEX IF NOT EXISTS report_schedules_frequency_idx ON report_schedules(frequency);
CREATE INDEX IF NOT EXISTS report_schedules_active_idx ON report_schedules(active);
CREATE INDEX IF NOT EXISTS report_schedules_next_run_idx ON report_schedules(next_run);
CREATE INDEX IF NOT EXISTS report_schedules_created_at_idx ON report_schedules(created_at);

CREATE INDEX IF NOT EXISTS report_logs_schedule_id_idx ON report_logs(schedule_id);
CREATE INDEX IF NOT EXISTS report_logs_status_idx ON report_logs(status);
CREATE INDEX IF NOT EXISTS report_logs_created_at_idx ON report_logs(created_at);

-- Function to calculate next run date
CREATE OR REPLACE FUNCTION calculate_next_run(
  frequency TEXT,
  last_run TIMESTAMPTZ DEFAULT NULL
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
AS $$
DECLARE
  next_date TIMESTAMPTZ;
BEGIN
  -- Se não houver última execução, usar data atual
  IF last_run IS NULL THEN
    last_run := now();
  END IF;

  CASE frequency
    WHEN 'daily' THEN
      next_date := last_run + INTERVAL '1 day';
    WHEN 'weekly' THEN
      next_date := last_run + INTERVAL '1 week';
    WHEN 'monthly' THEN
      next_date := last_run + INTERVAL '1 month';
    ELSE
      RAISE EXCEPTION 'Invalid frequency: %', frequency;
  END CASE;

  RETURN next_date;
END;
$$;

-- Trigger to update next_run on insert/update
CREATE OR REPLACE FUNCTION update_report_schedule_next_run()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.active != OLD.active OR NEW.frequency != OLD.frequency THEN
    NEW.next_run := calculate_next_run(NEW.frequency, NEW.last_run);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_report_schedule_next_run
  BEFORE INSERT OR UPDATE ON report_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_report_schedule_next_run();