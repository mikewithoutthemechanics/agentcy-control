-- =====================================================
-- Agentcy Control: Core Schema Migration
-- Phase 1: Foundation + Multi-Tenancy
-- =====================================================

-- Ensure auth schema exists before referencing auth.users
CREATE SCHEMA IF NOT EXISTS auth;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. AGENCIES & TEAMS
-- =====================================================

CREATE TABLE agencies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text UNIQUE NOT NULL,
    owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    billing_email text,
    plan_tier text DEFAULT 'starter' CHECK (plan_tier IN ('starter', 'growth', 'enterprise', 'custom')),
    settings jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE teams (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(agency_id, slug)
);

-- =====================================================
-- 2. CLIENTS
-- =====================================================

CREATE TABLE clients (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE,
    name text NOT NULL,
    slug text NOT NULL,
    tier text DEFAULT 'starter' CHECK (tier IN ('starter', 'growth', 'enterprise', 'custom')),
    billing_email text,
    custom_domain text,
    brand_colors jsonb DEFAULT '{"primary": "#0f172a", "secondary": "#38bdf8", "accent": "#10b981"}',
    settings jsonb DEFAULT '{}',
    status text DEFAULT 'active' CHECK (status IN ('active', 'paused', 'churned')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(agency_id, slug)
);

-- =====================================================
-- 3. PROJECTS & ENVIRONMENTS
-- =====================================================

CREATE TYPE project_category AS ENUM ('web_app', 'mobile_app', 'marketing_site', 'api', 'infrastructure', 'ecommerce');
CREATE TYPE deployment_strategy AS ENUM ('standard', 'blue_green', 'canary', 'rolling');
CREATE TYPE environment_name AS ENUM ('development', 'staging', 'production', 'preview');

CREATE TABLE projects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
    team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    category project_category DEFAULT 'web_app',
    deployment_strategy deployment_strategy DEFAULT 'standard',
    sla_tier text DEFAULT 'standard' CHECK (sla_tier IN ('basic', 'standard', 'premium')),
    is_archived boolean DEFAULT false,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(client_id, slug)
);

CREATE TABLE project_environments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
    name environment_name NOT NULL,
    url text,
    is_production boolean DEFAULT false,
    config_json jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    UNIQUE(project_id, name)
);

-- =====================================================
-- 4. SERVICE INTEGRATION CONFIGS (ENCRYPTED)
-- =====================================================

CREATE TYPE service_type AS ENUM (
    'supabase', 'vercel', 'sentry', 'posthog', 
    'resend', 'redis', 'github', 'stripe', 'aws', 
    'cloudflare', 'linear', 'slack', 'pagerduty'
);

CREATE TABLE project_service_configs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
    environment environment_name NOT NULL,
    service_type service_type NOT NULL,
    config_json_encrypted text NOT NULL,
    metadata_json jsonb DEFAULT '{}',
    is_active boolean DEFAULT true,
    last_validated_at timestamptz,
    last_error text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(project_id, environment, service_type)
);

-- =====================================================
-- 5. RBAC & MEMBERSHIPS
-- =====================================================

CREATE TYPE agency_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE project_role AS ENUM ('viewer', 'editor', 'admin', 'owner');

CREATE TABLE agency_memberships (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    role agency_role NOT NULL DEFAULT 'member',
    invited_by uuid REFERENCES auth.users(id),
    accepted_at timestamptz,
    created_at timestamptz DEFAULT now(),
    UNIQUE(agency_id, user_id)
);

CREATE TABLE team_memberships (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    role project_role NOT NULL DEFAULT 'viewer',
    created_at timestamptz DEFAULT now(),
    UNIQUE(team_id, user_id)
);

CREATE TABLE project_memberships (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    role project_role NOT NULL DEFAULT 'viewer',
    created_at timestamptz DEFAULT now(),
    UNIQUE(project_id, user_id)
);

-- =====================================================
-- 6. AUDIT LOG (IMMUTABLE)
-- =====================================================

CREATE TABLE audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE,
    actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_email text,
    action text NOT NULL,
    resource_type text NOT NULL,
    resource_id uuid,
    old_values jsonb,
    new_values jsonb,
    ip_address inet,
    user_agent text,
    created_at timestamptz DEFAULT now()
);

-- =====================================================
-- 7. UNIFIED EVENTS (TIME-SERIES)
-- =====================================================

