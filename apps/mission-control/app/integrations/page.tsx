'use client';

import { useState } from 'react';
import { createBrowserClient } from '@agentcy/supabase';
import { Card, Badge, Button } from '@agentcy/ui';
import {
  Settings,
  Database,
  Globe,
  Bug,
  BarChart3,
  Mail,
  HardDrive,
  Github,
  CreditCard,
  Cloud,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from 'lucide-react';

interface ServiceConfig {
  type: string;
  name: string;
  description: string;
  icon: React.ElementType;
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: string;
  environments: string[];
}

const services: ServiceConfig[] = [
  {
    type: 'supabase',
    name: 'Supabase',
    description: 'Database, Auth, Storage, and Realtime',
    icon: Database,
    status: 'disconnected',
    environments: ['development', 'staging', 'production'],
  },
  {
    type: 'vercel',
    name: 'Vercel',
    description: 'Deployments, Preview, and Analytics',
    icon: Globe,
    status: 'disconnected',
    environments: ['development', 'staging', 'production', 'preview'],
  },
  {
    type: 'sentry',
    name: 'Sentry',
    description: 'Error tracking and performance monitoring',
    icon: Bug,
    status: 'disconnected',
    environments: ['development', 'staging', 'production'],
  },
  {
    type: 'posthog',
    name: 'PostHog',
    description: 'Product analytics and feature flags',
    icon: BarChart3,
    status: 'disconnected',
    environments: ['development', 'staging', 'production'],
  },
  {
    type: 'resend',
    name: 'Resend',
    description: 'Transactional email delivery',
    icon: Mail,
    status: 'disconnected',
    environments: ['production'],
  },
  {
    type: 'redis',
    name: 'Redis',
    description: 'Cache, sessions, and job queues',
    icon: HardDrive,
    status: 'disconnected',
    environments: ['development', 'staging', 'production'],
  },
  {
    type: 'github',
    name: 'GitHub',
    description: 'Source control and CI/CD integration',
    icon: Github,
    status: 'disconnected',
    environments: ['development', 'staging', 'production'],
  },
  {
    type: 'stripe',
    name: 'Stripe',
    description: 'Billing and subscription management',
    icon: CreditCard,
    status: 'disconnected',
    environments: ['production'],
  },
  {
    type: 'cloudflare',
    name: 'Cloudflare',
    description: 'DNS, CDN, and edge security',
    icon: Cloud,
    status: 'disconnected',
    environments: ['production'],
  },
];

export default function IntegrationsPage() {
  const [selectedService, setSelectedService] = useState<ServiceConfig | null>(null);
  const [modalForm, setModalForm] = useState({
    apiKey: '',
    projectId: '',
    environments: [] as string[],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const supabase = createBrowserClient();

  function openModal(service: ServiceConfig) {
    setModalForm({ apiKey: '', projectId: '', environments: [] });
    setSaveError('');
    setSelectedService(service);
  }

  function closeModal() {
    setSelectedService(null);
    setModalForm({ apiKey: '', projectId: '', environments: [] });
    setSaveError('');
  }

  async function handleSaveConnection() {
    if (!selectedService) return;
    if (!modalForm.apiKey || !modalForm.projectId) {
      setSaveError('API Key and Project ID are required');
      return;
    }
    if (modalForm.environments.length === 0) {
      setSaveError('Select at least one environment');
      return;
    }

    setIsSaving(true);
    setSaveError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/secure-store`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          serviceType: selectedService.type,
          environment: modalForm.environments[0],
          config: {
            apiKey: modalForm.apiKey,
            projectId: modalForm.projectId,
            environments: modalForm.environments,
          },
          metadata: { service: selectedService.type, connectedAt: new Date().toISOString() },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setSaveError(result.error || 'Failed to save connection');
      } else {
        closeModal();
      }
    } catch (err: any) {
      setSaveError(err?.message || 'Network error while saving');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Integrations</h1>
        <p className="text-sm text-slate-500 mt-1">
          Connect and manage your third-party services across all projects
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((service) => (
          <Card key={service.type} className="hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <service.icon className="h-5 w-5 text-slate-700" />
                </div>
                <div>
                  <h3 className="font-medium text-slate-900">{service.name}</h3>
                  <p className="text-xs text-slate-500">{service.description}</p>
                </div>
              </div>
              {service.status === 'connected' ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : service.status === 'error' ? (
                <XCircle className="h-5 w-5 text-red-500" />
              ) : (
                <div className="h-2 w-2 rounded-full bg-slate-300 mt-2" />
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {service.environments.map((env) => (
                <Badge key={env} variant="default" className="text-xs capitalize">
                  {env}
                </Badge>
              ))}
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                {service.status === 'connected' && service.lastSync && (
                  <>
                    <RefreshCw className="h-3 w-3" />
                    Synced {service.lastSync}
                  </>
                )}
                {service.status === 'disconnected' && 'Not connected'}
              </div>
              <Button
                variant={service.status === 'connected' ? 'secondary' : 'primary'}
                size="sm"
                onClick={() => openModal(service)}
              >
                {service.status === 'connected' ? 'Configure' : 'Connect'}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Service Configuration Modal Placeholder */}
      {selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <selectedService.icon className="h-5 w-5 text-slate-700" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{selectedService.name}</h3>
                  <p className="text-xs text-slate-500">{selectedService.description}</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">API Key / Token</label>
                <input
                  type="password"
                  value={modalForm.apiKey}
                  onChange={(e) => setModalForm((prev) => ({ ...prev, apiKey: e.target.value }))}
                  placeholder="Enter your API key"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none text-sm"
                />
                <p className="text-xs text-slate-500 mt-1">This will be encrypted and stored securely</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Project ID / Org Slug</label>
                <input
                  type="text"
                  value={modalForm.projectId}
                  onChange={(e) => setModalForm((prev) => ({ ...prev, projectId: e.target.value }))}
                  placeholder="e.g., project-ref or org-slug"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Environments</label>
                <div className="flex gap-3">
                  {['development', 'staging', 'production'].map((env) => (
                    <label key={env} className="flex items-center gap-2 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        checked={modalForm.environments.includes(env)}
                        onChange={(e) =>
                          setModalForm((prev) => ({
                            ...prev,
                            environments: e.target.checked
                              ? [...prev.environments, env]
                              : prev.environments.filter((v) => v !== env),
                          }))
                        }
                        className="rounded border-slate-300"
                      />
                      <span className="capitalize">{env}</span>
                    </label>
                  ))}
                </div>
              </div>

              {saveError && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">{saveError}</div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={closeModal}>
                Cancel
              </Button>
              <Button onClick={handleSaveConnection} isLoading={isSaving}>
                Save Connection
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
