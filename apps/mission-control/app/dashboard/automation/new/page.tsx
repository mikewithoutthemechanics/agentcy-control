'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@agentcy/supabase';
import { Button, Card } from '@agentcy/ui';
import { ArrowLeft, Zap } from 'lucide-react';
import Link from 'next/link';

export default function NewAutomationPage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    triggerType: 'sentry_issue',
    conditionField: '',
    conditionOp: 'gt',
    conditionValue: '',
    actionType: 'send_email',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const { error: insertError } = await supabase.from('automation_rules').insert({
      name: form.name,
      trigger_config: { type: form.triggerType },
      conditions: form.conditionField
        ? [{ field: form.conditionField, operator: form.conditionOp, value: form.conditionValue }]
        : [],
      actions: [{ type: form.actionType }],
    });

    if (insertError) {
      setError(insertError.message);
      setIsLoading(false);
      return;
    }

    router.push('/dashboard/automation');
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard/automation" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900 mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Automation
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">New Automation Rule</h1>
        <p className="text-sm text-slate-500 mt-1">Create a trigger-based workflow for your projects</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Rule Name</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none text-sm"
              placeholder="e.g., Alert on High Error Rate"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Trigger</label>
            <select
              value={form.triggerType}
              onChange={(e) => setForm((prev) => ({ ...prev, triggerType: e.target.value }))}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none text-sm bg-white"
            >
              <option value="sentry_issue">Sentry Issue</option>
              <option value="vercel_deployment">Vercel Deployment</option>
              <option value="posthog_event">PostHog Event</option>
              <option value="alert_triggered">Alert Triggered</option>
            </select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Condition Field</label>
              <input
                type="text"
                value={form.conditionField}
                onChange={(e) => setForm((prev) => ({ ...prev, conditionField: e.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none text-sm"
                placeholder="e.g., count"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Operator</label>
              <select
                value={form.conditionOp}
                onChange={(e) => setForm((prev) => ({ ...prev, conditionOp: e.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none text-sm bg-white"
              >
                <option value="gt">&gt;</option>
                <option value="lt">&lt;</option>
                <option value="eq">=</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Value</label>
              <input
                type="text"
                value={form.conditionValue}
                onChange={(e) => setForm((prev) => ({ ...prev, conditionValue: e.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none text-sm"
                placeholder="e.g., 10"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Action</label>
            <select
              value={form.actionType}
              onChange={(e) => setForm((prev) => ({ ...prev, actionType: e.target.value }))}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none text-sm bg-white"
            >
              <option value="send_email">Send Email</option>
              <option value="send_slack">Send Slack Message</option>
              <option value="create_incident">Create Incident</option>
              <option value="toggle_feature_flag">Toggle Feature Flag</option>
            </select>
          </div>

          {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>}

          <div className="flex justify-end gap-3">
            <Link href="/dashboard/automation">
              <Button variant="secondary">Cancel</Button>
            </Link>
            <Button type="submit" isLoading={isLoading}>
              <Zap className="h-4 w-4 mr-2" />
              Create Rule
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
