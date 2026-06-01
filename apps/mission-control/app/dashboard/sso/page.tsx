'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@agentcy/supabase';
import { Card, Badge, Button } from '@agentcy/ui';
import { Shield, Plus, X, CheckCircle2, XCircle, Globe } from 'lucide-react';

interface SSOConfig {
  id: string;
  provider: string;
  name: string;
  metadata_url: string | null;
  metadata_xml: string | null;
  entity_id: string | null;
  sso_url: string | null;
  enabled: boolean;
  is_primary: boolean;
  created_at: string;
}

const providers = ['saml', 'oidc', 'google', 'azure_ad', 'okta'];

export default function SSOPage() {
  const [configs, setConfigs] = useState<SSOConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    provider: 'saml',
    name: '',
    metadata_url: '',
    metadata_xml: '',
    entity_id: '',
    sso_url: '',
  });
  const [createError, setCreateError] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const supabase = createBrowserClient();

  async function fetchConfigs() {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('sso_configurations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching SSO configs:', error);
    } else {
      setConfigs(data || []);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    fetchConfigs();
  }, [supabase]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError('');

    if (!createForm.name.trim()) {
      setCreateError('Name is required');
      return;
    }

    const { error } = await supabase.from('sso_configurations').insert({
      provider: createForm.provider,
      name: createForm.name,
      metadata_url: createForm.metadata_url || null,
      metadata_xml: createForm.metadata_xml || null,
      entity_id: createForm.entity_id || null,
      sso_url: createForm.sso_url || null,
      enabled: false,
      is_primary: false,
    });

    if (error) {
      setCreateError(error.message);
    } else {
      setShowCreate(false);
      setCreateForm({
        provider: 'saml',
        name: '',
        metadata_url: '',
        metadata_xml: '',
        entity_id: '',
        sso_url: '',
      });
      await fetchConfigs();
    }
  }

  async function toggleEnabled(config: SSOConfig) {
    setTogglingId(config.id);
    const { error } = await supabase
      .from('sso_configurations')
      .update({ enabled: !config.enabled })
      .eq('id', config.id);

    setTogglingId(null);
    if (error) {
      console.error('Error toggling SSO config:', error);
    } else {
      await fetchConfigs();
    }
  }

  function getProviderLabel(provider: string) {
    switch (provider) {
      case 'azure_ad':
        return 'Azure AD';
      case 'okta':
        return 'Okta';
      case 'google':
        return 'Google';
      default:
        return provider.toUpperCase();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">SSO Configuration</h1>
          <p className="text-sm text-slate-500 mt-1">Manage SAML and OIDC identity providers</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New SSO Provider
        </Button>
      </div>

      {/* Configs List */}
      <Card>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-slate-100 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : configs.length === 0 ? (
          <div className="py-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
              <Shield className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900">No SSO providers configured</h3>
            <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
              Add an SSO provider to enable single sign-on for your team members.
            </p>
            <div className="mt-6">
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Provider
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {configs.map((config) => (
              <div
                key={config.id}
                className="flex items-center justify-between p-4 border border-slate-100 rounded-lg hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Globe className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">{config.name}</span>
                      {config.enabled ? (
                        <Badge variant="success">Enabled</Badge>
                      ) : (
                        <Badge variant="default">Disabled</Badge>
                      )}
                      {config.is_primary && <Badge variant="info">Primary</Badge>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      <span>Provider: {getProviderLabel(config.provider)}</span>
                      {config.entity_id && <span className="truncate max-w-[200px]">ID: {config.entity_id}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleEnabled(config)}
                    disabled={togglingId === config.id}
                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                    title={config.enabled ? 'Disable' : 'Enable'}
                  >
                    {config.enabled ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-slate-400" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-slate-900">New SSO Provider</h3>
              <button
                onClick={() => setShowCreate(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Provider</label>
                <select
                  value={createForm.provider}
                  onChange={(e) => setCreateForm({ ...createForm, provider: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                >
                  <option value="saml">SAML 2.0</option>
                  <option value="oidc">OpenID Connect</option>
                  <option value="google">Google Workspace</option>
                  <option value="azure_ad">Azure AD</option>
                  <option value="okta">Okta</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  placeholder="e.g., Corporate SAML"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Metadata URL
                </label>
                <input
                  type="text"
                  value={createForm.metadata_url}
                  onChange={(e) => setCreateForm({ ...createForm, metadata_url: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  placeholder="https://identity-provider.com/metadata.xml"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Metadata XML
                </label>
                <textarea
                  value={createForm.metadata_xml}
                  onChange={(e) => setCreateForm({ ...createForm, metadata_xml: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  rows={4}
                  placeholder="Paste SAML metadata XML here..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Entity ID</label>
                <input
                  type="text"
                  value={createForm.entity_id}
                  onChange={(e) => setCreateForm({ ...createForm, entity_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  placeholder="urn:example:entity:id"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">SSO URL</label>
                <input
                  type="text"
                  value={createForm.sso_url}
                  onChange={(e) => setCreateForm({ ...createForm, sso_url: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  placeholder="https://identity-provider.com/sso"
                />
              </div>

              {createError && <p className="text-sm text-red-600">{createError}</p>}

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button variant="ghost" type="button" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add Provider</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
