'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@agentcy/supabase';
import { Card, Badge, Button } from '@agentcy/ui';
import { GitBranch, GitCommit, Timer, RefreshCw, ExternalLink, ArrowUpDown, Download, GitPullRequest } from 'lucide-react';
import Link from 'next/link';

interface Deployment {
  id: string;
  project_id: string;
  environment: string;
  status: string;
  branch: string | null;
  commit_sha: string | null;
  commit_message: string | null;
  author: string | null;
  url: string | null;
  duration_seconds: number | null;
  created_at: string;
  projects?: { name: string };
}

interface DeploymentPR {
  id: string;
  deployment_id: string;
  pr_number: number;
  pr_title: string;
  pr_url: string;
  branch: string;
  author: string;
  status: string;
  checks_status: string;
}

export default function DeploymentsPage() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [prs, setPrs] = useState<DeploymentPR[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createBrowserClient();

  useEffect(() => {
    async function fetchData() {
      const [{ data: deployData, error: deployError }, { data: prData }] = await Promise.all([
        supabase
          .from('deployments')
          .select('*, projects(name)')
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('deployment_prs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      if (deployError) {
        console.error('Error fetching deployments:', deployError);
      } else {
        setDeployments(deployData || []);
      }
      setPrs(prData || []);
      setIsLoading(false);
    }

    fetchData();
  }, [supabase]);

  function handleExport() {
    const rows = deployments.map((d) => ({
      Project: d.projects?.name || 'Unknown',
      Environment: d.environment,
      Status: d.status,
      Branch: d.branch || '',
      Commit: d.commit_sha || '',
      Message: d.commit_message || '',
      Author: d.author || '',
      Duration: d.duration_seconds || 0,
      Date: new Date(d.created_at).toISOString(),
    }));
    const csv = [
      Object.keys(rows[0] || {}).join(','),
      ...rows.map((r) => Object.values(r).map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deployments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'ready':
        return <Badge variant="success">Ready</Badge>;
      case 'building':
        return <Badge variant="warning">Building</Badge>;
      case 'pending':
        return <Badge variant="default">Pending</Badge>;
      case 'failed':
        return <Badge variant="error">Failed</Badge>;
      case 'cancelled':
        return <Badge variant="default">Cancelled</Badge>;
      case 'rolled_back':
        return <Badge variant="error">Rolled Back</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Deployments</h1>
          <p className="text-sm text-slate-500 mt-1">Track and manage deployments across all projects</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-slate-100 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : deployments.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-slate-500">No deployments found</p>
            <p className="text-xs text-slate-400 mt-1">Connect a Vercel project to see deployments</p>
          </div>
        ) : (
          <div className="space-y-3">
            {deployments.map((deployment) => (
              <div
                key={deployment.id}
                className="flex items-center justify-between p-4 border border-slate-100 rounded-lg hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center justify-center w-10 h-10 bg-slate-100 rounded-lg">
                    <GitBranch className="h-4 w-4 text-slate-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">
                        {deployment.projects?.name || 'Unknown Project'}
                      </span>
                      <span className="text-xs text-slate-400 capitalize">{deployment.environment}</span>
                      {getStatusBadge(deployment.status)}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      {deployment.commit_sha && (
                        <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                          {deployment.commit_sha.slice(0, 7)}
                        </span>
                      )}
                      {deployment.commit_message && (
                        <span className="truncate max-w-md">{deployment.commit_message}</span>
                      )}
                      {deployment.duration_seconds && (
                        <span className="flex items-center gap-1">
                          <Timer className="h-3 w-3" />
                          {deployment.duration_seconds}s
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">
                    {new Date(deployment.created_at).toLocaleDateString()}
                  </span>
                  {deployment.url && (
                    <Link
                      href={deployment.url}
                      target="_blank"
                      className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* GitHub PRs */}
      <Card title="Linked Pull Requests" subtitle="GitHub PRs associated with recent deployments">
        {prs.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">
            No linked PRs yet. Connect GitHub integration to auto-link pull requests.
          </div>
        ) : (
          <div className="space-y-3">
            {prs.map((pr) => (
              <div key={pr.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:border-slate-300 transition-colors">
                <div className="flex items-center gap-3">
                  <GitPullRequest className="h-5 w-5 text-slate-600" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">#{pr.pr_number}</span>
                      <span className="text-sm text-slate-700">{pr.pr_title}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                      <span>Branch: {pr.branch}</span>
                      <span>Author: {pr.author}</span>
                      <Badge variant={pr.checks_status === 'passing' ? 'success' : pr.checks_status === 'failing' ? 'error' : 'default'}>
                        {pr.checks_status}
                      </Badge>
                    </div>
                  </div>
                </div>
                {pr.pr_url && (
                  <Link
                    href={pr.pr_url}
                    target="_blank"
                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
