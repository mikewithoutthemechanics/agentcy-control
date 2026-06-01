-- =====================================================
-- Agentcy Control: Global Search RPC Function
-- Enables search across projects, incidents, deployments
-- =====================================================

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
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    -- Search projects
    SELECT
        'project'::text AS entity_type,
        p.id AS entity_id,
        p.name AS title,
        COALESCE(p.description, '') AS description,
        p.updated_at
    FROM projects p
    JOIN clients c ON c.id = p.client_id
    WHERE c.agency_id = p_agency_id
      AND (
          p.name ILIKE '%' || p_query || '%'
          OR p.slug ILIKE '%' || p_query || '%'
          OR COALESCE(p.description, '') ILIKE '%' || p_query || '%'
      )

    UNION ALL

    -- Search incidents
    SELECT
        'incident'::text AS entity_type,
        i.id AS entity_id,
        i.title,
        COALESCE(i.summary, '') AS description,
        i.updated_at
    FROM incidents i
    WHERE i.agency_id = p_agency_id
      AND (
          i.title ILIKE '%' || p_query || '%'
          OR COALESCE(i.summary, '') ILIKE '%' || p_query || '%'
          OR i.status ILIKE '%' || p_query || '%'
      )

    UNION ALL

    -- Search deployments
    SELECT
        'deployment'::text AS entity_type,
        d.id AS entity_id,
        COALESCE(d.commit_message, d.branch, 'Deployment') AS title,
        COALESCE(d.author, '') AS description,
        d.updated_at
    FROM deployments d
    JOIN projects p ON p.id = d.project_id
    JOIN clients c ON c.id = p.client_id
    WHERE c.agency_id = p_agency_id
      AND (
          COALESCE(d.commit_message, '') ILIKE '%' || p_query || '%'
          OR COALESCE(d.branch, '') ILIKE '%' || p_query || '%'
          OR COALESCE(d.author, '') ILIKE '%' || p_query || '%'
      )

    ORDER BY updated_at DESC
    LIMIT p_limit;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION global_search(uuid, text, integer) TO authenticated;
