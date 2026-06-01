// =====================================================
// Agentcy Control: Shared Types
// =====================================================

export type EnvironmentName = 'development' | 'staging' | 'production' | 'preview';

export type ProjectCategory = 'web_app' | 'mobile_app' | 'marketing_site' | 'api' | 'infrastructure' | 'ecommerce';

export type ServiceType = 
  | 'supabase' 
  | 'vercel' 
  | 'sentry' 
  | 'posthog' 
  | 'resend' 
  | 'redis' 
  | 'github' 
  | 'stripe' 
  | 'aws' 
  | 'cloudflare' 
  | 'linear' 
  | 'slack' 
  | 'pagerduty';

export type AgencyRole = 'owner' | 'admin' | 'member';

export type ProjectRole = 'viewer' | 'editor' | 'admin' | 'owner';

export type IncidentSeverity = 'sev1-critical' | 'sev2-high' | 'sev3-medium' | 'sev4-low';

export type IncidentStatus = 'detected' | 'investigating' | 'identified' | 'mitigating' | 'monitoring' | 'resolved' | 'postmortem';

export type DeploymentStatus = 'pending' | 'building' | 'ready' | 'failed' | 'cancelled' | 'rolled_back';

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

export type ClientTier = 'starter' | 'growth' | 'enterprise' | 'custom';

export interface ServiceMetadata {
  region?: string;
  planTier?: string;
  projectRef?: string;
  orgSlug?: string;
  projectId?: string;
  teamId?: string;
  apiVersion?: string;
}

export interface ServiceConfig {
  serviceType: ServiceType;
  environment: EnvironmentName;
  metadata: ServiceMetadata;
  // Actual credentials are encrypted and never exposed to frontend
}

export interface DashboardWidget {
  id: string;
  type: 'health_grid' | 'error_stream' | 'traffic_radar' | 'deployment_conveyor' | 'cost_meter' | 'alert_ticker' | 'custom';
  title: string;
  projectId?: string;
  config: Record<string, unknown>;
  position: { x: number; y: number; w: number; h: number };
}

export interface UnifiedEventPayload {
  [key: string]: unknown;
}

export interface AutomationTrigger {
  type: string;
  filters?: Record<string, unknown>;
}

export interface AutomationCondition {
  field: string;
  operator: string;
  value: unknown;
}

export interface AutomationAction {
  type: string;
  config?: Record<string, unknown>;
}

export interface ClientBrandColors {
  primary: string;
  secondary: string;
  accent: string;
}
