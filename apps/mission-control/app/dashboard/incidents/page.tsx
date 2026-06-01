'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@agentcy/supabase';
import { Card, Badge, Button, ErrorBanner } from '@agentcy/ui';
import { AlertTriangle, Clock, Users, Shield, Plus, Download } from 'lucide-react';
import Link from 'next/link';
import IncidentTimeline from '@/components/IncidentTimeline';

interface Incident {
  id: string;
  incident_number: number;
  severity: string;
  title: string;
  status: string;
  affected_services: string[];
  commander_id: string | null;
  started_at: string;
  resolved_at: string | null;
  projects?: { name: string };
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const supabase = createBrowserClient();

  useEffect(() => {
    async function fetchIncidents() {
      setFetchError(null);
      const { data, error } = await supabase
        .from('incidents')
        .select('*, projects(name)')
        .order('started_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching incidents:', error);
        setFetchError('Failed to load incidents. Please try again later.');
      } else {
        setIncidents(data || []);
      }
      setIsLoading(false);
    }

    fetchIncidents();
  }, [supabase]);

  function getSeverityBadge(severity: string) {
    switch (severity) {
      case 'sev1-critical':
        return <Badge variant="error">SEV 1</Badge>;
      case 'sev2-high':
        return <Badge variant="error">SEV 2</Badge>;
      case 'sev3-medium':
        return <Badge variant="warning">SEV 3</Badge>;
      case 'sev4-low':
        return <Badge variant="info">SEV 4</Badge>;
      default:
        return <Badge variant="default">{severity}</Badge>;
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'resolved':
        return <Badge variant="success">Resolved</Badge>;
      case 'monitoring':
        return <Badge variant="info">Monitoring</Badge>;
      case 'mitigating':
        return <Badge variant="warning">Mitigating</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  }

  return (
    <div className="space-y-6">
      {fetchError && <ErrorBanner message={fetchError} onDismiss={() => setFetchError(null)} />}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Incidents</h1>
          <p className="text-sm text-slate-500 mt-1">Track and manage incidents across your fleet</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => {
            const csv = [
              'ID,Title,Severity,Status,Project,Started,Resolved',
              ...incidents.map((i) => [
                i.incident_number,
                `"${i.title.replace(/"/g, '""')}"`,
                i.severity,
                i.status,
                i.projects?.name || '',
                i.started_at,
                i.resolved_at || '',
              ].join(','))
            ].join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `incidents-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Link href="/dashboard/incidents/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Incident
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Active</p>
              <p className="text-xl font-bold text-slate-900">
                {incidents.filter((i) => i.status !== 'resolved' && i.status !== 'postmortem').length}
              </p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Shield className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Resolved (30d)</p>
              <p className="text-xl font-bold text-slate-900">
                {incidents.filter((i) => i.status === 'resolved').length}
              </p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Avg MTTR</p>
              <p className="text-xl font-bold text-slate-900">12m</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-100 rounded-lg">
              <Users className="h-5 w-5 text-sky-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">On Call</p>
              <p className="text-xl font-bold text-slate-900">3</p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-slate-100 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : incidents.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-slate-500">No incidents found</p>
            <p className="text-xs text-slate-400 mt-1">When incidents are created, they will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {incidents.map((incident) => (
              <div
                key={incident.id}
                className="flex items-center justify-between p-4 border border-slate-100 rounded-lg hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center justify-center w-10 h-10 bg-slate-100 rounded-lg">
                    <span className="text-xs font-bold text-slate-600">#{incident.incident_number}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">{incident.title}</span>
                      {getSeverityBadge(incident.severity)}
                      {getStatusBadge(incident.status)}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      <span>{incident.projects?.name || 'Unknown Project'}</span>
                      {incident.affected_services && incident.affected_services.length > 0 && (
                        <span className="flex gap-1">
                          {incident.affected_services.map((s) => (
                            <Badge key={s} variant="default" className="text-xs">
                              {s}
                            </Badge>
                          ))}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">
                    {new Date(incident.started_at).toLocaleDateString()}
                  </span>
                  <Link
                    href={`/dashboard/incidents/${incident.id}`}
                    className="text-sm text-slate-600 hover:text-slate-900 font-medium"
                  >
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {incidents.length > 0 && (
        <IncidentTimeline incidentId={incidents[0].id} />
      )}
    </div>
  );
}
