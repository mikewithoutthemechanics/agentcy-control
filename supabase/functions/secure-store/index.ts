import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';
import { encrypt } from '../_shared/crypto.ts';

interface SecureStoreRequest {
  serviceType: string;
  environment: string;
  config: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  projectId?: string;
}

serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { serviceType, environment, config, metadata, projectId }: SecureStoreRequest = await req.json();

    if (!serviceType || !environment || !config) {
      return new Response(JSON.stringify({ error: 'serviceType, environment, and config are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Encrypt the config using the master key
    const masterKey = Deno.env.get('ENCRYPTION_MASTER_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!.slice(0, 32);
    const encryptedConfig = await encrypt(JSON.stringify(config), masterKey);

    const { error } = await supabase.from('project_service_configs').insert({
      project_id: projectId || null,
      service_type: serviceType,
      environment: environment as any,
      config_json_encrypted: encryptedConfig,
      metadata_json: metadata || { storedAt: new Date().toISOString() },
      is_active: true,
    });

    if (error) {
      console.error('Secure store error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, encrypted: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Secure store error:', err);
    return new Response(JSON.stringify({ error: err?.message || 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
