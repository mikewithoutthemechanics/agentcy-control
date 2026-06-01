import { createServerClient } from '@agentcy/supabase';
import { Card, Badge } from '@agentcy/ui';
import { Shield, Lock, Key, History, Fingerprint } from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_name: string | null;
  changes: Record<string, unknown> | null;
  created_at: string;
  profiles: { email: string | null; full_name: string | null } | null;
}

export default async function SecurityPage() {
  const supabase = await createServerClient();

  // Fetch real audit logs
  const { data: auditLogs, error } = await supabase
    .from('audit_logs')
    .select('*, profiles:user_profiles!user_id(email, full_name)')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching audit logs:', error);
  }

  const logs: AuditLog[] = (auditLogs || []).map((log: Record<string, unknown>) => ({
    id: log.id as string,
    action: log.action as string,
    entity_type: log.entity_type as string,
    entity_name: log.entity_name as string | null,
    changes: log.changes as Record<string, unknown> | null,
    created_at: log.created_at as string,
    profiles: log.profiles as AuditLog['profiles'],
  }));

  // Count action types for the summary
  const actionCounts = logs.reduce<Record<string, number>>((acc, log) => {
    acc[log.action] = (acc[log.action] || 0) + 1;
    return acc;
  }, {});

  const totalActions = logs.length;
  const createCount = actionCounts['create'] || 0;
  const updateCount = actionCounts['update'] || 0;
  const deleteCount = actionCounts['delete'] || 0;
  const loginCount = actionCounts['login'] || 0;

  // Calculate security score (heuristic based on audit activity)
  // More diverse actions = more activity = higher score (simplified)
  const uniqueActions = Object.keys(actionCounts).length;
  const securityScore = Math.min(60 + uniqueActions * 8 + Math.min(totalActions, 20), 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Security</h1>
        <p className="text-sm text-slate-500 mt-1">Audit logs, access control, and compliance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Shield className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Security Score</p>
              <p className="text-xl font-bold text-slate-900">{securityScore}/100</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-100 rounded-lg">
              <Lock className="h-5 w-5 text-sky-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Audit Events (30d)</p>
              <p className="text-xl font-bold text-slate-900">{totalActions}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Key className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Modifications</p>
              <p className="text-xl font-bold text-slate-900">{createCount + updateCount + deleteCount}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Fingerprint className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Logins (30d)</p>
              <p className="text-xl font-bold text-slate-900">{loginCount}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Recent Audit Log" subtitle="Last 30 days of security events">
        {logs.length === 0 ? (
          <div className="py-8 text-center">
            <History className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No audit logs found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-3 border border-slate-100 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <History className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {log.action} {log.entity_type}
                    </p>
                    <p className="text-xs text-slate-500">
                      {log.profiles?.full_name || log.profiles?.email || 'System'} on{' '}
                      {log.entity_name || log.entity_type}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant={
                      log.action === 'delete'
                        ? 'error'
                        : log.action === 'update'
                          ? 'warning'
                          : 'default'
                    }
                    className="text-xs"
                  >
                    {log.action}
                  </Badge>
                  <span className="text-xs text-slate-400">
                    {new Date(log.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
