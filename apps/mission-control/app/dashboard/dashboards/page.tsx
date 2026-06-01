'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@agentcy/supabase';
import { Card, Button, Badge } from '@agentcy/ui';
import { LayoutDashboard, Plus, Star, Trash2, BarChart3, Activity, DollarSign, AlertTriangle } from 'lucide-react';

interface Dashboard {
  id: string;
  name: string;
  description: string;
  layout_json: Array<{ type: string; title: string; size: string }>;
  is_default: boolean;
  created_at: string;
}

const widgetTypes = [
  { type: 'stats', title: 'Key Metrics', icon: BarChart3 },
  { type: 'incidents', title: 'Active Incidents', icon: AlertTriangle },
  { type: 'deployments', title: 'Recent Deployments', icon: Activity },
  { type: 'costs', title: 'Cost Summary', icon: DollarSign },
  { type: 'events', title: 'Event Stream', icon: Activity },
];

export default function DashboardsPage() {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newDashboard, setNewDashboard] = useState({ name: '', description: '', widgets: [] as string[] });
  const supabase = createBrowserClient();

  useEffect(() => {
    fetchDashboards();
  }, [supabase]);

  async function fetchDashboards() {
    setIsLoading(true);
    const { data } = await supabase
      .from('saved_dashboards')
      .select('*')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });
    setDashboards(data || []);
    setIsLoading(false);
  }

  async function createDashboard() {
    if (!newDashboard.name) return;
    const layout = newDashboard.widgets.map((w) => {
      const type = widgetTypes.find((t) => t.type === w);
      return { type: w, title: type?.title || w, size: 'medium' };
    });

    await supabase.from('saved_dashboards').insert({
      name: newDashboard.name,
      description: newDashboard.description,
      layout_json: layout,
      is_default: false,
    });
    setShowCreate(false);
    setNewDashboard({ name: '', description: '', widgets: [] });
    await fetchDashboards();
  }

  async function deleteDashboard(id: string) {
    if (!confirm('Delete this dashboard?')) return;
    await supabase.from('saved_dashboards').delete().eq('id', id);
    await fetchDashboards();
  }

  function toggleWidget(widgetType: string) {
    setNewDashboard((prev) => ({
      ...prev,
      widgets: prev.widgets.includes(widgetType)
        ? prev.widgets.filter((w) => w !== widgetType)
        : [...prev.widgets, widgetType],
    }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Custom Dashboards</h1>
          <p className="text-sm text-slate-500 mt-1">Build and save personalized views</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Dashboard
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}><div className="h-32 bg-slate-100 animate-pulse rounded-lg" /></Card>
          ))}
        </div>
      ) : dashboards.length === 0 ? (
        <div className="py-12 text-center">
          <LayoutDashboard className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">No dashboards yet</h3>
          <p className="text-sm text-slate-500 mt-2">Create your first custom dashboard with widgets</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dashboards.map((db) => (
            <Card key={db.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <LayoutDashboard className="h-5 w-5 text-slate-600" />
                  <h3 className="font-medium text-slate-900">{db.name}</h3>
                </div>
                {db.is_default && <Badge variant="success">Default</Badge>}
              </div>
              <p className="text-sm text-slate-500 mb-4">{db.description || 'No description'}</p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {(db.layout_json || []).map((widget: any, i: number) => (
                  <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    {widget.title}
                  </span>
                ))}
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="text-xs text-slate-400">
                  {new Date(db.created_at).toLocaleDateString()}
                </span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => deleteDashboard(db.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Create Dashboard</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  value={newDashboard.name}
                  onChange={(e) => setNewDashboard((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none text-sm"
                  placeholder="e.g., Operations Overview"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  value={newDashboard.description}
                  onChange={(e) => setNewDashboard((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none text-sm"
                  placeholder="What is this dashboard for?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Widgets</label>
                <div className="grid grid-cols-2 gap-2">
                  {widgetTypes.map((widget) => {
                    const isSelected = newDashboard.widgets.includes(widget.type);
                    const Icon = widget.icon;
                    return (
                      <button
                        key={widget.type}
                        onClick={() => toggleWidget(widget.type)}
                        className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-colors ${
                          isSelected
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-xs font-medium">{widget.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={createDashboard}>Create Dashboard</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
