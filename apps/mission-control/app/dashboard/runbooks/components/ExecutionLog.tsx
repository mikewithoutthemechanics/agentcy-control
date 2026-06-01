'use client';

import { Button } from '@agentcy/ui';
import { Play } from 'lucide-react';
import { Runbook } from './types';

interface ExecutionLogProps {
  runbook: Runbook;
  isExecuting: boolean;
  onExecute: (runbook: Runbook) => void;
}

export function ExecutionLog({ runbook, isExecuting, onExecute }: ExecutionLogProps) {
  return (
    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
      <div className="text-xs text-slate-400">
        {runbook.last_executed_at
          ? `Last run: ${new Date(runbook.last_executed_at).toLocaleDateString()}`
          : 'Never run'}
      </div>
      <Button
        variant="secondary"
        size="sm"
        isLoading={isExecuting}
        onClick={() => onExecute(runbook)}
      >
        <Play className="h-3.5 w-3.5 mr-1.5" />
        Execute
      </Button>
    </div>
  );
}
