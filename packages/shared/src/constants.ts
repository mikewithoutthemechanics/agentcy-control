export const ENVIRONMENTS: string[] = ['development', 'staging', 'production', 'preview'];

export const SERVICE_TYPES: string[] = [
  'supabase',
  'vercel',
  'sentry',
  'posthog',
  'resend',
  'redis',
  'github',
  'stripe',
  'aws',
  'cloudflare',
  'linear',
  'slack',
  'pagerduty',
];

export const PROJECT_CATEGORIES: string[] = [
  'web_app',
  'mobile_app',
  'marketing_site',
  'api',
  'infrastructure',
  'ecommerce',
];

export const INCIDENT_SEVERITIES = [
  { value: 'sev1-critical', label: 'SEV 1 - Critical', color: '#dc2626' },
  { value: 'sev2-high', label: 'SEV 2 - High', color: '#ea580c' },
  { value: 'sev3-medium', label: 'SEV 3 - Medium', color: '#ca8a04' },
  { value: 'sev4-low', label: 'SEV 4 - Low', color: '#2563eb' },
] as const;

export const DEPLOYMENT_STATUSES = [
  { value: 'pending', label: 'Pending', color: '#6b7280' },
  { value: 'building', label: 'Building', color: '#ca8a04' },
  { value: 'ready', label: 'Ready', color: '#16a34a' },
  { value: 'failed', label: 'Failed', color: '#dc2626' },
  { value: 'cancelled', label: 'Cancelled', color: '#6b7280' },
  { value: 'rolled_back', label: 'Rolled Back', color: '#9333ea' },
] as const;

export const DEFAULT_BRAND_COLORS = {
  primary: '#0f172a',
  secondary: '#38bdf8',
  accent: '#10b981',
};
