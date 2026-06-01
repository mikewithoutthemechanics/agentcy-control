-- =====================================================
-- Agentcy Control: Phase 6 Migration
-- Synthetic Monitoring, Log Aggregation, Plugins, Fixes
-- =====================================================

-- =====================================================
-- 0. USER PROFILES (mirror of auth.users for RLS-safe queries)
-- =====================================================

CREATE TABLE IF NOT EXISTS user_profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text,
    full_name text,
    avatar_url text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Trigger to sync auth.users into user_profiles
CREATE OR REPLACE FUNCTION sync_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (id, email, full_name, avatar_url, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.created_at,
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        avatar_url = EXCLUDED.avatar_url,
        updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS sync_user_profile_trigger ON auth.users;
CREATE TRIGGER sync_user_profile_trigger
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_profile();

-- Backfill existing users
INSERT INTO user_profiles (id, email, full_name, avatar_url)
SELECT id, email, raw_user_meta_data->>'full_name', raw_user_meta_data->>'avatar_url'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "User profiles public read" ON user_profiles
FOR SELECT TO authenticated
USING (true);

-- =====================================================
-- 1. SYNTHETIC CHECKS
-- =====================================================

CREATE TABLE IF NOT EXISTS synthetic_checks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
    name text NOT NULL,
    type text CHECK (type IN ('http', 'ssl', 'dns', 'tcp', 'playwright')) NOT NULL,
    url text,
    config jsonb DEFAULT '{}',
    schedule text DEFAULT '*/5 * * * *',
    enabled boolean DEFAULT true,
    regions text[] DEFAULT '{us-east, eu-west, ap-south}',
    assertions jsonb DEFAULT '[]',
    last_result jsonb,
    last_run_at timestamptz,
    failure_count integer DEFAULT 0,
    success_count integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_synthetic_checks_project ON synthetic_checks(project_id);
CREATE INDEX IF NOT EXISTS idx_synthetic_checks_enabled ON synthetic_checks(enabled);

-- =====================================================
-- 2. LOG ENTRIES (with denormalized agency_id for fast RLS)
-- =====================================================

CREATE TABLE IF NOT EXISTS log_entries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE,
    project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
    source text NOT NULL CHECK (source IN ('vercel', 'supabase', 'application', 'edge_function', 'vector', 'custom')),
    level text NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error', 'fatal')),
    message text NOT NULL,
    metadata jsonb DEFAULT '{}',
    trace_id text,
    span_id text,
    parent_span_id text,
    service_name text,
    host text,
    environment text,
    timestamp timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_log_entries_agency ON log_entries(agency_id);
CREATE INDEX IF NOT EXISTS idx_log_entries_project ON log_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_log_entries_timestamp ON log_entries(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_log_entries_trace ON log_entries(trace_id);
CREATE INDEX IF NOT EXISTS idx_log_entries_level ON log_entries(level);
CREATE INDEX IF NOT EXISTS idx_log_entries_source ON log_entries(source);
CREATE INDEX IF NOT EXISTS idx_log_entries_search ON log_entries USING gin(to_tsvector('english', message));

-- =====================================================
-- 3. PLUGINS
-- =====================================================

CREATE TABLE IF NOT EXISTS plugins (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    version text NOT NULL DEFAULT '1.0.0',
    author text,
    category text CHECK (category IN ('notifications', 'ticketing', 'infrastructure', 'ci-cd', 'incident-response', 'billing', 'analytics', 'custom')),
    manifest_json jsonb DEFAULT '{}',
    config_json jsonb DEFAULT '{}',
    enabled boolean DEFAULT false,
    installed_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(agency_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_plugins_agency ON plugins(agency_id);

CREATE TABLE IF NOT EXISTS plugin_executions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    plugin_id uuid REFERENCES plugins(id) ON DELETE CASCADE,
    hook text NOT NULL,
    payload_json jsonb DEFAULT '{}',
    result_json jsonb,
    error text,
    duration_ms integer,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plugin_executions_plugin ON plugin_executions(plugin_id);

-- =====================================================
-- 4. ON-CALL ESCALATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS on_call_escalations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id uuid REFERENCES on_call_schedules(id) ON DELETE CASCADE,
    level integer NOT NULL DEFAULT 1,
    delay_minutes integer NOT NULL DEFAULT 15,
    notify_via text[] DEFAULT '{push,email}',
    notify_manager boolean DEFAULT false,
    pagerduty_service_key text,
    slack_webhook text,
    created_at timestamptz DEFAULT now()
);

-- =====================================================
-- 5. NOTIFICATION CHANNELS
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_channels (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE,
    name text NOT NULL,
    type text CHECK (type IN ('email', 'slack', 'discord', 'telegram', 'pagerduty', 'webhook')) NOT NULL,
    config_json_encrypted text NOT NULL,
    is_active boolean DEFAULT true,
    last_tested_at timestamptz,
    created_at timestamptz DEFAULT now()
);

-- =====================================================
-- 6. SAVED VIEWS / DASHBOARDS
-- =====================================================

CREATE TABLE IF NOT EXISTS saved_dashboards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    layout_json jsonb NOT NULL DEFAULT '[]',
    is_default boolean DEFAULT false,
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- 7. PROMOTION PIPELINES
-- =====================================================

CREATE TABLE IF NOT EXISTS promotion_pipelines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
    name text NOT NULL,
    source_env text NOT NULL,
    target_env text NOT NULL,
    steps jsonb NOT NULL DEFAULT '[]',
    auto_rollback_on_failure boolean DEFAULT true,
    require_approval boolean DEFAULT true,
    enabled boolean DEFAULT true,
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now()
);

-- =====================================================
-- 8. FIX: unified_events partitioning for future dates
-- =====================================================

-- Create a trigger function to auto-create future partitions
CREATE OR REPLACE FUNCTION create_unified_events_partition()
RETURNS TRIGGER AS $$
DECLARE
    partition_date text;
    start_date date;
    end_date date;
    partition_name text;
BEGIN
    partition_date := to_char(NEW.occurred_at, 'YYYY_MM');
    partition_name := 'unified_events_' || partition_date;
    start_date := date_trunc('month', NEW.occurred_at)::date;
    end_date := (start_date + interval '1 month')::date;

    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = partition_name
    ) THEN
        EXECUTE format(
            'CREATE TABLE %I PARTITION OF unified_events FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists, then recreate
DROP TRIGGER IF EXISTS unified_events_auto_partition ON unified_events;
CREATE TRIGGER unified_events_auto_partition
    BEFORE INSERT ON unified_events
    FOR EACH ROW
    EXECUTE FUNCTION create_unified_events_partition();

-- Create future partitions proactively
DO $$
DECLARE
    i integer;
    start_d date;
    end_d date;
    p_name text;
BEGIN
    FOR i IN 0..12 LOOP
        start_d := (date_trunc('month', now()) + (i || ' months')::interval)::date;
        end_d := (start_d + interval '1 month')::date;
        p_name := 'unified_events_' || to_char(start_d, 'YYYY_MM');

        IF NOT EXISTS (
            SELECT 1 FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public' AND c.relname = p_name
        ) THEN
            EXECUTE format(
                'CREATE TABLE %I PARTITION OF unified_events FOR VALUES FROM (%L) TO (%L)',
                p_name, start_d, end_d
            );
        END IF;
    END LOOP;
END $$;

-- =====================================================
-- 9. FIX: Missing indexes on core tables
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_unified_events_source_time ON unified_events(source, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_deployments_env_created ON deployments(environment, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cost_snapshots_service_period ON cost_snapshots(service_type, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_service_configs_active ON project_service_configs(service_type) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_alert_notifications_status_created ON alert_notifications(status, created_at DESC);

-- =====================================================
-- 10. FIX: Add unique constraint on deployments
-- =====================================================

ALTER TABLE deployments
    DROP CONSTRAINT IF EXISTS unique_deployment_external;
ALTER TABLE deployments
    ADD CONSTRAINT unique_deployment_external UNIQUE (project_id, external_id);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE synthetic_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE plugins ENABLE ROW LEVEL SECURITY;
ALTER TABLE plugin_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE on_call_escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_pipelines ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Synthetic checks access" ON synthetic_checks
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM projects p
        JOIN clients c ON c.id = p.client_id
        JOIN agency_memberships am ON am.agency_id = c.agency_id
        WHERE p.id = synthetic_checks.project_id
        AND am.user_id = auth.uid()
    )
);

CREATE POLICY IF NOT EXISTS "Log entries access" ON log_entries
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM agency_memberships am
        WHERE am.agency_id = log_entries.agency_id
        AND am.user_id = auth.uid()
    )
);

CREATE POLICY IF NOT EXISTS "Plugins agency access" ON plugins
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM agency_memberships am
        WHERE am.agency_id = plugins.agency_id
        AND am.user_id = auth.uid()
    )
);

