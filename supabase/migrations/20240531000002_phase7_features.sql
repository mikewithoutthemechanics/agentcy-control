-- =====================================================
-- Agentcy Control: Phase 7 Migration
-- Notifications, Audit Logs, Runbooks, Webhook Replay
-- =====================================================

-- =====================================================
-- 1. NOTIFICATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE,
    type text NOT NULL CHECK (type IN ('incident', 'alert', 'deployment', 'cost', 'system', 'mention')),
    severity text NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')) DEFAULT 'info',
    title text NOT NULL,
    message text,
    link text,
    is_read boolean DEFAULT false,
    read_at timestamptz,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_agency ON notifications(agency_id, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Notifications user access" ON notifications
FOR ALL TO authenticated
USING (user_id = auth.uid());

-- =====================================================
-- 2. AUDIT LOGS
-- =====================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    action text NOT NULL CHECK (action IN ('create', 'update', 'delete', 'login', 'logout', 'export', 'execute', 'invite', 'remove')),
    entity_type text NOT NULL,
    entity_id uuid,
    entity_name text,
    changes jsonb,
    ip_address text,
    user_agent text,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_agency ON audit_logs(agency_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action, created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Audit logs agency access" ON audit_logs
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM agency_memberships am
        WHERE am.agency_id = audit_logs.agency_id
        AND am.user_id = auth.uid()
    )
);

-- =====================================================
-- 3. RUNBOOKS
-- =====================================================

CREATE TABLE IF NOT EXISTS runbooks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE,
    project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
    title text NOT NULL,
    description text,
    category text CHECK (category IN ('incident-response', 'deployment', 'security', 'maintenance', 'onboarding', 'custom')),
    steps jsonb NOT NULL DEFAULT '[]',
    triggers jsonb DEFAULT '[]',
    enabled boolean DEFAULT true,
    last_executed_at timestamptz,
    execution_count integer DEFAULT 0,
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_runbooks_agency ON runbooks(agency_id);
CREATE INDEX IF NOT EXISTS idx_runbooks_project ON runbooks(project_id);
CREATE INDEX IF NOT EXISTS idx_runbooks_enabled ON runbooks(enabled);

ALTER TABLE runbooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Runbooks agency access" ON runbooks
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM agency_memberships am
        WHERE am.agency_id = runbooks.agency_id
        AND am.user_id = auth.uid()
    )
);

-- =====================================================
-- 4. WEBHOOK PAYLOADS (for replay)
-- =====================================================

CREATE TABLE IF NOT EXISTS webhook_payloads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source text NOT NULL CHECK (source IN ('vercel', 'sentry', 'posthog', 'supabase', 'github', 'stripe', 'custom')),
    event_type text NOT NULL,
    payload jsonb NOT NULL,
    headers jsonb DEFAULT '{}',
    signature text,
    status text NOT NULL CHECK (status IN ('received', 'processing', 'processed', 'failed', 'replayed')) DEFAULT 'received',
    error_message text,
    processed_at timestamptz,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_payloads_source ON webhook_payloads(source, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_payloads_status ON webhook_payloads(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_payloads_event ON webhook_payloads(event_type, created_at DESC);

ALTER TABLE webhook_payloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Webhook payloads admin access" ON webhook_payloads
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM agency_memberships am
        WHERE am.user_id = auth.uid()
        AND am.role IN ('owner', 'admin')
    )
);

-- =====================================================
-- 5. NOTIFICATION PREFERENCES
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE,
    email_enabled boolean DEFAULT true,
    push_enabled boolean DEFAULT false,
    slack_enabled boolean DEFAULT false,
    digest_frequency text CHECK (digest_frequency IN ('realtime', 'hourly', 'daily', 'weekly')) DEFAULT 'realtime',
    incident_severity_threshold text CHECK (incident_severity_threshold IN ('sev1-critical', 'sev2-high', 'sev3-medium', 'sev4-low')) DEFAULT 'sev3-medium',
    alert_channels text[] DEFAULT '{email}',
    quiet_hours_start time,
    quiet_hours_end time,
    timezone text DEFAULT 'UTC',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(user_id, agency_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_prefs_user ON notification_preferences(user_id);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Notification prefs user access" ON notification_preferences
FOR ALL TO authenticated
USING (user_id = auth.uid());

-- =====================================================
-- 6. DEPLOYMENT PULL REQUESTS (GitHub integration)
-- =====================================================

CREATE TABLE IF NOT EXISTS deployment_prs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_id uuid REFERENCES deployments(id) ON DELETE CASCADE,
    pr_number integer NOT NULL,
    pr_title text,
    pr_url text,
    branch text,
    author text,
    status text CHECK (status IN ('open', 'merged', 'closed')),
    checks_status text CHECK (checks_status IN ('pending', 'passing', 'failing')),
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deployment_prs_deployment ON deployment_prs(deployment_id);

ALTER TABLE deployment_prs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deployment PRs access" ON deployment_prs
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM deployments d
        JOIN projects p ON p.id = d.project_id
        JOIN clients c ON c.id = p.client_id
        JOIN agency_memberships am ON am.agency_id = c.agency_id
        WHERE d.id = deployment_prs.deployment_id
        AND am.user_id = auth.uid()
    )
);

