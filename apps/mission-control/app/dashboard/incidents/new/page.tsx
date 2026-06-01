'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@agentcy/supabase';
import { Button, Card } from '@agentcy/ui';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function NewIncidentPage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({
    projectId: '',
    severity: 'sev3-medium',
    title: '',
    summary: '',
    affectedServices: '',
  });

  useEffect(() => {
    supabase.from('projects').select('id, name').eq('is_archived', false).then(({ data }) => {
      setProjects(data || []);
      if (data && data.length > 0) {
        setForm((prev) => ({ ...prev, projectId: data[0].id }));
      }
    });
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const { data: project } = await supabase
      .from('projects')
      .select('client_id, clients(agency_id)')
      .eq('id', form.projectId)
      .single();

    if (!project) {
      setError('Project not found');
      setIsLoading(false);
      return;
    }

    const agencyId = (project as Record<string, unknown>).clients
      ? ((project as Record<string, unknown>).clients as Record<string, unknown>[])[0]?.agency_id as string
      : undefined;

    const { error: insertError } = await supabase.from('incidents').insert({
      agency_id: agencyId,
      project_id: form.projectId,
      severity: form.severity,
      title: form.title,
      summary: form.summary,
      status: 'detected',
      affected_services: form.affectedServices.split(',').map((s) => s.trim()).filter(Boolean),
    });

    if (insertError) {
      setError(insertError.message);
      setIsLoading(false);
      return;
    }

    router.push('/dashboard/incidents');
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard/incidents" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900 mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Incidents
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">New Incident</h1>
        <p className="text-sm text-slate-500 mt-1">Log a new incident for tracking and response</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Project</label>
            <select
              required
              value={form.projectId}
              onChange={(e) => setForm((prev) => ({ ...prev, projectId: e.target.value }))}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none text-sm bg-white"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Severity</label>
            <select
              value={form.severity}
              onChange={(e) => setForm((prev) => ({ ...prev, severity: e.target.value }))}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none text-sm bg-white"
            >
              <option value="sev1-critical">SEV 1 - Critical</option>
              <option value="sev2-high">SEV 2 - High</option>
              <option value="sev3-medium">SEV 3 - Medium</option>
              <option value="sev4-low">SEV 4 - Low</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none text-sm"
              placeholder="Brief description of the incident"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Summary</label>
            <textarea
              rows={3}
              value={form.summary}
              onChange={(e) => setForm((prev) => ({ ...prev, summary: e.target.value }))}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none text-sm resize-none"
              placeholder="What happened, impact, and initial observations"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Affected Services (comma-separated)</label>
            <input
              type="text"
              value={form.affectedServices}
              onChange={(e) => setForm((prev) => ({ ...prev, affectedServices: e.target.value }))}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none text-sm"
              placeholder="e.g., api, database, cdn"
            />
          </div>

          {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>}

          <div className="flex justify-end gap-3">
            <Link href="/dashboard/incidents">
              <Button variant="secondary">Cancel</Button>
            </Link>
            <Button type="submit" isLoading={isLoading}>
              <AlertTriangle className="h-4 w-4 mr-2" />
              Create Incident
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