CREATE TABLE unified_events (
    id bigserial,
    agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE,
    project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
    source text NOT NULL CHECK (source IN ('vercel', 'sentry', 'posthog', 'supabase', 'agentcy', 'github', 'custom')),
    event_type text NOT NULL,
    severity text CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    payload jsonb NOT NULL DEFAULT '{}',
    occurred_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (id, occurred_at)
) PARTITION BY RANGE (occurred_at);

-- Create initial monthly partitions
CREATE TABLE unified_events_2024_06 PARTITION OF unified_events
    FOR VALUES FROM ('2024-06-01') TO ('2024-07-01');
CREATE TABLE unified_events_2024_07 PARTITION OF unified_events
    FOR VALUES FROM ('2024-07-01') TO ('2024-08-01');
CREATE TABLE unified_events_2024_08 PARTITION OF unified_events
    FOR VALUES FROM ('2024-08-01') TO ('2024-09-01');

-- =====================================================
-- 8. ALERT RULES & NOTIFICATIONS
-- =====================================================

CREATE TABLE alert_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    source text NOT NULL CHECK (source IN ('sentry', 'vercel', 'posthog', 'supabase', 'custom')),
    metric_path text NOT NULL,
    operator text CHECK (operator IN ('gt', 'lt', 'eq', 'contains', 'not_contains')),
    threshold numeric,
    string_threshold text,
    window_minutes integer DEFAULT 5,
    cooldown_minutes integer DEFAULT 60,
    enabled boolean DEFAULT true,
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE alert_notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id uuid REFERENCES alert_rules(id) ON DELETE CASCADE,
    project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
    status text DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'ignored')),
    severity text CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    title text NOT NULL,
    message text,
    metric_value text,
    payload jsonb DEFAULT '{}',
    acknowledged_by uuid REFERENCES auth.users(id),
    acknowledged_at timestamptz,
    resolved_by uuid REFERENCES auth.users(id),
    resolved_at timestamptz,
    created_at timestamptz DEFAULT now()
);

-- =====================================================
-- 9. INCIDENTS (WAR ROOM)
-- =====================================================

CREATE TYPE incident_severity AS ENUM ('sev1-critical', 'sev2-high', 'sev3-medium', 'sev4-low');
CREATE TYPE incident_status AS ENUM ('detected', 'investigating', 'identified', 'mitigating', 'monitoring', 'resolved', 'postmortem');

CREATE TABLE incidents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE,
    project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
    incident_number serial,
    severity incident_severity NOT NULL,
    title text NOT NULL,
    summary text,
    status incident_status DEFAULT 'detected',
    source_alerts uuid[] DEFAULT '{}',
    affected_services text[] DEFAULT '{}',
    war_room_url text,
    commander_id uuid REFERENCES auth.users(id),
    responders uuid[] DEFAULT '{}',
    started_at timestamptz DEFAULT now(),
    detected_at timestamptz,
    mitigated_at timestamptz,
    resolved_at timestamptz,
    root_cause text,
    lessons_learned text,
    action_items jsonb DEFAULT '[]',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- 10. DEPLOYMENTS
-- =====================================================

CREATE TYPE deployment_status AS ENUM ('pending', 'building', 'ready', 'failed', 'cancelled', 'rolled_back');

CREATE TABLE deployments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
    environment environment_name NOT NULL,
    external_id text,
    status deployment_status DEFAULT 'pending',
    branch text,
    commit_sha text,
    commit_message text,
    author text,
    author_avatar text,
    url text,
    preview_url text,
    duration_seconds integer,
    checks_passed boolean,
    metadata jsonb DEFAULT '{}',
    deployed_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- 11. REMOTE CONFIGS & FEATURE FLAGS
-- =====================================================

CREATE TABLE project_configs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
    environment environment_name NOT NULL,
    key text NOT NULL,
    value jsonb NOT NULL,
    description text,
    version integer NOT NULL DEFAULT 1,
    is_feature_flag boolean DEFAULT false,
    flag_type text CHECK (flag_type IN ('boolean', 'percentage', 'segment', 'user')),
    flag_rules jsonb DEFAULT '{}',
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    UNIQUE(project_id, environment, key, version)
);

-- =====================================================
-- 12. ON-CALL SCHEDULES
-- =====================================================

CREATE TABLE on_call_schedules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
    name text NOT NULL,
    rotation_type text CHECK (rotation_type IN ('weekly', 'daily', 'custom')),
    handoff_time time DEFAULT '09:00:00',
    timezone text DEFAULT 'UTC',
    escalation_config jsonb DEFAULT '[]',
    created_at timestamptz DEFAULT now()
);

