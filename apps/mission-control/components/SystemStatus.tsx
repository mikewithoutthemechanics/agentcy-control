'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@agentcy/supabase';

interface Status {
  label: string;
  color: 'emerald' | 'amber' | 'red';
  pulse: boolean;
}

export default function SystemStatus() {
  const [status, setStatus] = useState<Status>({
    label: 'Loading...',
    color: 'emerald',
    pulse: false,
  });
  const supabase = createBrowserClient();

  useEffect(() => {
    async function fetchStatus() {
      // Count active critical incidents and open alerts
      const [incidentResult, alertResult] = await Promise.all([
        supabase
          .from('incidents')
          .select('id', { count: 'exact', head: true })
          .in('status', ['detected', 'investigating', 'identified', 'mitigating'])
          .eq('severity', 'sev1-critical'),
        supabase
          .from('alert_notifications')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'open')
          .eq('severity', 'critical'),
      ]);

      const criticalIncidents = incidentResult.count || 0;
      const criticalAlerts = alertResult.count || 0;

      if (criticalIncidents > 0 || criticalAlerts > 0) {
        setStatus({
          label: `${criticalIncidents + criticalAlerts} Critical Issue${criticalIncidents + criticalAlerts > 1 ? 's' : ''}`,
          color: 'red',
          pulse: true,
        });
      } else {
        const openAlerts = (await supabase
          .from('alert_notifications')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'open')
        ).count || 0;

        if (openAlerts > 0) {
          setStatus({
            label: `${openAlerts} Open Alert${openAlerts > 1 ? 's' : ''}`,
            color: 'amber',
            pulse: true,
          });
        } else {
          setStatus({
            label: 'All Systems Operational',
            color: 'emerald',
            pulse: true,
          });
        }
      }
    }

    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [supabase]);

  const bgColors = {
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
  };

  const dotColors = {
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${bgColors[status.color]}`}>
      {status.pulse && (
        <span className="relative flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${dotColors[status.color]} opacity-75`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColors[status.color]}`} />
        </span>
      )}
      {status.label}
    </div>
  );
}
