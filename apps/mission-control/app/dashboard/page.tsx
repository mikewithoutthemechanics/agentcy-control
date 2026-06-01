import { createServerClient } from '@agentcy/supabase';
import { Card, Badge, StatusIndicator } from '@agentcy/ui';
import {
  Activity,
  AlertTriangle,
  Zap,
  TrendingUp,
  Server,
  Globe,
  Clock,
} from 'lucide-react';

export const revalidate = 30;

export default async function DashboardPage() {
  const supabase = await createServerClient();

  // Fetch real summary data in parallel
  const [
    projectsResult,
    deploymentsResult,
    alertsResult,
    criticalIncidentsResult,
    allOpenAlertsResult,
    recentEventsResult,
  ] = await Promise.all([
    supabase.from('projects').select('id, name, category, status, client_id').limit(100),
    supabase
      .from('deployments')
      .select('id, status, environment, deployed_at', { count: 'exact', head: false })
      .in('status', ['pending', 'building', 'ready'])
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('alert_notifications')
      .select('id, severity, status, title, created_at', { count: 'exact', head: false })
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('incidents')
      .select('id', { count: 'exact', head: true })
      .in('status', ['detected', 'investigating', 'identified', 'mitigating'])
      .eq('severity', 'sev1-critical'),
    supabase
      .from('alert_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open'),
    supabase
      .from('unified_events')
      .select('id, source, event_type, severity, payload, occurred_at')
      .order('occurred_at', { ascending: false })
      .limit(10),
  ]);

  const projects = projectsResult.data || [];
  const deployments = deploymentsResult.data || [];
  const alerts = alertsResult.data || [];
  const criticalIncidents = criticalIncidentsResult.count || 0;
  const openAlerts = allOpenAlertsResult.count || 0;
  const recentEvents = recentEventsResult.data || [];

  // Compute stats
  const totalProjects = projects.length;
  const activeDeployments = deployments.length;
  const readyDeployments = deployments.filter((d) => d.status === 'ready').length;
  const buildingDeployments = deployments.filter(
    (d) => d.status === 'pending' || d.status === 'building'
  ).length;
  const openAlertCount = alerts.length;
  const criticalAlertCount = alerts.filter((a) => a.severity === 'critical').length;
  const warningAlertCount = alerts.filter((a) => a.severity === 'warning').length;

  // System health: 100% minus a penalty for critical issues
  const healthPenalty = criticalIncidents > 0 ? 0.5 : openAlertCount > 0 ? 0.1 : 0;
  const systemHealth = (100 - healthPenalty).toFixed(1);
  const isHealthy = criticalIncidents === 0 && openAlertCount === 0;

  // Format recent events
  const formattedEvents = recentEvents.map((event) => {
    const payload = (event.payload as Record<string, unknown>) || {};
    let title = '';
    let subtitle = '';
    let badge = 'System';

    switch (event.source) {
      case 'vercel':
        title = (payload.project_name as string) || 'Deployment';
        subtitle = (payload.commit_message as string) || 'New deployment';
        badge = 'Deploy';
        break;
      case 'sentry':
        title = (payload.title as string) || 'Error';
        subtitle = (payload.culprit as string) || 'Error tracked';
        badge = 'Error';
        break;
      case 'posthog':
        title = (payload.event as string) || 'Event';
        subtitle = 'Analytics event';
        badge = 'Analytics';
        break;
      case 'supabase':
        title = (payload.message as string) || 'DB Event';
        subtitle = 'Database activity';
        badge = 'DB';
        break;
      default:
        title = event.event_type || 'Event';
        subtitle = `From ${event.source}`;
        badge = event.source || 'System';
    }

    return {
      id: event.id,
      title,
      subtitle,
      badge,
      severity: event.severity,
      time: new Date(event.occurred_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  });

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Projects</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{totalProjects}</p>
            </div>
            <div className="p-3 bg-slate-100 rounded-lg">
              <Server className="h-6 w-6 text-slate-700" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="h-4 w-4 text-emerald-500 mr-1" />
            <span className="text-emerald-600 font-medium">{totalProjects}</span>
            <span className="text-slate-500 ml-1">total</span>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Active Deployments</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{activeDeployments}</p>
            </div>
            <div className="p-3 bg-sky-100 rounded-lg">
              <Zap className="h-6 w-6 text-sky-700" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Badge variant="success">{readyDeployments} Ready</Badge>
            {buildingDeployments > 0 && (
              <Badge variant="warning">{buildingDeployments} Building</Badge>
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Open Alerts</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{openAlertCount}</p>
            </div>
            <div className="p-3 bg-amber-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-amber-700" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            {criticalAlertCount > 0 && (
              <Badge variant="error">{criticalAlertCount} Critical</Badge>
            )}
            {warningAlertCount > 0 && (
              <Badge variant="warning">{warningAlertCount} Warning</Badge>
            )}
            {criticalAlertCount === 0 && warningAlertCount === 0 && (
              <Badge variant="success">All Clear</Badge>
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">System Health</p>
              <p
                className={`text-2xl font-bold mt-1 ${
                  isHealthy ? 'text-emerald-600' : 'text-amber-600'
                }`}
              >
                {systemHealth}%
              </p>
            </div>
            <div className={`p-3 rounded-lg ${isHealthy ? 'bg-emerald-100' : 'bg-amber-100'}`}>
              <Activity
                className={`h-6 w-6 ${isHealthy ? 'text-emerald-700' : 'text-amber-700'}`}
              />
            </div>
          </div>
          <div className="mt-4">
            <StatusIndicator
              status={isHealthy ? 'healthy' : 'warning'}
              label={
                criticalIncidents > 0
                  ? `${criticalIncidents} critical issue${criticalIncidents > 1 ? 's' : ''}`
                  : openAlertCount > 0
                    ? `${openAlertCount} open alert${openAlertCount > 1 ? 's' : ''}`
                    : 'All services operational'
              }
            />
          </div>
        </Card>
      </div>

      {/* Fleet Health Grid */}
      <Card title="Fleet Health" subtitle="Real-time status of all connected projects">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.length > 0 ? (
            projects.map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between p-4 border border-slate-100 rounded-lg hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <StatusIndicator status="healthy" pulse={false} />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{project.name}</p>
                    <p className="text-xs text-slate-500 capitalize">
                      {(project.category as string)?.replace('_', ' ')}
                    </p>
                  </div>
                </div>
                <Globe className="h-4 w-4 text-slate-400" />
              </div>
            ))
          ) : (
            <div className="col-span-full py-12 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 mb-3">
                <Server className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500">No projects connected yet</p>
              <p className="text-xs text-slate-400 mt-1">Go to Projects to add your first project</p>
            </div>
          )}
        </div>
      </Card>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card title="Recent Events" subtitle="Latest activity across your agency">
            <div className="space-y-4">
              {formattedEvents.length > 0 ? (
                formattedEvents.map((event) => (
                  <div key={event.id} className="flex items-start gap-3 py-2">
                    <div
                      className={`w-2 h-2 mt-2 rounded-full ${
                        event.severity === 'critical'
                          ? 'bg-red-500'
                          : event.severity === 'error'
                            ? 'bg-amber-500'
                            : event.severity === 'warning'
                              ? 'bg-yellow-400'
                              : 'bg-slate-300'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-900 truncate">{event.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{event.subtitle}</p>
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {event.time}
                      </p>
                    </div>
                    <Badge variant="default" className="shrink-0">
                      {event.badge}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center">
                  <Activity className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No recent events</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        <div>
          <Card title="Quick Actions">
            <div className="space-y-2">
              <button className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium text-slate-700 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                <Zap className="h-4 w-4 text-sky-600" />
                Trigger Deployment
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium text-slate-700 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Acknowledge All Alerts
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium text-slate-700 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                <Activity className="h-4 w-4 text-emerald-600" />
                Run Health Checks
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
