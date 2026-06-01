import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';
import { getSentrySignature, verifyHmac } from '../_shared/webhooks.ts';

serve(async (req) => {
  try {
    const payloadText = await req.text();
    const payload = JSON.parse(payloadText);
    const event = payload.data || payload;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // In production: verify Sentry webhook signature
    // const signature = req.headers.get('x-sentry-signature');
    // if (!verifySentryWebhook(payloadText, signature)) return new Response(..., {status: 401});

    const severityMap: Record<string, string> = {
      fatal: 'critical',
      error: 'error',
      warning: 'warning',
      info: 'info',
    };

    const level = event.level || 'error';
    const severity = severityMap[level] || 'error';

    const sentryProjectId = event.project?.toString();
    const { data: project } = await supabase
      .from('projects')
      .select('id, client_id')
      .eq('metadata->>sentry_project_slug', sentryProjectId)
      .single();

    if (!project) {
      return new Response(JSON.stringify({ error: 'Project not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { error } = await supabase.from('unified_events').insert({
      project_id: project.id,
      source: 'sentry',
      event_type: event.event_id ? 'error_event' : 'issue_alert',
      severity,
      payload: event,
    });

    if (error) {
      console.error('Error storing Sentry event:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check alert rules
    const { data: rules } = await supabase
      .from('alert_rules')
      .select('*')
      .eq('project_id', project.id)
      .eq('source', 'sentry')
      .eq('enabled', true);

    for (const rule of rules || []) {
      if (rule.metric_path === 'error_count' && rule.operator === 'gt') {
        await supabase.from('alert_notifications').insert({
          rule_id: rule.id,
          project_id: project.id,
          severity,
          title: `Sentry Alert: ${event.title || event.message || 'New error'}`,
          message: event.culprit || event.message,
          payload: event,
        });
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error processing Sentry webhook:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