CREATE POLICY IF NOT EXISTS "Plugin executions access" ON plugin_executions
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM plugins p
        JOIN agency_memberships am ON am.agency_id = p.agency_id
        WHERE p.id = plugin_executions.plugin_id
        AND am.user_id = auth.uid()
    )
);

CREATE POLICY IF NOT EXISTS "Notification channels agency access" ON notification_channels
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM agency_memberships am
        WHERE am.agency_id = notification_channels.agency_id
        AND am.user_id = auth.uid()
    )
);

CREATE POLICY IF NOT EXISTS "Saved dashboards agency access" ON saved_dashboards
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM agency_memberships am
        WHERE am.agency_id = saved_dashboards.agency_id
        AND am.user_id = auth.uid()
    )
);

CREATE POLICY IF NOT EXISTS "Promotion pipelines access" ON promotion_pipelines
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM projects p
        JOIN clients c ON c.id = p.client_id
        JOIN agency_memberships am ON am.agency_id = c.agency_id
        WHERE p.id = promotion_pipelines.project_id
        AND am.user_id = auth.uid()
    )
);

CREATE POLICY IF NOT EXISTS "On-call escalations access" ON on_call_escalations
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM on_call_schedules s
        JOIN projects p ON p.id = s.project_id
        JOIN clients c ON c.id = p.client_id
        JOIN agency_memberships am ON am.agency_id = c.agency_id
        WHERE s.id = on_call_escalations.schedule_id
        AND am.user_id = auth.uid()
    )
);

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_synthetic_checks_updated_at ON synthetic_checks;
CREATE TRIGGER update_synthetic_checks_updated_at BEFORE UPDATE ON synthetic_checks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_plugins_updated_at ON plugins;
CREATE TRIGGER update_plugins_updated_at BEFORE UPDATE ON plugins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_saved_dashboards_updated_at ON saved_dashboards;
CREATE TRIGGER update_saved_dashboards_updated_at BEFORE UPDATE ON saved_dashboards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Search logs with full-text
CREATE OR REPLACE FUNCTION search_logs(
    p_agency_id uuid,
    p_query text,
    p_levels text[] DEFAULT NULL,
    p_sources text[] DEFAULT NULL,
    p_hours integer DEFAULT 24
)
RETURNS TABLE (id uuid, message text, level text, source text, timestamp timestamptz) AS $$
BEGIN
    RETURN QUERY
    SELECT l.id, l.message, l.level, l.source, l.timestamp
    FROM log_entries l
    WHERE l.agency_id = p_agency_id
    AND l.timestamp > now() - (p_hours || ' hours')::interval
    AND (p_query IS NULL OR to_tsvector('english', l.message) @@ plainto_tsquery('english', p_query))
    AND (p_levels IS NULL OR l.level = ANY(p_levels))
    AND (p_sources IS NULL OR l.source = ANY(p_sources))
    ORDER BY l.timestamp DESC
    LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get log stats
CREATE OR REPLACE FUNCTION get_log_stats(p_agency_id uuid, p_hours integer DEFAULT 24)
RETURNS TABLE (level text, count bigint) AS $$
BEGIN
    RETURN QUERY
    SELECT l.level, count(*)::bigint
    FROM log_entries l
    WHERE l.agency_id = p_agency_id
    AND l.timestamp > now() - (p_hours || ' hours')::interval
    GROUP BY l.level
    ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
