'use client';

import { Card } from '@agentcy/ui';
import { Plugin, CatalogPlugin } from './types';
import { PluginCard } from './PluginCard';
import { CatalogCard } from './CatalogCard';

interface PluginListProps {
  isLoading: boolean;
  displayPlugins: Plugin[];
  availableCatalog: CatalogPlugin[];
  togglingId: string | null;
  onToggle: (plugin: Plugin) => void;
  onDelete: (id: string) => void;
  onInstall: (catalog: CatalogPlugin) => void;
}

export function PluginList({
  isLoading,
  displayPlugins,
  availableCatalog,
  togglingId,
  onToggle,
  onDelete,
  onInstall,
}: PluginListProps) {
  return (
    <div className="space-y-8">
      {/* Installed Plugins */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <Card key={i}>
              <div className="h-32 bg-slate-100 animate-pulse rounded-lg" />
            </Card>
          ))
        ) : displayPlugins.length === 0 ? (
          <div className="col-span-full py-8 text-center text-slate-500 text-sm">
            No plugins installed yet. Browse the catalog below.
          </div>
        ) : (
          displayPlugins.map((plugin) => (
            <PluginCard
              key={plugin.id}
              plugin={plugin}
              isToggling={togglingId === plugin.id}
              onToggle={onToggle}
              onDelete={onDelete}
            />
          ))
        )}
      </div>

      {/* Available Catalog */}
      {!isLoading && availableCatalog.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Available Plugins</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableCatalog.map((plugin) => (
              <CatalogCard
                key={plugin.slug}
                plugin={plugin}
                isInstalling={togglingId === plugin.slug}
                onInstall={onInstall}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
