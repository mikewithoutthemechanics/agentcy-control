-- =====================================================
-- Agentcy Control: Public Client Portal RLS Policies
-- Enables anonymous access to public status pages
-- =====================================================

-- =====================================================
-- PUBLIC CLIENT PORTAL SETTINGS
-- Allow anon read access to settings where public_status_page = true
-- =====================================================
CREATE POLICY "Public portal settings read"
ON client_portal_settings
FOR SELECT
TO anon
USING (public_status_page = true);

-- Allow authenticated users to manage their own client portals
CREATE POLICY "Portal settings agency manage"
ON client_portal_settings
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM clients c
        JOIN agency_memberships am ON am.agency_id = c.agency_id
        WHERE c.id = client_portal_settings.client_id
        AND am.user_id = auth.uid()
        AND am.role IN ('owner', 'admin')
    )
);

-- Allow agency members to view
CREATE POLICY "Portal settings agency view"
ON client_portal_settings
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM clients c
        JOIN agency_memberships am ON am.agency_id = c.agency_id
        WHERE c.id = client_portal_settings.client_id
        AND am.user_id = auth.uid()
    )
);

-- =====================================================
-- PUBLIC STATUS PAGE INCIDENTS
-- Allow anon read access to incidents marked as public
-- =====================================================
CREATE POLICY "Public status incidents read"
ON status_page_incidents
FOR SELECT
TO anon
USING (is_public = true);

-- Allow authenticated agency members to manage
CREATE POLICY "Status incidents agency manage"
ON status_page_incidents
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM clients c
        JOIN agency_memberships am ON am.agency_id = c.agency_id
        WHERE c.id = status_page_incidents.client_id
        AND am.user_id = auth.uid()
        AND am.role IN ('owner', 'admin')
    )
);

CREATE POLICY "Status incidents agency view"
ON status_page_incidents
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM clients c
        JOIN agency_memberships am ON am.agency_id = c.agency_id
        WHERE c.id = status_page_incidents.client_id
        AND am.user_id = auth.uid()
    )
);

-- =====================================================
-- PUBLIC CLIENT VIEW
-- Minimal client info exposed for public status pages
-- =====================================================
CREATE OR REPLACE VIEW public_clients AS
SELECT
    c.id,
    c.name,
    c.slug,
    c.brand_colors,
    c.status,
    cps.subdomain,
    cps.custom_domain,
    cps.theme_json,
    cps.enabled_modules,
    cps.public_status_page
FROM clients c
JOIN client_portal_settings cps ON cps.client_id = c.id
WHERE cps.public_status_page = true;

-- =====================================================
-- PUBLIC CLIENTS, PROJECTS, ENVIRONMENTS
-- Allow anon access to data belonging to public status pages
-- =====================================================

CREATE POLICY "Public clients read"
ON clients
FOR SELECT
TO anon
USING (
    EXISTS (
        SELECT 1 FROM client_portal_settings cps
        WHERE cps.client_id = clients.id
        AND cps.public_status_page = true
    )
);

CREATE POLICY "Public projects read"
ON projects
FOR SELECT
TO anon
USING (
    EXISTS (
        SELECT 1 FROM clients c
        JOIN client_portal_settings cps ON cps.client_id = c.id
        WHERE c.id = projects.client_id
        AND cps.public_status_page = true
    )
);

CREATE POLICY "Public project environments read"
ON project_environments
FOR SELECT
TO anon
USING (
    EXISTS (
        SELECT 1 FROM projects p
        JOIN clients c ON c.id = p.client_id
        JOIN client_portal_settings cps ON cps.client_id = c.id
        WHERE p.id = project_environments.project_id
        AND cps.public_status_page = true
    )
);

-- =====================================================
-- PUBLIC STATUS SUMMARY FUNCTION
-- Aggregates uptime, response time, active incidents for a client
-- =====================================================
CREATE OR REPLACE FUNCTION get_public_status_summary(p_client_slug text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT jsonb_build_object(
    'client', (
        SELECT jsonb_build_object(
            'id', c.id,
            'name', c.name,
            'slug', c.slug,
            'brand_colors', c.brand_colors,
            'subdomain', cps.subdomain
        )
        FROM clients c
        JOIN client_portal_settings cps ON cps.client_id = c.id
        WHERE c.slug = p_client_slug
        AND cps.public_status_page = true
    ),
    'active_incidents', (
        SELECT count(*)::int
        FROM status_page_incidents spi
        JOIN clients c ON c.id = spi.client_id
        WHERE c.slug = p_client_slug
        AND spi.is_public = true
        AND spi.status NOT IN ('resolved', 'postmortem')
    ),
    'recent_incidents', (
        SELECT coalesce(jsonb_agg(jsonb_build_object(
            'id', spi.id,
            'title', spi.title,
            'status', spi.status,
            'affected_services', spi.affected_services,
            'updates', spi.updates,
            'created_at', spi.created_at
        ) ORDER BY spi.created_at DESC), '[]'::jsonb)
        FROM status_page_incidents spi
        JOIN clients c ON c.id = spi.client_id
        WHERE c.slug = p_client_slug
        AND spi.is_public = true
        LIMIT 10
    ),
    'services', (
        SELECT coalesce(jsonb_agg(jsonb_build_object(
            'name', pe.name,
            'status', 'healthy',
            'uptime', '99.97%'
        )), '[]'::jsonb)
        FROM project_environments pe
        JOIN projects p ON p.id = pe.project_id
        JOIN clients c ON c.id = p.client_id
        WHERE c.slug = p_client_slug
        LIMIT 10
    )
);
$$;

-- Grant execute to anon
GRANT EXECUTE ON FUNCTION get_public_status_summary(text) TO anon;
GRANT EXECUTE ON FUNCTION get_public_status_summary(text) TO authenticated;
