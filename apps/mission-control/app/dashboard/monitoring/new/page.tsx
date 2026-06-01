'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@agentcy/supabase';
import { Button, Card } from '@agentcy/ui';
import { ArrowLeft, Activity } from 'lucide-react';
import Link from 'next/link';

export default function NewCheckPage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({
    projectId: '',
    name: '',
    type: 'http',
    url: '',
    schedule: '*/5 * * * *',
    enabled: true,
    assertionStatus: '200',
    assertionResponseTime: '5000',
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

    const assertions = [];
    if (form.assertionStatus) {
      assertions.push({ type: 'status_code', expected: parseInt(form.assertionStatus, 10) });
    }
    if (form.assertionResponseTime) {
      assertions.push({ type: 'response_time_ms', max: parseInt(form.assertionResponseTime, 10) });
    }

    const { error: insertError } = await supabase.from('synthetic_checks').insert({
      project_id: form.projectId,
      name: form.name,
      type: form.type,
      url: form.url,
      schedule: form.schedule,
      enabled: form.enabled,
      assertions,
    });

    if (insertError) {
      setError(insertError.message);
      setIsLoading(false);
      return;
    }

    router.push('/dashboard/monitoring');
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard/monitoring" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900 mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Monitoring
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">New Synthetic Check</h1>
        <p className="text-sm text-slate-500 mt-1">Set up automated health checks for your projects</p>
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Check Name</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none text-sm"
              placeholder="e.g., Homepage Health Check"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none text-sm bg-white"
              >
                <option value="http">HTTP</option>
                <option value="ssl">SSL</option>
                <option value="dns">DNS</option>
                <option value="tcp">TCP</option>
                <option value="playwright">Playwright (E2E)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Schedule (cron)</label>
              <input
                type="text"
                value={form.schedule}
                onChange={(e) => setForm((prev) => ({ ...prev, schedule: e.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none text-sm font-mono"
                placeholder="*/5 * * * *"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">URL / Endpoint</label>
            <input
              type="text"
              required
              value={form.url}
              onChange={(e) => setForm((prev) => ({ ...prev, url: e.target.value }))}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none text-sm"
              placeholder="https://api.example.com/health"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Expected Status Code</label>
              <input
                type="text"
                value={form.assertionStatus}
                onChange={(e) => setForm((prev) => ({ ...prev, assertionStatus: e.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none text-sm"
                placeholder="200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Max Response Time (ms)</label>
              <input
                type="text"
                value={form.assertionResponseTime}
                onChange={(e) => setForm((prev) => ({ ...prev, assertionResponseTime: e.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none text-sm"
                placeholder="5000"
              />
            </div>
          </div>

          {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>}

          <div className="flex justify-end gap-3">
            <Link href="/dashboard/monitoring">
              <Button variant="secondary">Cancel</Button>
            </Link>
            <Button type="submit" isLoading={isLoading}>
              <Activity className="h-4 w-4 mr-2" />
              Create Check
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
