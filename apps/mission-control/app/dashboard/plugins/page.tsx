'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@agentcy/supabase';
import { Button } from '@agentcy/ui';
import { GitBranch } from 'lucide-react';
import { Plugin, CatalogPlugin } from './components/types';
import { PluginFilters } from './components/PluginFilters';
import { PluginList } from './components/PluginList';
import { InstallModal } from './components/InstallModal';
import { catalogPlugins } from './catalog';

export default function PluginsPage() {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const supabase = createBrowserClient();

  async function fetchPlugins() {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('plugins')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching plugins:', error);
    } else {
      setPlugins(data || []);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    fetchPlugins();
  }, [supabase]);

  async function installCatalogPlugin(catalog: CatalogPlugin) {
    setTogglingId(catalog.slug);
    const { error } = await supabase.from('plugins').insert({
      slug: catalog.slug,
      name: catalog.name,
      description: catalog.description,
      author: catalog.author,
      version: catalog.version,
      category: catalog.category,
      manifest_json: catalog.manifest_json || {},
      enabled: true,
      installed_at: new Date().toISOString(),
    });
    setTogglingId(null);
    if (error) {
      console.error('Error installing plugin:', error);
    } else {
      await fetchPlugins();
    }
  }

  async function togglePlugin(plugin: Plugin) {
    setTogglingId(plugin.id);
    const { error } = await supabase
      .from('plugins')
      .update({ enabled: !plugin.enabled })
      .eq('id', plugin.id);
    setTogglingId(null);
    if (error) {
      console.error('Error toggling plugin:', error);
    } else {
      await fetchPlugins();
    }
  }

  async function deletePlugin(id: string) {
    if (!confirm('Are you sure you want to remove this plugin?')) return;
    setTogglingId(id);
    const { error } = await supabase.from('plugins').delete().eq('id', id);
    setTogglingId(null);
    if (error) {
      console.error('Error deleting plugin:', error);
    } else {
      await fetchPlugins();
    }
  }

  async function handleCreatePlugin(data: {
    name: string;
    slug: string;
    description: string;
    category: string;
    version: string;
  }) {
    const { error } = await supabase.from('plugins').insert({
      slug: data.slug,
      name: data.name,
      description: data.description,
      category: data.category,
      version: data.version,
      manifest_json: { permissions: [], hooks: {} },
      enabled: false,
    });
    if (error) {
      throw new Error(error.message);
    }
    await fetchPlugins();
  }

  const installedSlugs = new Set(plugins.map((p) => p.slug));
  const availableCatalog = catalogPlugins.filter((c) => !installedSlugs.has(c.slug));
  const displayPlugins = filter === 'all' ? plugins : plugins.filter((p) => p.category === filter);
  const categories = ['all', ...Array.from(new Set([...plugins.map((p) => p.category), ...catalogPlugins.map((c) => c.category)]))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Plugin Marketplace</h1>
          <p className="text-sm text-slate-500 mt-1">Extend Agentcy Control with community and custom plugins</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setShowCreate(true)}>
          <GitBranch className="h-4 w-4 mr-2" />
          Create Plugin
        </Button>
      </div>

      <PluginFilters categories={categories} filter={filter} onFilterChange={setFilter} />

      <PluginList
        isLoading={isLoading}
        displayPlugins={displayPlugins}
        availableCatalog={availableCatalog}
        togglingId={togglingId}
        onToggle={togglePlugin}
        onDelete={deletePlugin}
        onInstall={installCatalogPlugin}
      />

      <InstallModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={handleCreatePlugin}
      />
    </div>
  );
}
