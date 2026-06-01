'use client';

import { Card, Badge, Button } from '@agentcy/ui';
import { Puzzle, CheckCircle2, Trash2 } from 'lucide-react';
import { Plugin } from './types';
import { PluginDetail } from './PluginDetail';

interface PluginCardProps {
  plugin: Plugin;
  isToggling: boolean;
  onToggle: (plugin: Plugin) => void;
  onDelete: (id: string) => void;
}

export function PluginCard({ plugin, isToggling, onToggle, onDelete }: PluginCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
          <Puzzle className="h-5 w-5 text-slate-600" />
        </div>
        {plugin.enabled ? (
          <Badge variant="success" className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Active
          </Badge>
        ) : (
          <Badge variant="default">Disabled</Badge>
        )}
      </div>

      <h3 className="font-medium text-slate-900 mb-1">{plugin.name}</h3>
      <p className="text-sm text-slate-500 mb-4">{plugin.description}</p>

      <PluginDetail plugin={plugin} />

      <div className="pt-4 border-t border-slate-100 flex gap-2">
        <Button
          size="sm"
          variant={plugin.enabled ? 'secondary' : 'primary'}
          className="flex-1"
          isLoading={isToggling}
          onClick={() => onToggle(plugin)}
        >
          {plugin.enabled ? 'Disable' : 'Enable'}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onDelete(plugin.id)} isLoading={isToggling}>
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </div>
    </Card>
  );
}
