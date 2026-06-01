'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@agentcy/supabase';
import { Button, Card } from '@agentcy/ui';
import { ArrowLeft, Rocket } from 'lucide-react';
import Link from 'next/link';

interface Client {
  id: string;
  name: string;
}

export default function NewProjectPage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState({
    clientId: '',
    name: '',
    slug: '',
    description: '',
    category: 'web_app',
    deployment_strategy: 'standard',
  });

  useEffect(() => {
    supabase.from('clients').select('id, name').order('name').then(({ data }) => {
      setClients(data || []);
      if (data && data.length > 0) {
        setForm((prev) => ({ ...prev, clientId: data[0].id }));
      }
    });
  }, [supabase]);

  function handleNameChange(name: string) {
    setForm((prev) => ({
      ...prev,
      name,
      slug: name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/^-+|-+$/g, ''),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!form.clientId) {
      setError('Please select a client.');
      setIsLoading(false);
      return;
    }

    const { error: projectError } = await supabase.from('projects').insert({
      client_id: form.clientId,
      name: form.name,
      slug: form.slug,
      description: form.description,
      category: form.category,
      deployment_strategy: form.deployment_strategy,
    });

    if (projectError) {
      setError(projectError.message);
    } else {
      router.push('/projects');
    }

    setIsLoading(false);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/projects" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900 mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Projects
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">New Project</h1>
        <p className="text-sm text-slate-500 mt-1">Add a new application or client project to your mission control</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Client</label>
            <select
              required
              value={form.clientId}
              onChange={(e) => setForm((prev) => ({ ...prev, clientId: e.target.value }))}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none text-sm bg-white"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Project Name</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none text-sm"
              placeholder="My Awesome App"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Slug</label>
            <input
              type="text"
              required
              value={form.slug}
              onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none text-sm font-mono"
              placeholder="my-awesome-app"
            />
            <p className="text-xs text-slate-500 mt-1">Used in URLs and API references</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none text-sm resize-none"
              placeholder="What does this project do?"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none text-sm bg-white"
              >
                <option value="web_app">Web Application</option>
                <option value="mobile_app">Mobile App</option>
                <option value="marketing_site">Marketing Site</option>
                <option value="api">API</option>
                <option value="infrastructure">Infrastructure</option>
                <option value="ecommerce">E-Commerce</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Deployment Strategy</label>
              <select
                value={form.deployment_strategy}
                onChange={(e) => setForm((prev) => ({ ...prev, deployment_strategy: e.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none text-sm bg-white"
              >
                <option value="standard">Standard</option>
                <option value="blue_green">Blue/Green</option>
                <option value="canary">Canary</option>
                <option value="rolling">Rolling</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>
          )}

          <div className="flex justify-end gap-3">
            <Link href="/projects">
              <Button variant="secondary">Cancel</Button>
            </Link>
            <Button type="submit" isLoading={isLoading}>
              <Rocket className="h-4 w-4 mr-2" />
              Create Project
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
