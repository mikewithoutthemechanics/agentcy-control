'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@agentcy/supabase';
import { Card, Badge, Button } from '@agentcy/ui';
import { Webhook, ChevronDown, ChevronUp, RotateCcw, Clock } from 'lucide-react';

interface WebhookPayload {
  id: string;
  source: string;
  event_type: string;
  status: string;
  payload: Record<string, unknown>;
  headers: Record<string, unknown>;
  created_at: string;
  error_message: string | null;
}

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookPayload[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replayingId, setReplayingId] = useState<string | null>(null);
  const supabase = createBrowserClient();

  useEffect(() => {
    async function fetchWebhooks() {
      setIsLoading(true);
      let query = supabase
        .from('webhook_payloads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (sourceFilter !== 'all') {
        query = query.eq('source', sourceFilter);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching webhooks:', error);
      } else {
        setWebhooks((data as WebhookPayload[]) || []);
      }
      setIsLoading(false);
    }

    fetchWebhooks();
  }, [supabase, sourceFilter]);

  async function handleReplay(webhook: WebhookPayload) {
    setReplayingId(webhook.id);

    // Get agency_id from membership
    const { data: memberships } = await supabase
      .from('agency_memberships')
      .select('agency_id')
      .limit(1);

    const agencyId = memberships?.[0]?.agency_id;

    // Update status to replayed
    const { error: updateError } = await supabase
      .from('webhook_payloads')
      .update({ status: 'replayed', processed_at: new Date().toISOString() })
      .eq('id', webhook.id);

    if (updateError) {
      console.error('Error updating webhook:', updateError);
      setReplayingId(null);
      return;
    }

    // Create unified event from payload
    const projectId =
      (webhook.payload as any)?.project_id ||
      (webhook.payload as any)?.project?.id ||
      null;

    const { error: insertError } = await supabase.from('unified_events').insert({
      agency_id: agencyId,
      project_id: projectId,
      source: webhook.source,
      event_type: webhook.event_type,
      payload: webhook.payload,
      occurred_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error('Error creating unified event:', insertError);
    }

    // Refresh local state
    setWebhooks((prev) =>
      prev.map((w) => (w.id === webhook.id ? { ...w, status: 'replayed' } : w))
    );
    setReplayingId(null);
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'received':
        return <Badge variant="default">Received</Badge>;
      case 'processing':
        return <Badge variant="info">Processing</Badge>;
      case 'processed':
        return <Badge variant="success">Processed</Badge>;
      case 'failed':
        return <Badge variant="error">Failed</Badge>;
      case 'replayed':
        return <Badge variant="warning">Replayed</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Webhook Replay</h1>
        <p className="text-sm text-slate-500 mt-1">
          Inspect and replay webhook payloads
        </p>
      </div>

      {/* Source filters */}
      <div className="flex flex-wrap gap-2">
        {['all', 'vercel', 'sentry', 'posthog'].map((source) => (
          <button
            key={source}
            onClick={() => setSourceFilter(source)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              sourceFilter === source
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {source.charAt(0).toUpperCase() + source.slice(1)}
          </button>
        ))}
      </div>

      <Card>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-slate-100 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : webhooks.length === 0 ? (
          <div className="py-12 text-center">
            <Webhook className="h-8 w-8 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900">No webhooks found</h3>
            <p className="text-sm text-slate-500 mt-2">
              Webhook payloads will appear here when received.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {webhooks.map((webhook) => (
              <div
                key={webhook.id}
                className="border border-slate-100 rounded-lg overflow-hidden"
              >
                {/* Row header */}
                <div className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <span className="text-sm font-medium text-slate-900 w-24 truncate">
                      {webhook.source}
                    </span>
                    <span className="text-sm text-slate-600 w-32 truncate">
                      {webhook.event_type}
                    </span>
                    {getStatusBadge(webhook.status)}
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Clock className="h-3 w-3" />
                      {new Date(webhook.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {webhook.status === 'failed' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        isLoading={replayingId === webhook.id}
                        onClick={() => handleReplay(webhook)}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Replay
                      </Button>
                    )}
                    <button
                      onClick={() =>
                        setExpandedId(expandedId === webhook.id ? null : webhook.id)
                      }
                      className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      {expandedId === webhook.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expandable payload */}
                {expandedId === webhook.id && (
                  <div className="px-4 pb-4 border-t border-slate-100 bg-slate-50">
                    <pre className="mt-3 text-xs font-mono text-slate-700 overflow-auto max-h-96 p-3 bg-white rounded-lg border border-slate-200">
                      {JSON.stringify(webhook.payload, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
