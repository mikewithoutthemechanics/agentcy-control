'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@agentcy/supabase';
import { Button } from '@agentcy/ui';
import { Plus } from 'lucide-react';
import { Runbook } from './components/types';
import { RunbookFilters } from './components/RunbookFilters';
import { RunbookList } from './components/RunbookList';
import { RunbookEditor } from './components/RunbookEditor';

export default function RunbooksPage() {
  const [runbooks, setRunbooks] = useState<Runbook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const supabase = createBrowserClient();

  async function fetchRunbooks() {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('runbooks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching runbooks:', error);
    } else {
      setRunbooks(data || []);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    fetchRunbooks();
  }, [supabase]);

  const filteredRunbooks =
    categoryFilter === 'all'
      ? runbooks
      : runbooks.filter((r) => r.category === categoryFilter);

  async function handleCreate(data: {
    title: string;
    description: string;
    category: string;
    steps: unknown[];
  }) {
    const { error } = await supabase.from('runbooks').insert({
      title: data.title,
      description: data.description,
      category: data.category,
      steps: data.steps,
      enabled: true,
      execution_count: 0,
    });

    if (error) {
      throw new Error(error.message);
    }
    await fetchRunbooks();
  }

  async function handleExecute(runbook: Runbook) {
    setExecutingId(runbook.id);
    const { error } = await supabase
      .from('runbooks')
      .update({
        execution_count: runbook.execution_count + 1,
        last_executed_at: new Date().toISOString(),
      })
      .eq('id', runbook.id);

    setExecutingId(null);
    if (error) {
      console.error('Error executing runbook:', error);
    } else {
      await fetchRunbooks();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Runbooks</h1>
          <p className="text-sm text-slate-500 mt-1">Procedures and playbooks for your team</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Runbook
        </Button>
      </div>

      <RunbookFilters filter={categoryFilter} onFilterChange={setCategoryFilter} />

      <RunbookList
        isLoading={isLoading}
        runbooks={filteredRunbooks}
        executingId={executingId}
        onExecute={handleExecute}
        onCreateClick={() => setShowCreate(true)}
      />

      <RunbookEditor
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={handleCreate}
      />
    </div>
  );
}