-- =====================================================
-- 7. SSO CONFIGURATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS sso_configurations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE,
    provider text NOT NULL CHECK (provider IN ('saml', 'oidc', 'google', 'azure_ad', 'okta')),
    name text NOT NULL,
    metadata_url text,
    metadata_xml text,
    entity_id text,
    sso_url text,
    certificate text,
    is_primary boolean DEFAULT false,
    enabled boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sso_configs_agency ON sso_configurations(agency_id);

ALTER TABLE sso_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SSO configs agency owner" ON sso_configurations
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM agency_memberships am
        WHERE am.agency_id = sso_configurations.agency_id
        AND am.user_id = auth.uid()
        AND am.role IN ('owner', 'admin')
    )
);

-- =====================================================
-- TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS update_runbooks_updated_at ON runbooks;
CREATE TRIGGER update_runbooks_updated_at BEFORE UPDATE ON runbooks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_prefs_updated_at ON notification_preferences;
CREATE TRIGGER update_notification_prefs_updated_at BEFORE UPDATE ON notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sso_configs_updated_at ON sso_configurations;
CREATE TRIGGER update_sso_configs_updated_at BEFORE UPDATE ON sso_configurations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Create notification helper
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id uuid,
    p_agency_id uuid,
    p_type text,
    p_severity text,
    p_title text,
    p_message text DEFAULT NULL,
    p_link text DEFAULT NULL,
    p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid AS $$
DECLARE
    v_id uuid;
BEGIN
    INSERT INTO notifications (user_id, agency_id, type, severity, title, message, link, metadata)
    VALUES (p_user_id, p_agency_id, p_type, p_severity, p_title, p_message, p_link, p_metadata)
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id uuid)
RETURNS integer AS $$
DECLARE
    v_count integer;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM notifications
    WHERE user_id = p_user_id AND is_read = false;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log audit event helper
CREATE OR REPLACE FUNCTION log_audit_event(
    p_agency_id uuid,
    p_user_id uuid,
    p_action text,
    p_entity_type text,
    p_entity_id uuid DEFAULT NULL,
    p_entity_name text DEFAULT NULL,
    p_changes jsonb DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
    v_id uuid;
BEGIN
    INSERT INTO audit_logs (agency_id, user_id, action, entity_type, entity_id, entity_name, changes)
    VALUES (p_agency_id, p_user_id, p_action, p_entity_type, p_entity_id, p_entity_name, p_changes)
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Search across entities
CREATE OR REPLACE FUNCTION global_search(
    p_agency_id uuid,
    p_query text,
    p_limit integer DEFAULT 20
)
RETURNS TABLE (
    entity_type text,
    entity_id uuid,
    title text,
    description text,
    updated_at timestamptz
) AS $$
BEGIN
    -- Search projects
    RETURN QUERY
    SELECT 'project'::text, p.id, p.name, p.description, p.updated_at
    FROM projects p
    JOIN clients c ON c.id = p.client_id
    WHERE c.agency_id = p_agency_id
    AND (p.name ILIKE '%' || p_query || '%' OR p.description ILIKE '%' || p_query || '%' OR p.slug ILIKE '%' || p_query || '%')
    LIMIT p_limit;

    -- Search incidents
    RETURN QUERY
    SELECT 'incident'::text, i.id, i.title, i.summary, i.updated_at
    FROM incidents i
    WHERE i.agency_id = p_agency_id
    AND (i.title ILIKE '%' || p_query || '%' OR i.summary ILIKE '%' || p_query || '%')
    LIMIT p_limit;

    -- Search deployments
    RETURN QUERY
    SELECT 'deployment'::text, d.id, d.commit_message, d.author, d.created_at
    FROM deployments d
    JOIN projects p ON p.id = d.project_id
    JOIN clients c ON c.id = p.client_id
    WHERE c.agency_id = p_agency_id
    AND (d.commit_message ILIKE '%' || p_query || '%' OR d.author ILIKE '%' || p_query || '%')
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
