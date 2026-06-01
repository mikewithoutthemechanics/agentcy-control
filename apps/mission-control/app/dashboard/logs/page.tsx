'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@agentcy/supabase';
import { Card, Badge, Button } from '@agentcy/ui';
import { Search, Filter, FileText, Download, Clock, AlertCircle } from 'lucide-react';

interface LogEntry {
  id: string;
  project_id: string;
  source: string;
  level: string;
  message: string;
  metadata: Record<string, unknown>;
  trace_id: string | null;
  timestamp: string;
  projects?: { name: string };
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const supabase = createBrowserClient();

  useEffect(() => {
    async function fetchLogs() {
      let query = supabase
        .from('log_entries')
        .select('*, projects(name)')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (sourceFilter !== 'all') query = query.eq('source', sourceFilter);
      if (levelFilter !== 'all') query = query.eq('level', levelFilter);

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching logs:', error);
      } else {
        setLogs(data || []);
      }
      setIsLoading(false);
    }

    fetchLogs();
  }, [supabase, sourceFilter, levelFilter]);

  const filteredLogs = logs.filter((log) => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      log.message.toLowerCase().includes(q) ||
      log.source.toLowerCase().includes(q) ||
      log.projects?.name.toLowerCase().includes(q)
    );
  });

  function getLevelBadge(level: string) {
    switch (level) {
      case 'error':
        return <Badge variant="error">ERROR</Badge>;
      case 'warn':
        return <Badge variant="warning">WARN</Badge>;
      case 'info':
        return <Badge variant="info">INFO</Badge>;
      case 'debug':
        return <Badge variant="default">DEBUG</Badge>;
      default:
        return <Badge variant="default">{level.toUpperCase()}</Badge>;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Log Explorer</h1>
          <p className="text-sm text-slate-500 mt-1">Centralized log search and analysis across all projects</p>
        </div>
        <Button variant="secondary" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search logs by message, source, or project..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
            >
              <option value="all">All Sources</option>
              <option value="vercel">Vercel</option>
              <option value="supabase">Supabase</option>
              <option value="application">Application</option>
              <option value="edge_function">Edge Function</option>
            </select>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
            >
              <option value="all">All Levels</option>
              <option value="error">Error</option>
              <option value="warn">Warning</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Log Table */}
      <Card>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-slate-100 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
              <FileText className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900">No logs found</h3>
            <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
              Connect your log shipper (Vector, Fluent Bit) to start aggregating logs from all services.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="mt-0.5">{getLevelBadge(log.level)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-slate-500 uppercase">{log.source}</span>
                    <span className="text-xs text-slate-400">{log.projects?.name}</span>
                    {log.trace_id && (
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1 rounded">
                        {log.trace_id.slice(0, 8)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-900 truncate">{log.message}</p>
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {Object.entries(log.metadata).slice(0, 3).map(([key, value]) => (
                        <span key={key} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          {key}: {String(value).slice(0, 30)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-400 whitespace-nowrap">
                  <Clock className="h-3 w-3" />
                  {new Date(log.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
