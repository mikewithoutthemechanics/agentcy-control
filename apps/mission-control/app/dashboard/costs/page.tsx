'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@agentcy/supabase';
import { Card, Badge, Button } from '@agentcy/ui';
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, CreditCard, PieChart } from 'lucide-react';
import CostForecast from '@/components/CostForecast';

interface CostSnapshot {
  id: string;
  project_id: string;
  service_type: string;
  environment: string;
  period_start: string;
  period_end: string;
  amount_cents: number;
  currency: string;
  breakdown_json: Record<string, unknown>;
  projects?: { name: string };
}

interface Budget {
  id: string;
  monthly_limit_cents: number;
  current_spend_cents: number;
  alert_thresholds: number[];
  currency: string;
  clients?: { name: string };
  projects?: { name: string };
}

export default function CostsPage() {
  const [costs, setCosts] = useState<CostSnapshot[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createBrowserClient();

  useEffect(() => {
    async function fetchData() {
      const { data: costData } = await supabase
        .from('cost_snapshots')
        .select('*, projects(name)')
        .order('period_start', { ascending: false })
        .limit(50);

      const { data: budgetData } = await supabase
        .from('budgets')
        .select('*, clients(name), projects(name)')
        .order('created_at', { ascending: false });

      setCosts(costData || []);
      setBudgets(budgetData || []);
      setIsLoading(false);
    }

    fetchData();
  }, [supabase]);

  const totalSpend = costs.reduce((sum, c) => sum + c.amount_cents, 0);
  const byService = costs.reduce<Record<string, number>>((acc, c) => {
    acc[c.service_type] = (acc[c.service_type] || 0) + c.amount_cents;
    return acc;
  }, {});

  const sortedServices = Object.entries(byService).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cost Management</h1>
          <p className="text-sm text-slate-500 mt-1">Track spending across all services and projects</p>
        </div>
        <Button variant="secondary" size="sm">
          <CreditCard className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Spend (MTD)</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">${(totalSpend / 100).toFixed(2)}</p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-emerald-700" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Budget Utilization</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {budgets.length > 0
                  ? `${Math.round((budgets[0].current_spend_cents / budgets[0].monthly_limit_cents) * 100)}%`
                  : '0%'}
              </p>
            </div>
            <div className="p-3 bg-sky-100 rounded-lg">
              <PieChart className="h-6 w-6 text-sky-700" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Top Service</p>
              <p className="text-2xl font-bold text-slate-900 mt-1 capitalize">
                {sortedServices[0]?.[0] || 'N/A'}
              </p>
            </div>
            <div className="p-3 bg-amber-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-amber-700" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Est. Monthly</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                ${((totalSpend / 100) * 1.5).toFixed(2)}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <TrendingDown className="h-6 w-6 text-purple-700" />
            </div>
          </div>
        </Card>
      </div>

      {/* Budget Alerts */}
      {budgets.map((budget) => {
        const pct = Math.round((budget.current_spend_cents / budget.monthly_limit_cents) * 100);
        return (
          <Card key={budget.id} title="Budget Alert" subtitle={`${budget.clients?.name || budget.projects?.name || 'Agency'}`}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-700">
                  ${(budget.current_spend_cents / 100).toFixed(2)} / ${(budget.monthly_limit_cents / 100).toFixed(2)}
                </span>
                <Badge variant={pct >= 100 ? 'error' : pct >= 80 ? 'warning' : 'success'}>{pct}%</Badge>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full transition-all ${pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
              {pct >= 80 && (
                <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 p-2 rounded-lg">
                  <AlertTriangle className="h-4 w-4" />
                  Budget threshold exceeded. Consider reviewing resource usage.
                </div>
              )}
            </div>
          </Card>
        );
      })}

      {/* Cost Forecast */}
      <CostForecast />

      {/* Cost Breakdown by Service */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Spend by Service" subtitle="Current period">
          <div className="space-y-3">
            {sortedServices.map(([service, amount]) => (
              <div key={service} className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-sm text-slate-700 capitalize w-24">{service}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-2">
                    <div
                      className="bg-slate-900 h-2 rounded-full"
                      style={{ width: totalSpend > 0 ? `${(amount / totalSpend) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
                <span className="text-sm font-medium text-slate-900 ml-4 w-16 text-right">
                  ${(amount / 100).toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Recent Entries" subtitle="Latest cost snapshots">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-slate-100 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : costs.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-500">No cost data yet</p>
              <p className="text-xs text-slate-400 mt-1">Connect billing integrations to track spending</p>
            </div>
          ) : (
            <div className="space-y-2">
              {costs.slice(0, 10).map((cost) => (
                <div key={cost.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-slate-900 capitalize">{cost.service_type}</p>
                    <p className="text-xs text-slate-500">
                      {cost.projects?.name} {cost.environment && `(${cost.environment})`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-900">
                      ${(cost.amount_cents / 100).toFixed(2)} {cost.currency}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(cost.period_start).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
