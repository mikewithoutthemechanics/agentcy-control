import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';

interface EmailRequest {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  template?: 'incident-alert' | 'weekly-digest' | 'on-call-alert' | 'cost-alert';
  data?: Record<string, unknown>;
}

function renderTemplate(template: string, data: Record<string, unknown>): { subject: string; html: string } {
  switch (template) {
    case 'incident-alert': {
      const title = (data.title as string) || 'New Incident';
      const severity = (data.severity as string) || 'medium';
      const summary = (data.summary as string) || '';
      return {
        subject: `[${severity.toUpperCase()}] Incident: ${title}`,
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
            <h1 style="color: #dc2626; margin-bottom: 8px;">Incident Alert</h1>
            <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 16px 0;">
              <h2 style="margin: 0 0 8px; color: #1e293b;">${title}</h2>
              <p style="margin: 0; color: #475569;"><strong>Severity:</strong> ${severity}</p>
              <p style="margin: 8px 0 0; color: #475569;">${summary}</p>
            </div>
            <p style="color: #64748b; font-size: 12px;">This alert was sent by Agentcy Control.</p>
          </div>
        `,
      };
    }
    case 'weekly-digest': {
      const incidents = (data.incidents as number) || 0;
      const deployments = (data.deployments as number) || 0;
      const cost = (data.cost as string) || '$0.00';
      return {
        subject: 'Weekly Operations Digest',
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
            <h1 style="color: #0f172a;">Weekly Operations Digest</h1>
            <div style="display: grid; gap: 16px; margin: 24px 0;">
              <div style="background: #f8fafc; padding: 16px; border-radius: 8px;">
                <p style="margin: 0; color: #64748b; font-size: 14px;">Incidents</p>
                <p style="margin: 4px 0 0; font-size: 24px; font-weight: bold; color: #1e293b;">${incidents}</p>
              </div>
              <div style="background: #f8fafc; padding: 16px; border-radius: 8px;">
                <p style="margin: 0; color: #64748b; font-size: 14px;">Deployments</p>
                <p style="margin: 4px 0 0; font-size: 24px; font-weight: bold; color: #1e293b;">${deployments}</p>
              </div>
              <div style="background: #f8fafc; padding: 16px; border-radius: 8px;">
                <p style="margin: 0; color: #64748b; font-size: 14px;">Total Cost</p>
                <p style="margin: 4px 0 0; font-size: 24px; font-weight: bold; color: #1e293b;">${cost}</p>
              </div>
            </div>
            <p style="color: #64748b; font-size: 12px;">Sent by Agentcy Control.</p>
          </div>
        `,
      };
    }
    case 'on-call-alert': {
      const name = (data.name as string) || 'Team Member';
      const shift = (data.shift as string) || 'Unknown shift';
      return {
        subject: `On-Call Alert: ${name}`,
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
            <h1 style="color: #0f172a;">On-Call Alert</h1>
            <p style="color: #475569;"><strong>${name}</strong> is now on-call for <strong>${shift}</strong>.</p>
            <p style="color: #64748b; font-size: 12px; margin-top: 24px;">Sent by Agentcy Control.</p>
          </div>
        `,
      };
    }
    case 'cost-alert': {
      const service = (data.service as string) || 'Unknown';
      const amount = (data.amount as string) || '$0.00';
      const limit = (data.limit as string) || '$0.00';
      return {
        subject: `Cost Alert: ${service} exceeded budget`,
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
            <h1 style="color: #d97706;">Cost Alert</h1>
            <div style="background: #fffbeb; border-left: 4px solid #d97706; padding: 16px; margin: 16px 0;">
              <p style="margin: 0; color: #475569;"><strong>Service:</strong> ${service}</p>
              <p style="margin: 8px 0 0; color: #475569;"><strong>Current Spend:</strong> ${amount}</p>
              <p style="margin: 8px 0 0; color: #475569;"><strong>Budget Limit:</strong> ${limit}</p>
            </div>
            <p style="color: #64748b; font-size: 12px;">Sent by Agentcy Control.</p>
          </div>
        `,
      };
    }
    default:
      return { subject: 'Agentcy Control', html: '<p>Hello from Agentcy Control.</p>' };
  }
}

serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const body: EmailRequest = await req.json();

    let subject = body.subject;
    let html = body.html || '';
    let text = body.text || '';

    if (body.template && body.data) {
      const rendered = renderTemplate(body.template, body.data);
      subject = rendered.subject;
      html = rendered.html;
      text = body.text || (body.data.summary as string) || '';
    }

    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) {
      return new Response(JSON.stringify({ error: 'Resend not configured' }), { status: 503 });
    }

    const toArray = Array.isArray(body.to) ? body.to : [body.to];

    const results = [];
    for (const recipient of toArray) {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: 'Agentcy Control <alerts@agentcy.dev>',
          to: recipient,
          subject,
          html,
          text: text || undefined,
        }),
      });

      const result = await resendRes.json();
      results.push({ recipient, status: resendRes.status, id: result.id, error: result.error });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Send email error:', err);
    return new Response(JSON.stringify({ error: err?.message || 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
