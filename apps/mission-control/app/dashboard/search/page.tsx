'use client';

import { useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@agentcy/supabase';
import { Card, Badge } from '@agentcy/ui';
import { Search, Loader2, FolderKanban, AlertTriangle, Zap } from 'lucide-react';
import Link from 'next/link';

interface SearchResult {
  entity_type: string;
  entity_id: string;
  title: string;
  description: string;
  updated_at: string;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const supabase = createBrowserClient();

  useEffect(() => {
    async function fetchAgency() {
      const { data } = await supabase
        .from('agency_memberships')
        .select('agency_id')
        .limit(1);

      if (data && data.length > 0) {
        setAgencyId(data[0].agency_id);
      }
    }
    fetchAgency();
  }, [supabase]);

  const handleSearch = useCallback(async () => {
    if (!query.trim() || !agencyId) return;

    setIsLoading(true);
    const { data, error } = await supabase.rpc('global_search', {
      p_agency_id: agencyId,
      p_query: query.trim(),
      p_limit: 20,
    });

    if (error) {
      console.error('Search error:', error);
      setResults([]);
    } else {
      setResults((data as SearchResult[]) || []);
    }
    setIsLoading(false);
  }, [query, agencyId, supabase]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }

  const grouped = results.reduce((acc, result) => {
    if (!acc[result.entity_type]) acc[result.entity_type] = [];
    acc[result.entity_type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  function getResultLink(result: SearchResult) {
    switch (result.entity_type) {
      case 'project':
        return `/projects/${result.entity_id}`;
      case 'incident':
        return `/dashboard/incidents/${result.entity_id}`;
      case 'deployment':
        return `/dashboard/deployments`;
      default:
        return '#';
    }
  }

  function getResultIcon(type: string) {
    switch (type) {
      case 'project':
        return <FolderKanban className="h-5 w-5 text-sky-600" />;
      case 'incident':
        return <AlertTriangle className="h-5 w-5 text-amber-600" />;
      case 'deployment':
        return <Zap className="h-5 w-5 text-emerald-600" />;
      default:
        return <Search className="h-5 w-5 text-slate-500" />;
    }
  }

  function getTypeLabel(type: string) {
    return type.charAt(0).toUpperCase() + type.slice(1) + 's';
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Advanced Search</h1>
        <p className="text-sm text-slate-500 mt-1">
          Search across projects, incidents, and deployments
        </p>
      </div>

      <Card>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search projects, incidents, deployments..."
            className="w-full pl-10 pr-24 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none text-sm"
          />
          <button
            onClick={handleSearch}
            disabled={isLoading || !query.trim()}
            className="absolute right-2 top-1.5 px-3 py-1.5 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Search'
            )}
          </button>
        </div>
      </Card>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-slate-400 animate-spin" />
        </div>
      )}

      {!isLoading && results.length > 0 && (
        <div className="space-y-6">
          {Object.entries(grouped).map(([type, items]) => (
            <Card key={type} title={getTypeLabel(type)}>
              <div className="space-y-2">
                {items.map((result) => (
                  <Link
                    key={result.entity_id}
                    href={getResultLink(result)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100"
                  >
                    <div className="p-2 bg-slate-100 rounded-lg">
                      {getResultIcon(type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {result.title}
                        </p>
                        <Badge variant="default" className="text-xs">
                          {type}
                        </Badge>
                      </div>
                      {result.description && (
                        <p className="text-xs text-slate-500 truncate">
                          {result.description}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 whitespace-nowrap">
                      {new Date(result.updated_at).toLocaleDateString()}
                    </span>
                  </Link>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && query.trim() && results.length === 0 && (
        <div className="py-12 text-center">
          <Search className="h-8 w-8 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">No results found</h3>
          <p className="text-sm text-slate-500 mt-2">Try a different search term</p>
        </div>
      )}
    </div>
  );
}