CREATE TABLE on_call_shifts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id uuid REFERENCES on_call_schedules(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    starts_at timestamptz NOT NULL,
    ends_at timestamptz NOT NULL,
    is_override boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- =====================================================
-- 13. AUTOMATION RULES
-- =====================================================

CREATE TABLE automation_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
    name text NOT NULL,
    enabled boolean DEFAULT true,
    trigger_config jsonb NOT NULL,
    conditions jsonb DEFAULT '[]',
    actions jsonb NOT NULL,
    execution_count integer DEFAULT 0,
    last_executed_at timestamptz,
    last_error text,
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- 14. COST MANAGEMENT
-- =====================================================

CREATE TABLE cost_snapshots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
    service_type service_type NOT NULL,
    environment environment_name,
    period_start date NOT NULL,
    period_end date NOT NULL,
    amount_cents integer NOT NULL,
    currency text DEFAULT 'USD',
    breakdown_json jsonb DEFAULT '{}',
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now()
);

CREATE TABLE budgets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
    project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
    monthly_limit_cents integer NOT NULL,
    alert_thresholds integer[] DEFAULT '{50,80,100}',
    current_spend_cents integer DEFAULT 0,
    currency text DEFAULT 'USD',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- 15. CLIENT PORTAL SETTINGS
-- =====================================================

CREATE TABLE client_portal_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
    subdomain text UNIQUE NOT NULL,
    custom_domain text,
    theme_json jsonb DEFAULT '{}',
    enabled_modules text[] DEFAULT '{uptime,incidents,deployments,analytics}',
    support_config jsonb DEFAULT '{}',
    public_status_page boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE status_page_incidents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
    incident_id uuid REFERENCES incidents(id) ON DELETE CASCADE,
    title text NOT NULL,
    status incident_status DEFAULT 'detected',
    affected_services text[] DEFAULT '{}',
    updates jsonb DEFAULT '[]',
    is_public boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_clients_agency ON clients(agency_id);
CREATE INDEX idx_projects_client ON projects(client_id);
CREATE INDEX idx_projects_team ON projects(team_id);
CREATE INDEX idx_service_configs_project ON project_service_configs(project_id);
CREATE INDEX idx_unified_events_agency_time ON unified_events(agency_id, occurred_at DESC);
CREATE INDEX idx_unified_events_project_time ON unified_events(project_id, occurred_at DESC);
CREATE INDEX idx_alert_notifications_project ON alert_notifications(project_id, created_at DESC);
CREATE INDEX idx_alert_notifications_status ON alert_notifications(status);
CREATE INDEX idx_incidents_agency ON incidents(agency_id, created_at DESC);
CREATE INDEX idx_incidents_project ON incidents(project_id, created_at DESC);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_deployments_project ON deployments(project_id, created_at DESC);
CREATE INDEX idx_audit_logs_agency ON audit_logs(agency_id, created_at DESC);
CREATE INDEX idx_cost_snapshots_project ON cost_snapshots(project_id, period_start DESC);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_environments ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_service_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE on_call_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE on_call_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_portal_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_page_incidents ENABLE ROW LEVEL SECURITY;

-- Agencies: owner or admin can manage
CREATE POLICY "Agencies owner/admin access" ON agencies
FOR ALL TO authenticated
USING (
    owner_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM agency_memberships am
        WHERE am.agency_id = agencies.id
        AND am.user_id = auth.uid()
        AND am.role IN ('owner', 'admin')
    )
);

CREATE POLICY "Agencies member view" ON agencies
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM agency_memberships am
        WHERE am.agency_id = agencies.id
        AND am.user_id = auth.uid()
    )
);

-- Teams: agency member access
CREATE POLICY "Teams agency access" ON teams
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM agency_memberships am
        WHERE am.agency_id = teams.agency_id
        AND am.user_id = auth.uid()
    )
);

-- Clients: agency member access
CREATE POLICY "Clients agency access" ON clients
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM agency_memberships am
        WHERE am.agency_id = clients.agency_id
        AND am.user_id = auth.uid()
    )
);

-- Projects: complex access through client agency + team/project membership
CREATE POLICY "Projects access" ON projects
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM agency_memberships am
        JOIN clients c ON c.agency_id = am.agency_id
        WHERE c.id = projects.client_id
        AND am.user_id = auth.uid()
    )
);

-- Project Environments
CREATE POLICY "Project environments access" ON project_environments
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM projects p
        JOIN clients c ON c.id = p.client_id
        JOIN agency_memberships am ON am.agency_id = c.agency_id
        WHERE p.id = project_environments.project_id
        AND am.user_id = auth.uid()
    )
);

