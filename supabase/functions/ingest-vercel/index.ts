import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';
import { getVercelSignature, verifyHmac } from '../_shared/webhooks.ts';

interface VercelDeployment {
  id: string;
  name: string;
  url: string;
  state: string;
  type: string;
  creator: { username: string; uid: string };
  created: number;
  readyState: string;
  source?: string;
  target?: string;
  inspectorUrl?: string;
  meta?: Record<string, unknown>;
  projectId?: string;
}

serve(async (req) => {
  try {
    const payloadText = await req.text();
    const payload = JSON.parse(payloadText);
    const deployment: VercelDeployment = payload;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify webhook signature
    const signature = getVercelSignature(req);
    if (signature) {
      const secret = Deno.env.get('VERCEL_WEBHOOK_SECRET');
      if (secret) {
        const isValid = await verifyHmac(payloadText, signature, secret);
        if (!isValid) {
          return new Response(JSON.stringify({ error: 'Invalid webhook signature' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }
    }

    const statusMap: Record<string, string> = {
      INITIALIZING: 'pending',
      ANALYZING: 'building',
      BUILDING: 'building',
      DEPLOYING: 'building',
      READY: 'ready',
      ERROR: 'failed',
      CANCELED: 'cancelled',
    };

    const projectId = deployment.projectId || payload.projectId || 'unknown';

    // Find the project by vercel_project_id in metadata
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('metadata->>vercel_project_id', projectId)
      .single();

    if (!project) {
      return new Response(JSON.stringify({ error: 'Project not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Upsert deployment to avoid duplicates on webhook retries
    const { error } = await supabase
      .from('deployments')
      .upsert({
        project_id: project.id,
        environment: deployment.target === 'production' ? 'production' : 'preview',
        external_id: deployment.id,
        status: statusMap[deployment.readyState] || 'pending',
        branch: deployment.meta?.branch?.toString() || null,
        commit_sha: deployment.meta?.githubCommitSha?.toString() || null,
        commit_message: deployment.meta?.githubCommitMessage?.toString() || null,
        author: deployment.creator?.username || null,
        url: deployment.url || null,
        metadata: payload,
      }, { onConflict: 'project_id,external_id' });

    if (error) {
      console.error('Error storing deployment:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create unified event
    await supabase.from('unified_events').insert({
      project_id: project.id,
      source: 'vercel',
      event_type: 'deployment',
      severity: deployment.readyState === 'ERROR' ? 'error' : 'info',
      payload: payload,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error processing Vercel webhook:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
