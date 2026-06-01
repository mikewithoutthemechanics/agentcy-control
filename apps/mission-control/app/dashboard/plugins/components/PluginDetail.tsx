'use client';

import { ExternalLink, Lock } from 'lucide-react';
import { Plugin } from './types';

interface PluginDetailProps {
  plugin: Plugin;
}

export function PluginDetail({ plugin }: PluginDetailProps) {
  return (
    <div className="space-y-2 mb-4">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <ExternalLink className="h-3 w-3" />
        <span>Author: {plugin.author || 'Unknown'}</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Lock className="h-3 w-3" />
        <span>{(plugin.manifest_json?.permissions || []).length} permissions</span>
      </div>
      <div className="flex flex-wrap gap-1 mt-2">
        {Object.keys(plugin.manifest_json?.hooks || {}).map((hook) => (
          <span key={hook} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
            {hook}
          </span>
        ))}
      </div>
    </div>
  );
}