-- Service Configs
CREATE POLICY "Service configs access" ON project_service_configs
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM projects p
        JOIN clients c ON c.id = p.client_id
        JOIN agency_memberships am ON am.agency_id = c.agency_id
        WHERE p.id = project_service_configs.project_id
        AND am.user_id = auth.uid()
    )
);

-- Audit Logs: agency view only
CREATE POLICY "Audit logs agency view" ON audit_logs
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM agency_memberships am
        WHERE am.agency_id = audit_logs.agency_id
        AND am.user_id = auth.uid()
    )
);

-- Unified Events
CREATE POLICY "Unified events agency view" ON unified_events
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM agency_memberships am
        WHERE am.agency_id = unified_events.agency_id
        AND am.user_id = auth.uid()
    )
);

-- Alert Rules
CREATE POLICY "Alert rules project access" ON alert_rules
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM projects p
        JOIN clients c ON c.id = p.client_id
        JOIN agency_memberships am ON am.agency_id = c.agency_id
        WHERE p.id = alert_rules.project_id
        AND am.user_id = auth.uid()
    )
);

-- Alert Notifications
CREATE POLICY "Alert notifications project access" ON alert_notifications
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM projects p
        JOIN clients c ON c.id = p.client_id
        JOIN agency_memberships am ON am.agency_id = c.agency_id
        WHERE p.id = alert_notifications.project_id
        AND am.user_id = auth.uid()
    )
);

-- Incidents
CREATE POLICY "Incidents agency access" ON incidents
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM agency_memberships am
        WHERE am.agency_id = incidents.agency_id
        AND am.user_id = auth.uid()
    )
);

-- Deployments
CREATE POLICY "Deployments project access" ON deployments
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM projects p
        JOIN clients c ON c.id = p.client_id
        JOIN agency_memberships am ON am.agency_id = c.agency_id
        WHERE p.id = deployments.project_id
        AND am.user_id = auth.uid()
    )
);

-- Project Configs
CREATE POLICY "Project configs access" ON project_configs
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM projects p
        JOIN clients c ON c.id = p.client_id
        JOIN agency_memberships am ON am.agency_id = c.agency_id
        WHERE p.id = project_configs.project_id
        AND am.user_id = auth.uid()
    )
);

-- Memberships: users can see their own
CREATE POLICY "Agency memberships own" ON agency_memberships
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR invited_by = auth.uid());

CREATE POLICY "Team memberships own" ON team_memberships
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Project memberships own" ON project_memberships
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Cost & Budgets
CREATE POLICY "Cost snapshots agency access" ON cost_snapshots
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM projects p
        JOIN clients c ON c.id = p.client_id
        JOIN agency_memberships am ON am.agency_id = c.agency_id
        WHERE p.id = cost_snapshots.project_id
        AND am.user_id = auth.uid()
    )
);

CREATE POLICY "Budgets agency access" ON budgets
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM clients c
        JOIN agency_memberships am ON am.agency_id = c.agency_id
        WHERE (c.id = budgets.client_id OR budgets.client_id IS NULL)
        AND am.user_id = auth.uid()
    )
);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_agencies_updated_at BEFORE UPDATE ON agencies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON incidents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_deployments_updated_at BEFORE UPDATE ON deployments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_automation_rules_updated_at BEFORE UPDATE ON automation_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Helper: get user's agency
CREATE OR REPLACE FUNCTION get_user_agency(user_uuid uuid)
RETURNS uuid AS $$
DECLARE
    agency_uuid uuid;
BEGIN
    SELECT agency_id INTO agency_uuid
    FROM agency_memberships
    WHERE user_id = user_uuid
    LIMIT 1;
    RETURN agency_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: check if user is agency owner/admin
CREATE OR REPLACE FUNCTION is_agency_admin(user_uuid uuid, agency_uuid uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM agency_memberships
        WHERE user_id = user_uuid
        AND agency_id = agency_uuid
        AND role IN ('owner', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Audit log trigger helper
CREATE OR REPLACE FUNCTION log_audit(
    p_agency_id uuid,
    p_actor_id uuid,
    p_action text,
    p_resource_type text,
    p_resource_id uuid,
    p_old_values jsonb,
    p_new_values jsonb
)
RETURNS void AS $$
DECLARE
    v_email text;
BEGIN
    SELECT email INTO v_email FROM auth.users WHERE id = p_actor_id;
    
    INSERT INTO audit_logs (
        agency_id, actor_id, actor_email, action,
        resource_type, resource_id, old_values, new_values
    ) VALUES (
        p_agency_id, p_actor_id, v_email, p_action,
        p_resource_type, p_resource_id, p_old_values, p_new_values
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
