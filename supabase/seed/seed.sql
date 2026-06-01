-- Seed data for Agentcy Control
-- Run after migrations: supabase db reset or supabase seed
-- This seed is idempotent when possible; some tables have unique constraints

DO $$
DECLARE
    v_agency_id uuid;
    v_client_id uuid;
    v_project_ids uuid[] := '{}'::uuid[];
    v_project_id uuid;
BEGIN
    -- Create a default agency (skip if exists)
    INSERT INTO agencies (name, slug, plan_tier)
    VALUES ('Demo Agency', 'demo-agency', 'growth')
    ON CONFLICT (slug) DO NOTHING;

    SELECT id INTO v_agency_id FROM agencies WHERE slug = 'demo-agency';
    IF v_agency_id IS NULL THEN
        RAISE NOTICE 'Agency already seeded or missing.';
        RETURN;
    END IF;

    -- Create a default client
    INSERT INTO clients (agency_id, name, slug, tier, billing_email)
    VALUES (v_agency_id, 'Demo Client', 'demo-client', 'growth', 'demo@client.com')
    ON CONFLICT (agency_id, slug) DO NOTHING;

    SELECT id INTO v_client_id FROM clients WHERE agency_id = v_agency_id AND slug = 'demo-client';

    -- Create sample projects (skip if already exist for this client)
    INSERT INTO projects (client_id, name, slug, description, category, deployment_strategy)
    SELECT v_client_id, p.name, p.slug, p.description, p.category::project_category, p.strategy::deployment_strategy
    FROM (VALUES
        ('SaaS Platform', 'saas-platform', 'Main SaaS application with authentication and billing', 'web_app', 'blue_green'),
        ('Marketing Website', 'marketing-website', 'Company marketing website with blog and CMS', 'marketing_site', 'standard'),
        ('E-Commerce Store', 'ecommerce-store', 'Client e-commerce store with Stripe payments', 'ecommerce', 'canary')
    ) AS p(name, slug, description, category, strategy)
    ON CONFLICT (client_id, slug) DO NOTHING;

    -- Collect project IDs
    SELECT array_agg(id) INTO v_project_ids FROM projects WHERE client_id = v_client_id;

    -- Create environments for each project (skip duplicates)
    FOREACH v_project_id IN ARRAY v_project_ids
    LOOP
        INSERT INTO project_environments (project_id, name, url, is_production)
        VALUES
            (v_project_id, 'development'::environment_name, 'https://dev.' || (SELECT slug FROM projects WHERE id = v_project_id) || '.com', false),
            (v_project_id, 'staging'::environment_name, 'https://staging.' || (SELECT slug FROM projects WHERE id = v_project_id) || '.com', false),
            (v_project_id, 'production'::environment_name, 'https://' || (SELECT slug FROM projects WHERE id = v_project_id) || '.com', true)
        ON CONFLICT (project_id, name) DO NOTHING;
    END LOOP;

    -- Create sample deployments (only if none exist for these projects)
    FOREACH v_project_id IN ARRAY v_project_ids
    LOOP
        INSERT INTO deployments (project_id, environment, external_id, status, branch, commit_sha, commit_message, author, url, duration_seconds)
        SELECT v_project_id, 'production'::environment_name, 'dpl_' || gen_random_uuid(), 'ready'::deployment_status, 'main',
               substring(gen_random_uuid()::text, 1, 7), 'Fix authentication middleware and add rate limiting', 'Jane Developer',
               'https://' || (SELECT slug FROM projects WHERE id = v_project_id) || '.com', 142
        WHERE NOT EXISTS (SELECT 1 FROM deployments WHERE project_id = v_project_id LIMIT 1)
        ON CONFLICT DO NOTHING;
    END LOOP;

    -- Create sample incident (avoid cross join by using explicit project_id)
    INSERT INTO incidents (agency_id, project_id, severity, title, summary, status, affected_services)
    SELECT v_agency_id, v_project_ids[1], 'sev3-medium'::incident_severity,
           'Database connection pool exhaustion',
           'Increased latency observed due to connection pool limits',
           'resolved'::incident_status, ARRAY['supabase', 'api']
    WHERE v_project_ids[1] IS NOT NULL
    ON CONFLICT DO NOTHING;

    -- Create sample alert rules
    INSERT INTO alert_rules (project_id, name, source, metric_path, operator, threshold, window_minutes)
    SELECT v_project_ids[1], 'High Error Rate', 'sentry', 'error_rate_5m', 'gt', 5.0, 5
    WHERE v_project_ids[1] IS NOT NULL
    ON CONFLICT DO NOTHING;

    -- Create sample cost snapshots
    INSERT INTO cost_snapshots (project_id, service_type, environment, period_start, period_end, amount_cents, breakdown_json)
    SELECT v_project_ids[1], 'vercel'::service_type, 'production'::environment_name,
           '2024-05-01', '2024-05-31', 4200, '{"pro_plan": 2000, "bandwidth": 1200, "functions": 1000}'::jsonb
    WHERE v_project_ids[1] IS NOT NULL
    ON CONFLICT DO NOTHING;

END $$;
