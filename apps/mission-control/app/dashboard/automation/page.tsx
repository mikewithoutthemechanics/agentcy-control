'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@agentcy/supabase';
import { Card, Badge, Button } from '@agentcy/ui';
import { Zap, Plus, Play, Pause, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger_config: { type: string; filters?: Record<string, unknown> };
  actions: Array<{ type: string; config?: Record<string, unknown> }>;
  execution_count: number;
  last_executed_at: string | null;
  last_error: string | null;
}

export default function AutomationPage() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createBrowserClient();

  useEffect(() => {
    async function fetchRules() {
      const { data, error } = await supabase
        .from('automation_rules')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching automation rules:', error);
      } else {
        setRules(data || []);
      }
      setIsLoading(false);
    }

    fetchRules();
  }, [supabase]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Automation</h1>
          <p className="text-sm text-slate-500 mt-1">Workflow rules and auto-remediation</p>
        </div>
        <Link href="/dashboard/automation/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Rule
          </Button>
        </Link>
      </div>

      <Card>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-slate-100 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : rules.length === 0 ? (
          <div className="py-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
              <Zap className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900">No automation rules</h3>
            <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
              Create rules to automatically respond to alerts, scale resources, or notify teams.
            </p>
            <div className="mt-6">
              <Link href="/dashboard/automation/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Rule
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between p-4 border border-slate-100 rounded-lg hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${rule.enabled ? 'bg-amber-100' : 'bg-slate-100'}`}>
                    <Zap className={`h-5 w-5 ${rule.enabled ? 'text-amber-600' : 'text-slate-400'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">{rule.name}</span>
                      {rule.enabled ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="default">Paused</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      <span>Trigger: {rule.trigger_config.type}</span>
                      <span>Actions: {rule.actions.length}</span>
                      <span>Runs: {rule.execution_count}</span>
                      {rule.last_error && <span className="text-red-500">Last run failed</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                    {rule.enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                  <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
