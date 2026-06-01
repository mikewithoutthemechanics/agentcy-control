export interface Runbook {
  id: string;
  title: string;
  description: string | null;
  category: string;
  steps: unknown[];
  enabled: boolean;
  execution_count: number;
  last_executed_at: string | null;
  created_at: string;
}
