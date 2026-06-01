'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@agentcy/supabase';
import { Card } from '@agentcy/ui';
import { AlertTriangle, CheckCircle2, Clock, Radio, TrendingUp, MessageSquare, Activity } from 'lucide-react';

interface TimelineEvent {
  id: string;
  occurred_at: string;
  event_type: string;
  severity: string;
  source: string;
  payload: Record<string, unknown>;
}

interface IncidentTimelineProps {
  incidentId: string;
}

export default function IncidentTimeline({ incidentId }: IncidentTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createBrowserClient();

  useEffect(() => {
    async function fetchEvents() {
      const { data } = await supabase
        .from('unified_events')
        .select('*')
        .eq('project_id', incidentId)
        .gte('occurred_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('occurred_at', { ascending: true });

      setEvents(data || []);
      setIsLoading(false);
    }

    fetchEvents();
  }, [supabase, incidentId]);

  function getIcon(eventType: string, severity: string) {
    if (eventType === 'deployment') return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    if (eventType === 'incident' || severity === 'critical') return <AlertTriangle className="h-4 w-4 text-red-500" />;
    if (eventType === 'error') return <Activity className="h-4 w-4 text-amber-500" />;
    if (eventType === 'check_failed') return <Radio className="h-4 w-4 text-red-500" />;
    return <Clock className="h-4 w-4 text-slate-400" />;
  }

  function getSeverityColor(severity: string) {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'error': return 'bg-amber-500';
      case 'warning': return 'bg-yellow-500';
      default: return 'bg-slate-400';
    }
  }

  if (isLoading) {
    return (
      <Card>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4">
              <div className="w-8 h-8 bg-slate-100 animate-pulse rounded-full" />
              <div className="flex-1 h-16 bg-slate-100 animate-pulse rounded-lg" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card>
        <div className="py-8 text-center text-sm text-slate-500">
          No timeline events found for this incident.
        </div>
      </Card>
    );
  }

  return (
    <Card title="Incident Timeline" subtitle="Events leading to and during the incident">
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />

        <div className="space-y-6">
          {events.map((event, index) => {
            const time = new Date(event.occurred_at);
            const prevTime = index > 0 ? new Date(events[index - 1].occurred_at) : null;
            const timeDiff = prevTime ? Math.round((time.getTime() - prevTime.getTime()) / 60000) : 0;

            return (
              <div key={event.id} className="relative flex gap-4 pl-1">
                {/* Dot */}
                <div className={`relative z-10 w-8 h-8 rounded-full border-2 border-white shadow-sm flex items-center justify-center ${getSeverityColor(event.severity)}`}>
                  {getIcon(event.event_type, event.severity)}
                </div>

                <div className="flex-1 pt-0.5">
                  {timeDiff > 0 && index > 0 && (
                    <div className="text-[10px] text-slate-400 mb-1 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      +{timeDiff} min
                    </div>
                  )}
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-900 capitalize">
                        {event.event_type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-slate-400">
                        {time.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Source: <span className="font-medium">{event.source}</span>
                      {event.severity && (
                        <span className="ml-2">
                          Severity: <span className={`font-medium ${event.severity === 'critical' ? 'text-red-600' : event.severity === 'error' ? 'text-amber-600' : 'text-slate-600'}`}>
                            {event.severity}
                          </span>
                        </span>
                      )}
                    </p>
                    {event.payload && (
                      <div className="mt-2 text-[10px] bg-white rounded p-2 border border-slate-100 font-mono text-slate-500 overflow-x-auto">
                        {JSON.stringify(event.payload).slice(0, 200)}
                        {JSON.stringify(event.payload).length > 200 ? '...' : ''}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
