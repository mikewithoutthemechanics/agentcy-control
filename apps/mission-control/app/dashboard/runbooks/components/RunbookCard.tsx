'use client';

import { Card } from '@agentcy/ui';
import { BookOpen, ListOrdered, Activity } from 'lucide-react';
import { Runbook } from './types';
import { ExecutionLog } from './ExecutionLog';
import { getCategoryBadge } from './category-badge';

interface RunbookCardProps {
  runbook: Runbook;
  isExecuting: boolean;
  onExecute: (runbook: Runbook) => void;
}

export function RunbookCard({ runbook, isExecuting, onExecute }: RunbookCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
          <BookOpen className="h-5 w-5 text-slate-600" />
        </div>
        {getCategoryBadge(runbook.category)}
      </div>

      <h3 className="font-semibold text-slate-900 mb-1">{runbook.title}</h3>
      <p className="text-sm text-slate-500 mb-4 line-clamp-2">
        {runbook.description || 'No description provided.'}
      </p>

      <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
        <div className="flex items-center gap-1">
          <ListOrdered className="h-3.5 w-3.5" />
          <span>{Array.isArray(runbook.steps) ? runbook.steps.length : 0} steps</span>
        </div>
        <div className="flex items-center gap-1">
          <Activity className="h-3.5 w-3.5" />
          <span>{runbook.execution_count} runs</span>
        </div>
      </div>

      <ExecutionLog runbook={runbook} isExecuting={isExecuting} onExecute={onExecute} />
    </Card>
  );
}
