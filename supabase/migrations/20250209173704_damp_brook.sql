-- Analytics Tables
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  data JSONB NOT NULL,
  session_id TEXT,
  ip_address TEXT,
  user_agent TEXT
);

CREATE TABLE IF NOT EXISTS analytics_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  name TEXT NOT NULL,
  value DECIMAL NOT NULL,
  dimension TEXT,
  period TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS analytics_dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  name TEXT NOT NULL,
  description TEXT,
  layout JSONB NOT NULL,
  widgets JSONB[] NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  is_public BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS analytics_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  model_type TEXT NOT NULL,
  target_metric TEXT NOT NULL,
  prediction_date TIMESTAMPTZ NOT NULL,
  predicted_value DECIMAL NOT NULL,
  confidence_score DECIMAL,
  features JSONB NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Automation Tables
CREATE TABLE IF NOT EXISTS automation_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL,
  trigger_config JSONB NOT NULL,
  actions JSONB[] NOT NULL,
  active BOOLEAN DEFAULT true,
  user_id UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  name TEXT NOT NULL,
  description TEXT,
  conditions JSONB[] NOT NULL,
  actions JSONB[] NOT NULL,
  priority INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  user_id UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS automation_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  workflow_id UUID REFERENCES automation_workflows(id),
  rule_id UUID REFERENCES automation_rules(id),
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
  result JSONB,
  error TEXT,
  duration INTEGER -- in milliseconds
);

-- Enable RLS
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_executions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can insert analytics events"
  ON analytics_events
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view own analytics events"
  ON analytics_events
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view own dashboards"
  ON analytics_dashboards
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR is_public = true);

CREATE POLICY "Users can manage own dashboards"
  ON analytics_dashboards
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own workflows"
  ON automation_workflows
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own rules"
  ON automation_rules
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add indexes
CREATE INDEX IF NOT EXISTS analytics_events_user_id_idx ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS analytics_events_event_type_idx ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS analytics_events_created_at_idx ON analytics_events(created_at);

CREATE INDEX IF NOT EXISTS analytics_metrics_name_idx ON analytics_metrics(name);
CREATE INDEX IF NOT EXISTS analytics_metrics_period_idx ON analytics_metrics(period);
CREATE INDEX IF NOT EXISTS analytics_metrics_start_date_idx ON analytics_metrics(start_date);

CREATE INDEX IF NOT EXISTS analytics_dashboards_user_id_idx ON analytics_dashboards(user_id);
CREATE INDEX IF NOT EXISTS analytics_dashboards_is_public_idx ON analytics_dashboards(is_public);

CREATE INDEX IF NOT EXISTS automation_workflows_user_id_idx ON automation_workflows(user_id);
CREATE INDEX IF NOT EXISTS automation_workflows_active_idx ON automation_workflows(active);

CREATE INDEX IF NOT EXISTS automation_rules_user_id_idx ON automation_rules(user_id);
CREATE INDEX IF NOT EXISTS automation_rules_active_idx ON automation_rules(active);

CREATE INDEX IF NOT EXISTS automation_executions_workflow_id_idx ON automation_executions(workflow_id);
CREATE INDEX IF NOT EXISTS automation_executions_rule_id_idx ON automation_executions(rule_id);
CREATE INDEX IF NOT EXISTS automation_executions_status_idx ON automation_executions(status);