'use client';

import * as React from 'react';

interface ToastProps {
  message: string;
  variant?: 'success' | 'error' | 'warning' | 'info';
  onClose?: () => void;
  duration?: number;
  title?: string;
}

export function Toast({
  message,
  variant = 'info',
  onClose,
  duration = 5000,
  title,
}: ToastProps) {
  React.useEffect(() => {
    if (onClose && duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const variants = {
    success: {
      container: 'bg-emerald-50 border-emerald-200',
      icon: 'text-emerald-500',
      title: 'text-emerald-900',
      message: 'text-emerald-700',
      iconPath: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      ),
    },
    error: {
      container: 'bg-red-50 border-red-200',
      icon: 'text-red-500',
      title: 'text-red-900',
      message: 'text-red-700',
      iconPath: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
        />
      ),
    },
    warning: {
      container: 'bg-amber-50 border-amber-200',
      icon: 'text-amber-500',
      title: 'text-amber-900',
      message: 'text-amber-700',
      iconPath: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
        />
      ),
    },
    info: {
      container: 'bg-sky-50 border-sky-200',
      icon: 'text-sky-500',
      title: 'text-sky-900',
      message: 'text-sky-700',
      iconPath: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
        />
      ),
    },
  };

  const style = variants[variant];

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border p-4 shadow-sm ${style.container}`}
      role="alert"
    >
      <svg
        className={`h-5 w-5 flex-shrink-0 mt-0.5 ${style.icon}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        {style.iconPath}
      </svg>
      <div className="flex-1 min-w-0">
        {title && <p className={`text-sm font-semibold ${style.title}`}>{title}</p>}
        <p className={`text-sm ${title ? 'mt-0.5' : ''} ${style.message}`}>{message}</p>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 rounded-md p-1 text-slate-400 hover:text-slate-600 hover:bg-black/5 transition-colors"
          aria-label="Close"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
