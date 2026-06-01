'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@agentcy/supabase';
import { Card, Badge, Button, StatusIndicator } from '@agentcy/ui';
import { FolderKanban, Plus, ExternalLink, Settings } from 'lucide-react';
import Link from 'next/link';

interface Project {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string | null;
  is_archived: boolean;
  created_at: string;
  client_id: string;
  clients?: { name: string };
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createBrowserClient();

  useEffect(() => {
    async function fetchProjects() {
      const { data, error } = await supabase
        .from('projects')
        .select('*, clients(name)')
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching projects:', error);
      } else {
        setProjects(data || []);
      }
      setIsLoading(false);
    }

    fetchProjects();
  }, [supabase]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your applications and client projects</p>
        </div>
        <Link href="/projects/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-slate-100 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <Card className="py-16">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
              <FolderKanban className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900">No projects yet</h3>
            <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
              Connect your first project to start monitoring deployments, errors, and analytics in one place.
            </p>
            <div className="mt-6">
              <Link href="/projects/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Project
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Card key={project.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                    <FolderKanban className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-900">{project.name}</h3>
                    <p className="text-xs text-slate-500">{project.clients?.name || 'Internal'}</p>
                  </div>
                </div>
                <StatusIndicator status="healthy" pulse={false} />
              </div>

              <p className="text-sm text-slate-500 mb-4 line-clamp-2">
                {project.description || 'No description provided.'}
              </p>

              <div className="flex items-center gap-2 mb-4">
                <Badge variant="default" className="capitalize">
                  {project.category?.replace('_', ' ')}
                </Badge>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                <Link
                  href={`/projects/${project.id}`}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  Manage
                </Link>
                <Link
                  href={`/projects/${project.id}/deployments`}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  Deployments
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
