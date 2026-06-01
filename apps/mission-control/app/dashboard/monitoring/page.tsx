import { createServerClient } from '@agentcy/supabase';
import { Card, Badge, Button, StatusIndicator } from '@agentcy/ui';
import {
  Activity,
  Globe,
  Plus,
  Timer,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
} from 'lucide-react';
import Link from 'next/link';

interface SyntheticCheck {
  id: string;
  project_id: string;
  name: string;
  type: string;
  url: string;
  config: Record<string, unknown>;
  schedule: string;
  enabled: boolean;
  last_result: Record<string, unknown> | null;
  last_run_at: string | null;
  projects: { name: string } | null;
}

function getCheckStatus(check: SyntheticCheck): 'healthy' | 'warning' | 'critical' | 'unknown' {
  if (!check.last_result) return 'unknown';
  const result = check.last_result as { status?: string; success?: boolean };
  if (result.success === false || result.status === 'failed') return 'critical';
  if (result.status === 'degraded') return 'warning';
  return 'healthy';
}

export default async function MonitoringPage() {
  const supabase = await createServerClient();

  const { data: checksRaw, error } = await supabase
    .from('synthetic_checks')
    .select('*, projects(name)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching checks:', error);
  }

  const checks: SyntheticCheck[] = (checksRaw || []).map((c: Record<string, unknown>) => ({
    id: c.id as string,
    project_id: c.project_id as string,
    name: c.name as string,
    type: c.type as string,
    url: c.url as string,
    config: c.config as Record<string, unknown>,
    schedule: c.schedule as string,
    enabled: c.enabled as boolean,
    last_result: c.last_result as Record<string, unknown> | null,
    last_run_at: c.last_run_at as string | null,
    projects: c.projects as SyntheticCheck['projects'],
  }));

  const healthyCount = checks.filter((c) => getCheckStatus(c) === 'healthy').length;
  const criticalCount = checks.filter((c) => getCheckStatus(c) === 'critical').length;
  const warningCount = checks.filter((c) => getCheckStatus(c) === 'warning').length;

  const responseTimes = checks
    .filter((c) => (c.last_result as { responseTime?: number })?.responseTime)
    .map((c) => (c.last_result as { responseTime?: number }).responseTime || 0);

  const avgResponse =
    responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Synthetic Monitoring</h1>
          <p className="text-sm text-slate-500 mt-1">
            Multi-region health checks, uptime monitoring, and end-to-end tests
          </p>
        </div>
        <Link href="/dashboard/monitoring/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Check
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Passing</p>
              <p className="text-xl font-bold text-slate-900">{healthyCount}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Failing</p>
              <p className="text-xl font-bold text-slate-900">{criticalCount}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Degraded</p>
              <p className="text-xl font-bold text-slate-900">{warningCount}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-100 rounded-lg">
              <Timer className="h-5 w-5 text-sky-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Avg Response</p>
              <p className="text-xl font-bold text-slate-900">
                {avgResponse !== null ? `${avgResponse}ms` : 'N/A'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Checks List */}
      <Card title="Active Checks" subtitle="Synthetic monitoring across all projects">
        {checks.length === 0 ? (
          <div className="py-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
              <Activity className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900">No checks configured</h3>
            <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
              Set up synthetic checks to monitor uptime, SSL expiration, and API health from
              multiple regions.
            </p>
            <div className="mt-6">
              <Link href="/dashboard/monitoring/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Check
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {checks.map((check) => {
              const status = getCheckStatus(check);
              const lastResult = check.last_result as {
                responseTime?: number;
                statusCode?: number;
                region?: string;
              } | null;

              return (
                <div
                  key={check.id}
                  className="flex items-center justify-between p-4 border border-slate-100 rounded-lg hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center justify-center w-10 h-10 rounded-lg bg-slate-100">
                      {check.type === 'http' ? (
                        <Globe className="h-5 w-5 text-slate-600" />
                      ) : check.type === 'playwright' ? (
                        <Play className="h-5 w-5 text-slate-600" />
                      ) : (
                        <Activity className="h-5 w-5 text-slate-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-900">{check.name}</span>
                        <StatusIndicator status={status} pulse={status !== 'healthy'} />
                        <Badge variant={check.enabled ? 'success' : 'default'} className="text-xs">
                          {check.enabled ? 'Active' : 'Paused'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        <span className="capitalize">{check.type}</span>
                        <span>{check.url}</span>
                        {lastResult?.responseTime && <span>{lastResult.responseTime}ms</span>}
                        {lastResult?.statusCode && <span>HTTP {lastResult.statusCode}</span>}
                        {lastResult?.region && <span>{lastResult.region}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">
                      {check.last_run_at
                        ? new Date(check.last_run_at).toLocaleTimeString()
                        : 'Never run'}
                    </span>
                    <Button variant="ghost" size="sm">
                      <Play className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
