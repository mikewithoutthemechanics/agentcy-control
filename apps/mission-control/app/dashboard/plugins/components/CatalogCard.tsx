'use client';

import { Card, Badge, Button } from '@agentcy/ui';
import { Puzzle, Download } from 'lucide-react';
import { CatalogPlugin } from './types';

interface CatalogCardProps {
  plugin: CatalogPlugin;
  isInstalling: boolean;
  onInstall: (plugin: CatalogPlugin) => void;
}

export function CatalogCard({ plugin, isInstalling, onInstall }: CatalogCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow opacity-80">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
          <Puzzle className="h-5 w-5 text-slate-600" />
        </div>
        <Badge variant="default">{plugin.version}</Badge>
      </div>
      <h3 className="font-medium text-slate-900 mb-1">{plugin.name}</h3>
      <p className="text-sm text-slate-500 mb-4">{plugin.description}</p>
      <Button size="sm" className="w-full" isLoading={isInstalling} onClick={() => onInstall(plugin)}>
        <Download className="h-4 w-4 mr-2" />
        Install
      </Button>
    </Card>
  );
}
