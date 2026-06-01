import { createServerClient } from '@agentcy/supabase';
import { Card, Badge, StatusIndicator } from '@agentcy/ui';
import {
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Globe,
  Server,
} from 'lucide-react';
import { notFound } from 'next/navigation';

export const revalidate = 60;

interface PublicClient {
  id: string;
  name: string;
  slug: string;
  brand_colors: { primary?: string; secondary?: string; accent?: string } | null;
  status: string;
  subdomain: string;
  custom_domain: string | null;
  theme_json: Record<string, unknown> | null;
  enabled_modules: string[] | null;
}

interface StatusIncident {
  id: string;
  title: string;
  status: string;
  affected_services: string[] | null;
  updates: unknown[] | null;
  created_at: string;
}

interface ProjectEnv {
  id: string;
  name: string;
  url: string | null;
  is_production: boolean;
}

async function getPublicData(clientSlug?: string) {
  const supabase = await createServerClient();

  // Fetch public clients
  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select(
      `id, name, slug, brand_colors, status, client_portal_settings!inner(subdomain, custom_domain, theme_json, enabled_modules, public_status_page)`
    )
    .eq('client_portal_settings.public_status_page', true)
    .order('name');

  if (clientsError) {
    console.error('Error fetching public clients:', clientsError);
    return null;
  }

  if (!clients || clients.length === 0) {
    return null;
  }

  // Map nested relation to flat shape
  const mappedClients: PublicClient[] = clients.map((c: Record<string, unknown>) => {
    const cps = (c.client_portal_settings as Record<string, unknown>[])?.[0] || {};
    return {
      id: c.id as string,
      name: c.name as string,
      slug: c.slug as string,
      brand_colors: (c.brand_colors as Record<string, string>) || null,
      status: c.status as string,
      subdomain: cps.subdomain as string,
      custom_domain: cps.custom_domain as string | null,
      theme_json: cps.theme_json as Record<string, unknown> | null,
      enabled_modules: cps.enabled_modules as string[] | null,
    };
  });

  // Select target client
  const targetClient = clientSlug
    ? mappedClients.find((c) => c.slug === clientSlug)
    : mappedClients[0];

  if (!targetClient) {
    return null;
  }

  // Fetch public incidents for this client
  const { data: incidents, error: incidentsError } = await supabase
    .from('status_page_incidents')
    .select('id, title, status, affected_services, updates, created_at')
    .eq('client_id', targetClient.id)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(20);

  if (incidentsError) {
    console.error('Error fetching incidents:', incidentsError);
  }

  // Fetch project environments (services) for this client
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name')
    .eq('client_id', targetClient.id)
    .limit(20);

  const projectIds = projects?.map((p: Record<string, unknown>) => p.id) || [];

  let environments: ProjectEnv[] = [];
  if (projectIds.length > 0) {
    const { data: envs, error: envError } = await supabase
      .from('project_environments')
      .select('id, name, url, is_production')
      .in('project_id', projectIds)
      .limit(50);

    if (envError) {
      console.error('Error fetching environments:', envError);
    } else {
      environments = (envs || []).map((e: Record<string, unknown>) => ({
        id: e.id as string,
        name: e.name as string,
        url: e.url as string | null,
        is_production: e.is_production as boolean,
      }));
    }
  }

  // Count active incidents
  const activeIncidents =
    (incidents || []).filter(
      (i: StatusIncident) => !['resolved', 'postmortem'].includes(i.status)
    ).length;

  // Fetch synthetic checks for real uptime/response metrics
  const { data: checks } = await supabase
    .from('synthetic_checks')
    .select('last_result, last_run_at, enabled')
    .in('project_id', projectIds)
    .eq('enabled', true)
    .limit(50);

  const checkResults = (checks || []).map((c: Record<string, unknown>) => ({
    last_result: c.last_result as Record<string, unknown> | null,
    success: (c.last_result as Record<string, unknown>)?.success === true ||
      (c.last_result as Record<string, unknown>)?.status === 'healthy',
    responseTime: (c.last_result as Record<string, unknown>)?.responseTime as number | undefined,
  }));

  const totalChecks = checkResults.length;
  const passingChecks = checkResults.filter((c) => c.success).length;
  const uptimePercent = totalChecks > 0 ? Math.round((passingChecks / totalChecks) * 10000) / 100 : 100;

  const responseTimes = checkResults
    .filter((c) => typeof c.responseTime === 'number')
    .map((c) => c.responseTime as number);

  const avgResponse =
    responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : null;

  return {
    client: targetClient,
    clients: mappedClients,
    incidents: (incidents || []) as StatusIncident[],
    environments,
    activeIncidents,
    uptimePercent,
    avgResponse,
  };
}

