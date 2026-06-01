'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@agentcy/supabase';
import { Card, Badge, Button } from '@agentcy/ui';
import { FileText, Filter, Clock, Shield, Search } from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_name: string | null;
  created_at: string;
  profiles?: { email: string | null; full_name: string | null } | null;
}

const actionTypes = ['all', 'create', 'update', 'delete', 'login', 'logout', 'export', 'execute', 'invite', 'remove'];

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const supabase = createBrowserClient();

  useEffect(() => {
    async function fetchLogs() {
      let query = supabase
        .from('audit_logs')
        .select('*, profiles:user_profiles!user_id(email, full_name)')
        .order('created_at', { ascending: false })
        .limit(200);

      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching audit logs:', error);
      } else {
        setLogs(data || []);
      }
      setIsLoading(false);
    }

    fetchLogs();
  }, [supabase, actionFilter]);

  const filteredLogs = logs.filter((log) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      log.action.toLowerCase().includes(q) ||
      log.entity_type.toLowerCase().includes(q) ||
      (log.entity_name && log.entity_name.toLowerCase().includes(q)) ||
      (log.profiles?.email && log.profiles.email.toLowerCase().includes(q))
    );
  });

  function getActionBadge(action: string) {
    switch (action) {
      case 'create':
        return <Badge variant="success">Create</Badge>;
      case 'update':
        return <Badge variant="info">Update</Badge>;
      case 'delete':
        return <Badge variant="error">Delete</Badge>;
      case 'login':
        return <Badge variant="warning">Login</Badge>;
      case 'logout':
        return <Badge variant="default">Logout</Badge>;
      case 'export':
        return <Badge variant="info">Export</Badge>;
      case 'execute':
        return <Badge variant="success">Execute</Badge>;
      case 'invite':
        return <Badge variant="success">Invite</Badge>;
      case 'remove':
        return <Badge variant="error">Remove</Badge>;
      default:
        return <Badge variant="default">{action}</Badge>;
    }
  }

  function formatTime(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleString();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Audit Log Viewer</h1>
          <p className="text-sm text-slate-500 mt-1">Track all changes across your agency</p>
        </div>
        <Button variant="secondary" size="sm">
          <FileText className="h-4 w-4 mr-2" />
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
              placeholder="Search by action, entity, or user..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
            >
              {actionTypes.map((action) => (
                <option key={action} value={action}>
                  {action === 'all' ? 'All Actions' : action.charAt(0).toUpperCase() + action.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Audit Table */}
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
              <Shield className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900">No audit logs found</h3>
            <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
              Activity will appear here as users interact with your agency resources.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left font-medium text-slate-500 py-3 px-4">Action</th>
                  <th className="text-left font-medium text-slate-500 py-3 px-4">Entity</th>
                  <th className="text-left font-medium text-slate-500 py-3 px-4">Entity Name</th>
                  <th className="text-left font-medium text-slate-500 py-3 px-4">User</th>
                  <th className="text-left font-medium text-slate-500 py-3 px-4">Time</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-3 px-4">{getActionBadge(log.action)}</td>
                    <td className="py-3 px-4 text-slate-700 capitalize">{log.entity_type}</td>
                    <td className="py-3 px-4 text-slate-700">
                      {log.entity_name || <span className="text-slate-400">—</span>}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {log.profiles?.email || <span className="text-slate-400">System</span>}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 text-xs text-slate-400 whitespace-nowrap">
                        <Clock className="h-3 w-3" />
                        {formatTime(log.created_at)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
