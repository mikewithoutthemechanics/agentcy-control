'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@agentcy/supabase';
import { Card } from '@agentcy/ui';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

interface CostPoint {
  period_start: string;
  amount_cents: number;
  service_type: string;
}

export default function CostForecast() {
  const [data, setData] = useState<CostPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createBrowserClient();

  useEffect(() => {
    async function fetchData() {
      const { data: costs } = await supabase
        .from('cost_snapshots')
        .select('period_start, amount_cents, service_type')
        .order('period_start', { ascending: true })
        .limit(12);

      setData(costs || []);
      setIsLoading(false);
    }

    fetchData();
  }, [supabase]);

  function computeForecast() {
    if (data.length < 3) return null;

    // Simple linear regression on total monthly cost
    const monthlyTotals: Record<string, number> = {};
    data.forEach((c) => {
      const month = c.period_start.slice(0, 7);
      monthlyTotals[month] = (monthlyTotals[month] || 0) + c.amount_cents;
    });

    const months = Object.keys(monthlyTotals).sort();
    const values = months.map((m) => monthlyTotals[m]);
    const n = values.length;

    const xMean = (n - 1) / 2;
    const yMean = values.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (values[i] - yMean);
      denominator += (i - xMean) ** 2;
    }

    const slope = denominator !== 0 ? numerator / denominator : 0;
    const intercept = yMean - slope * xMean;

    const nextMonthValue = slope * n + intercept;
    const currentMonthValue = values[n - 1];
    const change = currentMonthValue > 0 ? ((nextMonthValue - currentMonthValue) / currentMonthValue) * 100 : 0;

    const serviceBreakdown: Record<string, { current: number; projected: number }> = {};
    const byService: Record<string, number[]> = {};
    data.forEach((c) => {
      if (!byService[c.service_type]) byService[c.service_type] = [];
      byService[c.service_type].push(c.amount_cents);
    });

    Object.entries(byService).forEach(([service, vals]) => {
      if (vals.length >= 2) {
        const avgGrowth = vals.length > 1 ? (vals[vals.length - 1] - vals[0]) / vals[0] / (vals.length - 1) : 0;
        serviceBreakdown[service] = {
          current: vals[vals.length - 1],
          projected: Math.round(vals[vals.length - 1] * (1 + avgGrowth)),
        };
      }
    });

    return {
      currentMonthTotal: currentMonthValue,
      projectedNextMonth: Math.round(nextMonthValue),
      changePercent: Math.round(change * 10) / 10,
      slope,
      serviceBreakdown,
    };
  }

  const forecast = computeForecast();

  if (isLoading) {
    return (
      <Card>
        <div className="h-32 bg-slate-100 animate-pulse rounded-lg" />
      </Card>
    );
  }

  if (!forecast) {
    return (
      <Card title="Cost Forecast" subtitle="Predict future spending based on trends">
        <div className="py-8 text-center text-sm text-slate-500">
          Not enough data for forecasting. At least 3 months of cost data required.
        </div>
      </Card>
    );
  }

  const isIncreasing = forecast.changePercent > 0;

  return (
    <Card title="Cost Forecast" subtitle="Predicted spend based on historical trends">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-50 rounded-lg p-4">
          <p className="text-xs text-slate-500 mb-1">Current Month</p>
          <p className="text-xl font-bold text-slate-900">${(forecast.currentMonthTotal / 100).toFixed(2)}</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-4">
          <p className="text-xs text-slate-500 mb-1">Projected Next Month</p>
          <p className="text-xl font-bold text-slate-900">${(forecast.projectedNextMonth / 100).toFixed(2)}</p>
        </div>
        <div className={`rounded-lg p-4 ${isIncreasing ? 'bg-red-50' : 'bg-emerald-50'}`}>
          <p className="text-xs text-slate-500 mb-1">Trend</p>
          <div className="flex items-center gap-2">
            {isIncreasing ? (
              <TrendingUp className="h-5 w-5 text-red-500" />
            ) : (
              <TrendingDown className="h-5 w-5 text-emerald-500" />
            )}
            <p className={`text-xl font-bold ${isIncreasing ? 'text-red-600' : 'text-emerald-600'}`}>
              {isIncreasing ? '+' : ''}{forecast.changePercent}%
            </p>
          </div>
        </div>
      </div>

      {isIncreasing && forecast.changePercent > 20 && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <p className="text-sm text-amber-700">
            Cost trend is increasing significantly. Consider reviewing resource allocation or setting budget alerts.
          </p>
        </div>
      )}

      <h4 className="text-sm font-semibold text-slate-900 mb-3">Service Projections</h4>
      <div className="space-y-3">
        {Object.entries(forecast.serviceBreakdown).map(([service, values]) => {
          const serviceChange = values.current > 0 ? ((values.projected - values.current) / values.current) * 100 : 0;
          return (
            <div key={service}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-slate-700 capitalize">{service.replace('_', ' ')}</span>
                <span className="text-sm font-medium text-slate-900">${(values.projected / 100).toFixed(0)}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${serviceChange > 20 ? 'bg-red-400' : serviceChange > 0 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                  style={{ width: `${Math.min((values.projected / Math.max(forecast.projectedNextMonth, 1)) * 100, 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Currently ${(values.current / 100).toFixed(0)} · {serviceChange > 0 ? '+' : ''}{Math.round(serviceChange)}%
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