function getStatusVariant(status: string) {
  switch (status) {
    case 'resolved':
    case 'postmortem':
      return 'success' as const;
    case 'monitoring':
      return 'warning' as const;
    case 'mitigating':
    case 'identified':
      return 'error' as const;
    case 'investigating':
    case 'detected':
      return 'error' as const;
    default:
      return 'default' as const;
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'detected':
      return 'Detected';
    case 'investigating':
      return 'Investigating';
    case 'identified':
      return 'Identified';
    case 'mitigating':
      return 'Mitigating';
    case 'monitoring':
      return 'Monitoring';
    case 'resolved':
      return 'Resolved';
    case 'postmortem':
      return 'Postmortem';
    default:
      return status;
  }
}

export default async function ClientPortalPage({
  searchParams,
}: {
  searchParams: { client?: string };
}) {
  const data = await getPublicData(searchParams.client);

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Server className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-slate-900">No Public Status Page</h1>
          <p className="text-slate-500 mt-2">
            There are no public status pages configured yet.
          </p>
        </div>
      </div>
    );
  }

  const { client, clients, incidents, environments, activeIncidents, uptimePercent, avgResponse } = data;
  const primaryColor = client.brand_colors?.primary || '#0f172a';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header
        className="border-b border-slate-200"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">{client.name}</h1>
              <p className="text-sm text-white/70 mt-1">System Status</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-full text-sm font-medium">
              {activeIncidents > 0 ? (
                <>
                  <AlertTriangle className="h-4 w-4" />
                  {activeIncidents} Active Incident{activeIncidents > 1 ? 's' : ''}
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  All Systems Operational
                </>
              )}
            </div>
          </div>

          {clients.length > 1 && (
            <div className="mt-4 flex gap-2">
              {clients.map((c) => (
                <a
                  key={c.id}
                  href={`?client=${c.slug}`}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    c.slug === client.slug
                      ? 'bg-white text-slate-900'
                      : 'bg-white/10 text-white/80 hover:bg-white/20'
                  }`}
                >
                  {c.name}
                </a>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Status Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Activity className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Uptime (30d)</p>
                <p className="text-xl font-bold text-slate-900">{uptimePercent.toFixed(2)}%</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-sky-100 rounded-lg">
                <Clock className="h-5 w-5 text-sky-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Response Time</p>
                <p className="text-xl font-bold text-slate-900">
                  {avgResponse !== null ? `${avgResponse}ms` : 'N/A'}
                </p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg ${
                  activeIncidents > 0 ? 'bg-amber-100' : 'bg-emerald-100'
                }`}
              >
                <AlertTriangle
                  className={`h-5 w-5 ${
                    activeIncidents > 0 ? 'text-amber-600' : 'text-emerald-600'
                  }`}
                />
              </div>
              <div>
                <p className="text-sm text-slate-500">Active Incidents</p>
                <p className="text-xl font-bold text-slate-900">{activeIncidents}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Services Status */}
        {environments.length > 0 && (
          <Card title="Services" subtitle="Current status of all monitored services">
            <div className="space-y-3">
              {environments.map((env) => (
                <div
                  key={env.id}
                  className="flex items-center justify-between p-3 border border-slate-100 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <StatusIndicator
                      status="healthy"
                      pulse={false}
                    />
                    <span className="text-sm font-medium text-slate-900">
                      {env.name}
                    </span>
                    {env.is_production && (
                      <Badge variant="success" className="text-[10px]">
                        Prod
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {env.url && (
                      <a
                        href={env.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-slate-400 hover:text-slate-600"
                      >
                        <Globe className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {environments.length === 0 && (
          <Card title="Services" subtitle="No services configured yet">
            <div className="py-8 text-center">
              <Server className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">
                No project environments found for this client.
              </p>
            </div>
          </Card>
        )}

        {/* Incident History */}
        <Card
          title="Recent Incidents"
          subtitle={incidents.length > 0 ? `Past incidents for ${client.name}` : 'No incidents reported'}
        >
          <div className="space-y-4">
            {incidents.length > 0 ? (
              incidents.map((incident) => (
                <div
                  key={incident.id}
                  className="flex items-start gap-3 p-3 border border-slate-100 rounded-lg"
                >
                  <Badge variant={getStatusVariant(incident.status)}>
                    {getStatusLabel(incident.status)}
                  </Badge>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      {incident.title}
                    </p>
                    {incident.affected_services &&
                      incident.affected_services.length > 0 && (
                        <p className="text-xs text-slate-500 mt-1">
                          Affected: {incident.affected_services.join(', ')}
                        </p>
                      )}
                    {incident.updates && incident.updates.length > 0 && (
                      <p className="text-xs text-slate-500 mt-1">
                        {incident.updates.length} update
                        {incident.updates.length > 1 ? 's' : ''}
                      </p>
                    )}
                    <p className="text-xs text-slate-400 mt-2">
                      {new Date(incident.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">
                  No incidents to report. All systems are operational.
                </p>
              </div>
            )}
          </div>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-5xl mx-auto px-6 py-6 text-center">
          <p className="text-sm text-slate-500">
            Powered by <span className="font-medium text-slate-900">Agentcy Control</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
