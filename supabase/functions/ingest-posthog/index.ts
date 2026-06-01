import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';
import { verifyHmac } from '../_shared/webhooks.ts';

serve(async (req) => {
  try {
    const payload = await req.json();
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const events = Array.isArray(payload.batch) ? payload.batch : [payload];

    for (const event of events) {
      const projectId = event.properties?.project_id || 'unknown';

      const { data: project } = await supabase
        .from('projects')
        .select('id')
        .eq('metadata->>posthog_project_id', projectId)
        .single();

      if (!project) continue;

      await supabase.from('unified_events').insert({
        project_id: project.id,
        source: 'posthog',
        event_type: event.event,
        severity: 'info',
        payload: {
          distinct_id: event.distinct_id,
          timestamp: event.timestamp,
          properties: event.properties,
        },
      });
    }

    return new Response(JSON.stringify({ success: true, processed: events.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error processing PostHog webhook:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
