import * as React from 'react';

interface StatusIndicatorProps {
  status: 'healthy' | 'warning' | 'critical' | 'unknown' | 'pending';
  label?: string;
  pulse?: boolean;
}

export function StatusIndicator({ status, label, pulse = true }: StatusIndicatorProps) {
  const colors = {
    healthy: 'bg-emerald-500',
    warning: 'bg-amber-500',
    critical: 'bg-red-500',
    unknown: 'bg-slate-400',
    pending: 'bg-sky-500',
  };

  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-2.5 w-2.5">
        {pulse && status !== 'unknown' && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${colors[status]} opacity-75`} />
        )}
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${colors[status]}`} />
      </span>
      {label && <span className="text-sm text-slate-600">{label}</span>}
    </div>
  );
}
