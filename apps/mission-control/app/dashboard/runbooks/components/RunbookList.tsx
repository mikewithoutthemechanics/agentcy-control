'use client';

import { Card, Button } from '@agentcy/ui';
import { BookOpen, Plus } from 'lucide-react';
import { Runbook } from './types';
import { RunbookCard } from './RunbookCard';

interface RunbookListProps {
  isLoading: boolean;
  runbooks: Runbook[];
  executingId: string | null;
  onExecute: (runbook: Runbook) => void;
  onCreateClick: () => void;
}

export function RunbookList({ isLoading, runbooks, executingId, onExecute, onCreateClick }: RunbookListProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <div className="h-40 bg-slate-100 animate-pulse rounded-lg" />
          </Card>
        ))}
      </div>
    );
  }

  if (runbooks.length === 0) {
    return (
      <Card>
        <div className="py-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
            <BookOpen className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900">No runbooks found</h3>
          <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
            Create runbooks to document procedures, incident response steps, and team workflows.
          </p>
          <div className="mt-6">
            <Button onClick={onCreateClick}>
              <Plus className="h-4 w-4 mr-2" />
              Create Runbook
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {runbooks.map((runbook) => (
        <RunbookCard
          key={runbook.id}
          runbook={runbook}
          isExecuting={executingId === runbook.id}
          onExecute={onExecute}
        />
      ))}
    </div>
  );
}
