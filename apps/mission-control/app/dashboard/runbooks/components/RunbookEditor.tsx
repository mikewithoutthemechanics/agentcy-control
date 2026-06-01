'use client';

import { useState } from 'react';
import { Button } from '@agentcy/ui';
import { X } from 'lucide-react';

interface RunbookEditorProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description: string;
    category: string;
    steps: unknown[];
  }) => Promise<void>;
}

export function RunbookEditor({ open, onClose, onSubmit }: RunbookEditorProps) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'incident-response',
    steps: '[\n  {\n    "title": "Step 1",\n    "command": ""\n  }\n]',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!form.title.trim()) {
      setError('Title is required');
      return;
    }

    let parsedSteps: unknown[];
    try {
      parsedSteps = JSON.parse(form.steps);
      if (!Array.isArray(parsedSteps)) {
        setError('Steps must be a JSON array');
        return;
      }
    } catch {
      setError('Invalid JSON in steps field');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        title: form.title,
        description: form.description,
        category: form.category,
        steps: parsedSteps,
      });
      setForm({
        title: '',
        description: '',
        category: 'incident-response',
        steps: '[\n  {\n    "title": "Step 1",\n    "command": ""\n  }\n]',
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-slate-900">New Runbook</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:outline-none"
              placeholder="e.g., Database Failover Procedure"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:outline-none"
              rows={3}
              placeholder="Brief description of when to use this runbook..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
            >
              <option value="incident-response">Incident Response</option>
              <option value="deployment">Deployment</option>
              <option value="security">Security</option>
              <option value="maintenance">Maintenance</option>
              <option value="onboarding">Onboarding</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Steps (JSON)</label>
            <textarea
              value={form.steps}
              onChange={(e) => setForm((prev) => ({ ...prev, steps: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-slate-900 focus:outline-none"
              rows={8}
            />
            <p className="text-xs text-slate-500 mt-1">
              Enter steps as a JSON array of objects with title and command properties.
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Create Runbook
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
