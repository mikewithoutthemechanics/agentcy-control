import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';

interface CheckResult {
  success: boolean;
  status: 'healthy' | 'degraded' | 'failed';
  statusCode?: number;
  responseTime: number;
  error?: string;
  region: string;
  checkedAt: string;
}

async function runHttpCheck(url: string, maxResponseTimeMs: number): Promise<CheckResult> {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      // Short timeout to avoid hanging
      // Deno fetch doesn't support signal/timeout directly in all versions,
      // so we wrap with Promise.race if needed. For now, Deno default is fine.
    });
    const responseTime = Date.now() - start;
    const success = res.ok && responseTime <= maxResponseTimeMs;
    return {
      success,
      status: success ? 'healthy' : res.ok ? 'degraded' : 'failed',
      statusCode: res.status,
      responseTime,
      region: 'us-east',
      checkedAt: new Date().toISOString(),
    };
  } catch (err: any) {
    return {
      success: false,
      status: 'failed',
      responseTime: Date.now() - start,
      error: err?.message || 'Network error',
      region: 'us-east',
      checkedAt: new Date().toISOString(),
    };
  }
}

async function runSslCheck(hostname: string): Promise<CheckResult> {
  const start = Date.now();
  try {
    // Basic connectivity check via HTTPS
    const res = await fetch(`https://${hostname}`, { method: 'HEAD' });
    const responseTime = Date.now() - start;
    return {
      success: res.ok,
      status: res.ok ? 'healthy' : 'failed',
      statusCode: res.status,
      responseTime,
      region: 'us-east',
      checkedAt: new Date().toISOString(),
    };
  } catch (err: any) {
    return {
      success: false,
      status: 'failed',
      responseTime: Date.now() - start,
      error: err?.message || 'SSL/Connection error',
      region: 'us-east',
      checkedAt: new Date().toISOString(),
    };
  }
}

async function runDnsCheck(hostname: string): Promise<CheckResult> {
  const start = Date.now();
  try {
    // Deno does not have a native DNS resolver accessible from fetch.
    // We do a basic fetch to validate resolution.
    await fetch(`http://${hostname}`, { method: 'HEAD' });
    return {
      success: true,
      status: 'healthy',
      responseTime: Date.now() - start,
      region: 'us-east',
      checkedAt: new Date().toISOString(),
    };
  } catch (err: any) {
    return {
      success: false,
      status: 'failed',
      responseTime: Date.now() - start,
      error: err?.message || 'DNS resolution failed',
      region: 'us-east',
      checkedAt: new Date().toISOString(),
    };
  }
}

async function runTcpCheck(host: string, port: number): Promise<CheckResult> {
  const start = Date.now();
  try {
    const conn = await Deno.connect({ hostname: host, port });
    conn.close();
    return {
      success: true,
      status: 'healthy',
      responseTime: Date.now() - start,
      region: 'us-east',
      checkedAt: new Date().toISOString(),
    };
  } catch (err: any) {
    return {
      success: false,
      status: 'failed',
      responseTime: Date.now() - start,
      error: err?.message || 'TCP connection refused',
      region: 'us-east',
      checkedAt: new Date().toISOString(),
    };
  }
}

serve(async (req) => {
  try {
    // This function can be triggered by a cron job or direct HTTP call
    // For cron, Supabase sends a POST with {} body
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch all enabled synthetic checks
    const { data: checks, error: checksError } = await supabase
      .from('synthetic_checks')
      .select('*')
      .eq('enabled', true);

    if (checksError || !checks || checks.length === 0) {
      return new Response(
        JSON.stringify({ success: true, checked: 0, message: 'No enabled checks found' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const results: Array<{ checkId: string; result: CheckResult }> = [];

    for (const check of checks) {
      let result: CheckResult;
      const assertions = (check.assertions || []) as Array<{ type: string; expected?: number; max?: number }>;
      const maxResponseTime = assertions.find((a: any) => a.type === 'response_time_ms')?.max || 5000;

      switch (check.type) {
        case 'http':
          result = await runHttpCheck(check.url, maxResponseTime);
          break;
        case 'ssl': {
          const url = new URL(check.url);
          result = await runSslCheck(url.hostname);
          break;
        }
        case 'dns': {
          const url = new URL(check.url);
          result = await runDnsCheck(url.hostname);
          break;
        }
        case 'tcp': {
          const url = new URL(check.url);
          result = await runTcpCheck(url.hostname, parseInt(url.port) || 80);
          break;
        }
        default:
          result = {
            success: false,
            status: 'failed',
            responseTime: 0,
            error: 'Unsupported check type',
            region: 'us-east',
            checkedAt: new Date().toISOString(),
          };
      }

      // Evaluate assertions
      if (result.success && assertions.length > 0) {
        for (const assertion of assertions) {
          if (assertion.type === 'status_code' && result.statusCode !== undefined) {
            if (result.statusCode !== assertion.expected) {
              result.success = false;
              result.status = 'failed';
              result.error = `Expected status ${assertion.expected}, got ${result.statusCode}`;
            }
          }
          if (assertion.type === 'response_time_ms' && result.responseTime > (assertion.max || 5000)) {
            result.success = false;
            result.status = 'degraded';
            result.error = `Response time ${result.responseTime}ms exceeded ${assertion.max}ms`;
          }
        }
      }

      // Update check in DB
      const newSuccessCount = result.success ? (check.success_count || 0) + 1 : (check.success_count || 0);
      const newFailureCount = !result.success ? (check.failure_count || 0) + 1 : (check.failure_count || 0);

      await supabase
        .from('synthetic_checks')
        .update({
          last_result: {
            ...result,
            assertionsPassed: result.success,
          },
          last_run_at: result.checkedAt,
          success_count: newSuccessCount,
          failure_count: newFailureCount,
        })
        .eq('id', check.id);

      // Write unified event on failure
      if (!result.success) {
        await supabase.from('unified_events').insert({
          project_id: check.project_id,
          source: 'synthetic',
          event_type: 'check_failed',
          severity: result.status === 'failed' ? 'error' : 'warning',
          payload: {
            check_id: check.id,
            check_name: check.name,
            check_type: check.type,
            url: check.url,
            result,
          },
        });
      }

      results.push({ checkId: check.id, result });
    }

    return new Response(
      JSON.stringify({
        success: true,
        checked: checks.length,
        results: results.map((r) => ({ id: r.checkId, status: r.result.status, success: r.result.success })),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Synthetic checker error:', err);
    return new Response(
      JSON.stringify({ error: err?.message || 'Internal error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
